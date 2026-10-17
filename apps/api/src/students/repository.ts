import { and, asc, eq, exists, gt, sql } from 'drizzle-orm'
import type { Database } from '../database/client.js'
import type { Principal } from '../auth/access.js'
import { academicYears, assessments, classGroups, enrollments, gradeLevels, scores, students, subjects, teachingAssignments, terms } from '../database/schema.js'
import type { DashboardDataResponse, StudentListQuery, StudentListResponse } from './contracts.js'

export async function listStudents(database: Database, query: StudentListQuery, principal: Principal): Promise<StudentListResponse> {
  const assignedRoster = principal.role === 'teacher' ? exists(database.select({ id: enrollments.id }).from(enrollments)
    .innerJoin(teachingAssignments, and(eq(teachingAssignments.classGroupId, enrollments.classGroupId), eq(teachingAssignments.schoolId, principal.schoolId), eq(teachingAssignments.membershipId, principal.membershipId)))
    .where(and(eq(enrollments.studentId, students.id), eq(enrollments.schoolId, principal.schoolId), eq(enrollments.status, 'active')))) : undefined
  const rows = await database.select({ id: students.id, studentNumber: students.studentNumber, firstName: students.firstName,
    lastName: students.lastName, preferredName: students.preferredName, gender: students.gender, status: students.status,
  }).from(students).where(and(eq(students.schoolId, principal.schoolId), query.after ? gt(students.id, query.after) : undefined, assignedRoster))
    .orderBy(asc(students.id)).limit(query.limit + 1)
  const hasNextPage = rows.length > query.limit
  const data = hasNextPage ? rows.slice(0, query.limit) : rows
  return { data: data.map((student) => ({ ...student, status: student.status as StudentListResponse['data'][number]['status'] })),
    page: { limit: query.limit, nextCursor: hasNextPage ? data.at(-1)!.id : null } }
}

export async function getDashboardData(database: Database, principal: Principal): Promise<DashboardDataResponse> {
  const assignedSubject = principal.role === 'teacher' ? exists(database.select({ id: teachingAssignments.id }).from(teachingAssignments).where(and(
    eq(teachingAssignments.schoolId, principal.schoolId), eq(teachingAssignments.membershipId, principal.membershipId),
    eq(teachingAssignments.classGroupId, assessments.classGroupId), eq(teachingAssignments.subjectId, assessments.subjectId),
  ))) : undefined
  const rows = await database.select({ studentId: students.id, firstName: students.firstName, lastName: students.lastName,
    gender: students.gender, grade: gradeLevels.name, gradeSequence: gradeLevels.sequence,
    termId: terms.id, term: terms.name, termSequence: terms.sequence, year: academicYears.name, yearStarts: academicYears.startsOn,
    subjectCode: subjects.code, points: scores.points, scoreStatus: scores.status, maximumScore: assessments.maximumScore, weight: assessments.weight,
  }).from(assessments)
    .innerJoin(enrollments, and(eq(enrollments.classGroupId, assessments.classGroupId), eq(enrollments.schoolId, principal.schoolId), eq(enrollments.status, 'active')))
    .innerJoin(students, and(eq(students.id, enrollments.studentId), eq(students.schoolId, principal.schoolId)))
    .innerJoin(classGroups, and(eq(classGroups.id, assessments.classGroupId), eq(classGroups.schoolId, principal.schoolId), eq(classGroups.status, 'active')))
    .innerJoin(gradeLevels, and(eq(gradeLevels.id, classGroups.gradeLevelId), eq(gradeLevels.schoolId, principal.schoolId)))
    .innerJoin(terms, and(eq(terms.id, assessments.termId), eq(terms.schoolId, principal.schoolId), eq(terms.academicYearId, enrollments.academicYearId)))
    .innerJoin(academicYears, and(eq(academicYears.id, terms.academicYearId), eq(academicYears.schoolId, principal.schoolId)))
    .innerJoin(subjects, and(eq(subjects.id, assessments.subjectId), eq(subjects.schoolId, principal.schoolId)))
    .leftJoin(scores, and(eq(scores.assessmentId, assessments.id), eq(scores.enrollmentId, enrollments.id), eq(scores.schoolId, principal.schoolId)))
    .where(and(eq(assessments.schoolId, principal.schoolId), sql`${assessments.status} <> 'archived'`, assignedSubject))
    .orderBy(asc(academicYears.startsOn), asc(terms.sequence), asc(gradeLevels.sequence), asc(students.id), asc(subjects.code), asc(assessments.id))
  const grades = new Map<string, number>()
  const subjectCodes = new Set<string>()
  const termLabels = new Set<string>()
  const records = new Map<string, DashboardDataResponse['data']['students'][number]>()
  const totals = new Map<string, { recordId: string; subject: string; weighted: number; weights: number }>()
  for (const row of rows) {
    grades.set(row.grade, row.gradeSequence)
    subjectCodes.add(row.subjectCode)
    const termLabel = `${row.year} / ${row.term}`
    termLabels.add(termLabel)
    const recordId = `${row.studentId}:${row.termId}`
    if (!records.has(recordId)) records.set(recordId, { id: recordId, studentId: row.studentId, name: `${row.firstName} ${row.lastName}`, gender: row.gender, grade: row.grade, term: termLabel, termId: row.termId, scores: {} })
    const record = records.get(recordId)!
    record.scores[row.subjectCode] ??= null
    if (row.scoreStatus !== 'scored' || row.points === null) continue
    const points = Number(row.points), maximum = Number(row.maximumScore), weight = Number(row.weight)
    if (points > maximum) throw new Error('Invalid persisted score range')
    if (weight === 0) continue
    const key = JSON.stringify([recordId, row.subjectCode])
    const total = totals.get(key) ?? { recordId, subject: row.subjectCode, weighted: 0, weights: 0 }
    total.weighted += points / maximum * 100 * weight
    total.weights += weight
    totals.set(key, total)
  }
  for (const total of totals.values()) records.get(total.recordId)!.scores[total.subject] = total.weighted / total.weights
  return { data: { grades: [...grades.entries()].sort((a, b) => a[1] - b[1]).map(([name]) => name), students: [...records.values()], subjects: [...subjectCodes], terms: [...termLabels] } }
}
