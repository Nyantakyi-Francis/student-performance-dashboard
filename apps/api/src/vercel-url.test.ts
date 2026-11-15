import { describe, expect, it } from 'vitest'
import { normalizeVercelRequestUrl } from './vercel-url.js'

describe('Vercel request routing', () => {
  it('removes the wildcard injected by the hosted rewrite', () => {
    expect(normalizeVercelRequestUrl('/api/v1/dashboard-data?path=v1%2Fdashboard-data')).toBe('/api/v1/dashboard-data')
  })
  it('preserves school filters and other application parameters for validation', () => {
    expect(normalizeVercelRequestUrl('/api/v1/dashboard-data?schoolId=99&path=v1%2Fdashboard-data&unexpected=1')).toBe('/api/v1/dashboard-data?schoolId=99&unexpected=1')
  })
  it('preserves unmatched or duplicated path values for validation', () => {
    expect(normalizeVercelRequestUrl('/api/v1/dashboard-data?path=other')).toBe('/api/v1/dashboard-data?path=other')
    expect(normalizeVercelRequestUrl('/api/v1/dashboard-data?path=v1%2Fdashboard-data&path=other')).toBe('/api/v1/dashboard-data?path=v1%2Fdashboard-data&path=other')
  })
  it('handles the health alias and leaves ordinary API requests intact', () => {
    expect(normalizeVercelRequestUrl('/api/health?path=health')).toBe('/health')
    expect(normalizeVercelRequestUrl('/api/v1/auth/session')).toBe('/api/v1/auth/session')
  })
})
