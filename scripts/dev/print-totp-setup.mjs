import { randomBytes } from 'node:crypto'

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const bytes = randomBytes(20)
let bits = 0
let value = 0
let secret = ''
for (const byte of bytes) {
  value = (value << 8) | byte
  bits += 8
  while (bits >= 5) {
    bits -= 5
    secret += alphabet[(value >>> bits) & 31]
  }
}
if (bits > 0) secret += alphabet[(value << (5 - bits)) & 31]

const issuer = 'YuSheng'
const label = `${issuer}:admin`
const url = `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`

console.log(`ADMIN_TOTP_SECRET=${secret}`)
console.log(url)
