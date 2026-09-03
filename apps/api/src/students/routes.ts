import type { FastifyInstance } from 'fastify'
import type { Database } from '../database/client.js'
import {
  dashboardDataResponseSchema,
  dashboardDataQuerySchema,
  studentListQuerySchema,
  studentListResponseSchema,
} from './contracts.js'
import { getDashboardData, listStudents } from './repository.js'

export async function registerStudentRoutes(
  app: FastifyInstance,
  database: Database
) {
  app.get('/api/v1/students', async (request, reply) => {
    const parsedQuery = studentListQuerySchema.safeParse(request.query)

    if (!parsedQuery.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'The student query is invalid.',
          requestId: request.id,
          fields: parsedQuery.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
      })
    }

    const result = await listStudents(database, parsedQuery.data)
    return studentListResponseSchema.parse(result)
  })

  app.get('/api/v1/dashboard-data', async (request, reply) => {
    const parsedQuery = dashboardDataQuerySchema.safeParse(request.query)

    if (!parsedQuery.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'The dashboard query is invalid.',
          requestId: request.id,
          fields: parsedQuery.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
      })
    }

    const result = await getDashboardData(database, parsedQuery.data)
    return dashboardDataResponseSchema.parse(result)
  })
}
