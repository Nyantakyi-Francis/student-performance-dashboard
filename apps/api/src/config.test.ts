import { describe, expect, it } from 'vitest'
import { parseConfig } from './config.js'

describe('parseConfig', () => {
  it('supplies safe local defaults', () => {
    const config = parseConfig({ NODE_ENV: 'test' })

    expect(config.API_HOST).toBe('127.0.0.1')
    expect(config.API_PORT).toBe(3001)
    expect(config.LOG_LEVEL).toBe('info')
  })

  it('rejects an invalid port', () => {
    expect(() => parseConfig({ API_PORT: '70000' })).toThrow(
      'Invalid API configuration'
    )
  })
})
