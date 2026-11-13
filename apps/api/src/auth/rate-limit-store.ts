import { createHash } from 'node:crypto'
import { sql } from 'drizzle-orm'
import type { FastifyRateLimitStore, FastifyRateLimitStoreCtor } from '@fastify/rate-limit'
import type { Database } from '../database/client.js'

/** Atomic fixed windows shared by all function instances. Persist only hashed keys. */
export function postgresRateLimitStore(database: Database): FastifyRateLimitStoreCtor {
  return class PostgresStore implements FastifyRateLimitStore {
    constructor(_options?: unknown, private namespace = 'global') {}

    child(options: unknown): FastifyRateLimitStore {
      const route = (options as { routeInfo?: { method?: string; url?: string } }).routeInfo
      return new PostgresStore(undefined, `route:${route?.method ?? ''}:${route?.url ?? ''}`)
    }

    incr(key: string, callback: (error: Error | null, result?: { current: number; ttl: number }) => void, timeWindow: number): void {
      const hash = createHash('sha256').update(`${this.namespace}:${key}`).digest('hex')
      void database.execute(sql`
        with expired as (
          delete from rate_limit_buckets where key in (
            select key from rate_limit_buckets
            where expires_at < now() and key <> ${hash}
            order by expires_at limit 100 for update skip locked
          )
        )
        insert into rate_limit_buckets (key, hits, expires_at)
        values (${hash}, 1, now() + ${timeWindow} * interval '1 millisecond')
        on conflict (key) do update set
          hits = case when rate_limit_buckets.expires_at <= now() then 1 else rate_limit_buckets.hits + 1 end,
          expires_at = case when rate_limit_buckets.expires_at <= now()
            then now() + ${timeWindow} * interval '1 millisecond' else rate_limit_buckets.expires_at end
        returning hits, greatest(1, ceil(extract(epoch from (expires_at - now())) * 1000)) as ttl
      `).then((rows) => {
        const row = rows[0]!
        callback(null, { current: Number(row.hits), ttl: Number(row.ttl) })
      }, (error: Error) => callback(error))
    }
  }
}
