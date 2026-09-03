import { and, asc, eq, gt } from 'drizzle-orm'
import type { Database } from '../database/client.js'
import {
  assessments,
  classGroups,
  enrollments,
  gradeLevels,
  scores,
  schools,
  students,
  subjects,
  terms,
} from '../database/schema.js'
import type {
  DashboardDataQuery,
  DashboardDataResponse,
  StudentListQuery,
  StudentListResponse,
} from './contracts.js'

export async function listStudents(
  database: Database,
  query: StudentListQuery
): Promise<StudentListResponse> {
  const cursorCondition = query.after ? gt(students.id, query.after) : undefined

  const rows = await database
    .select({
      id: students.id,
      studentNumber: students.studentNumber,
      firstName: students.firstName,
      lastName: students.lastName,
      preferredName: students.preferredName,
      gender: students.gender,
      status: students.status,
    })
    .from(students)
    .where(and(eq(students.schoolId, query.schoolId), cursorCondition))
    .orderBy(asc(students.id))
    .limit(query.limit + 1)

  const hasNextPage = rows.length > query.limit
  const data = hasNextPage ? rows.slice(0, query.limit) : rows
  const lastStudent = data.at(-1)

  return {
    data: data.map((student) => ({
      ...student,
      status: student.status as StudentListResponse['data'][number]['status'],
    })),
    page: {
      limit: query.limit,
      nextCursor: hasNextPage && lastStudent ? lastStudent.id : null,
    },
  }
}

export async function getDashboardData(
  database: Database,
  query: DashboardDataQuery
): Promise<DashboardDataResponse> {
  const schoolCondition = query.schoolId
    ? eq(scores.schoolId, query.schoolId)
    : eq(schools.slug, query.schoolSlug)

  const rows = await database
    .select({
      studentId: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
      gender: students.gender,
      grade: gradeLevels.name,
      gradeSequence: gradeLevels.sequence,
      term: terms.name,
      termSequence: terms.sequence,
      subjectCode: subjects.code,
      subjectName: subjects.name,
      points: scores.points,
    })
    .from(scores)
    .innerJoin(schools, eq(scores.schoolId, schools.id))
    .innerJoin(assessments, eq(scores.assessmentId, assessments.id))
    .innerJoin(enrollments, eq(scores.enrollmentId, enrollments.id))
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(classGroups, eq(enrollments.classGroupId, classGroups.id))
    .innerJoin(gradeLevels, eq(classGroups.gradeLevelId, gradeLevels.id))
    .innerJoin(terms, eq(assessments.termId, terms.id))
    .innerJoin(subjects, eq(assessments.subjectId, subjects.id))
    .where(and(schoolCondition, eq(scores.status, 'scored')))
    .orderBy(
      asc(gradeLevels.sequence),
      asc(students.lastName),
      asc(students.firstName),
      asc(terms.sequence),
      asc(subjects.name)
    )

  const gradeOptions = new Map<string, number>()
  const subjectOptions = new Map<string, string>()
  const termOptions = new Map<string, number>()
  const records = new Map<
    string,
    DashboardDataResponse['data']['students'][number]
  >()

  for (const row of rows) {
    gradeOptions.set(row.grade, row.gradeSequence)
    subjectOptions.set(row.subjectCode, row.subjectName)
    termOptions.set(row.term, row.termSequence)

    const recordId = `${row.studentId}:${row.term}`
    const existingRecord = records.get(recordId)

    if (existingRecord) {
      existingRecord.scores[row.subjectCode] = Number(row.points)
      continue
    }

    records.set(recordId, {
      id: recordId,
      studentId: row.studentId,
      name: `${row.firstName} ${row.lastName}`,
      gender: row.gender,
      grade: row.grade,
      term: row.term,
      scores: {
        [row.subjectCode]: Number(row.points),
      },
    })
  }

  return {
    data: {
      grades: [...gradeOptions.entries()]
        .sort(([, leftSequence], [, rightSequence]) => leftSequence - rightSequence)
        .map(([grade]) => grade),
      students: [...records.values()],
      subjects: [...subjectOptions.keys()],
      terms: [...termOptions.entries()]
        .sort(([, leftSequence], [, rightSequence]) => leftSequence - rightSequence)
        .map(([term]) => term),
    },
  }
}
