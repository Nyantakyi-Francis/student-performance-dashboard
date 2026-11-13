import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import type { Database } from '../database/client.js'
import type { Principal } from '../auth/access.js'
import { fail, requireSession } from '../auth/access.js'
import { assessments, auditEvents, classGroups, enrollments, gradingPolicies, importPreviews, memberships, publications, scores, studentLinks, students, subjects, teachingAssignments, terms } from '../database/schema.js'
import { calculateResult, defaultPolicy, id, policyInput, saveInput, validateRows, type Policy, type ScoreInput } from './domain.js'

type Tx = Parameters<Parameters<Database['transaction']>[0]>[0]
type Db = Database | Tx
class WorkflowError extends Error {
  constructor(public statusCode: number, public code: string, message: string) { super(message) }
}
const stop = (status: number, code: string, message: string): never => { throw new WorkflowError(status, code, message) }
const numericId = (params: unknown) => z.object({ id: z.coerce.number().int().positive().safe() }).parse(params).id
function staff(p: Principal) { if (!['administrator', 'teacher'].includes(p.role)) stop(403, 'FORBIDDEN', 'Staff access is required.') }
async function scope(db: Db, p: Principal, classId: number, subjectId: number, termId: number, write = false) {
  staff(p)
  // Locks serialize writes with deactivation and assignment removal.
  const memberQuery = db.select().from(memberships).where(and(eq(memberships.id, p.membershipId), eq(memberships.schoolId, p.schoolId), eq(memberships.status, 'active')))
  const [member] = await (write ? memberQuery.for('update') : memberQuery)
  if (!member) stop(401, 'UNAUTHENTICATED', 'Your membership is inactive.')
  const [group] = await db.select().from(classGroups).where(and(eq(classGroups.id, classId), eq(classGroups.schoolId, p.schoolId), eq(classGroups.status, 'active')))
  const termQuery = db.select().from(terms).where(and(eq(terms.id, termId), eq(terms.schoolId, p.schoolId)))
  const [term] = await (write ? termQuery.for('update') : termQuery)
  const [subject] = await db.select().from(subjects).where(and(eq(subjects.id, subjectId), eq(subjects.schoolId, p.schoolId), eq(subjects.status, 'active')))
  if (!group || !term || !subject || group.academicYearId !== term.academicYearId) return stop(404, 'NOT_FOUND', 'Class, subject or term is unavailable.')
  if (write && ['locked', 'archived'].includes(term.status)) stop(409, 'TERM_LOCKED', 'This reporting period is locked.')
  if (p.role === 'teacher') {
    const assignmentQuery = db.select().from(teachingAssignments).where(and(eq(teachingAssignments.schoolId, p.schoolId), eq(teachingAssignments.membershipId, p.membershipId), eq(teachingAssignments.classGroupId, classId), eq(teachingAssignments.subjectId, subjectId)))
    const [assignment] = await (write ? assignmentQuery.for('update') : assignmentQuery)
    if (!assignment) stop(403, 'FORBIDDEN', 'You are not assigned to this class and subject.')
  }
  return { group: group!, term: term! }
}
async function assessment(db: Db, p: Principal, assessmentId: number, write = false) {
  staff(p)
  // Lock the membership first for consistent lock ordering.
  if (write) await db.select().from(memberships).where(eq(memberships.id, p.membershipId)).for('update')
  const query = db.select().from(assessments).where(and(eq(assessments.id, assessmentId), eq(assessments.schoolId, p.schoolId)))
  const [row] = await (write ? query.for('update') : query)
  if (!row || row.status === 'archived') return stop(404, 'NOT_FOUND', 'Assessment not found.')
  const scoped = await scope(db, p, row.classGroupId, row.subjectId, row.termId, write)
  return { ...row, academicYearId: scoped.term.academicYearId }
}
async function roster(db: Db, p: Principal, row: { classGroupId: number; academicYearId: number }) {
  return db.select({ enrollmentId: enrollments.id, studentId: students.id, studentNumber: students.studentNumber, name: sql<string>`${students.firstName} || ' ' || ${students.lastName}` }).from(enrollments)
    .innerJoin(students, and(eq(students.id, enrollments.studentId), eq(students.schoolId, p.schoolId)))
    .where(and(eq(enrollments.schoolId, p.schoolId), eq(enrollments.classGroupId, row.classGroupId), eq(enrollments.academicYearId, row.academicYearId), eq(enrollments.status, 'active'), eq(students.status, 'active'))).orderBy(asc(students.studentNumber))
}
async function currentPolicy(db: Db, schoolId: number) {
  const [row] = await db.select().from(gradingPolicies).where(eq(gradingPolicies.schoolId, schoolId)).orderBy(desc(gradingPolicies.version)).limit(1)
  return row ? { id: row.id, version: row.version, ...policyInput.parse({ passMark: Number(row.passMark), goodMark: Number(row.goodMark), excellentMark: Number(row.excellentMark), minimumScores: row.minimumScores }) } : { id: null, version: 0, ...defaultPolicy }
}
async function audit(db: Db, p: Principal, action: string, targetId: number) {
  await db.insert(auditEvents).values({ schoolId: p.schoolId, actorMembershipId: p.membershipId, action, targetId: String(targetId) })
}
async function save(db: Tx, p: Principal, row: Awaited<ReturnType<typeof assessment>>, input: z.infer<typeof saveInput>) {
  if (row.version !== input.version) stop(409, 'VERSION_CONFLICT', 'Newer changes exist. Reload before saving.')
  if (row.publishedAt && !input.reason) stop(400, 'REASON_REQUIRED', 'Explain the amendment to previously published results.')
  const people = await roster(db, p, row)
  const errors = validateRows(input.rows, new Set(people.map((s) => s.enrollmentId)), Number(row.maximumScore))
  if (errors.length) stop(400, 'INVALID_SCORES', errors.map((e) => `Row ${e.row}: ${e.message}`).join(' '))
  for (const score of input.rows) await db.insert(scores).values({ schoolId: p.schoolId, assessmentId: row.id, enrollmentId: score.enrollmentId, status: score.status, points: score.points === null ? null : String(score.points), feedback: score.feedback })
    .onConflictDoUpdate({ target: [scores.assessmentId, scores.enrollmentId], set: { status: score.status, points: score.points === null ? null : String(score.points), feedback: score.feedback, version: sql`${scores.version} + 1`, updatedAt: new Date() } })
  await db.update(assessments).set({ version: row.version + 1, status: 'draft', updatedAt: new Date() }).where(eq(assessments.id, row.id))
  await audit(db, p, input.reason ? `scores.amended: ${input.reason}` : 'scores.saved', row.id)
  return { version: row.version + 1 }
}
type Snapshot = { title: string; term: string; termId: number; subject: string; subjectId: number; maximumScore: number; weight: number; policy: Policy & { id: number; version: number }; rows: { studentId: number; status: string; points: number | null; feedback: string }[] }

