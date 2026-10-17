import { randomBytes } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import type { Database } from '../database/client.js'
import type { AppConfig } from '../config.js'
import { auditEvents, memberships, schools, sessions, users } from '../database/schema.js'
import { fail, requireSession } from './access.js'
import { hashPassword, hashToken, verifyPassword } from './passwords.js'

export const SESSION_COOKIE = 'dashboard_session'
const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
  schoolSlug: z.string().min(1).max(100),
}).strict()

export async function registerAuthRoutes(app: FastifyInstance, database: Database, config: AppConfig) {
  // An unknown account still performs the same password derivation as a known account.
  const dummyHash = await hashPassword(randomBytes(32).toString('hex'))
  const cookieOptions = {
    httpOnly: true, secure: config.NODE_ENV === 'production', sameSite: 'lax' as const,
    path: '/api', maxAge: 8 * 60 * 60,
  }

  app.post('/api/v1/auth/login', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const parsed = credentialsSchema.safeParse(request.body)
    if (!parsed.success) return fail(reply, request, 400, 'VALIDATION_ERROR', 'Enter an email, password, and school.')
    const [account] = await database.select({
      membershipId: memberships.id, schoolId: schools.id, passwordHash: users.passwordHash,
    }).from(users).innerJoin(memberships, eq(users.id, memberships.userId))
      .innerJoin(schools, eq(memberships.schoolId, schools.id))
      .where(and(eq(users.email, parsed.data.email), eq(schools.slug, parsed.data.schoolSlug),
        eq(users.status, 'active'), eq(memberships.status, 'active'), eq(schools.status, 'active'))).limit(1)
    const valid = await verifyPassword(parsed.data.password, account?.passwordHash ?? dummyHash)
    if (!account || !valid) return fail(reply, request, 401, 'INVALID_CREDENTIALS', 'Email, password, or school is incorrect.')
    const token = randomBytes(32).toString('base64url')
    await database.transaction(async (tx) => {
      if (request.cookies[SESSION_COOKIE]) {
        await tx.delete(sessions).where(eq(sessions.tokenHash, hashToken(request.cookies[SESSION_COOKIE]!)))
      }
      await tx.insert(sessions).values({ membershipId: account.membershipId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + cookieOptions.maxAge * 1000) })
      await tx.insert(auditEvents).values({ schoolId: account.schoolId, actorMembershipId: account.membershipId, action: 'session.login' })
    })
    reply.setCookie(SESSION_COOKIE, token, cookieOptions)
    return { data: { signedIn: true } }
  })

  app.get('/api/v1/auth/session', { preHandler: async (request, reply) => requireSession(request, reply) }, async (request) => ({ data: request.principal }))

  app.post('/api/v1/auth/logout', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE]
    if (token) await database.transaction(async (tx) => {
      await tx.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)))
      if (request.principal) await tx.insert(auditEvents).values({ schoolId: request.principal.schoolId, actorMembershipId: request.principal.membershipId, action: 'session.logout' })
    })
    reply.clearCookie(SESSION_COOKIE, { path: '/api', secure: cookieOptions.secure, httpOnly: true, sameSite: 'lax' })
    return { data: { signedOut: true } }
  })
}
