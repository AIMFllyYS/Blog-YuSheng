import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { VFile } from 'vfile'
import { matter } from 'vfile-matter'
import { parseVisibilitySource } from '../../src/server/visibility/visibility-json.mjs'

const POST_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u
const BRIEF_FILENAME_DATE = /(\d{4}-\d{2}-\d{2})\.html?$/iu

/**
 * @param {string} [root]
 */
export async function loadAdminCatalog(root = process.cwd()) {
  const visibility = await readVisibilityFile(path.join(root, 'content', 'visibility.json'))
  const hiddenPosts = new Set(visibility.posts)
  const hiddenBriefs = new Set(visibility.briefs)
  const [posts, briefs] = await Promise.all([
    loadPosts(path.join(root, 'content', 'posts'), hiddenPosts),
    loadBriefs(path.join(root, 'content', 'briefs'), hiddenBriefs),
  ])
  return { posts, briefs }
}

/**
 * @param {string} filePath
 */
async function readVisibilityFile(filePath) {
  const parsed = parseVisibilitySource(await readFile(filePath, 'utf8'))
  if (!parsed.ok) throw new Error(parsed.message)
  return parsed.value
}

/**
 * @param {string} postsRoot
 * @param {Set<string>} hiddenPosts
 */
async function loadPosts(postsRoot, hiddenPosts) {
  const entries = await readdir(postsRoot, { withFileTypes: true })
  const posts = []
  for (const entry of entries) {
    if (!entry.isDirectory() || !POST_SLUG.test(entry.name)) continue
    const source = await readFile(path.join(postsRoot, entry.name, 'index.md'), 'utf8')
    const frontmatter = readFrontmatter(source)
    if (!frontmatter || frontmatter.draft === true) continue
    const title = typeof frontmatter.title === 'string' ? frontmatter.title.trim() : ''
    const publishedAt =
      typeof frontmatter.publishedAt === 'string' ? frontmatter.publishedAt : ''
    if (!title || !publishedAt) continue
    posts.push({
      slug: entry.name,
      title,
      publishedAt,
      hidden: hiddenPosts.has(entry.name),
    })
  }
  return posts.sort((left, right) => {
    const byDate = Date.parse(right.publishedAt) - Date.parse(left.publishedAt)
    return byDate || left.slug.localeCompare(right.slug, 'en')
  })
}

/**
 * @param {string} source
 */
function readFrontmatter(source) {
  try {
    const file = new VFile({ value: source })
    matter(file)
    const data = file.data.matter
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return undefined
    return /** @type {Record<string, unknown>} */ (data)
  } catch {
    return undefined
  }
}

/**
 * @param {string} briefsRoot
 * @param {Set<string>} hiddenBriefs
 */
async function loadBriefs(briefsRoot, hiddenBriefs) {
  const files = (await collectHtmlFiles(briefsRoot)).sort()
  const seen = new Set()
  const briefs = []
  for (const filePath of files) {
    const date = BRIEF_FILENAME_DATE.exec(path.basename(filePath))?.[1]
    if (!date || seen.has(date)) continue
    seen.add(date)
    const source = await readFile(filePath, 'utf8')
    const title = readTitle(source) ?? `折晓早报 · ${date}`
    briefs.push({ date, title, hidden: hiddenBriefs.has(date) })
  }
  return briefs.sort((left, right) => (left.date < right.date ? 1 : -1))
}

/**
 * @param {string} root
 */
async function collectHtmlFiles(root) {
  const files = []
  let entries
  try {
    entries = await readdir(root, { withFileTypes: true })
  } catch (error) {
    if (isMissingDirectory(error)) return files
    throw error
  }
  for (const entry of entries) {
    const target = path.join(root, entry.name)
    if (entry.isDirectory()) files.push(...(await collectHtmlFiles(target)))
    else if (entry.isFile() && /\.html?$/iu.test(entry.name)) files.push(target)
  }
  return files
}

/**
 * @param {string} source
 */
function readTitle(source) {
  const text = /<title>([\s\S]*?)<\/title>/iu.exec(source)?.[1]?.replace(/\s+/gu, ' ').trim()
  return text || undefined
}

/**
 * @param {unknown} error
 */
function isMissingDirectory(error) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  )
}
