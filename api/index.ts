import type { IncomingMessage, ServerResponse } from 'node:http'
import { buildApp } from '../apps/api/src/app.js'
import { parseConfig } from '../apps/api/src/config.js'
import { createDatabase } from '../apps/api/src/database/client.js'

// Reuse the app and its small connection pool throughout a warm function's lifetime.
const application = (async () => {
  const config = parseConfig(process.env)
  const database = createDatabase(config)
  const app = await buildApp({ config, database: database.db })
  await app.ready()
  return app
})()

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  const app = await application
  if (request.url?.split('?')[0] === '/api/health') request.url = '/health'
  app.server.emit('request', request, response)
}
