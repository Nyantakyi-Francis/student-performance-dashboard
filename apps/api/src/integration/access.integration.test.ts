import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { and, eq, inArray } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { buildApp } from '../app.js'
import { parseConfig } from '../config.js'
import { createDatabase } from '../database/client.js'
import * as schema from '../database/schema.js'
import { hashPassword, hashToken } from '../auth/passwords.js'

const url = process.env.TEST_DATABASE_URL
if (!url || !new URL(url).pathname.endsWith('_test')) throw new Error('Set TEST_DATABASE_URL to a dedicated database whose name ends in _test.')
const database = createDatabase({ DATABASE_URL: url })
const db = database.db
const suffix = randomUUID()
const password = 'Synthetic-test-password-2026'
let app: FastifyInstance
let schoolA: number, schoolB: number, adminId: number, teacherId: number, emptyTeacherId: number
let classA: number, classOther: number, foreignClass: number, english: number, maths: number
let studentA: number, studentOther: number
let adminCookie: string, teacherCookie: string, otherCookie: string, emptyCookie: string
const userIds: number[] = []
const schoolIds: number[] = []
const headers = { 'x-dashboard-request': '1' }

async function login(email: string, schoolSlug = `test-a-${suffix}`) {
  const response = await app.inject({ method: 'POST', url: '/api/v1/auth/login', headers, payload: { email, password, schoolSlug } })
  expect(response.statusCode, response.body).toBe(200)
  return response.cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ')
}
const read = (path: string, cookie: string) => app.inject({ method: 'GET', url: path, headers: { cookie } })

beforeAll(async () => {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../../drizzle', import.meta.url)) })
  const hash = await hashPassword(password)
  async function school(slug: string) {
    const [row] = await db.insert(schema.schools).values({ name: slug, slug }).returning()
    schoolIds.push(row!.id)
    return row!.id
  }
  schoolA = await school(`test-a-${suffix}`)
  schoolB = await school(`test-b-${suffix}`)
  async function account(email: string, schoolId: number, role: string) {
    const [user] = await db.insert(schema.users).values({ email, displayName: role, passwordHash: hash }).returning()
    userIds.push(user!.id)
    const [membership] = await db.insert(schema.memberships).values({ schoolId, userId: user!.id, role }).returning()
    return membership!.id
  }
  adminId = await account(`admin-${suffix}@test.example`, schoolA, 'administrator')
  teacherId = await account(`teacher-${suffix}@test.example`, schoolA, 'teacher')
  emptyTeacherId = await account(`empty-${suffix}@test.example`, schoolA, 'teacher')
  await account(`other-${suffix}@test.example`, schoolB, 'administrator')
  async function academics(schoolId: number) {
    const [year] = await db.insert(schema.academicYears).values({ schoolId, name: '2026', startsOn: '2026-01-01', endsOn: '2026-12-31' }).returning()
    const [grade] = await db.insert(schema.gradeLevels).values({ schoolId, name: 'Grade 7', sequence: 7 }).returning()
    const [group] = await db.insert(schema.classGroups).values({ schoolId, academicYearId: year!.id, gradeLevelId: grade!.id, name: 'Class A' }).returning()
    const [otherGroup] = await db.insert(schema.classGroups).values({ schoolId, academicYearId: year!.id, gradeLevelId: grade!.id, name: 'Class B' }).returning()
    const [term] = await db.insert(schema.terms).values({ schoolId, academicYearId: year!.id, name: 'Term 1', sequence: 1, startsOn: '2026-01-01', endsOn: '2026-04-01' }).returning()
    const [eng, math] = await db.insert(schema.subjects).values([{ schoolId, code: 'english', name: 'English' }, { schoolId, code: 'maths', name: 'Maths' }]).returning()
    const pupils = await db.insert(schema.students).values([
      { schoolId, studentNumber: 'S1', firstName: 'Same', lastName: 'Name' },
      { schoolId, studentNumber: 'S2', firstName: 'Same', lastName: 'Name' },
      { schoolId, studentNumber: 'S3', firstName: 'Missing', lastName: 'Scores' },
    ]).returning()
    for (const [index, pupil] of pupils.entries()) {
      const [enrollment] = await db.insert(schema.enrollments).values({ schoolId, studentId: pupil.id, classGroupId: index === 1 ? otherGroup!.id : group!.id, academicYearId: year!.id, startsOn: '2026-01-01' }).returning()
      if (index === 1) continue
      const assessmentInputs = [
        { subjectId: eng!.id, title: 'Quiz', maximumScore: '20', weight: '1' },
        { subjectId: eng!.id, title: 'Exam', maximumScore: '100', weight: '3' },
        { subjectId: math!.id, title: 'Math', maximumScore: '100', weight: '1' },
      ]
      for (const input of assessmentInputs) {
        await db.insert(schema.assessments).values({ ...input, schoolId, classGroupId: group!.id, termId: term!.id, assessedOn: '2026-02-01' }).onConflictDoNothing()
      }
      const tests = await db.select().from(schema.assessments).where(and(eq(schema.assessments.schoolId, schoolId), eq(schema.assessments.classGroupId, group!.id)))
      for (const test of tests) await db.insert(schema.scores).values({ schoolId, assessmentId: test.id, enrollmentId: enrollment!.id, status: index === 2 ? 'missing' : 'scored', points: index === 2 ? null : test.title === 'Quiz' ? '10' : test.title === 'Exam' ? '90' : '0' })
    }
    return { group: group!.id, otherGroup: otherGroup!.id, eng: eng!.id, maths: math!.id, firstStudent: pupils[0]!.id, otherStudent: pupils[1]!.id }
  }
  const a = await academics(schoolA), b = await academics(schoolB)
  classA = a.group; classOther = a.otherGroup; foreignClass = b.group; english = a.eng; maths = a.maths
  studentA = a.firstStudent; studentOther = a.otherStudent
  await db.insert(schema.teachingAssignments).values({ schoolId: schoolA, membershipId: teacherId, classGroupId: classA, subjectId: english })
  app = await buildApp({ config: parseConfig({ NODE_ENV: 'test', CLIENT_ORIGIN: 'http://localhost:5173' }), database: db })
  adminCookie = await login(`admin-${suffix}@test.example`)
  teacherCookie = await login(`teacher-${suffix}@test.example`)
  emptyCookie = await login(`empty-${suffix}@test.example`)
  otherCookie = await login(`other-${suffix}@test.example`, `test-b-${suffix}`)
})

