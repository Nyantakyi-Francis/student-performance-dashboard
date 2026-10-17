import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import type { Database } from '../database/client.js'
import { auditEvents, classGroups, memberships, subjects, teachingAssignments, users } from '../database/schema.js'
import { fail, requireAdmin } from '../auth/access.js'

const assignmentSchema = z.object({ membershipId: z.number().int().positive(), classGroupId: z.number().int().positive(), subjectId: z.number().int().positive() }).strict()

export async function registerAdminRoutes(app: FastifyInstance, database: Database) {
  await app.register(async (admin) => {
    admin.addHook('preHandler', async (request, reply) => requireAdmin(request, reply))
    admin.get('/api/v1/admin/access', async (request) => {
      const schoolId = request.principal!.schoolId
      const [teachers, classes, schoolSubjects, assignments] = await Promise.all([
        database.select({ id: memberships.id, displayName: users.displayName }).from(memberships).innerJoin(users, eq(memberships.userId, users.id)).where(and(eq(memberships.schoolId, schoolId), eq(memberships.role, 'teacher'), eq(memberships.status, 'active'), eq(users.status, 'active'))),
        database.select({ id: classGroups.id, name: classGroups.name }).from(classGroups).where(and(eq(classGroups.schoolId, schoolId), eq(classGroups.status, 'active'))),
        database.select({ id: subjects.id, name: subjects.name }).from(subjects).where(and(eq(subjects.schoolId, schoolId), eq(subjects.status, 'active'))),
        database.select({ id: teachingAssignments.id, membershipId: teachingAssignments.membershipId, classGroupId: teachingAssignments.classGroupId, subjectId: teachingAssignments.subjectId }).from(teachingAssignments).where(eq(teachingAssignments.schoolId, schoolId)),
      ])
      return { data: { teachers, classes, subjects: schoolSubjects, assignments } }
    })
    admin.post('/api/v1/admin/teaching-assignments', async (request, reply) => {
      const parsed = assignmentSchema.safeParse(request.body)
      if (!parsed.success) return fail(reply, request, 400, 'VALIDATION_ERROR', 'Choose a teacher, class, and subject.')
      const schoolId = request.principal!.schoolId
      const { membershipId, classGroupId, subjectId } = parsed.data
      const result = await database.transaction(async (tx) => {
        // Lock scope records so deactivation cannot race this validation.
        const [teacher] = await tx.select().from(memberships).where(and(eq(memberships.id, membershipId), eq(memberships.schoolId, schoolId), eq(memberships.role, 'teacher'), eq(memberships.status, 'active'))).for('update')
        const [group] = await tx.select().from(classGroups).where(and(eq(classGroups.id, classGroupId), eq(classGroups.schoolId, schoolId), eq(classGroups.status, 'active'))).for('update')
        const [subject] = await tx.select().from(subjects).where(and(eq(subjects.id, subjectId), eq(subjects.schoolId, schoolId), eq(subjects.status, 'active'))).for('update')
        if (!teacher || !group || !subject) return null
        const [assignment] = await tx.insert(teachingAssignments).values({ schoolId, membershipId, classGroupId, subjectId }).onConflictDoNothing().returning({ id: teachingAssignments.id })
        if (assignment) await tx.insert(auditEvents).values({ schoolId, actorMembershipId: request.principal!.membershipId, action: 'assignment.created', targetId: String(assignment.id) })
        return { created: Boolean(assignment) }
      })
      if (!result) return fail(reply, request, 400, 'INVALID_ASSIGNMENT', 'The teacher, class, and subject must belong to your school and be active.')
      return { data: result }
    })
    admin.delete('/api/v1/admin/teaching-assignments/:id', async (request, reply) => {
      const parsed = z.object({ id: z.coerce.number().int().positive() }).safeParse(request.params)
      if (!parsed.success) return fail(reply, request, 400, 'VALIDATION_ERROR', 'Invalid assignment ID.')
      const schoolId = request.principal!.schoolId
      const removed = await database.transaction(async (tx) => {
        const [row] = await tx.delete(teachingAssignments).where(and(eq(teachingAssignments.id, parsed.data.id), eq(teachingAssignments.schoolId, schoolId))).returning({ id: teachingAssignments.id })
        if (row) await tx.insert(auditEvents).values({ schoolId, actorMembershipId: request.principal!.membershipId, action: 'assignment.removed', targetId: String(row.id) })
        return Boolean(row)
      })
      if (!removed) return fail(reply, request, 404, 'ASSIGNMENT_NOT_FOUND', 'Assignment not found.')
      return { data: { removed: true } }
    })
  })
}
