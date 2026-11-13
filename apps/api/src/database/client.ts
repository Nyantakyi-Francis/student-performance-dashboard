import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import type { AppConfig } from '../config.js'
import * as schema from './schema.js'

export type Database = ReturnType<typeof createDatabase>['db']

export function createDatabase(config: Pick<AppConfig, 'DATABASE_URL'>) {
  if (!config.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for database-backed API routes.')
  }

  const client = postgres(config.DATABASE_URL, {
    // Supabase's transaction pooler shares server connections across functions.
    max: 3,
    idle_timeout: 5,
    connect_timeout: 10,
    prepare: false,
  })

  return {
    client,
    db: drizzle(client, { schema }),
  }
}
