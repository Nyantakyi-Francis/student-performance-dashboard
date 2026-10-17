import { describe, expect, it } from 'vitest'
import { hashPassword, hashToken, verifyPassword } from './passwords.js'
describe('password and session secrets', () => {
  it('salts passwords and verifies valid credentials only', async () => {
    const first = await hashPassword('Synthetic-password-2026')
    const second = await hashPassword('Synthetic-password-2026')
    expect(first).not.toBe(second)
    expect(await verifyPassword('Synthetic-password-2026', first)).toBe(true)
    expect(await verifyPassword('wrong', first)).toBe(false)
    expect(await verifyPassword('wrong', 'corrupt')).toBe(false)
  }, 15000)
  it('uses deterministic hashes without storing raw session tokens', () => {
    expect(hashToken('secret')).toBe(hashToken('secret'))
    expect(hashToken('secret')).not.toContain('secret')
    expect(hashToken('secret')).not.toBe(hashToken('different'))
  })
})
