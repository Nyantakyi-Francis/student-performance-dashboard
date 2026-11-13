import { afterAll, beforeAll, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { sql } from 'drizzle-orm'
import { createDatabase } from '../database/client.js'
import { postgresRateLimitStore } from '../auth/rate-limit-store.js'

const url = process.env.TEST_DATABASE_URL
if (!url || !new URL(url).pathname.endsWith('_test')) throw new Error('Use a dedicated _test database.')
const first = createDatabase({ DATABASE_URL: url })
const second = createDatabase({ DATABASE_URL: url })
beforeAll(async () => { await migrate(first.db, { migrationsFolder: fileURLToPath(new URL('../../drizzle', import.meta.url)) }) })
afterAll(async () => { await Promise.all([first.client.end(), second.client.end()]) })

it('shares atomic budgets between separate connection pools, scopes routes and resets expired windows', async () => {
  const A = postgresRateLimitStore(first.db), B = postgresRateLimitStore(second.db)
  const a = new A({}), b = new B({}), key = randomUUID()
  const increment = (store: typeof a) => new Promise<{ current: number; ttl: number }>((resolve, reject) => {
    store.incr(key, (error, result) => error ? reject(error) : resolve(result!), 60_000, 10)
  })
  const results = await Promise.all(Array.from({ length: 20 }, (_, i) => increment(i % 2 ? a : b)))
  expect(results.map((r) => r.current).sort((x, y) => x - y)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1))
  expect(results.every((r) => r.ttl > 0 && r.ttl <= 60_000)).toBe(true)
  const route = { routeInfo: { method: 'POST', url: '/login' } }
  expect((await increment(a.child(route as never))).current).toBe(1)
  expect((await increment(b.child(route as never))).current).toBe(2)
  await first.db.execute(sql`update rate_limit_buckets set expires_at = now() - interval '1 second'`)
  expect((await increment(b)).current).toBe(1)
})
