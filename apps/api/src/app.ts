import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import rateLimit, { normalizeIP } from '@fastify/rate-limit'
import type { AppConfig } from './config.js'
import type { Database } from './database/client.js'
import { registerStudentRoutes } from './students/routes.js'
import { fail, resolveSession } from './auth/access.js'
import { registerAuthRoutes, SESSION_COOKIE } from './auth/routes.js'
import { registerAdminRoutes } from './admin/routes.js'
import { registerWorkflowRoutes } from './workflow/routes.js'
import { registerAccountRoutes } from './auth/accounts.js'
import { postgresRateLimitStore } from './auth/rate-limit-store.js'

type BuildAppOptions = { config: AppConfig; database?: Database }

export async function buildApp({ config, database }: BuildAppOptions) {
  const app = Fastify({
    trustProxy: Boolean(config.VERCEL_URL),
    logger: config.NODE_ENV === 'test' ? false : { level: config.LOG_LEVEL, redact: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'] },
    requestIdHeader: 'x-request-id', bodyLimit: 16 * 1024,
  })
  await app.register(cookie)
  app.decorateRequest('principal', null)
  // Register before routes so child scopes inherit the same safe error contract.
  app.setErrorHandler(async (error, request, reply) => {
    const status = error && typeof error === 'object' && 'statusCode' in error && typeof error.statusCode === 'number' ? error.statusCode : 500
    if (status === 429) return fail(reply, request, 429, 'RATE_LIMITED', 'Too many requests. Try again shortly.')
    if (status >= 400 && status < 500) return fail(reply, request, status, 'INVALID_REQUEST', 'The request is invalid.')
    const failure = error as { name?: string; code?: string; cause?: { code?: string } }
    request.log.error({ requestId: request.id, errorName: failure.name, errorCode: failure.cause?.code ?? failure.code }, 'Request failed')
    return fail(reply, request, 500, 'INTERNAL_ERROR', 'The request could not be completed.')
  })
  const allowedClientOrigins = new Set(config.CLIENT_ORIGIN.split(',').map((origin) => origin.trim()))
  // Deployment names come from the runtime, never request headers.
  for (const host of [config.VERCEL_URL, config.VERCEL_BRANCH_URL, config.VERCEL_PROJECT_PRODUCTION_URL]) {
    if (host && /^[a-z0-9.-]+\.vercel\.app$/i.test(host)) allowedClientOrigins.add(`https://${host}`)
  }

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
  }
  await app.register(rateLimit, {
    ...(database && config.NODE_ENV === 'production' ? { store: postgresRateLimitStore(database) } : {}),
    hook: 'preHandler', max: 120, timeWindow: '1 minute',
    keyGenerator: (request) => request.principal ? `membership:${request.principal.membershipId}` : `ip:${normalizeIP(request.ip)}`,
  })
  if (database) {
    await registerAuthRoutes(app, database, config)
    await registerStudentRoutes(app, database)
    await registerAdminRoutes(app, database)
    await registerWorkflowRoutes(app, database)
    await registerAccountRoutes(app, database)
  }

  app.get('/health', { config: { rateLimit: false } }, async () => ({ data: { service: 'student-dashboard-api', status: 'ok' } }))
  app.setNotFoundHandler(async (request, reply) => fail(reply, request, 404, 'ROUTE_NOT_FOUND', 'The requested route was not found.'))
  return app
}