export async function registerWorkflowRoutes(app: FastifyInstance, database: Database) {
  await app.register(async (api) => {
    api.addHook('preHandler', async (req, reply) => requireSession(req, reply))
    api.setErrorHandler(async (error, req, reply) => {
      if (error instanceof WorkflowError) return fail(reply, req, error.statusCode, error.code, error.message)
      if (error instanceof z.ZodError) return fail(reply, req, 400, 'VALIDATION_ERROR', error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '))
      if (typeof error === 'object' && error && 'cause' in error && (error.cause as { code?: string })?.code === '23505') return fail(reply, req, 409, 'DUPLICATE', 'A record with those details already exists.')
      throw error
    })
    api.get('/api/v1/workspace', async (req) => {
      const p = req.principal!; staff(p)
      const [groups, schoolSubjects, periods, assignments, allAssessments, policy] = await Promise.all([
        database.select().from(classGroups).where(and(eq(classGroups.schoolId, p.schoolId), eq(classGroups.status, 'active'))),
        database.select().from(subjects).where(and(eq(subjects.schoolId, p.schoolId), eq(subjects.status, 'active'))),
        database.select().from(terms).where(eq(terms.schoolId, p.schoolId)).orderBy(asc(terms.startsOn)),
        database.select().from(teachingAssignments).where(and(eq(teachingAssignments.schoolId, p.schoolId), eq(teachingAssignments.membershipId, p.membershipId))),
        database.select().from(assessments).where(eq(assessments.schoolId, p.schoolId)).orderBy(desc(assessments.id)), currentPolicy(database, p.schoolId),
      ])
      const permitted = (classId: number, subjectId: number) => p.role === 'administrator' || assignments.some((a) => a.classGroupId === classId && a.subjectId === subjectId)
      return { data: { classes: groups.filter((g) => p.role === 'administrator' || assignments.some((a) => a.classGroupId === g.id)), subjects: schoolSubjects.filter((s) => p.role === 'administrator' || assignments.some((a) => a.subjectId === s.id)), terms: periods, assignments, assessments: allAssessments.filter((a) => a.status !== 'archived' && permitted(a.classGroupId, a.subjectId)), policy } }
    })
    api.post('/api/v1/assessments', async (req) => {
      const p = req.principal!
      const input = z.object({ classGroupId: id, subjectId: id, termId: id, title: z.string().trim().min(1).max(120), assessedOn: z.iso.date(), maximumScore: z.number().positive().max(99999.99), weight: z.number().min(0).max(999.9999) }).strict().parse(req.body)
      const data = await database.transaction(async (tx) => {
        const { term } = await scope(tx, p, input.classGroupId, input.subjectId, input.termId, true)
        if (input.assessedOn < term.startsOn || input.assessedOn > term.endsOn) stop(400, 'INVALID_DATE', 'Assessment date must be within its term.')
        const [row] = await tx.insert(assessments).values({ ...input, schoolId: p.schoolId, maximumScore: String(input.maximumScore), weight: String(input.weight) }).returning()
        await audit(tx, p, 'assessment.created', row!.id)
        return row!
      })
      return { data }
    })
    api.get('/api/v1/assessments/:id', async (req) => {
      const p = req.principal!, row = await assessment(database, p, numericId(req.params))
      const [people, saved] = await Promise.all([roster(database, p, row), database.select().from(scores).where(and(eq(scores.schoolId, p.schoolId), eq(scores.assessmentId, row.id)))])
      return { data: { assessment: row, rows: people.map((person) => { const score = saved.find((s) => s.enrollmentId === person.enrollmentId); return { ...person, status: score?.status ?? 'missing', points: score?.points === undefined || score.points === null ? null : Number(score.points), feedback: score?.feedback ?? '' } }) } }
    })
    api.post('/api/v1/assessments/:id/scores', { bodyLimit: 512 * 1024 }, async (req) => {
      const p = req.principal!, input = saveInput.parse(req.body)
      return { data: await database.transaction(async (tx) => save(tx, p, await assessment(tx, p, numericId(req.params), true), input)) }
    })
    api.post('/api/v1/grading-policies', async (req) => {
      const p = req.principal!; if (p.role !== 'administrator') stop(403, 'FORBIDDEN', 'Administrator access is required.')
      const input = policyInput.parse(req.body)
      return { data: await database.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(${p.schoolId})`)
        const previous = await currentPolicy(tx, p.schoolId)
        const [row] = await tx.insert(gradingPolicies).values({ ...input, schoolId: p.schoolId, version: previous.version + 1, passMark: String(input.passMark), goodMark: String(input.goodMark), excellentMark: String(input.excellentMark) }).returning()
        await audit(tx, p, 'grading_policy.created', row!.id)
        return row
      }) }
    })
    api.post('/api/v1/assessments/:id/publish', async (req) => {
      const p = req.principal!, input = z.object({ version: id, policyVersion: z.number().int().min(0), reason: z.string().trim().min(1).max(500) }).strict().parse(req.body)
      return { data: await database.transaction(async (tx) => {
        const row = await assessment(tx, p, numericId(req.params), true)
        if (row.version !== input.version || row.status === 'published') stop(409, 'VERSION_CONFLICT', 'Reload the latest draft before publishing.')
        await tx.execute(sql`select pg_advisory_xact_lock(${p.schoolId})`)
        let policy = await currentPolicy(tx, p.schoolId)
        if (policy.version !== input.policyVersion) stop(409, 'POLICY_CHANGED', 'The grading policy changed. Reload and review before publishing.')
        if (!policy.id) {
          await tx.execute(sql`select pg_advisory_xact_lock(${p.schoolId})`)
          policy = await currentPolicy(tx, p.schoolId)
          if (!policy.id) {
            const [created] = await tx.insert(gradingPolicies).values({ schoolId: p.schoolId, version: 1, passMark: '50', goodMark: '60', excellentMark: '80', minimumScores: 1 }).returning()
            policy = { ...defaultPolicy, id: created!.id, version: 1 }
          } else if (policy.version !== input.policyVersion) stop(409, 'POLICY_CHANGED', 'The grading policy changed. Reload before publishing.')
        }
        const people = await roster(tx, p, row)
        const saved = await tx.select().from(scores).where(and(eq(scores.schoolId, p.schoolId), eq(scores.assessmentId, row.id)))
        if (!people.length || !saved.some((s) => s.status === 'scored')) stop(400, 'NO_SCORES', 'Record at least one score before publication.')
        const [term] = await tx.select().from(terms).where(eq(terms.id, row.termId))
        const [subject] = await tx.select().from(subjects).where(eq(subjects.id, row.subjectId))
        const snapshot: Snapshot = { title: row.title, term: term!.name, termId: row.termId, subject: subject!.name, subjectId: row.subjectId, maximumScore: Number(row.maximumScore), weight: Number(row.weight), policy: { ...policy, id: policy.id! }, rows: people.map((person) => { const s = saved.find((v) => v.enrollmentId === person.enrollmentId); return { studentId: person.studentId, points: s?.points == null ? null : Number(s.points), status: s?.status ?? 'missing', feedback: s?.feedback ?? '' } }) }
        const [publication] = await tx.insert(publications).values({ schoolId: p.schoolId, assessmentId: row.id, assessmentVersion: row.version, policyId: policy.id!, snapshot, reason: input.reason }).returning({ id: publications.id })
        await tx.update(assessments).set({ status: 'published', publishedAt: new Date(), updatedAt: new Date() }).where(eq(assessments.id, row.id))
        await audit(tx, p, `assessment.published: ${input.reason}`, row.id)
        return publication
      }) }
    })
    api.post('/api/v1/assessments/:id/import-preview', { bodyLimit: 512 * 1024 }, async (req) => {
      const p = req.principal!, input = saveInput.parse(req.body), row = await assessment(database, p, numericId(req.params))
      if (row.version !== input.version) stop(409, 'VERSION_CONFLICT', 'Reload before importing.')
      const people = await roster(database, p, row)
      const errors = validateRows(input.rows, new Set(people.map((s) => s.enrollmentId)), Number(row.maximumScore))
      if (errors.length) return { data: { previewId: null, errors, count: input.rows.length } }
      const [preview] = await database.insert(importPreviews).values({ schoolId: p.schoolId, membershipId: p.membershipId, assessmentId: row.id, assessmentVersion: row.version, rows: { rows: input.rows, reason: input.reason }, expiresAt: new Date(Date.now() + 15 * 60_000) }).returning({ id: importPreviews.id })
      return { data: { previewId: preview!.id, errors: [], count: input.rows.length } }
    })
    api.post('/api/v1/imports/:id/commit', async (req) => {
      const p = req.principal!; staff(p)
      return { data: await database.transaction(async (tx) => {
        const [preview] = await tx.select().from(importPreviews).where(and(eq(importPreviews.id, numericId(req.params)), eq(importPreviews.schoolId, p.schoolId), eq(importPreviews.membershipId, p.membershipId))).for('update')
        if (!preview) return stop(404, 'NOT_FOUND', 'Import preview not found.')
        const row = await assessment(tx, p, preview.assessmentId, true)
        if (preview.committedAt) return { committed: true, alreadyCommitted: true }
        if (preview.expiresAt.getTime() < Date.now()) stop(409, 'PREVIEW_EXPIRED', 'Preview expired. Validate the file again.')
        const input = preview.rows as { rows: ScoreInput[]; reason: string }
        await save(tx, p, row, { ...input, version: preview.assessmentVersion })
        await tx.update(importPreviews).set({ committedAt: new Date() }).where(eq(importPreviews.id, preview.id))
        await audit(tx, p, 'import.committed', preview.id)
        return { committed: true, alreadyCommitted: false }
      }) }
    })
    api.get('/api/v1/reports', async (req) => {
      const p = req.principal!
      let allowed: number[]
      if (p.role === 'administrator') allowed = (await database.select({ id: students.id }).from(students).where(eq(students.schoolId, p.schoolId))).map((s) => s.id)
      else if (p.role === 'teacher') {
        const assigned = await database.select().from(teachingAssignments).where(and(eq(teachingAssignments.schoolId, p.schoolId), eq(teachingAssignments.membershipId, p.membershipId)))
        allowed = (await database.select({ id: enrollments.studentId }).from(enrollments).where(and(eq(enrollments.schoolId, p.schoolId), inArray(enrollments.classGroupId, assigned.map((a) => a.classGroupId)), eq(enrollments.status, 'active')))).map((s) => s.id)
      } else allowed = (await database.select().from(studentLinks).where(and(eq(studentLinks.schoolId, p.schoolId), eq(studentLinks.membershipId, p.membershipId)))).map((s) => s.studentId)
      if (!allowed.length) return { data: [] }
      const [people, snapshots, assignments] = await Promise.all([
        database.select().from(students).where(and(eq(students.schoolId, p.schoolId), inArray(students.id, allowed))),
        database.select({ publication: publications, classGroupId: assessments.classGroupId, subjectId: assessments.subjectId }).from(publications).innerJoin(assessments, and(eq(assessments.id, publications.assessmentId), eq(assessments.schoolId, p.schoolId))).where(eq(publications.schoolId, p.schoolId)).orderBy(desc(publications.id)),
        p.role === 'teacher' ? database.select().from(teachingAssignments).where(and(eq(teachingAssignments.schoolId, p.schoolId), eq(teachingAssignments.membershipId, p.membershipId))) : Promise.resolve([]),
      ])
      const latest = new Map<number, typeof snapshots[number]>()
      for (const item of snapshots) if (!latest.has(item.publication.assessmentId)) latest.set(item.publication.assessmentId, item)
      return { data: people.map((person) => {
        const items = [...latest.values()].filter((item) => p.role !== 'teacher' || assignments.some((a) => a.classGroupId === item.classGroupId && a.subjectId === item.subjectId)).flatMap(({ publication }) => {
          const s = publication.snapshot as Snapshot, result = s.rows.find((r) => r.studentId === person.id)
          return result ? [{ ...result, title: s.title, term: s.term, termId: s.termId, subject: s.subject, subjectId: s.subjectId, maximumScore: s.maximumScore, weight: s.weight, policy: s.policy, assessmentVersion: publication.assessmentVersion, publishedAt: publication.createdAt }] : []
        })
        const groups = new Map<string, typeof items>()
        for (const item of items) { const key = `${item.termId}:${item.subjectId}:${item.policy.id}`; groups.set(key, [...(groups.get(key) ?? []), item]) }
        return { studentId: person.id, name: `${person.firstName} ${person.lastName}`, studentNumber: person.studentNumber, items, totals: [...groups.values()].map((group) => ({ term: group[0]!.term, subject: group[0]!.subject, policyVersion: group[0]!.policy.version, ...calculateResult(group, group[0]!.policy) })) }
      }) }
    })
  })
}
