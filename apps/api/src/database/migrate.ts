import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { parseConfig } from '../config.js'
import { createDatabase } from './client.js'

const config = parseConfig(process.env)
const { client, db } = createDatabase(config)

try {
  await migrate(db, { migrationsFolder: './drizzle' })
  console.log('Database migrations completed.')
} finally {
  await client.end()
}
