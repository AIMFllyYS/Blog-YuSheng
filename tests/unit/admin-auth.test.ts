import { describe, expect, it } from 'vitest'
import {
  credentialsMatch,
  readAdminSecrets,
  signAdminToken,
  totpAt,
  verifyAdminToken,
  verifyTotp,
} from '../../functions/lib/admin-auth.mjs'
import { handleAdminRequest } from '../../functions/lib/handle-admin.mjs'

const totpSecret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
const secrets = { username: 'yu', password: 'secret', totpSecret }
const env = {
  ADMIN_USERNAME: secrets.username,
  ADMIN_PASSWORD: secrets.password,
  ADMIN_TOTP_SECRET: totpSecret,
}
const catalog = {
  posts: [
    {
      slug: 'alpha',
      title: '甲',
      publishedAt: '2026-01-01T00:00:00+08:00',
      hidden: false,
    },
  ],
  briefs: [{ date: '2026-09-14', title: '折晓早报', hidden: false }],
}

describe('admin login', () => {
  it('accepts the current authenticator code and rejects a wrong one', async () => {
    const issuedAt = 59_000
    const code = await totpAt(totpSecret, issuedAt)
    expect(code).toBe('287082')
    expect(await verifyTotp(totpSecret, '287082', issuedAt)).toBe(true)
    expect(await verifyTotp(totpSecret, '287082', issuedAt + 60_000)).toBe(false)
    expect(await credentialsMatch(secrets, { ...secrets, code: '287082' }, issuedAt)).toBe(true)
    expect(await credentialsMatch(secrets, { ...secrets, code: '000000' }, issuedAt)).toBe(false)
    expect(readAdminSecrets({})).toBeUndefined()
    expect(readAdminSecrets({ ...env, ADMIN_TOTP_SECRET: 'not-a-secret' })).toBeUndefined()
  })

  it('expires the session token', async () => {
    const issuedAt = 1_700_000_000_000
    const token = await signAdminToken(secrets, issuedAt)
    expect(await verifyAdminToken(token, secrets, issuedAt + 1000)).toBe(true)
    expect(await verifyAdminToken(token, secrets, issuedAt + 12 * 60 * 60 * 1000)).toBe(false)
    expect(await verifyAdminToken(`${token}x`, secrets, issuedAt)).toBe(false)
  })

  it('returns the catalog after login and refuses online writes', async () => {
    const code = await totpAt(totpSecret)
    const login = await handleAdminRequest({
      request: new Request('https://blog.yusheng.email/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({
          username: secrets.username,
          password: secrets.password,
          code,
        }),
      }),
      env,
      catalog,
      canWrite: false,
    })
    expect(login.status).toBe(200)
    const { token } = (await login.json()) as { token: string }

    const listed = await handleAdminRequest({
      request: new Request('https://blog.yusheng.email/api/admin/catalog', {
        headers: { authorization: `Bearer ${token}` },
      }),
      env,
      catalog,
      canWrite: false,
    })
    expect(listed.status).toBe(200)
    await expect(listed.json()).resolves.toMatchObject({ canWrite: false, posts: catalog.posts })

    const write = await handleAdminRequest({
      request: new Request('https://blog.yusheng.email/api/admin/visibility', {
        method: 'PUT',
        headers: { authorization: `Bearer ${token}` },
        body: JSON.stringify({ posts: ['alpha'], briefs: [] }),
      }),
      env,
      catalog,
      canWrite: false,
    })
    expect(write.status).toBe(409)
  })
})
