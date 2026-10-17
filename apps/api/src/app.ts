import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'
import type { AppConfig } from './config.js'
import type { Database } from './database/client.js'
import { registerStudentRoutes } from './students/routes.js'
import { fail, resolveSession } from './auth/access.js'
import { registerAuthRoutes, SESSION_COOKIE } from './auth/routes.js'
import { registerAdminRoutes } from './admin/routes.js'

type BuildAppOptions = { config: AppConfig; database?: Database }

export async function buildApp({ config, database }: BuildAppOptions) {
  const app = Fastify({
    logger: config.NODE_ENV === 'test' ? false : { level: config.LOG_LEVEL, redact: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'] },
    requestIdHeader: 'x-request-id', bodyLimit: 16 * 1024,
  })
  await app.register(cookie)
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' })
  app.decorateRequest('principal', null)
  const allowedClientOrigins = new Set(config.CLIENT_ORIGIN.split(',').map((origin) => origin.trim()))

  app.addHook('onRequest', async (request, reply) => {
    reply.header('cache-control', 'no-store')
    reply.header('x-content-type-options', 'nosniff')
    reply.header('vary', 'Origin')
    const origin = request.headers.origin
    if (origin && !allowedClientOrigins.has(origin)) return fail(reply, request, 403, 'ORIGIN_DENIED', 'This origin is not allowed.')
    if (origin) {
      reply.header('access-control-allow-origin', origin)
      reply.header('access-control-allow-credentials', 'true')
    }
    reply.header('access-control-allow-methods', 'GET,POST,DELETE,OPTIONS')
    reply.header('access-control-allow-headers', 'content-type,x-request-id,x-dashboard-request')
    if (request.method === 'OPTIONS') return reply.status(204).send()
    // Custom header + exact CORS origins prevent cross-site form requests, including login CSRF.
    if (!['GET', 'HEAD'].includes(request.method)) {
      if (request.headers['x-dashboard-request'] !== '1') return fail(reply, request, 403, 'CSRF_REJECTED', 'The request verification header is required.')
      if (request.method === 'POST' && !request.headers['content-type']?.startsWith('application/json')) return fail(reply, request, 415, 'JSON_REQUIRED', 'Send an application/json request.')
    }
  })

  if (database) {
    app.addHook('preHandler', async (request) => {
      request.principal = await resolveSession(database, request.cookies[SESSION_COOKIE])
    })
    await registerAuthRoutes(app, database, config)
    await registerStudentRoutes(app, database)
    await registerAdminRoutes(app, database)
  }

  app.get('/health', async () => ({ data: { service: 'student-dashboard-api', status: 'ok' } }))
  app.setNotFoundHandler(async (request, reply) => fail(reply, request, 404, 'ROUTE_NOT_FOUND', 'The requested route was not found.'))
  app.setErrorHandler(async (error, request, reply) => {
    const status = error && typeof error === 'object' && 'statusCode' in error && typeof error.statusCode === 'number' ? error.statusCode : 500
    if (status === 429) return fail(reply, request, 429, 'RATE_LIMITED', 'Too many requests. Try again shortly.')
    if (status >= 400 && status < 500) return fail(reply, request, status, 'INVALID_REQUEST', 'The request is invalid.')
    request.log.error({ requestId: request.id }, 'Request failed')
    return fail(reply, request, 500, 'INTERNAL_ERROR', 'The request could not be completed.')
  })
  return app
}
