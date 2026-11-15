import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiError, createApiClient, validateDashboardResponse } from './client.js'

test('API requests include session credentials and mutation verification headers', async () => {
  const calls = []
  const request = createApiClient('https://api.example/', async (...args) => { calls.push(args); return { ok: true, json: async () => ({ data: {} }) } })
  await request('/api/v1/auth/login', { method: 'POST', body: { email: 'demo@example.test' } })
  assert.equal(calls[0][0], 'https://api.example/api/v1/auth/login')
  assert.equal(calls[0][1].credentials, 'include')
  assert.equal(calls[0][1].headers['x-dashboard-request'], '1')
  assert.equal(calls[0][1].cache, 'no-store')
  assert.equal(JSON.parse(calls[0][1].body).email, 'demo@example.test')
  await request('/api/v1/admin/teaching-assignments/1', { method: 'DELETE' })
  assert.equal(calls[1][1].headers['x-dashboard-request'], '1')
  assert.equal(calls[1][1].headers['content-type'], undefined)
  assert.equal(calls[1][1].body, undefined)
})

test('API errors preserve stable codes and reject unreadable success bodies', async () => {
  const denied = createApiClient('', async () => ({ ok: false, json: async () => ({ error: { code: 'UNAUTHENTICATED', message: 'Sign in.' } }) }))
  await assert.rejects(denied('/api/v1/dashboard-data'), (error) => error instanceof ApiError && error.code === 'UNAUTHENTICATED')
  const invalid = createApiClient('', async () => ({ ok: true, json: async () => { throw new Error('HTML') } }))
  await assert.rejects(invalid('/api/v1/dashboard-data'), (error) => error.code === 'INVALID_RESPONSE' && error.message === 'School records are temporarily unavailable. Please try again shortly.')
})

test('connection failures and server errors give useful messages without exposing diagnostics', async () => {
  const offline = createApiClient('', async () => { throw new TypeError('Failed to fetch') })
  await assert.rejects(offline('/api/v1/auth/session'), (error) => error.code === 'NETWORK_ERROR' && error.message.includes('Check your internet connection'))
  const failed = createApiClient('', async () => ({ ok: false, status: 500, json: async () => ({ error: { code: 'INTERNAL_ERROR', message: 'internal diagnostic' } }) }))
  await assert.rejects(failed('/api/v1/auth/session'), (error) => error.code === 'INTERNAL_ERROR' && !error.message.includes('diagnostic'))
  const controller = new AbortController()
  const cancelled = new DOMException('Cancelled', 'AbortError')
  controller.abort()
  const request = createApiClient('', async () => { throw cancelled })
  await assert.rejects(request('/api/v1/auth/session', { signal: controller.signal }), (error) => error === cancelled)
})

test('dashboard validation preserves empty and missing data and rejects malformed records', () => {
  const data = { students: [], subjects: [], grades: [], terms: [] }
  assert.equal(validateDashboardResponse({ data }), data)
  const record = { id: '1:1', studentId: 1, name: 'Demo', gender: null, grade: '7', term: 'Term 1', scores: { english: null, maths: 0 } }
  assert.equal(validateDashboardResponse({ data: { ...data, students: [record] } }).students[0].scores.english, null)
  for (const students of [[{ ...record, scores: { english: '80' } }], [{ ...record, scores: { english: 101 } }], [record, record], [{ ...record, studentId: undefined }]]) {
    assert.throws(() => validateDashboardResponse({ data: { ...data, students } }), ApiError)
  }
})
