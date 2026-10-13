/**
 * @typedef {Object} VisibilityList
 * @property {readonly string[]} posts
 * @property {readonly string[]} briefs
 */

/**
 * @typedef {{ ok: true, value: { posts: string[], briefs: string[] } } | { ok: false, message: string }} VisibilityParseResult
 */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/u

/**
 * @param {string} slug
 */
export function isValidPostSlug(slug) {
  return SLUG_PATTERN.test(slug)
}

/**
 * @param {string} date
 */
export function isValidBriefDate(date) {
  const match = DATE_PATTERN.exec(date)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const utc = new Date(Date.UTC(year, month - 1, day))
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  )
}

/**
 * @param {unknown} value
 * @returns {VisibilityParseResult}
 */
export function parseVisibilityJson(value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, message: 'content/visibility.json 必须是对象' }
  }
  const record = /** @type {Record<string, unknown>} */ (value)
  const keys = Object.keys(record)
  if (keys.some((key) => key !== 'posts' && key !== 'briefs')) {
    return { ok: false, message: 'content/visibility.json 只能包含 posts 和 briefs' }
  }
  const posts = readIdList(record.posts, 'posts', isValidPostSlug, '文章 slug')
  if (!posts.ok) return posts
  const briefs = readIdList(record.briefs, 'briefs', isValidBriefDate, '早报日期')
  if (!briefs.ok) return briefs
  return { ok: true, value: { posts: posts.ids, briefs: briefs.ids } }
}

/**
 * @param {string} source
 * @returns {VisibilityParseResult}
 */
export function parseVisibilitySource(source) {
  let value
  try {
    value = JSON.parse(source)
  } catch {
    return { ok: false, message: 'content/visibility.json 不是合法 JSON' }
  }
  return parseVisibilityJson(value)
}

/**
 * @param {{ posts: readonly string[], briefs: readonly string[] }} list
 */
export function serializeVisibility(list) {
  return `${JSON.stringify(
    {
      posts: [...list.posts].sort((left, right) => left.localeCompare(right, 'en')),
      briefs: [...list.briefs].sort((left, right) => left.localeCompare(right, 'en')),
    },
    null,
    2,
  )}\n`
}

/**
 * @param {unknown} value
 * @param {string} field
 * @param {(id: string) => boolean} validate
 * @param {string} label
 * @returns {{ ok: true, ids: string[] } | { ok: false, message: string }}
 */
function readIdList(value, field, validate, label) {
  if (!Array.isArray(value)) {
    return { ok: false, message: `content/visibility.json 的 ${field} 必须是数组` }
  }
  const ids = []
  const seen = new Set()
  for (const item of value) {
    if (typeof item !== 'string' || !validate(item)) {
      return { ok: false, message: `content/visibility.json 的 ${field} 含有非法${label}` }
    }
    if (seen.has(item)) {
      return { ok: false, message: `content/visibility.json 的 ${field} 含有重复项 ${item}` }
    }
    seen.add(item)
    ids.push(item)
  }
  return { ok: true, ids }
}
