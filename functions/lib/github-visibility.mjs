import {
  parseVisibilitySource,
  serializeVisibility,
} from '../../src/server/visibility/visibility-json.mjs'

const DEFAULT_REPO = 'AIMFllyYS/Blog-YuSheng'
const DEFAULT_BRANCH = 'main'
const VISIBILITY_PATH = 'content/visibility.json'
const REPO_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u

/**
 * @typedef {Object} GithubVisibilityConfig
 * @property {string} token
 * @property {string} repo
 * @property {string} branch
 * @property {string} path
 */

/**
 * @param {Record<string, unknown>} env
 * @returns {GithubVisibilityConfig | undefined}
 */
export function readGithubConfig(env) {
  const token = readNonEmptyString(env.ADMIN_GITHUB_TOKEN) ?? readNonEmptyString(env.GITHUB_TOKEN)
  if (!token) return undefined
  const rawRepo =
    readNonEmptyString(env.ADMIN_GITHUB_REPO) ??
    readNonEmptyString(env.GITHUB_REPOSITORY) ??
    DEFAULT_REPO
  const repo = REPO_PATTERN.test(rawRepo) ? rawRepo : DEFAULT_REPO
  const branch = readNonEmptyString(env.ADMIN_GITHUB_BRANCH) ?? DEFAULT_BRANCH
  return {
    token,
    repo,
    branch,
    path: VISIBILITY_PATH,
  }
}

/**
 * @template {{ posts: { slug: string, hidden: boolean }[], briefs: { date: string, hidden: boolean }[] }} T
 * @param {T} baseCatalog
 * @param {{ posts: readonly string[], briefs: readonly string[] }} visibility
 * @returns {T}
 */
export function applyVisibilityToCatalog(baseCatalog, visibility) {
  const hiddenPosts = new Set(visibility.posts)
  const hiddenBriefs = new Set(visibility.briefs)
  return {
    ...baseCatalog,
    posts: baseCatalog.posts.map((post) => ({
      ...post,
      hidden: hiddenPosts.has(post.slug),
    })),
    briefs: baseCatalog.briefs.map((brief) => ({
      ...brief,
      hidden: hiddenBriefs.has(brief.date),
    })),
  }
}

/**
 * @param {GithubVisibilityConfig} config
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<{ visibility: { posts: string[], briefs: string[] }, sha: string }>}
 */
export async function fetchGithubVisibility(config, fetchImpl = fetch) {
  const url = `${contentsUrl(config)}?ref=${encodeURIComponent(config.branch)}`
  const response = await fetchImpl(url, {
    method: 'GET',
    headers: githubHeaders(config.token),
  })
  if (!response.ok) {
    throw new Error(`读取 GitHub 可见性清单失败（HTTP ${response.status}）`)
  }
  const payload = /** @type {Record<string, unknown>} */ (await response.json())
  const sha = typeof payload.sha === 'string' ? payload.sha : ''
  const encoded = typeof payload.content === 'string' ? payload.content : ''
  if (!sha || !encoded) {
    throw new Error('GitHub 返回的 content/visibility.json 缺少 sha 或内容')
  }
  const source = decodeBase64Utf8(encoded)
  const parsed = parseVisibilitySource(source)
  if (!parsed.ok) {
    throw new Error(parsed.message)
  }
  return { visibility: parsed.value, sha }
}

/**
 * @param {GithubVisibilityConfig} config
 * @param {{ posts: readonly string[], briefs: readonly string[] }} nextVisibility
 * @param {typeof fetch} [fetchImpl]
 */
export async function writeGithubVisibility(config, nextVisibility, fetchImpl = fetch) {
  const current = await fetchGithubVisibility(config, fetchImpl)
  const currentSerialized = serializeVisibility(current.visibility)
  const nextSerialized = serializeVisibility(nextVisibility)
  if (currentSerialized === nextSerialized) {
    return
  }

  const response = await fetchImpl(contentsUrl(config), {
    method: 'PUT',
    headers: {
      ...githubHeaders(config.token),
      'content-type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      message: 'chore(visibility): update content/visibility.json',
      content: encodeBase64Utf8(nextSerialized),
      sha: current.sha,
      branch: config.branch,
    }),
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('GitHub Token 权限不足，请确认已开启仓库 Contents 读写权限')
    }
    if (response.status === 409) {
      throw new Error('仓库中的 content/visibility.json 刚刚有并发改动，请刷新后再试')
    }
    throw new Error(`写回 GitHub 仓库失败（HTTP ${response.status}）`)
  }
}

/**
 * @param {GithubVisibilityConfig} config
 */
function contentsUrl(config) {
  return `https://api.github.com/repos/${config.repo}/contents/${config.path}`
}

/**
 * @param {string} token
 */
function githubHeaders(token) {
  return {
    accept: 'application/vnd.github+json',
    authorization: `Bearer ${token}`,
    'x-github-api-version': '2022-11-28',
    'user-agent': 'blog-yusheng-admin',
  }
}

/**
 * @param {unknown} value
 */
function readNonEmptyString(value) {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/**
 * @param {string} value
 */
function encodeBase64Utf8(value) {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

/**
 * @param {string} encoded
 */
function decodeBase64Utf8(encoded) {
  const cleaned = encoded.replace(/\s+/gu, '')
  const binary = atob(cleaned)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}
