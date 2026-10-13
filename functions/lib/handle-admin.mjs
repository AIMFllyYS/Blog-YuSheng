import { credentialsMatch, readAdminSecrets, signAdminToken, verifyAdminToken } from './admin-auth.mjs'
import { parseVisibilityJson } from '../../src/server/visibility/visibility-json.mjs'

const MAX_BODY_BYTES = 64 * 1024

/**
 * @param {{
 *   request: Request,
 *   env: Record<string, unknown>,
 *   catalog: { posts: AdminPost[], briefs: AdminBrief[] },
 *   canWrite: boolean,
 *   reloadCatalog?: () => Promise<{ posts: AdminPost[], briefs: AdminBrief[] }>,
 *   writeVisibility?: (list: { posts: string[], briefs: string[] }) => Promise<void>,
 *   allowOrigins?: readonly string[],
 * }} options
 */
export async function handleAdminRequest({
  request,
  env,
  catalog,
  canWrite,
  reloadCatalog,
  writeVisibility,
  allowOrigins = [],
}) {
  const origin = request.headers.get('origin')
  const corsOrigin = origin && allowOrigins.includes(origin) ? origin : undefined
  if (request.method === 'OPTIONS') return emptyResponse(204, corsOrigin)

  const url = new URL(request.url)
  const pathname = url.pathname.replace(/\/+$/u, '') || '/'
  const secrets = readAdminSecrets(env)
  if (!secrets) {
    return json({ error: '后台登录还没有配置环境变量' }, 503, corsOrigin)
  }

  if (request.method === 'POST' && pathname === '/api/admin/login') {
    const body = await readJson(request)
    if (!body.ok) return json({ error: body.error }, body.status, corsOrigin)
    const attempt = readAttempt(body.value)
    if (!attempt) return json({ error: '请填写用户名、密码和验证码' }, 400, corsOrigin)
    if (!(await credentialsMatch(secrets, attempt))) {
      return json({ error: '登录没有通过' }, 401, corsOrigin)
    }
    return json({ token: await signAdminToken(secrets) }, 200, corsOrigin)
  }

  if (!(await authorized(request, secrets))) {
    return json({ error: '请先登录' }, 401, corsOrigin)
  }

  if (request.method === 'GET' && pathname === '/api/admin/catalog') {
    return json({ canWrite, ...catalog }, 200, corsOrigin)
  }

  if (request.method === 'PUT' && pathname === '/api/admin/visibility') {
    if (!canWrite || !writeVisibility || !reloadCatalog) {
      return json(
        {
          error:
            '线上部署不能写回仓库。请在本地 pnpm dev 里保存，再提交 content/visibility.json。',
        },
        409,
        corsOrigin,
      )
    }
    const body = await readJson(request)
    if (!body.ok) return json({ error: body.error }, body.status, corsOrigin)
    const parsed = parseVisibilityJson(body.value)
    if (!parsed.ok) return json({ error: parsed.message }, 400, corsOrigin)
    const unknownPost = parsed.value.posts.find(
      (slug) => !catalog.posts.some((post) => post.slug === slug),
    )
    const unknownBrief = parsed.value.briefs.find(
      (date) => !catalog.briefs.some((brief) => brief.date === date),
    )
    if (unknownPost || unknownBrief) {
      return json({ error: '隐藏名单里有当前内容中不存在的项目' }, 400, corsOrigin)
    }
    await writeVisibility(parsed.value)
    const nextCatalog = await reloadCatalog()
    return json({ canWrite: true, ...nextCatalog }, 200, corsOrigin)
  }

  return json({ error: '没有这个接口' }, 404, corsOrigin)
}

/**
 * @param {Request} request
 * @param {{ username: string, password: string, totpSecret: string }} secrets
 */
async function authorized(request, secrets) {
  const header = request.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''
  if (!token) return false
  return verifyAdminToken(token, secrets)
}

/**
 * @param {unknown} value
 */
function readAttempt(value) {
  if (typeof value !== 'object' || value === null) return undefined
  const record = /** @type {Record<string, unknown>} */ (value)
  if (
    typeof record.username !== 'string' ||
    typeof record.password !== 'string' ||
    typeof record.code !== 'string'
  ) {
    return undefined
  }
  return {
    username: record.username,
    password: record.password,
    code: record.code.trim(),
  }
}

/**
 * @param {Request} request
 */
async function readJson(request) {
  const length = Number(request.headers.get('content-length') ?? '0')
  if (length > MAX_BODY_BYTES) return { ok: false, status: 413, error: '请求太大' }
  try {
    const text = await request.text()
    if (text.length > MAX_BODY_BYTES) return { ok: false, status: 413, error: '请求太大' }
    return { ok: true, value: JSON.parse(text) }
  } catch {
    return { ok: false, status: 400, error: '请求不是合法 JSON' }
  }
}

/**
 * @param {unknown} body
 * @param {number} status
 * @param {string | undefined} corsOrigin
 */
function json(body, status, corsOrigin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: headers(corsOrigin),
  })
}

/**
 * @param {number} status
 * @param {string | undefined} corsOrigin
 */
function emptyResponse(status, corsOrigin) {
  return new Response(null, { status, headers: headers(corsOrigin) })
}

/**
 * @param {string | undefined} corsOrigin
 */
function headers(corsOrigin) {
  const result = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  })
  if (corsOrigin) {
    result.set('access-control-allow-origin', corsOrigin)
    result.set('access-control-allow-headers', 'authorization, content-type')
    result.set('access-control-allow-methods', 'GET, POST, PUT, OPTIONS')
    result.set('vary', 'origin')
  }
  return result
}
