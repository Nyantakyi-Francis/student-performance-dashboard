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
