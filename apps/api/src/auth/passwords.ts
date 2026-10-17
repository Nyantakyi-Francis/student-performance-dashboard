import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto'

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error)
      else resolve(key)
    })
  })
}

export async function hashPassword(password: string) {
  const salt = randomBytes(32).toString('hex')
  const key = await derive(password, salt)
  return `scrypt:${salt}:${key.toString('hex')}`
}

export async function verifyPassword(password: string, hash: string) {
  const [algorithm, salt, encoded] = hash.split(':')
  if (algorithm !== 'scrypt' || !salt || !encoded || !/^[a-f0-9]{128}$/.test(encoded)) return false
  const actual = await derive(password, salt)
  return timingSafeEqual(actual, Buffer.from(encoded, 'hex'))
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}
