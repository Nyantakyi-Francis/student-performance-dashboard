import type { FastifyInstance } from 'fastify'
import type { Database } from '../database/client.js'
import { dashboardDataResponseSchema, dashboardDataQuerySchema, studentListQuerySchema, studentListResponseSchema } from './contracts.js'
import { getDashboardData, listStudents } from './repository.js'
import { fail, requireSession } from '../auth/access.js'

export async function registerStudentRoutes(app: FastifyInstance, database: Database) {
  await app.register(async (protectedApp) => {
    protectedApp.addHook('preHandler', async (request, reply) => requireSession(request, reply))
    protectedApp.get('/api/v1/students', async (request, reply) => {
      const parsed = studentListQuerySchema.safeParse(request.query)
      if (!parsed.success) return fail(reply, request, 400, 'VALIDATION_ERROR', 'The student query is invalid.')
      const principal = request.principal!
      if (parsed.data.schoolId && parsed.data.schoolId !== principal.schoolId) return fail(reply, request, 403, 'FORBIDDEN', 'Access to that school is not allowed.')
      return studentListResponseSchema.parse(await listStudents(database, parsed.data, principal))
    })
    protectedApp.get('/api/v1/dashboard-data', async (request, reply) => {
      const parsed = dashboardDataQuerySchema.safeParse(request.query)
      if (!parsed.success) return fail(reply, request, 400, 'VALIDATION_ERROR', 'The dashboard query is invalid.')
      const principal = request.principal!
      if ((parsed.data.schoolId && parsed.data.schoolId !== principal.schoolId) || (parsed.data.schoolSlug && parsed.data.schoolSlug !== principal.schoolSlug)) return fail(reply, request, 403, 'FORBIDDEN', 'Access to that school is not allowed.')
      return dashboardDataResponseSchema.parse(await getDashboardData(database, principal))
    })
  })
}