afterAll(async () => {
  await app?.close()
  if (schoolIds.length) {
    // Remove only this suite's fixtures, never truncate the database.
    for (const table of [schema.auditEvents, schema.teachingAssignments, schema.scores, schema.assessments, schema.enrollments]) await db.delete(table).where(inArray(table.schoolId, schoolIds))
    const memberRows = await db.select({ id: schema.memberships.id }).from(schema.memberships).where(inArray(schema.memberships.schoolId, schoolIds))
    if (memberRows.length) await db.delete(schema.sessions).where(inArray(schema.sessions.membershipId, memberRows.map((row) => row.id)))
    for (const table of [schema.memberships, schema.students, schema.classGroups, schema.terms, schema.subjects, schema.gradeLevels, schema.academicYears]) await db.delete(table).where(inArray(table.schoolId, schoolIds))
    await db.delete(schema.schools).where(inArray(schema.schools.id, schoolIds))
  }
  if (userIds.length) await db.delete(schema.users).where(inArray(schema.users.id, userIds))
  await database.client.end()
})

describe('PostgreSQL-backed sessions and scoped reads', () => {
  it('denies unauthenticated reads and admin operations', async () => {
    expect((await read('/api/v1/students', '')).statusCode).toBe(401)
    expect((await read('/api/v1/dashboard-data', '')).statusCode).toBe(401)
    expect((await read('/api/v1/admin/access', '')).statusCode).toBe(401)
  })
  it('uses HTTP-only cookies and stores only session hashes', async () => {
    const token = adminCookie.split('=')[1]!
    const [session] = await db.select().from(schema.sessions).where(eq(schema.sessions.tokenHash, hashToken(token)))
    expect(session?.tokenHash).not.toBe(token)
    expect((await read('/api/v1/auth/session', adminCookie)).json().data.role).toBe('administrator')
  })
  it('paginates by stable student IDs without leaking other schools', async () => {
    const first = (await read('/api/v1/students?limit=1', adminCookie)).json()
    const second = (await read(`/api/v1/students?limit=1&after=${first.page.nextCursor}`, adminCookie)).json()
    expect(first.data).toHaveLength(1)
    expect(second.data[0].id).not.toBe(first.data[0].id)
    const all = (await read('/api/v1/students', adminCookie)).json()
    expect(all.data).toHaveLength(3)
    expect(all.page.nextCursor).toBeNull()
    expect((await read('/api/v1/students?limit=0', adminCookie)).statusCode).toBe(400)
  })
  it('rejects a school ID or slug outside the signed-in school', async () => {
    expect((await read(`/api/v1/students?schoolId=${schoolB}`, adminCookie)).statusCode).toBe(403)
    expect((await read(`/api/v1/dashboard-data?schoolId=${schoolB}`, teacherCookie)).statusCode).toBe(403)
    expect((await read(`/api/v1/dashboard-data?schoolSlug=test-a-${suffix}`, otherCookie)).statusCode).toBe(403)
  })
  it('limits teacher rosters to assigned classes and scores to assigned subjects', async () => {
    const roster = (await read('/api/v1/students', teacherCookie)).json().data
    expect(roster.map((pupil: { id: number }) => pupil.id)).toContain(studentA)
    expect(roster.map((pupil: { id: number }) => pupil.id)).not.toContain(studentOther)
    const dashboard = (await read('/api/v1/dashboard-data', teacherCookie)).json().data
    expect(dashboard.subjects).toEqual(['english'])
    expect(dashboard.students).toHaveLength(2)
    expect(dashboard.students[0].scores.english).toBe(80)
    expect(dashboard.students[1].scores.english).toBeNull()
  })
  it('preserves zero, missing values, and weighted assessment totals for admins', async () => {
    const dashboard = (await read('/api/v1/dashboard-data', adminCookie)).json().data
    expect(dashboard.subjects).toEqual(['english', 'maths'])
    expect(dashboard.students[0].scores).toEqual({ english: 80, maths: 0 })
    expect(dashboard.students[1].scores).toEqual({ english: null, maths: null })
    expect(dashboard.students[0].id).toContain(`:${dashboard.students[0].termId}`)
    expect(dashboard.terms).toEqual(['2026 / Term 1'])
  })
  it('returns an empty dataset for a teacher without assignments', async () => {
    expect((await read('/api/v1/dashboard-data', emptyCookie)).json().data.students).toEqual([])
    expect((await read('/api/v1/students', emptyCookie)).json().data).toEqual([])
  })
  it('denies teachers access to assignment administration', async () => {
    expect((await read('/api/v1/admin/access', teacherCookie)).statusCode).toBe(403)
    expect((await app.inject({ method: 'POST', url: '/api/v1/admin/teaching-assignments', headers: { ...headers, cookie: teacherCookie }, payload: { membershipId: teacherId, classGroupId: classOther, subjectId: maths } })).statusCode).toBe(403)
  })
  it('rejects cross-school assignments and malformed input', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/v1/admin/teaching-assignments', headers: { ...headers, cookie: adminCookie }, payload: { membershipId: teacherId, classGroupId: foreignClass, subjectId: maths } })
    expect(response.statusCode).toBe(400)
    expect((await app.inject({ method: 'POST', url: '/api/v1/admin/teaching-assignments', headers: { ...headers, cookie: adminCookie }, payload: {} })).statusCode).toBe(400)
  })
  it('adds and removes access immediately and records audit events', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/v1/admin/teaching-assignments', headers: { ...headers, cookie: adminCookie }, payload: { membershipId: emptyTeacherId, classGroupId: classA, subjectId: maths } })
    expect(response.statusCode).toBe(200)
    expect((await read('/api/v1/dashboard-data', emptyCookie)).json().data.subjects).toEqual(['maths'])
    const [assignment] = await db.select().from(schema.teachingAssignments).where(eq(schema.teachingAssignments.membershipId, emptyTeacherId))
    expect((await app.inject({ method: 'DELETE', url: `/api/v1/admin/teaching-assignments/${assignment!.id}`, headers: { ...headers, cookie: otherCookie } })).statusCode).toBe(404)
    expect((await app.inject({ method: 'DELETE', url: `/api/v1/admin/teaching-assignments/${assignment!.id}`, headers: { ...headers, cookie: adminCookie } })).statusCode).toBe(200)
    expect((await read('/api/v1/dashboard-data', emptyCookie)).json().data.students).toEqual([])
    const events = await db.select().from(schema.auditEvents).where(eq(schema.auditEvents.actorMembershipId, adminId))
    expect(events.map((event) => event.action)).toContain('assignment.created')
    expect(events.map((event) => event.action)).toContain('assignment.removed')
  })
  it('blocks bad origins and requests without CSRF headers', async () => {
    expect((await app.inject({ method: 'POST', url: '/api/v1/auth/logout', headers: { cookie: teacherCookie }, payload: {} })).statusCode).toBe(403)
    expect((await app.inject({ method: 'POST', url: '/api/v1/auth/logout', headers: { ...headers, cookie: teacherCookie, origin: 'https://untrusted.example' }, payload: {} })).statusCode).toBe(403)
    const cors = await app.inject({ method: 'OPTIONS', url: '/api/v1/auth/login', headers: { origin: 'http://localhost:5173' } })
    expect(cors.headers['access-control-allow-origin']).toBe('http://localhost:5173')
    expect(cors.headers['access-control-allow-credentials']).toBe('true')
  })
  it('uses generic credential failures and secure production cookies', async () => {
    const denied = await app.inject({ method: 'POST', url: '/api/v1/auth/login', headers, payload: { email: `admin-${suffix}@test.example`, password: 'wrong', schoolSlug: `test-a-${suffix}` } })
    expect(denied.statusCode).toBe(401)
    const production = await buildApp({ config: parseConfig({ NODE_ENV: 'production', LOG_LEVEL: 'silent' }), database: db })
    try {
      const response = await production.inject({ method: 'POST', url: '/api/v1/auth/login', headers, payload: { email: `admin-${suffix}@test.example`, password, schoolSlug: `test-a-${suffix}` } })
      expect(response.headers['set-cookie']).toContain('HttpOnly')
      expect(response.headers['set-cookie']).toContain('Secure')
      expect(response.headers['set-cookie']).toContain('SameSite=Lax')
    } finally { await production.close() }
  })
  it('rejects expired sessions and revoked memberships', async () => {
    await db.update(schema.sessions).set({ expiresAt: new Date(0) }).where(eq(schema.sessions.tokenHash, hashToken(emptyCookie.split('=')[1]!)))
    expect((await read('/api/v1/students', emptyCookie)).statusCode).toBe(401)
    await db.update(schema.memberships).set({ status: 'inactive' }).where(eq(schema.memberships.id, teacherId))
    expect((await read('/api/v1/dashboard-data', teacherCookie)).statusCode).toBe(401)
    await db.update(schema.memberships).set({ status: 'active' }).where(eq(schema.memberships.id, teacherId))
  })
  it('logs out and invalidates the server session', async () => {
    expect((await app.inject({ method: 'POST', url: '/api/v1/auth/logout', headers: { ...headers, cookie: teacherCookie }, payload: {} })).statusCode).toBe(200)
    expect((await read('/api/v1/students', teacherCookie)).statusCode).toBe(401)
  })
  it('enables RLS for session and academic tables', async () => {
    const rows = await database.client`SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('users','sessions','students','scores','teaching_assignments') AND relnamespace = 'public'::regnamespace`
    expect(rows).toHaveLength(5)
    expect(rows.every((row) => row.relrowsecurity)).toBe(true)
  })
  it('rate-limits repeated sign-in attempts', async () => {
    let status = 0
    for (let attempt = 0; attempt < 11; attempt++) {
      const response = await app.inject({ method: 'POST', url: '/api/v1/auth/login', headers, payload: { email: 'unknown@test.example', password: 'wrong', schoolSlug: `test-a-${suffix}` } })
      status = response.statusCode
    }
    expect(status).toBe(429)
  })

})
