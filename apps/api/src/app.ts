import Fastify from 'fastify'
import type { AppConfig } from './config.js'
import type { Database } from './database/client.js'
import { registerStudentRoutes } from './students/routes.js'

type BuildAppOptions = {
  config: AppConfig
  database?: Database
}

export async function buildApp({ config, database }: BuildAppOptions) {
  const app = Fastify({
    logger: config.NODE_ENV === 'test' ? false : { level: config.LOG_LEVEL },
    requestIdHeader: 'x-request-id',
  })

  const allowedClientOrigins = new Set(
    config.CLIENT_ORIGIN.split(',').map((origin) => origin.trim())
  )

  app.addHook('onRequest', async (request, reply) => {
    const requestOrigin = request.headers.origin
    const allowedOrigin =
      requestOrigin && allowedClientOrigins.has(requestOrigin)
        ? requestOrigin
        : [...allowedClientOrigins][0]

    reply.header('access-control-allow-origin', allowedOrigin)
    reply.header('access-control-allow-methods', 'GET,OPTIONS')
    reply.header('access-control-allow-headers', 'content-type,x-request-id')

    if (request.method === 'OPTIONS') {
      return reply.status(204).send()
    }
  })

  app.get('/health', async () => ({
    data: {
      service: 'student-dashboard-api',
      status: 'ok',
    },
  }))

  if (database) {
    await registerStudentRoutes(app, database)
  }

  app.setNotFoundHandler(async (request, reply) => {
    return reply.status(404).send({
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'The requested route was not found.',
        requestId: request.id,
        fields: [],
      },
    })
  })

  app.setErrorHandler(async (error, request, reply) => {
    request.log.error({ error }, 'Request failed')
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'The request could not be completed.',
        requestId: request.id,
        fields: [],
      },
    })
  })

  return app
}
