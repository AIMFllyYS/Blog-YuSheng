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
  const totpSecret = readSecret(env.ADMIN_TOTP_SECRET)
  if (!username || !password || !totpSecret || !decodeBase32(totpSecret)) return undefined
  return { username, password, totpSecret }
}

/**
 * @param {{ username: string, password: string, totpSecret: string }} secrets
 * @param {{ username: string, password: string, code: string }} attempt
 * @param {number} [now]
 */
export async function credentialsMatch(secrets, attempt, now = Date.now()) {
  const username = timingSafeEqual(attempt.username, secrets.username)
  const password = timingSafeEqual(attempt.password, secrets.password)
  const code = await verifyTotp(secrets.totpSecret, attempt.code, now)
  return username && password && code
}

/**
 * 校验验证器上的 6 位 TOTP。允许前后各一个 30 秒窗口。
 * @param {string} secret
 * @param {string} code
 * @param {number} [now]
 */
export async function verifyTotp(secret, code, now = Date.now()) {
  if (!/^\d{6}$/u.test(code)) return false
  const key = decodeBase32(secret)
  if (!key) return false
  const counter = Math.floor(now / 1000 / 30)
  let matched = false
  for (const drift of [-1, 0, 1]) {
    const expected = await hotp(key, counter + drift)
    matched = timingSafeEqual(expected, code) || matched
  }
  return matched
}

/**
 * @param {string} secret
 * @param {number} [now]
 */
export async function totpAt(secret, now = Date.now()) {
  const key = decodeBase32(secret)
  if (!key) return undefined
  return hotp(key, Math.floor(now / 1000 / 30))
}

/**
 * @param {{ username: string, password: string, totpSecret: string }} secrets
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
 * @param {{ username: string, password: string, totpSecret: string }} secrets
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
 * @param {{ username: string, password: string, totpSecret: string }} secrets
 * @param {string} payload
 */
async function hmacHex(secrets, payload) {
  const material = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(`${secrets.username}\0${secrets.password}\0${secrets.totpSecret}`),
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

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/**
 * @param {string} secret
 * @returns {Uint8Array | undefined}
 */
function decodeBase32(secret) {
  const cleaned = secret.replace(/[\s=-]/gu, '').toUpperCase()
  if (cleaned.length < 16 || /[^A-Z2-7]/u.test(cleaned)) return undefined
  let bits = 0
  let value = 0
  const bytes = []
  for (const char of cleaned) {
    value = (value << 5) | BASE32.indexOf(char)
    bits += 5
    if (bits >= 8) {
      bits -= 8
      bytes.push((value >>> bits) & 0xff)
    }
  }
  return bytes.length >= 10 ? new Uint8Array(bytes) : undefined
}

/**
 * @param {Uint8Array} key
 * @param {number} counter
 */
async function hotp(key, counter) {
  const message = new ArrayBuffer(8)
  const view = new DataView(message)
  view.setUint32(0, Math.floor(counter / 2 ** 32))
  view.setUint32(4, counter >>> 0)
  const hmacKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', hmacKey, message))
  const offset = (signature.at(-1) ?? 0) & 0x0f
  const binary =
    ((signature[offset] & 0x7f) << 24) |
    (signature[offset + 1] << 16) |
    (signature[offset + 2] << 8) |
    signature[offset + 3]
  return String(binary % 1_000_000).padStart(6, '0')
}
