import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { parseConfig } from '../config.js'
import { createDatabase } from './client.js'
import { classGroups, memberships, schools, studentLinks, students, subjects, teachingAssignments, users } from './schema.js'
import { hashPassword } from '../auth/passwords.js'

const config = parseConfig(process.env)
const demoPassword = z.string().min(12).max(128)
const passwords = z.object({ DEMO_ADMIN_PASSWORD: demoPassword, DEMO_TEACHER_PASSWORD: demoPassword, DEMO_STUDENT_PASSWORD: demoPassword.optional(), DEMO_GUARDIAN_PASSWORD: demoPassword.optional() }).parse(process.env)
const { db, client } = createDatabase(config)
try {
  const [school] = await db.select().from(schools).where(eq(schools.slug, 'accra-demo-jhs'))
  if (!school) throw new Error('Run the academic seed first.')
  await db.transaction(async (tx) => {
    for (const account of [
      { email: 'admin@demo.example', displayName: 'Demo Administrator', role: 'administrator', password: passwords.DEMO_ADMIN_PASSWORD },
      { email: 'teacher@demo.example', displayName: 'Demo Teacher', role: 'teacher', password: passwords.DEMO_TEACHER_PASSWORD },
      { email: 'student@demo.example', displayName: 'Demo Student', role: 'student', password: passwords.DEMO_STUDENT_PASSWORD || passwords.DEMO_TEACHER_PASSWORD },
      { email: 'guardian@demo.example', displayName: 'Demo Guardian', role: 'guardian', password: passwords.DEMO_GUARDIAN_PASSWORD || passwords.DEMO_TEACHER_PASSWORD },
    ]) {
      // Rerunning the seed preserves credentials and existing access changes.
      await tx.insert(users).values({ email: account.email, displayName: account.displayName, passwordHash: await hashPassword(account.password) }).onConflictDoNothing()
      const [user] = await tx.select().from(users).where(eq(users.email, account.email))
      const [createdMembership] = await tx.insert(memberships).values({ userId: user!.id, schoolId: school.id, role: account.role }).onConflictDoNothing().returning({ id: memberships.id })
      if (account.role === 'teacher' && createdMembership) {
        const [membership] = await tx.select().from(memberships).where(and(eq(memberships.schoolId, school.id), eq(memberships.userId, user!.id)))
        const [group] = await tx.select().from(classGroups).where(and(eq(classGroups.schoolId, school.id), eq(classGroups.name, 'Grade 7 Demo Class')))
        const [subject] = await tx.select().from(subjects).where(and(eq(subjects.schoolId, school.id), eq(subjects.code, 'english')))
        if (group && subject) await tx.insert(teachingAssignments).values({ schoolId: school.id, membershipId: membership!.id, classGroupId: group.id, subjectId: subject.id }).onConflictDoNothing()
      }
      if (['student', 'guardian'].includes(account.role) && createdMembership) {
        const [student] = await tx.select().from(students).where(and(eq(students.schoolId, school.id), eq(students.studentNumber, 'ADJHS-2025-001')))
        if (student) await tx.insert(studentLinks).values({ schoolId: school.id, membershipId: createdMembership.id, studentId: student.id }).onConflictDoNothing()
      }
    }
  })
  console.log('Synthetic accounts ready: admin, teacher, student, guardian @demo.example (school: accra-demo-jhs).')
} finally { await client.end() }
