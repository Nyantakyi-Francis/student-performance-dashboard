import { parseConfig } from '../config.js'
import { createDatabase } from './client.js'

const config = parseConfig(process.env)
const { client } = createDatabase(config)

try {
  await client.begin(async (sql) => {
    await sql.unsafe(`
      insert into schools (name, slug, time_zone, status)
      values ('Accra Demo Junior High School', 'accra-demo-jhs', 'Africa/Accra', 'active')
      on conflict (slug) do update set
        name = excluded.name,
        time_zone = excluded.time_zone,
        status = excluded.status,
        updated_at = now();

      insert into academic_years (school_id, name, starts_on, ends_on, status)
      select id, '2025-2026', '2025-09-01', '2026-07-31', 'active'
      from schools
      where slug = 'accra-demo-jhs'
      on conflict (school_id, name) do update set
        starts_on = excluded.starts_on,
        ends_on = excluded.ends_on,
        status = excluded.status,
        updated_at = now();

      insert into grade_levels (school_id, name, sequence, status)
      select school.id, grade.name, grade.sequence, 'active'
      from schools school
      cross join (
        values
          ('Grade 7', 7),
          ('Grade 8', 8),
          ('Grade 9', 9)
      ) as grade(name, sequence)
      where school.slug = 'accra-demo-jhs'
      on conflict (school_id, name) do update set
        sequence = excluded.sequence,
        status = excluded.status,
        updated_at = now();

      insert into class_groups (school_id, academic_year_id, grade_level_id, name, status)
      select school.id, year.id, grade.id, grade.name || ' Demo Class', 'active'
      from schools school
      join academic_years year on year.school_id = school.id and year.name = '2025-2026'
      join grade_levels grade on grade.school_id = school.id
      where school.slug = 'accra-demo-jhs'
      on conflict (academic_year_id, name) do update set
        grade_level_id = excluded.grade_level_id,
        status = excluded.status,
        updated_at = now();

      insert into terms (school_id, academic_year_id, name, sequence, starts_on, ends_on, status)
      select school.id, year.id, term.name, term.sequence, term.starts_on::date, term.ends_on::date, 'open'
      from schools school
      join academic_years year on year.school_id = school.id and year.name = '2025-2026'
      cross join (
        values
          ('Term 1', 1, '2025-09-01', '2025-12-12'),
          ('Term 2', 2, '2026-01-12', '2026-04-10'),
          ('Term 3', 3, '2026-05-04', '2026-07-31')
      ) as term(name, sequence, starts_on, ends_on)
      where school.slug = 'accra-demo-jhs'
      on conflict (academic_year_id, name) do update set
        sequence = excluded.sequence,
        starts_on = excluded.starts_on,
        ends_on = excluded.ends_on,
        status = excluded.status,
        updated_at = now();

      insert into subjects (school_id, code, name, status)
      select school.id, subject.code, subject.name, 'active'
      from schools school
      cross join (
        values
          ('english', 'English'),
          ('mathematics', 'Mathematics'),
          ('science', 'Science'),
          ('socialStudies', 'Social Studies')
      ) as subject(code, name)
      where school.slug = 'accra-demo-jhs'
      on conflict (school_id, code) do update set
        name = excluded.name,
        status = excluded.status,
        updated_at = now();

      insert into students (school_id, student_number, first_name, last_name, gender, status)
      select school.id, student.student_number, student.first_name, student.last_name, student.gender, 'active'
      from schools school
      cross join (
        values
          ('ADJHS-2025-001', 'Ama', 'Mensah', 'Female'),
          ('ADJHS-2025-002', 'Kwame', 'Asare', 'Male'),
          ('ADJHS-2025-003', 'Akosua', 'Boateng', 'Female'),
          ('ADJHS-2025-004', 'Yaw', 'Owusu', 'Male'),
          ('ADJHS-2025-005', 'Efua', 'Koomson', 'Female'),
          ('ADJHS-2025-006', 'Kojo', 'Frimpong', 'Male'),
          ('ADJHS-2025-007', 'Adwoa', 'Serwaa', 'Female'),
          ('ADJHS-2025-008', 'Kofi', 'Badu', 'Male')
      ) as student(student_number, first_name, last_name, gender)
      where school.slug = 'accra-demo-jhs'
      on conflict (school_id, student_number) do update set
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        gender = excluded.gender,
        status = excluded.status,
        updated_at = now();

      insert into enrollments (school_id, student_id, class_group_id, academic_year_id, starts_on, ends_on, status)
      select school.id, student.id, class.id, year.id, '2025-09-01', null, 'active'
      from schools school
      join academic_years year on year.school_id = school.id and year.name = '2025-2026'
      join students student on student.school_id = school.id
      join (
        values
          ('ADJHS-2025-001', 'Grade 7 Demo Class'),
          ('ADJHS-2025-002', 'Grade 7 Demo Class'),
          ('ADJHS-2025-003', 'Grade 8 Demo Class'),
          ('ADJHS-2025-004', 'Grade 8 Demo Class'),
          ('ADJHS-2025-005', 'Grade 9 Demo Class'),
          ('ADJHS-2025-006', 'Grade 9 Demo Class'),
          ('ADJHS-2025-007', 'Grade 7 Demo Class'),
          ('ADJHS-2025-008', 'Grade 8 Demo Class')
      ) as placement(student_number, class_name) on placement.student_number = student.student_number
      join class_groups class on class.academic_year_id = year.id and class.name = placement.class_name
      where school.slug = 'accra-demo-jhs'
      on conflict (student_id, academic_year_id) do update set
        class_group_id = excluded.class_group_id,
        starts_on = excluded.starts_on,
        ends_on = excluded.ends_on,
        status = excluded.status,
        updated_at = now();

      insert into assessments (
        school_id,
        term_id,
        class_group_id,
        subject_id,
        title,
        assessed_on,
        maximum_score,
        weight,
        status,
        published_at
      )
      select
        school.id,
        term.id,
        class.id,
        subject.id,
        term.name || ' ' || subject.name || ' Score',
        case term.name
          when 'Term 1' then '2025-11-28'::date
          when 'Term 2' then '2026-03-27'::date
          else '2026-07-17'::date
        end,
        100,
        1,
        'published',
        case term.name
          when 'Term 1' then '2025-11-28T12:00:00Z'::timestamptz
          when 'Term 2' then '2026-03-27T12:00:00Z'::timestamptz
          else '2026-07-17T12:00:00Z'::timestamptz
        end
      from schools school
      join academic_years year on year.school_id = school.id and year.name = '2025-2026'
      join terms term on term.academic_year_id = year.id
      join class_groups class on class.academic_year_id = year.id
      join subjects subject on subject.school_id = school.id
      where school.slug = 'accra-demo-jhs'
      on conflict (term_id, class_group_id, subject_id, title) do update set
        assessed_on = excluded.assessed_on,
        maximum_score = excluded.maximum_score,
        weight = excluded.weight,
        status = excluded.status,
        published_at = excluded.published_at,
        updated_at = now();

      insert into scores (school_id, assessment_id, enrollment_id, status, points)
      select school.id, assessment.id, enrollment.id, 'scored', score.points
      from schools school
      join academic_years year on year.school_id = school.id and year.name = '2025-2026'
      join students student on student.school_id = school.id
      join enrollments enrollment on enrollment.student_id = student.id and enrollment.academic_year_id = year.id
      join class_groups class on class.id = enrollment.class_group_id
      join terms term on term.academic_year_id = year.id
      join subjects subject on subject.school_id = school.id
      join assessments assessment
        on assessment.term_id = term.id
        and assessment.class_group_id = class.id
        and assessment.subject_id = subject.id
        and assessment.title = term.name || ' ' || subject.name || ' Score'
      join (
        values
          ('ADJHS-2025-001', 'Term 1', 'english', 85),
          ('ADJHS-2025-001', 'Term 1', 'mathematics', 78),
          ('ADJHS-2025-001', 'Term 1', 'science', 74),
          ('ADJHS-2025-001', 'Term 1', 'socialStudies', 80),
          ('ADJHS-2025-001', 'Term 2', 'english', 88),
          ('ADJHS-2025-001', 'Term 2', 'mathematics', 82),
          ('ADJHS-2025-001', 'Term 2', 'science', 79),
          ('ADJHS-2025-001', 'Term 2', 'socialStudies', 84),
          ('ADJHS-2025-001', 'Term 3', 'english', 91),
          ('ADJHS-2025-001', 'Term 3', 'mathematics', 86),
          ('ADJHS-2025-001', 'Term 3', 'science', 83),
          ('ADJHS-2025-001', 'Term 3', 'socialStudies', 87),
          ('ADJHS-2025-002', 'Term 1', 'english', 70),
          ('ADJHS-2025-002', 'Term 1', 'mathematics', 65),
          ('ADJHS-2025-002', 'Term 1', 'science', 60),
          ('ADJHS-2025-002', 'Term 1', 'socialStudies', 72),
          ('ADJHS-2025-002', 'Term 2', 'english', 69),
          ('ADJHS-2025-002', 'Term 2', 'mathematics', 63),
          ('ADJHS-2025-002', 'Term 2', 'science', 59),
          ('ADJHS-2025-002', 'Term 2', 'socialStudies', 70),
          ('ADJHS-2025-002', 'Term 3', 'english', 67),
          ('ADJHS-2025-002', 'Term 3', 'mathematics', 61),
          ('ADJHS-2025-002', 'Term 3', 'science', 58),
          ('ADJHS-2025-002', 'Term 3', 'socialStudies', 69),
          ('ADJHS-2025-003', 'Term 1', 'english', 91),
          ('ADJHS-2025-003', 'Term 1', 'mathematics', 88),
          ('ADJHS-2025-003', 'Term 1', 'science', 84),
          ('ADJHS-2025-003', 'Term 1', 'socialStudies', 86),
          ('ADJHS-2025-003', 'Term 2', 'english', 93),
          ('ADJHS-2025-003', 'Term 2', 'mathematics', 90),
          ('ADJHS-2025-003', 'Term 2', 'science', 88),
          ('ADJHS-2025-003', 'Term 2', 'socialStudies', 89),
          ('ADJHS-2025-003', 'Term 3', 'english', 95),
          ('ADJHS-2025-003', 'Term 3', 'mathematics', 92),
          ('ADJHS-2025-003', 'Term 3', 'science', 90),
          ('ADJHS-2025-003', 'Term 3', 'socialStudies', 91),
          ('ADJHS-2025-004', 'Term 1', 'english', 62),
          ('ADJHS-2025-004', 'Term 1', 'mathematics', 55),
          ('ADJHS-2025-004', 'Term 1', 'science', 58),
          ('ADJHS-2025-004', 'Term 1', 'socialStudies', 64),
          ('ADJHS-2025-004', 'Term 2', 'english', 60),
          ('ADJHS-2025-004', 'Term 2', 'mathematics', 53),
          ('ADJHS-2025-004', 'Term 2', 'science', 56),
          ('ADJHS-2025-004', 'Term 2', 'socialStudies', 61),
          ('ADJHS-2025-004', 'Term 3', 'english', 66),
          ('ADJHS-2025-004', 'Term 3', 'mathematics', 60),
          ('ADJHS-2025-004', 'Term 3', 'science', 62),
          ('ADJHS-2025-004', 'Term 3', 'socialStudies', 68),
          ('ADJHS-2025-005', 'Term 1', 'english', 87),
          ('ADJHS-2025-005', 'Term 1', 'mathematics', 92),
          ('ADJHS-2025-005', 'Term 1', 'science', 90),
          ('ADJHS-2025-005', 'Term 1', 'socialStudies', 89),
          ('ADJHS-2025-005', 'Term 2', 'english', 90),
          ('ADJHS-2025-005', 'Term 2', 'mathematics', 94),
          ('ADJHS-2025-005', 'Term 2', 'science', 93),
          ('ADJHS-2025-005', 'Term 2', 'socialStudies', 91),
          ('ADJHS-2025-005', 'Term 3', 'english', 92),
          ('ADJHS-2025-005', 'Term 3', 'mathematics', 96),
          ('ADJHS-2025-005', 'Term 3', 'science', 95),
          ('ADJHS-2025-005', 'Term 3', 'socialStudies', 94),
          ('ADJHS-2025-006', 'Term 1', 'english', 55),
          ('ADJHS-2025-006', 'Term 1', 'mathematics', 48),
          ('ADJHS-2025-006', 'Term 1', 'science', 50),
          ('ADJHS-2025-006', 'Term 1', 'socialStudies', 52),
          ('ADJHS-2025-006', 'Term 2', 'english', 58),
          ('ADJHS-2025-006', 'Term 2', 'mathematics', 54),
          ('ADJHS-2025-006', 'Term 2', 'science', 57),
          ('ADJHS-2025-006', 'Term 2', 'socialStudies', 55),
          ('ADJHS-2025-006', 'Term 3', 'english', 64),
          ('ADJHS-2025-006', 'Term 3', 'mathematics', 59),
          ('ADJHS-2025-006', 'Term 3', 'science', 61),
          ('ADJHS-2025-006', 'Term 3', 'socialStudies', 63),
          ('ADJHS-2025-007', 'Term 1', 'english', 77),
          ('ADJHS-2025-007', 'Term 1', 'mathematics', 81),
          ('ADJHS-2025-007', 'Term 1', 'science', 79),
          ('ADJHS-2025-007', 'Term 1', 'socialStudies', 83),
          ('ADJHS-2025-007', 'Term 2', 'english', 80),
          ('ADJHS-2025-007', 'Term 2', 'mathematics', 84),
          ('ADJHS-2025-007', 'Term 2', 'science', 82),
          ('ADJHS-2025-007', 'Term 2', 'socialStudies', 85),
          ('ADJHS-2025-007', 'Term 3', 'english', 83),
          ('ADJHS-2025-007', 'Term 3', 'mathematics', 86),
          ('ADJHS-2025-007', 'Term 3', 'science', 84),
          ('ADJHS-2025-007', 'Term 3', 'socialStudies', 88),
          ('ADJHS-2025-008', 'Term 1', 'english', 68),
          ('ADJHS-2025-008', 'Term 1', 'mathematics', 73),
          ('ADJHS-2025-008', 'Term 1', 'science', 71),
          ('ADJHS-2025-008', 'Term 1', 'socialStudies', 69),
          ('ADJHS-2025-008', 'Term 2', 'english', 72),
          ('ADJHS-2025-008', 'Term 2', 'mathematics', 76),
          ('ADJHS-2025-008', 'Term 2', 'science', 74),
          ('ADJHS-2025-008', 'Term 2', 'socialStudies', 73),
          ('ADJHS-2025-008', 'Term 3', 'english', 75),
          ('ADJHS-2025-008', 'Term 3', 'mathematics', 78),
          ('ADJHS-2025-008', 'Term 3', 'science', 77),
          ('ADJHS-2025-008', 'Term 3', 'socialStudies', 76)
      ) as score(student_number, term_name, subject_code, points)
        on score.student_number = student.student_number
        and score.term_name = term.name
        and score.subject_code = subject.code
      where school.slug = 'accra-demo-jhs'
      on conflict (assessment_id, enrollment_id) do update set
        status = excluded.status,
        points = excluded.points,
        updated_at = now();
    `)
  })

  const [school] = await client.unsafe(`
    select
      schools.id as school_id,
      (select count(*)::int from students where students.school_id = schools.id) as student_count,
      (select count(*)::int from subjects where subjects.school_id = schools.id) as subject_count,
      (
        select count(*)::int
        from academic_years
        join terms on terms.academic_year_id = academic_years.id
        where academic_years.school_id = schools.id
      ) as term_count,
      (select count(*)::int from scores where scores.school_id = schools.id) as score_count
    from schools
    where schools.slug = 'accra-demo-jhs'
  `)

  if (!school) {
    throw new Error('Seed failed: demo school was not found after insert.')
  }

  console.log(
    `Seeded ${school.student_count} students, ${school.subject_count} subjects, ${school.term_count} terms, and ${school.score_count} scores for schoolId=${school.school_id}.`
  )
} finally {
  await client.end()
}
