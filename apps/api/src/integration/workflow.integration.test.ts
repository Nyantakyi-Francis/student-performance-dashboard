import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { and, eq, inArray } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../app.js'
import { parseConfig } from '../config.js'
import { createDatabase } from '../database/client.js'
import { hashPassword, hashToken } from '../auth/passwords.js'
import * as s from '../database/schema.js'

const url = process.env.TEST_DATABASE_URL
if (!url || !new URL(url).pathname.endsWith('_test')) throw new Error('Use a dedicated _test database.')
const { db, client } = createDatabase({ DATABASE_URL: url })
const suffix = randomUUID(), password = 'Synthetic-workflow-password'
let app: FastifyInstance, schoolId: number, foreignSchool: number, yearId: number, classId: number, subjectId: number, termId: number, foreignClass: number
let pupil: number, enrollmentId: number, otherEnrollment: number, adminId: number, teacherId: number, studentMember: number
const cookies: Record<string, string> = {}, userIds: number[] = [], memberIds: number[] = []
let loginCount = 0
const request = (method: 'GET' | 'POST', path: string, role = 'teacher', payload?: object) => app.inject({ method, url: `/api/v1${path}`, headers: { cookie: cookies[role] ?? '', 'x-dashboard-request': '1' }, ...(method === 'POST' ? { payload: payload ?? {} } : {}) })
async function login(email: string, pass = password) {
  const result = await app.inject({ method: 'POST', url: '/api/v1/auth/login', remoteAddress: `10.0.0.${++loginCount}`, headers: { 'x-dashboard-request': '1' }, payload: { email, password: pass, schoolSlug: `workflow-${suffix}` } })
  expect(result.statusCode, result.body).toBe(200)
  return result.cookies.map((c) => `${c.name}=${c.value}`).join('; ')
}
async function create(title: string = randomUUID()) {
  const r = await request('POST', '/assessments', 'teacher', { classGroupId: classId, subjectId, termId, title, assessedOn: '2026-02-01', maximumScore: 20, weight: 1 })
  expect(r.statusCode, r.body).toBe(200)
  return r.json().data as { id: number; version: number }
}
const score = (points: number | null = 0, status = 'scored') => ({ enrollmentId, points, status, feedback: 'Published feedback' })
async function save(id: number, version: number, points = 10, reason = '') {
  return request('POST', `/assessments/${id}/scores`, 'teacher', { version, reason, rows: [score(points)] })
}
async function publish(id: number, version: number) {
  const workspace = await request('GET', '/workspace')
  return request('POST', `/assessments/${id}/publish`, 'teacher', { version, policyVersion: workspace.json().data.policy.version, reason: 'Reviewed synthetic results' })
}
beforeAll(async () => {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../../drizzle', import.meta.url)) })
  const hash = await hashPassword(password)
  ;[schoolId, foreignSchool] = (await db.insert(s.schools).values([{ name: 'Workflow school', slug: `workflow-${suffix}` }, { name: 'Other school', slug: `foreign-${suffix}` }]).returning()).map((r) => r.id) as [number, number]
  const [year] = await db.insert(s.academicYears).values({ schoolId, name: '2026', startsOn: '2026-01-01', endsOn: '2026-12-31' }).returning(); yearId = year!.id
  const [grade] = await db.insert(s.gradeLevels).values({ schoolId, name: 'Grade 7', sequence: 7 }).returning()
  const groups = await db.insert(s.classGroups).values([{ schoolId, academicYearId: yearId, gradeLevelId: grade!.id, name: 'Class A' }, { schoolId: foreignSchool, academicYearId: yearId, gradeLevelId: grade!.id, name: 'Foreign class' }]).returning()
  classId = groups[0]!.id; foreignClass = groups[1]!.id
  const [subject] = await db.insert(s.subjects).values({ schoolId, name: 'English', code: 'english' }).returning(); subjectId = subject!.id
  const [term] = await db.insert(s.terms).values({ schoolId, academicYearId: yearId, name: 'Term 1', sequence: 1, startsOn: '2026-01-01', endsOn: '2026-04-01', status: 'open' }).returning(); termId = term!.id
  const people = await db.insert(s.students).values([{ schoolId, studentNumber: 'W1', firstName: 'Linked', lastName: 'Student' }, { schoolId, studentNumber: 'W2', firstName: 'Private', lastName: 'Student' }]).returning()
  pupil = people[0]!.id
  const enrollments = await db.insert(s.enrollments).values(people.map((person) => ({ schoolId, studentId: person.id, classGroupId: classId, academicYearId: yearId, startsOn: '2026-01-01' }))).returning()
  enrollmentId = enrollments[0]!.id; otherEnrollment = enrollments[1]!.id
  for (const role of ['administrator', 'teacher', 'student', 'guardian', 'unlinked']) {
    const [user] = await db.insert(s.users).values({ email: `${role}-${suffix}@test.example`, displayName: role, passwordHash: hash }).returning(); userIds.push(user!.id)
    const [member] = await db.insert(s.memberships).values({ schoolId, userId: user!.id, role: role === 'unlinked' ? 'student' : role }).returning(); memberIds.push(member!.id)
    if (role === 'administrator') adminId = member!.id
    if (role === 'teacher') { teacherId = member!.id; await db.insert(s.teachingAssignments).values({ schoolId, membershipId: teacherId, classGroupId: classId, subjectId }) }
    if (role === 'student') studentMember = member!.id
    if (['student', 'guardian'].includes(role)) await db.insert(s.studentLinks).values({ schoolId, membershipId: member!.id, studentId: pupil })
  }
  app = await buildApp({ config: parseConfig({ NODE_ENV: 'test' }), database: db })
  for (const role of ['administrator', 'teacher', 'student', 'guardian', 'unlinked']) cookies[role] = await login(`${role}-${suffix}@test.example`)
})
afterAll(async () => {
  await app?.close()
  if (schoolId) {
    const schools = [schoolId, foreignSchool]
    for (const table of [s.importPreviews, s.publications, s.gradingPolicies, s.accountTokens, s.recoveryRequests, s.studentLinks, s.auditEvents, s.teachingAssignments, s.scores, s.assessments, s.enrollments]) await db.delete(table).where(inArray(table.schoolId, schools))
    const members = await db.select().from(s.memberships).where(eq(s.memberships.schoolId, schoolId))
    userIds.push(...members.map((m) => m.userId))
    if (members.length) await db.delete(s.sessions).where(inArray(s.sessions.membershipId, members.map((m) => m.id)))
    for (const table of [s.memberships, s.students, s.classGroups, s.terms, s.subjects, s.gradeLevels, s.academicYears]) await db.delete(table).where(inArray(table.schoolId, schools))
    await db.delete(s.schools).where(inArray(s.schools.id, schools))
    await db.delete(s.users).where(inArray(s.users.id, [...new Set(userIds)]))
  }
  await client.end()
})
describe('school workflow', () => {
  it('rejects unauthorized staff reads and cross-school assessment writes', async () => {
    for (const path of ['/workspace', '/students', '/dashboard-data', '/admin/accounts']) expect((await request('GET', path, 'student')).statusCode).toBe(403)
    expect((await request('POST', '/assessments', 'teacher', { classGroupId: foreignClass, subjectId, termId, title: 'Foreign', assessedOn: '2026-02-01', maximumScore: 100, weight: 1 })).statusCode).toBe(404)
    const created = await create()
    expect((await request('GET', `/assessments/${created.id}`, 'guardian')).statusCode).toBe(403)
    expect((await request('POST', `/assessments/${created.id}/scores`, 'student', { version: 1, rows: [score()] })).statusCode).toBe(403)
  })
  it('preserves zero and non-scored states and rejects stale, duplicate and invalid rows atomically', async () => {
    const a = await create()
    expect((await save(a.id, 1, 0)).statusCode).toBe(200)
    const response = await request('GET', `/assessments/${a.id}`)
    expect(response.json().data.rows[0]).toMatchObject({ points: 0, status: 'scored' })
    expect(response.json().data.rows[1]).toMatchObject({ points: null, status: 'missing' })
    expect((await save(a.id, 1)).statusCode).toBe(409)
    for (const rows of [[score(21)], [score(null)], [score(0, 'excused')], [score(), score()], [score(), { ...score(), enrollmentId: 999999 }]]) {
      expect((await request('POST', `/assessments/${a.id}/scores`, 'teacher', { version: 2, rows })).statusCode).toBe(400)
    }
    expect((await request('GET', `/assessments/${a.id}`)).json().data.assessment.version).toBe(2)
    expect((await request('POST', `/assessments/${a.id}/scores`, 'teacher', { version: 2, rows: [score(null, 'excused'), { ...score(null, 'incomplete'), enrollmentId: otherEnrollment }] })).statusCode).toBe(200)
  })
  it('serializes competing saves rather than silently overwriting', async () => {
    const a = await create()
    const outcomes = await Promise.all([save(a.id, 1, 5), save(a.id, 1, 15)])
    expect(outcomes.map((r) => r.statusCode).sort()).toEqual([200, 409])
  })
  it('validates import previews without writes, commits atomically and retries without duplicates', async () => {
    const a = await create()
    const invalid = await request('POST', `/assessments/${a.id}/import-preview`, 'teacher', { version: 1, rows: [score(21)] })
    expect(invalid.json().data).toMatchObject({ previewId: null, errors: [{ row: 2 }] })
    const preview = await request('POST', `/assessments/${a.id}/import-preview`, 'teacher', { version: 1, rows: [score(0)] })
    const previewId = preview.json().data.previewId
    expect((await request('GET', `/assessments/${a.id}`)).json().data.assessment.version).toBe(1)
    expect((await request('POST', `/imports/${previewId}/commit`)).json().data.alreadyCommitted).toBe(false)
    expect((await request('POST', `/imports/${previewId}/commit`)).json().data.alreadyCommitted).toBe(true)
    expect((await request('GET', `/assessments/${a.id}`)).json().data.assessment.version).toBe(2)
    const stale = await request('POST', `/assessments/${a.id}/import-preview`, 'teacher', { version: 2, rows: [score(10)] })
    await save(a.id, 2, 5)
    expect((await request('POST', `/imports/${stale.json().data.previewId}/commit`)).statusCode).toBe(409)
    const expired = await request('POST', `/assessments/${a.id}/import-preview`, 'teacher', { version: 3, rows: [score(10)] })
    await db.update(s.importPreviews).set({ expiresAt: new Date(0) }).where(eq(s.importPreviews.id, expired.json().data.previewId))
    expect((await request('POST', `/imports/${expired.json().data.previewId}/commit`)).json().error.code).toBe('PREVIEW_EXPIRED')
  })
  it('publishes immutable linked reports, retains policy versions and audits amendments', async () => {
    const a = await create('Published evidence')
    await save(a.id, 1, 10)
    expect((await request('GET', '/reports', 'student')).json().data[0].items).toHaveLength(0)
    expect((await publish(a.id, 2)).statusCode).toBe(200)
    const studentReport = (await request('GET', '/reports', 'student')).json().data
    expect(studentReport).toHaveLength(1)
    expect(studentReport[0].studentId).toBe(pupil)
    expect(studentReport[0].items[0]).toMatchObject({ points: 10, policy: { version: 1 } })
    expect(studentReport[0].totals[0]).toMatchObject({ average: 50, recordedCount: 1, passed: true })
    expect((await request('GET', '/reports', 'guardian')).json().data).toEqual(studentReport)
    expect((await request('GET', '/reports', 'unlinked')).json().data).toEqual([])
    expect((await save(a.id, 2, 15)).json().error.code).toBe('REASON_REQUIRED')
    expect((await save(a.id, 2, 15, 'Corrected marking')).statusCode).toBe(200)
    expect((await request('GET', '/reports', 'student')).json().data[0].items[0].points).toBe(10)
    expect((await request('POST', '/grading-policies', 'administrator', { passMark: 80, goodMark: 85, excellentMark: 95, minimumScores: 1 })).statusCode).toBe(200)
    expect((await publish(a.id, 3)).statusCode).toBe(200)
    const updated = (await request('GET', '/reports', 'student')).json().data[0]
    expect(updated.items[0]).toMatchObject({ points: 15, assessmentVersion: 3, policy: { version: 2 } })
    expect(updated.totals[0]).toMatchObject({ average: 75, passed: false, risk: 'At Risk' })
    const events = await db.select().from(s.auditEvents).where(and(eq(s.auditEvents.schoolId, schoolId), eq(s.auditEvents.targetId, String(a.id))))
    expect(events.some((e) => e.action.includes('Corrected marking'))).toBe(true)
  })
  it('prevents writes after assignment removal and while a term is locked', async () => {
    const a = await create()
    await db.update(s.terms).set({ status: 'locked' }).where(eq(s.terms.id, termId))
    expect((await save(a.id, 1)).json().error.code).toBe('TERM_LOCKED')
    await db.update(s.terms).set({ status: 'open' }).where(eq(s.terms.id, termId))
    await db.delete(s.teachingAssignments).where(eq(s.teachingAssignments.membershipId, teacherId))
    expect((await save(a.id, 1)).statusCode).toBe(403)
    await db.insert(s.teachingAssignments).values({ schoolId, membershipId: teacherId, classGroupId: classId, subjectId })
  })
  it('issues scoped single-use invitations and expires recovery tokens without disclosing unknown accounts', async () => {
    const inviteEmail = `invited-${suffix}@test.example`
    const body = { email: inviteEmail, displayName: 'Invited learner', role: 'student', studentIds: [pupil], password }
    expect((await request('POST', '/admin/invitations', 'teacher', body)).statusCode).toBe(403)
    expect((await request('POST', '/admin/invitations', 'administrator', { ...body, studentIds: [999999] })).statusCode).toBe(400)
    const invited = await request('POST', '/admin/invitations', 'administrator', body)
    expect(invited.statusCode, invited.body).toBe(200)
    const token = invited.json().data.token
    const [stored] = await db.select().from(s.accountTokens).where(eq(s.accountTokens.tokenHash, hashToken(token)))
    expect(stored!.tokenHash).not.toBe(token)
    expect((await request('POST', '/auth/redeem', 'unlinked', { token, password })).statusCode).toBe(200)
    expect((await request('POST', '/auth/redeem', 'unlinked', { token, password })).statusCode).toBe(400)
    cookies.invited = await login(inviteEmail)
    expect((await request('GET', '/reports', 'invited')).json().data.map((r: { studentId: number }) => r.studentId)).toEqual([pupil])
    const unknown = await request('POST', '/auth/recovery-request', 'unlinked', { email: 'unknown@test.example', schoolSlug: `workflow-${suffix}` })
    const known = await request('POST', '/auth/recovery-request', 'unlinked', { email: `student-${suffix}@test.example`, schoolSlug: `workflow-${suffix}` })
    expect(unknown.json()).toEqual(known.json())
    const issued = await request('POST', `/admin/accounts/${studentMember}/recovery`, 'administrator', { password })
    const recovery = issued.json().data.token
    const newPassword = 'New-synthetic-password-2026'
    expect((await request('POST', '/auth/redeem', 'unlinked', { token: recovery, password: newPassword })).statusCode).toBe(200)
    expect((await request('GET', '/reports', 'student')).statusCode).toBe(401)
    cookies.student = await login(`student-${suffix}@test.example`, newPassword)
    const expired = await request('POST', `/admin/accounts/${studentMember}/recovery`, 'administrator', { password })
    await db.update(s.accountTokens).set({ expiresAt: new Date(0) }).where(eq(s.accountTokens.tokenHash, hashToken(expired.json().data.token)))
    expect((await request('POST', '/auth/redeem', 'unlinked', { token: expired.json().data.token, password })).statusCode).toBe(400)
    expect((await request('POST', `/admin/accounts/${adminId}/deactivate`, 'administrator')).statusCode).toBe(400)
    expect((await request('POST', `/admin/accounts/${studentMember}/deactivate`, 'administrator')).statusCode).toBe(200)
    expect((await request('GET', '/reports', 'student')).statusCode).toBe(401)
  })
  it('isolates authenticated request budgets behind a shared proxy and returns stable rate-limit errors', async () => {
    const results = []
    for (let i = 0; i < 121; i++) results.push(await request('GET', '/auth/session', 'teacher'))
    const limited = results.find((r) => r.statusCode === 429)
    expect(limited?.json().error.code).toBe('RATE_LIMITED')
    expect((await request('GET', '/auth/session', 'guardian')).statusCode).toBe(200)
  })
})
