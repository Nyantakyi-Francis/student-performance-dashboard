import { and, eq, gt } from 'drizzle-orm'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { Database } from '../database/client.js'
import { memberships, schools, sessions, users } from '../database/schema.js'
import { hashToken } from './passwords.js'

export type Principal = {
  membershipId: number
  schoolId: number
  schoolName: string
  schoolSlug: string
  userId: number
  displayName: string
  role: string
}

declare module 'fastify' {
  interface FastifyRequest { principal: Principal | null }
}

export function fail(reply: FastifyReply, request: FastifyRequest, status: number, code: string, message: string) {
  return reply.status(status).send({ error: { code, message, requestId: request.id, fields: [] } })
}

export async function resolveSession(database: Database, token: string | undefined): Promise<Principal | null> {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null
  const [principal] = await database.select({
    membershipId: memberships.id, schoolId: schools.id, schoolName: schools.name,
    schoolSlug: schools.slug, userId: users.id, displayName: users.displayName, role: memberships.role,
  }).from(sessions)
    .innerJoin(memberships, eq(sessions.membershipId, memberships.id))
    .innerJoin(users, eq(memberships.userId, users.id))
    .innerJoin(schools, eq(memberships.schoolId, schools.id))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date()),
      eq(memberships.status, 'active'), eq(users.status, 'active'), eq(schools.status, 'active'))).limit(1)
  return principal ?? null
}

export function requireSession(request: FastifyRequest, reply: FastifyReply) {
  if (!request.principal) return fail(reply, request, 401, 'UNAUTHENTICATED', 'Sign in to view database records.')
}

export function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  const denied = requireSession(request, reply)
  if (denied) return denied
  if (request.principal?.role !== 'administrator') return fail(reply, request, 403, 'FORBIDDEN', 'Administrator access is required.')
}
