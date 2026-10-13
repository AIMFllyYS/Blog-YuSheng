const encoder = new TextEncoder()
const SESSION_TTL_MS = 12 * 60 * 60 * 1000

/**
 * @param {string} left
 * @param {string} right
 */
export function timingSafeEqual(left, right) {
  const a = encoder.encode(left)
  const b = encoder.encode(right)
  let diff = a.length ^ b.length
  const length = Math.max(a.length, b.length)
  for (let index = 0; index < length; index += 1) {
    diff |= (a[index] ?? 0) ^ (b[index] ?? 0)
  }
  return diff === 0
}

/**
 * @param {Record<string, unknown>} env
 */
export function readAdminSecrets(env) {
  const username = readSecret(env.ADMIN_USERNAME)
  const password = readSecret(env.ADMIN_PASSWORD)
  const rfa = readSecret(env.ADMIN_RFA)
  if (!username || !password || !rfa) return undefined
  return { username, password, rfa }
}

/**
 * @param {{ username: string, password: string, rfa: string }} secrets
 * @param {{ username: string, password: string, rfa: string }} attempt
 */
export function credentialsMatch(secrets, attempt) {
  const username = timingSafeEqual(attempt.username, secrets.username)
  const password = timingSafeEqual(attempt.password, secrets.password)
  const rfa = timingSafeEqual(attempt.rfa, secrets.rfa)
  return username && password && rfa
}

/**
 * @param {{ username: string, password: string, rfa: string }} secrets
 * @param {number} [now]
 */
export async function signAdminToken(secrets, now = Date.now()) {
  const payload = base64url(
    JSON.stringify({ exp: now + SESSION_TTL_MS }),
  )
  const signature = await hmacHex(secrets, payload)
  return `${payload}.${signature}`
}

/**
 * @param {string} token
 * @param {{ username: string, password: string, rfa: string }} secrets
 * @param {number} [now]
 */
export async function verifyAdminToken(token, secrets, now = Date.now()) {
  const separator = token.indexOf('.')
  if (separator <= 0) return false
  const payload = token.slice(0, separator)
  const signature = token.slice(separator + 1)
  const expected = await hmacHex(secrets, payload)
  if (!timingSafeEqual(signature, expected)) return false
  try {
    const parsed = JSON.parse(decodeBase64url(payload))
    return (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.exp === 'number' &&
      parsed.exp > now
    )
  } catch {
    return false
  }
}

/**
 * @param {unknown} value
 */
function readSecret(value) {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/**
 * @param {{ username: string, password: string, rfa: string }} secrets
 * @param {string} payload
 */
async function hmacHex(secrets, payload) {
  const material = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(`${secrets.username}\0${secrets.password}\0${secrets.rfa}`),
  )
  const key = await crypto.subtle.importKey(
    'raw',
    material,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * @param {string} value
 */
function base64url(value) {
  const bytes = encoder.encode(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '')
}

/**
 * @param {string} value
 */
function decodeBase64url(value) {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}
