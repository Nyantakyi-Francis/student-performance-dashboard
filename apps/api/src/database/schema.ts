import {
  bigint,
  check,
  date,
  index,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

const identityId = bigint({ mode: 'number' })
  .primaryKey()
  .generatedAlwaysAsIdentity()

const createdAt = timestamp('created_at', { withTimezone: true })
  .notNull()
  .defaultNow()

const updatedAt = timestamp('updated_at', { withTimezone: true })
  .notNull()
  .defaultNow()

export const schools = pgTable(
  'schools',
  {
    id: identityId,
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    timeZone: text('time_zone').notNull().default('UTC'),
    status: text('status').notNull().default('active'),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('schools_slug_uidx').on(table.slug),
    check('schools_status_check', sql`${table.status} in ('active', 'inactive')`),
  ]
)

export const academicYears = pgTable(
  'academic_years',
  {
    id: identityId,
    schoolId: bigint('school_id', { mode: 'number' })
      .notNull()
      .references(() => schools.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    startsOn: date('starts_on').notNull(),
    endsOn: date('ends_on').notNull(),
    status: text('status').notNull().default('planned'),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('academic_years_school_name_uidx').on(table.schoolId, table.name),
    index('academic_years_school_id_idx').on(table.schoolId),
    check('academic_years_date_order_check', sql`${table.endsOn} >= ${table.startsOn}`),
    check(
      'academic_years_status_check',
      sql`${table.status} in ('planned', 'active', 'archived')`
    ),
  ]
)

export const terms = pgTable(
  'terms',
  {
    id: identityId,
    schoolId: bigint('school_id', { mode: 'number' })
      .notNull()
      .references(() => schools.id, { onDelete: 'restrict' }),
    academicYearId: bigint('academic_year_id', { mode: 'number' })
      .notNull()
      .references(() => academicYears.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    sequence: smallint('sequence').notNull(),
    startsOn: date('starts_on').notNull(),
    endsOn: date('ends_on').notNull(),
    status: text('status').notNull().default('planned'),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('terms_year_sequence_uidx').on(table.academicYearId, table.sequence),
    uniqueIndex('terms_year_name_uidx').on(table.academicYearId, table.name),
    index('terms_school_id_idx').on(table.schoolId),
    index('terms_academic_year_id_idx').on(table.academicYearId),
    check('terms_sequence_check', sql`${table.sequence} > 0`),
    check('terms_date_order_check', sql`${table.endsOn} >= ${table.startsOn}`),
    check(
      'terms_status_check',
      sql`${table.status} in ('planned', 'open', 'locked', 'archived')`
    ),
  ]
)

export const gradeLevels = pgTable(
  'grade_levels',
  {
    id: identityId,
    schoolId: bigint('school_id', { mode: 'number' })
      .notNull()
      .references(() => schools.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    sequence: smallint('sequence').notNull(),
    status: text('status').notNull().default('active'),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('grade_levels_school_name_uidx').on(table.schoolId, table.name),
    uniqueIndex('grade_levels_school_sequence_uidx').on(
      table.schoolId,
      table.sequence
    ),
    index('grade_levels_school_id_idx').on(table.schoolId),
    check('grade_levels_sequence_check', sql`${table.sequence} > 0`),
    check(
      'grade_levels_status_check',
      sql`${table.status} in ('active', 'inactive')`
    ),
  ]
)

export const classGroups = pgTable(
  'class_groups',
  {
    id: identityId,
    schoolId: bigint('school_id', { mode: 'number' })
      .notNull()
      .references(() => schools.id, { onDelete: 'restrict' }),
    academicYearId: bigint('academic_year_id', { mode: 'number' })
      .notNull()
      .references(() => academicYears.id, { onDelete: 'restrict' }),
    gradeLevelId: bigint('grade_level_id', { mode: 'number' })
      .notNull()
      .references(() => gradeLevels.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    status: text('status').notNull().default('active'),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('class_groups_year_name_uidx').on(table.academicYearId, table.name),
    index('class_groups_school_id_idx').on(table.schoolId),
    index('class_groups_academic_year_id_idx').on(table.academicYearId),
    index('class_groups_grade_level_id_idx').on(table.gradeLevelId),
    check(
      'class_groups_status_check',
      sql`${table.status} in ('active', 'inactive', 'archived')`
    ),
  ]
)

export const subjects = pgTable(
  'subjects',
  {
    id: identityId,
    schoolId: bigint('school_id', { mode: 'number' })
      .notNull()
      .references(() => schools.id, { onDelete: 'restrict' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    status: text('status').notNull().default('active'),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('subjects_school_code_uidx').on(table.schoolId, table.code),
    index('subjects_school_id_idx').on(table.schoolId),
    check('subjects_status_check', sql`${table.status} in ('active', 'inactive')`),
  ]
)

export const students = pgTable(
  'students',
  {
    id: identityId,
    schoolId: bigint('school_id', { mode: 'number' })
      .notNull()
      .references(() => schools.id, { onDelete: 'restrict' }),
    studentNumber: text('student_number').notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    preferredName: text('preferred_name'),
    gender: text('gender'),
    status: text('status').notNull().default('active'),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('students_school_number_uidx').on(
      table.schoolId,
      table.studentNumber
    ),
    index('students_school_id_id_idx').on(table.schoolId, table.id),
    check(
      'students_status_check',
      sql`${table.status} in ('active', 'inactive', 'withdrawn', 'graduated')`
    ),
  ]
)

export const enrollments = pgTable(
  'enrollments',
  {
    id: identityId,
    schoolId: bigint('school_id', { mode: 'number' })
      .notNull()
      .references(() => schools.id, { onDelete: 'restrict' }),
    studentId: bigint('student_id', { mode: 'number' })
      .notNull()
      .references(() => students.id, { onDelete: 'restrict' }),
    classGroupId: bigint('class_group_id', { mode: 'number' })
      .notNull()
      .references(() => classGroups.id, { onDelete: 'restrict' }),
    academicYearId: bigint('academic_year_id', { mode: 'number' })
      .notNull()
      .references(() => academicYears.id, { onDelete: 'restrict' }),
    startsOn: date('starts_on').notNull(),
    endsOn: date('ends_on'),
    status: text('status').notNull().default('active'),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('enrollments_student_year_uidx').on(
      table.studentId,
      table.academicYearId
    ),
    index('enrollments_school_id_idx').on(table.schoolId),
    index('enrollments_student_id_idx').on(table.studentId),
    index('enrollments_class_group_id_idx').on(table.classGroupId),
    index('enrollments_academic_year_id_idx').on(table.academicYearId),
    check(
      'enrollments_status_check',
      sql`${table.status} in ('active', 'transferred', 'withdrawn', 'completed')`
    ),
    check(
      'enrollments_date_order_check',
      sql`${table.endsOn} is null or ${table.endsOn} >= ${table.startsOn}`
    ),
  ]
)

export const assessments = pgTable(
  'assessments',
  {
    id: identityId,
    schoolId: bigint('school_id', { mode: 'number' })
      .notNull()
      .references(() => schools.id, { onDelete: 'restrict' }),
    termId: bigint('term_id', { mode: 'number' })
      .notNull()
      .references(() => terms.id, { onDelete: 'restrict' }),
    classGroupId: bigint('class_group_id', { mode: 'number' })
      .notNull()
      .references(() => classGroups.id, { onDelete: 'restrict' }),
    subjectId: bigint('subject_id', { mode: 'number' })
      .notNull()
      .references(() => subjects.id, { onDelete: 'restrict' }),
    title: text('title').notNull(),
    assessedOn: date('assessed_on').notNull(),
    maximumScore: numeric('maximum_score', { precision: 7, scale: 2 }).notNull(),
    weight: numeric('weight', { precision: 7, scale: 4 }).notNull().default('1'),
    status: text('status').notNull().default('draft'),
    version: bigint('version', { mode: 'number' }).notNull().default(1),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('assessments_term_class_subject_title_uidx').on(
      table.termId,
      table.classGroupId,
      table.subjectId,
      table.title
    ),
    index('assessments_school_id_idx').on(table.schoolId),
    index('assessments_term_class_subject_idx').on(
      table.termId,
      table.classGroupId,
      table.subjectId
    ),
    index('assessments_class_group_id_idx').on(table.classGroupId),
    index('assessments_subject_id_idx').on(table.subjectId),
    check('assessments_maximum_score_check', sql`${table.maximumScore} > 0`),
    check('assessments_weight_check', sql`${table.weight} >= 0`),
    check('assessments_version_check', sql`${table.version} > 0`),
    check(
      'assessments_status_check',
      sql`${table.status} in ('draft', 'submitted', 'published', 'archived')`
    ),
  ]
)

export const scores = pgTable(
  'scores',
  {
    id: identityId,
    schoolId: bigint('school_id', { mode: 'number' })
      .notNull()
      .references(() => schools.id, { onDelete: 'restrict' }),
    assessmentId: bigint('assessment_id', { mode: 'number' })
      .notNull()
      .references(() => assessments.id, { onDelete: 'restrict' }),
    enrollmentId: bigint('enrollment_id', { mode: 'number' })
      .notNull()
      .references(() => enrollments.id, { onDelete: 'restrict' }),
    status: text('status').notNull(),
    points: numeric('points', { precision: 7, scale: 2 }),
    feedback: text('feedback'),
    version: bigint('version', { mode: 'number' }).notNull().default(1),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('scores_assessment_enrollment_uidx').on(
      table.assessmentId,
      table.enrollmentId
    ),
    index('scores_school_id_idx').on(table.schoolId),
    index('scores_assessment_id_idx').on(table.assessmentId),
    index('scores_enrollment_id_idx').on(table.enrollmentId),
    check(
      'scores_status_points_check',
      sql`(${table.status} = 'scored' and ${table.points} is not null and ${table.points} >= 0) or (${table.status} in ('missing', 'excused', 'incomplete') and ${table.points} is null)`
    ),
    check('scores_version_check', sql`${table.version} > 0`),
  ]
)
