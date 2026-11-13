import { randomBytes } from 'node:crypto'
import { normalizeIP } from '@fastify/rate-limit'
import { and, desc, eq, gt, inArray, isNull } from 'drizzle-orm'
import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import type { Database } from '../database/client.js'
import { accountTokens, auditEvents, memberships, recoveryRequests, schools, sessions, studentLinks, students, users } from '../database/schema.js'
import { fail, requireAdmin } from './access.js'
import { hashPassword, hashToken, verifyPassword } from './passwords.js'

const email = z.string().trim().toLowerCase().email().max(254)
const password = z.string().min(12).max(128)
const roles = z.enum(['administrator', 'teacher', 'student', 'guardian'])
export async function registerAccountRoutes(app: FastifyInstance, database: Database) {
  app.post('/api/v1/auth/recovery-request', { config: { rateLimit: { max: 5, timeWindow: '15 minutes', keyGenerator: (req) => normalizeIP(req.ip) } } }, async (req, reply) => {
    const input = z.object({ email, schoolSlug: z.string().min(1).max(100) }).safeParse(req.body)
    if (!input.success) return fail(reply, req, 400, 'VALIDATION_ERROR', 'Enter an email and school code.')
    const [member] = await database.select({ id: memberships.id, schoolId: memberships.schoolId }).from(memberships).innerJoin(users, eq(users.id, memberships.userId)).innerJoin(schools, eq(schools.id, memberships.schoolId)).where(and(eq(users.email, input.data.email), eq(schools.slug, input.data.schoolSlug), eq(memberships.status, 'active'), eq(users.status, 'active')))
    if (member) await database.insert(recoveryRequests).values({ schoolId: member.schoolId, membershipId: member.id }).onConflictDoNothing()
    return { data: { message: 'If the account is eligible, your school administrator can arrange recovery after verifying your identity.' } }
  })
  app.post('/api/v1/auth/redeem', { config: { rateLimit: { max: 5, timeWindow: '15 minutes', keyGenerator: (req) => normalizeIP(req.ip) } } }, async (req, reply) => {
    const parsed = z.object({ token: z.string().min(40).max(100), password }).strict().safeParse(req.body)
    if (!parsed.success) return fail(reply, req, 400, 'VALIDATION_ERROR', 'Use a valid token and a password of 12–128 characters.')
    const passwordHash = await hashPassword(parsed.data.password)
    const result = await database.transaction(async (tx) => {
      const [token] = await tx.select().from(accountTokens).where(and(eq(accountTokens.tokenHash, hashToken(parsed.data.token)), isNull(accountTokens.usedAt), gt(accountTokens.expiresAt, new Date()))).for('update')
      if (!token) return false
      const [school] = await tx.select().from(schools).where(and(eq(schools.id, token.schoolId), eq(schools.status, 'active')))
      if (!school) return false
      let [user] = await tx.select().from(users).where(eq(users.email, token.email))
      if (token.kind === 'recovery') {
        if (!user || user.status !== 'active') return false
        const [member] = await tx.select().from(memberships).where(and(eq(memberships.schoolId, token.schoolId), eq(memberships.userId, user.id), eq(memberships.status, 'active'))).for('update')
        if (!member) return false
        await tx.update(users).set({ passwordHash }).where(eq(users.id, user.id))
        const allMembers = await tx.select({ id: memberships.id }).from(memberships).where(eq(memberships.userId, user.id))
        await tx.delete(sessions).where(inArray(sessions.membershipId, allMembers.map((m) => m.id)))
        await tx.delete(recoveryRequests).where(eq(recoveryRequests.membershipId, member.id))
        await tx.insert(auditEvents).values({ schoolId: token.schoolId, actorMembershipId: member.id, action: 'account.password_recovered', targetId: String(member.id) })
      } else {
        // Invitations never reset an existing user's password or silently attach another identity.
        if (user) return false
        const linked = token.studentIds.length ? await tx.select().from(students).where(and(eq(students.schoolId, token.schoolId), inArray(students.id, token.studentIds))) : []
        if (linked.length !== token.studentIds.length) return false
        ;[user] = await tx.insert(users).values({ email: token.email, displayName: token.displayName, passwordHash }).onConflictDoNothing().returning()
        if (!user) return false
        const [member] = await tx.insert(memberships).values({ schoolId: token.schoolId, userId: user.id, role: token.role }).returning()
        for (const studentId of token.studentIds) await tx.insert(studentLinks).values({ schoolId: token.schoolId, membershipId: member!.id, studentId })
        await tx.insert(auditEvents).values({ schoolId: token.schoolId, actorMembershipId: member!.id, action: 'account.invitation_accepted', targetId: String(member!.id) })
      }
      await tx.update(accountTokens).set({ usedAt: new Date() }).where(eq(accountTokens.id, token.id))
      // Invalidate other pending recovery/invitation links for this identity.
      await tx.update(accountTokens).set({ usedAt: new Date() }).where(and(eq(accountTokens.email, token.email), isNull(accountTokens.usedAt)))
      return true
    })
    if (!result) return fail(reply, req, 400, 'INVALID_TOKEN', 'This link is invalid, expired, already used, or no longer eligible.')
    return { data: { message: 'Password saved. Sign in with your school code and email.' } }
  })
  await app.register(async (admin) => {
    admin.addHook('preHandler', async (req, reply) => requireAdmin(req, reply))
    admin.get('/api/v1/admin/accounts', async (req) => {
      const schoolId = req.principal!.schoolId
      const [accounts, people, requests, events] = await Promise.all([
        database.select({ id: memberships.id, role: memberships.role, status: memberships.status, email: users.email, displayName: users.displayName }).from(memberships).innerJoin(users, eq(users.id, memberships.userId)).where(eq(memberships.schoolId, schoolId)),
        database.select({ id: students.id, firstName: students.firstName, lastName: students.lastName, studentNumber: students.studentNumber }).from(students).where(eq(students.schoolId, schoolId)),
        database.select().from(recoveryRequests).where(eq(recoveryRequests.schoolId, schoolId)),
        database.select().from(auditEvents).where(eq(auditEvents.schoolId, schoolId)).orderBy(desc(auditEvents.id)).limit(100),
      ])
      return { data: { accounts, students: people, requests, events } }
    })
    admin.post('/api/v1/admin/invitations', async (req, reply) => {
      const p = req.principal!
      const parsed = z.object({ email, displayName: z.string().trim().min(1).max(100), role: roles, studentIds: z.array(z.number().int().positive()).max(50), password: z.string().min(1).max(128) }).strict().safeParse(req.body)
      if (!parsed.success) return fail(reply, req, 400, 'VALIDATION_ERROR', 'Enter an email, name, role, linked students and your current password.')
      const input = parsed.data
      const [actor] = await database.select().from(users).where(eq(users.id, p.userId))
      if (!actor || !await verifyPassword(input.password, actor.passwordHash)) return fail(reply, req, 403, 'REAUTH_REQUIRED', 'Your current password is incorrect.')
      if ((input.role === 'student' && input.studentIds.length !== 1) || (input.role === 'guardian' && !input.studentIds.length) || (['teacher', 'administrator'].includes(input.role) && input.studentIds.length)) return fail(reply, req, 400, 'INVALID_LINKS', 'Link one student for a student account, one or more for a guardian, and none for staff.')
      const people = input.studentIds.length ? await database.select().from(students).where(and(eq(students.schoolId, p.schoolId), inArray(students.id, input.studentIds))) : []
      if (people.length !== input.studentIds.length) return fail(reply, req, 400, 'INVALID_LINKS', 'Linked students must belong to your school and be unique.')
      const [existing] = await database.select().from(users).where(eq(users.email, input.email))
      if (existing) return fail(reply, req, 409, 'ACCOUNT_EXISTS', 'This email already has an account. Use its existing membership or recovery workflow.')
      const token = randomBytes(32).toString('base64url')
      await database.transaction(async (tx) => {
        await tx.update(accountTokens).set({ usedAt: new Date() }).where(and(eq(accountTokens.schoolId, p.schoolId), eq(accountTokens.email, input.email), eq(accountTokens.kind, 'invitation'), isNull(accountTokens.usedAt)))
        const [row] = await tx.insert(accountTokens).values({ schoolId: p.schoolId, email: input.email, displayName: input.displayName, kind: 'invitation', role: input.role, studentIds: input.studentIds, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 24 * 60 * 60_000) }).returning()
        await tx.insert(auditEvents).values({ schoolId: p.schoolId, actorMembershipId: p.membershipId, action: 'account.invited', targetId: String(row!.id) })
      })
      return { data: { token, expiresInHours: 24, message: 'Share once through a verified channel. Creating another invitation invalidates the previous one.' } }
    })
    admin.post('/api/v1/admin/accounts/:id/recovery', async (req, reply) => {
      const p = req.principal!, params = z.object({ id: z.coerce.number().int().positive() }).safeParse(req.params)
      const input = z.object({ password: z.string().min(1).max(128) }).strict().safeParse(req.body)
      if (!params.success || !input.success) return fail(reply, req, 400, 'VALIDATION_ERROR', 'Provide an account and your current password.')
      const [actor] = await database.select().from(users).where(eq(users.id, p.userId))
      if (!actor || !await verifyPassword(input.data.password, actor.passwordHash)) return fail(reply, req, 403, 'REAUTH_REQUIRED', 'Your current password is incorrect.')
      const [member] = await database.select({ id: memberships.id, role: memberships.role, email: users.email, displayName: users.displayName }).from(memberships).innerJoin(users, eq(users.id, memberships.userId)).where(and(eq(memberships.id, params.data.id), eq(memberships.schoolId, p.schoolId), eq(memberships.status, 'active')))
      if (!member) return fail(reply, req, 404, 'NOT_FOUND', 'Account not found.')
      const token = randomBytes(32).toString('base64url')
      await database.transaction(async (tx) => {
        await tx.update(accountTokens).set({ usedAt: new Date() }).where(and(eq(accountTokens.email, member.email), eq(accountTokens.kind, 'recovery'), isNull(accountTokens.usedAt)))
        await tx.insert(accountTokens).values({ schoolId: p.schoolId, email: member.email, displayName: member.displayName, role: member.role, kind: 'recovery', studentIds: [], tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 30 * 60_000) })
        await tx.insert(auditEvents).values({ schoolId: p.schoolId, actorMembershipId: p.membershipId, action: 'account.recovery_issued', targetId: String(member.id) })
      })
      return { data: { token, message: 'Verify the recipient identity before sharing this single-use link. It expires in 30 minutes.' } }
    })
    admin.post('/api/v1/admin/accounts/:id/deactivate', async (req, reply) => {
      const p = req.principal!, params = z.object({ id: z.coerce.number().int().positive() }).safeParse(req.params)
      if (!params.success || params.data.id === p.membershipId) return fail(reply, req, 400, 'INVALID_ACCOUNT', 'Choose another account. You cannot deactivate yourself.')
      const removed = await database.transaction(async (tx) => {
        const [member] = await tx.update(memberships).set({ status: 'inactive' }).where(and(eq(memberships.id, params.data.id), eq(memberships.schoolId, p.schoolId))).returning()
        if (!member) return false
        await tx.delete(sessions).where(eq(sessions.membershipId, member.id))
        await tx.insert(auditEvents).values({ schoolId: p.schoolId, actorMembershipId: p.membershipId, action: 'account.deactivated', targetId: String(member.id) })
        return true
      })
      if (!removed) return fail(reply, req, 404, 'NOT_FOUND', 'Account not found.')
      return { data: { deactivated: true } }
    })
  })
}
