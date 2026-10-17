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
  await assert.rejects(invalid('/api/v1/dashboard-data'), (error) => error.code === 'INVALID_RESPONSE')
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
