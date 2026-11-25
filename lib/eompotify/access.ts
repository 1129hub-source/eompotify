// Server-side only: never import this module into a Client Component.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

export const ACCESS_COOKIE = 'eompotify_access_v1'
export const ACCESS_MAX_AGE = 400 * 24 * 60 * 60

function config() {
  const password = process.env.EOMPOTIFY_ACCESS_PASSWORD
  const secret = process.env.EOMPOTIFY_ACCESS_SECRET
  return password && secret && secret.length >= 32 ? { password, secret } : null
}

export function isAccessConfigured(): boolean {
  return config() !== null
}

function equalText(a: string, b: string): boolean {
  return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest())
}

export function matchesAccessPassword(input: string): boolean {
  const settings = config()
  return !!settings && input.length <= 256 && equalText(input, settings.password)
}

function sign(expires: string, settings: NonNullable<ReturnType<typeof config>>): string {
  // Including the password invalidates old sessions when the password changes.
  return createHmac('sha256', settings.secret)
    .update(JSON.stringify(['eompotify-access-v1', settings.password, expires]))
    .digest('hex')
}

export function issueAccessToken(now = Date.now()): string {
  const settings = config()
  if (!settings) throw new Error('Access configuration missing')
  const expires = String(Math.floor(now / 1000) + ACCESS_MAX_AGE)
  return `${expires}.${sign(expires, settings)}`
}

export function hasValidAccess(token: string | undefined, now = Date.now()): boolean {
  const settings = config()
  if (!settings || !token || !/^\d{1,12}\.[a-f0-9]{64}$/.test(token)) return false
  const [expires, signature] = token.split('.')
  if (Number(expires) <= Math.floor(now / 1000)) return false
  return equalText(signature, sign(expires, settings))
}
