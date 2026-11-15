import { and, eq } from 'drizzle-orm'
import { parseConfig } from '../apps/api/src/config.ts'
import { createDatabase } from '../apps/api/src/database/client.ts'
import { hashPassword, verifyPassword } from '../apps/api/src/auth/passwords.ts'
import { schools, users, memberships, classGroups, subjects, students, teachingAssignments, studentLinks } from '../apps/api/src/database/schema.ts'
import { publicDemoAccounts, publicDemoSchool } from '../src/data/demoAccounts.js'

// DATABASE_URL must be supplied explicitly. Never reset academic data or passwords.
if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL to the intended fictional demo database first.')
const administratorPassword = process.env.PORTFOLIO_ADMIN_PASSWORD
if (administratorPassword && (administratorPassword.length < 12 || administratorPassword.length > 128)) throw new Error('Use a private administrator password of 12–128 characters.')
const accounts = [...publicDemoAccounts, ...(administratorPassword ? [{ role: 'administrator', email: 'admin@portfolio.example', displayName: 'School Administrator', password: administratorPassword }] : [])]
const { db, client } = createDatabase(parseConfig(process.env))
try {
  await db.transaction(async (tx) => {
    const [school] = await tx.select().from(schools).where(eq(schools.slug, publicDemoSchool))
    if (school?.name !== 'Accra Demo Junior High School') throw new Error('The fictional demo school was not found. No changes made.')
    const [group] = await tx.select().from(classGroups).where(and(eq(classGroups.schoolId, school.id), eq(classGroups.name, 'Grade 7 Demo Class')))
    const [subject] = await tx.select().from(subjects).where(and(eq(subjects.schoolId, school.id), eq(subjects.code, 'english')))
    const [student] = await tx.select().from(students).where(and(eq(students.schoolId, school.id), eq(students.studentNumber, 'ADJHS-2025-001')))
    if (!group || !subject || !student) throw new Error('Expected sample class, subject and student were not found. No changes made.')
    for (const account of accounts) {
      await tx.insert(users).values({ email: account.email, displayName: account.displayName, passwordHash: await hashPassword(account.password) }).onConflictDoNothing()
      const [user] = await tx.select().from(users).where(eq(users.email, account.email))
      if (!user || !await verifyPassword(account.password, user.passwordHash)) throw new Error('A demo address already has different credentials. Existing passwords were preserved.')
      await tx.insert(memberships).values({ schoolId: school.id, userId: user.id, role: account.role }).onConflictDoNothing()
      const [membership] = await tx.select().from(memberships).where(and(eq(memberships.schoolId, school.id), eq(memberships.userId, user.id)))
      if (membership.role !== account.role || membership.status !== 'active') throw new Error('An existing demo membership differs. Existing access was preserved.')
      if (account.role === 'teacher') await tx.insert(teachingAssignments).values({ schoolId: school.id, membershipId: membership.id, classGroupId: group.id, subjectId: subject.id }).onConflictDoNothing()
      else if (['student', 'guardian'].includes(account.role)) await tx.insert(studentLinks).values({ schoolId: school.id, membershipId: membership.id, studentId: student.id }).onConflictDoNothing()
    }
  })
  console.log('Public demo teacher, student and guardian are ready. Academic records and existing credentials were preserved.')
} finally { await client.end() }
