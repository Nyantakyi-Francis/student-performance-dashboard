import { buildApp } from './app.js'
import { parseConfig } from './config.js'
import { createDatabase } from './database/client.js'

const config = parseConfig(process.env)
const database = createDatabase(config)
const app = await buildApp({ config, database: database.db })

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'Shutting down API')
  await app.close()
  await database.client.end()
  process.exit(0)
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))

try {
  await app.listen({ host: config.API_HOST, port: config.API_PORT })
} catch (error) {
  app.log.error(error)
  await database.client.end()
  process.exit(1)
}
