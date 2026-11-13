import { afterEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from './app.js'
import { parseConfig } from './config.js'

let app: FastifyInstance | undefined

afterEach(async () => {
  await app?.close()
  app = undefined
})

describe('API application', () => {
  it('allows its exact Vercel preview origin and rejects an origin supplied through forwarded headers', async () => {
    app = await buildApp({ config: parseConfig({ NODE_ENV: 'test', VERCEL_URL: 'dashboard-preview.vercel.app' }) })
    expect((await app.inject({ method: 'GET', url: '/health', headers: { origin: 'https://dashboard-preview.vercel.app' } })).statusCode).toBe(200)
    const denied = await app.inject({ method: 'GET', url: '/health', headers: { origin: 'https://attacker.example', 'x-forwarded-host': 'attacker.example' } })
    expect(denied.statusCode).toBe(403)
    expect(denied.json().error.code).toBe('ORIGIN_DENIED')
  })
  it('reports health without requiring a database connection', async () => {
    app = await buildApp({ config: parseConfig({ NODE_ENV: 'test' }) })

    const response = await app.inject({ method: 'GET', url: '/health' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      data: {
        service: 'student-dashboard-api',
        status: 'ok',
      },
    })
  })

  it('returns a stable error contract for unknown routes', async () => {
    app = await buildApp({ config: parseConfig({ NODE_ENV: 'test' }) })

    const response = await app.inject({ method: 'GET', url: '/missing' })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toMatchObject({
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'The requested route was not found.',
        fields: [],
      },
    })
  })
})
