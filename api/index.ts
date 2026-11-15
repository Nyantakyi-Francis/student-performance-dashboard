import type { IncomingMessage, ServerResponse } from 'node:http'
import { buildApp } from '../apps/api/src/app.js'
import { parseConfig } from '../apps/api/src/config.js'
import { createDatabase } from '../apps/api/src/database/client.js'
import { normalizeVercelRequestUrl } from '../apps/api/src/vercel-url.js'

// Reuse the app and its small connection pool throughout a warm function's lifetime.
async function createApplication() {
  const config = parseConfig(process.env)
  const database = createDatabase(config)
  const app = await buildApp({ config, database: database.db })
  await app.ready()
  return app
}
let application: ReturnType<typeof createApplication> | undefined

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  try {
    application ??= createApplication()
    const app = await application
    if (request.url) request.url = normalizeVercelRequestUrl(request.url)
    app.server.emit('request', request, response)
  } catch (error) {
    application = undefined
    console.error('School service startup failed', { name: error instanceof Error ? error.name : 'UnknownError' })
    response.statusCode = 503
    response.setHeader('content-type', 'application/json; charset=utf-8')
    response.setHeader('cache-control', 'no-store')
    response.end(JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE', message: 'School records are temporarily unavailable. Please try again shortly.' } }))
  }
}
