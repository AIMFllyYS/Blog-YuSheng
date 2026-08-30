import 'server-only'

import { readFile, readdir, realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import { ContentBuildError } from './content-error'
import { collectAssetReferences } from './collect-asset-references'
import { CONTENT_POSTS_ROOT } from './content-paths'
import { readAllPosts } from './discover-posts'
import { validateHtmlEmbedProtocol } from './html-embed-protocol'
import { validateArticleAssetPath } from './validate-assets'
import type { FrontmatterDiagnostic, SourceRange } from './validate-frontmatter'
import { getCanvasRendererRegistration } from '../../features/doc-engine/registry/canvas-renderer-registry'
import { CHOICE_QUESTION_DATA_SCHEMA } from '../../features/doc-engine/renderers/quiz-choice/schema'
import { FILL_BLANK_QUESTION_DATA_SCHEMA } from '../../features/doc-engine/renderers/quiz-fill/schema'
import { ARTICLE_PALETTE_SCHEMA } from '../../features/doc-engine/mark-style'
import { sanitizeSvgSource } from './sanitize-svg'

export const MAX_STATIC_FILE_BYTES = 25 * 1024 * 1024
export const MAX_STATIC_FILE_COUNT = 20_000

export type AssetManifestEntry = {
  id: string
  articleSlug: string
  nodeId: string
  nodeName: string
  attribute: string
  sourcePath: string
  outputPath: string
  publicUrl: string
  bytes: number
  transform?: 'sanitize-svg'
  derivedFrom?: string
  image?: {
    width: number
    height: number
    format: string
    derived: boolean
    quality?: number
  }
  data?: unknown
  sourceRange: SourceRange
}

export async function createAssetManifest(postsRoot?: string) {
  const enforceHtmlEmbedProtocol =
    path.resolve(postsRoot ?? CONTENT_POSTS_ROOT) ===
    path.resolve(CONTENT_POSTS_ROOT)
  const posts = await readAllPosts(postsRoot)
  const entries: AssetManifestEntry[] = []
  const diagnostics: FrontmatterDiagnostic[] = []
  const outputOwners = new Map<string, string>()

  for (const post of posts) {
    const collected = await collectAssetReferences(post)
    diagnostics.push(...collected.diagnostics)
    const seenIds = new Set<string>()
    for (const component of collected.componentIds) {
      if (seenIds.has(component.id)) {
        diagnostics.push(
          diagnostic(
            post.slug,
            'ASSET_COMPONENT_ID_DUPLICATE',
            `组件 ID 重复：${component.id}`,
            component.sourceRange,
            component.id,
          ),
        )
      }
      seenIds.add(component.id)
    }

    for (const reference of collected.references) {
      const validation = await validateArticleAssetPath({
        articleRoot: post.packageRoot,
        articleSlug: post.slug,
        relativePath: reference.relativePath,
        source: post.source,
        sourceOffset: reference.sourceRange.start.offset,
        sourceLength:
          reference.sourceRange.end.offset -
          reference.sourceRange.start.offset,
      })
      if (!validation.ok) {
        diagnostics.push(
          ...validation.diagnostics.map((item) => ({
            ...item,
            nodeId: reference.nodeId,
          })),
        )
        continue
      }

      const structureDiagnostic = validateReferenceStructure(
        reference.nodeName,
        reference.nodeId,
        reference.attribute,
        validation.relativePath,
        post.slug,
        reference.sourceRange,
      )
      if (structureDiagnostic) {
        diagnostics.push(structureDiagnostic)
        continue
      }

      let files: string[]
      try {
        files =
          reference.nodeName === 'html-embed'
            ? await collectEmbedFiles(
                validation.absolutePath,
                post.slug,
                reference.nodeId,
                reference.sourceRange,
              )
            : [validation.absolutePath]
      } catch (error) {
        if (error instanceof ContentBuildError) {
          diagnostics.push(...error.diagnostics)
          continue
        }
        throw error
      }
      for (const sourcePath of files) {
        let manifestData: unknown
        const file = await stat(sourcePath)
        if (!file.isFile()) {
          diagnostics.push(
            diagnostic(
              post.slug,
              'ASSET_FILE_TYPE_INVALID',
              `文章资源必须是文件：${reference.relativePath}`,
              reference.sourceRange,
              reference.nodeId,
            ),
          )
          continue
        }
        if (file.size > MAX_STATIC_FILE_BYTES) {
          diagnostics.push(
            diagnostic(
              post.slug,
              'ASSET_FILE_TOO_LARGE',
              `文章资源超过 25 MB：${reference.relativePath}`,
              reference.sourceRange,
              reference.nodeId,
            ),
          )
          continue
        }
        if (!(await hasExpectedFileType(sourcePath))) {
          diagnostics.push(
            diagnostic(
              post.slug,
              'ASSET_FILE_TYPE_INVALID',
              `资源扩展名与真实内容不匹配：${relativeDisplayPath(sourcePath, post.packageRoot)}`,
              reference.sourceRange,
              reference.nodeId,
            ),
          )
          continue
        }
        if (
          enforceHtmlEmbedProtocol &&
          reference.nodeName === 'html-embed' &&
          sourcePath === validation.absolutePath
        ) {
          const protocol = validateHtmlEmbedProtocol(
            await readFile(sourcePath, 'utf8'),
          )
          if (!protocol.ok) {
            diagnostics.push(
              diagnostic(
                post.slug,
                'ASSET_HTML_HANDSHAKE_MISSING',
                `HTML embed 未通过宿主握手协议：${protocol.reason}`,
                reference.sourceRange,
                reference.nodeId,
              ),
            )
            continue
          }
        }
        if (reference.nodeName === 'svg-embed') {
          const source = decodeStrictText(await readFile(sourcePath))
          const sanitized = source ? sanitizeSvgSource(source) : undefined
          if (!sanitized?.ok) {
            diagnostics.push(
              diagnostic(
                post.slug,
                'ASSET_SVG_UNSAFE',
                `SVG 未通过构建期安全清洗：${sanitized?.reason ?? reference.relativePath}`,
                reference.sourceRange,
                reference.nodeId,
              ),
            )
            continue
          }
        }
        if (
          reference.nodeName === 'canvas-render' &&
          reference.attribute === 'data-src'
        ) {
          const registration = reference.componentRenderer
            ? getCanvasRendererRegistration(reference.componentRenderer)
            : undefined
          const data = await readJsonValue(sourcePath)
          if (!registration || !registration.validateData(data)) {
            diagnostics.push(
              diagnostic(
                post.slug,
                'ASSET_DATA_SCHEMA_INVALID',
                `Canvas 数据未通过 renderer ${reference.componentRenderer ?? ''} 的 schema：${reference.relativePath}`,
                reference.sourceRange,
                reference.nodeId,
              ),
            )
            continue
          }
          manifestData = data
        }
        if (
          (reference.nodeName === 'choice-question' ||
            reference.nodeName === 'fill-blank-question') &&
          reference.attribute === 'data-src'
        ) {
          const rawData = await readJsonValue(sourcePath)
          const parsed =
            reference.nodeName === 'choice-question'
              ? CHOICE_QUESTION_DATA_SCHEMA.safeParse(rawData)
              : FILL_BLANK_QUESTION_DATA_SCHEMA.safeParse(rawData)
          if (!parsed.success) {
            diagnostics.push(
              diagnostic(
                post.slug,
                'ASSET_DATA_SCHEMA_INVALID',
                `${reference.nodeName} 数据未通过构建期 schema：${reference.relativePath}`,
                reference.sourceRange,
                reference.nodeId,
              ),
            )
            continue
          }
          manifestData = parsed.data
        }
        if (
          reference.attribute === 'swatch' &&
          validation.relativePath.replace(/^\.\//, '') === 'data/palette.json'
        ) {
          const parsed = ARTICLE_PALETTE_SCHEMA.safeParse(await readJsonValue(sourcePath))
          if (!parsed.success) {
            diagnostics.push(
              diagnostic(
                post.slug,
                'ASSET_DATA_SCHEMA_INVALID',
                `文章色板未通过 schema：${reference.relativePath}`,
                reference.sourceRange,
                reference.nodeId,
              ),
            )
            continue
          }
          manifestData = parsed.data
        }
        const relativePath = reference.nodeName === 'html-embed'
          ? path.posix.join(path.posix.dirname(validation.relativePath), path.relative(path.dirname(validation.absolutePath), sourcePath).split(path.sep).join('/'))
          : validation.relativePath
        const outputPath = toOutputPath(post.slug, relativePath)
        const owner = `${post.slug}:${reference.nodeId}:${relativePath}`
        const previous = outputOwners.get(outputPath.toLowerCase())
        const sourceIdentity = sourcePath
        if (previous && previous !== sourceIdentity) {
          diagnostics.push(
            diagnostic(
              post.slug,
              'ASSET_OUTPUT_COLLISION',
              `静态资源目标冲突：${outputPath}`,
              reference.sourceRange,
              reference.nodeId,
            ),
          )
          continue
        }
        outputOwners.set(outputPath.toLowerCase(), sourceIdentity)
        if (post.frontmatter.draft === true) continue
        const publicUrl = `/${outputPath}`
        entries.push({
          id: owner,
          articleSlug: post.slug,
          nodeId: reference.nodeId,
          nodeName: reference.nodeName,
          attribute: reference.attribute,
          sourcePath,
          outputPath,
          publicUrl,
          bytes: file.size,
          data: manifestData,
          transform:
            reference.nodeName === 'svg-embed' ? 'sanitize-svg' : undefined,
          sourceRange: reference.sourceRange,
        })
      }
    }
  }

  if (diagnostics.length > 0) throw new ContentBuildError('文章资产 manifest 校验失败', diagnostics)
  return deduplicateEntries(entries)
}

function toOutputPath(slug: string, relativePath: string) {
  if (relativePath.startsWith('embeds/')) {
    return path.posix.join(
      'embeds',
      slug,
      relativePath.slice('embeds/'.length),
    )
  }
  return path.posix.join('blog', slug, relativePath)
}

async function collectEmbedFiles(
  entryPath: string,
  articleSlug: string,
  nodeId: string,
  sourceRange: SourceRange,
) {
  const root = path.dirname(entryPath)
  const realRoot = await realpath(root)
  const files: string[] = []
  async function walk(directory: string) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name)
      if (entry.isSymbolicLink()) {
        throw new ContentBuildError('HTML embed 禁止链接型传递资源', [
          diagnostic(
            articleSlug,
            'ASSET_EMBED_LINK_FORBIDDEN',
            `HTML embed 包含 symlink/junction/reparse point：${entry.name}`,
            sourceRange,
            nodeId,
          ),
        ])
      }
      if (entry.isDirectory()) {
        await walk(target)
      } else if (entry.isFile()) {
        const realFile = await realpath(target)
        const relative = path.relative(realRoot, realFile)
        if (
          relative === '..' ||
          relative.startsWith(`..${path.sep}`) ||
          path.isAbsolute(relative)
        ) {
          throw new ContentBuildError('HTML embed 传递资源越界', [
            diagnostic(
              articleSlug,
              'ASSET_EMBED_PATH_INVALID',
              `HTML embed 传递资源逃逸：${entry.name}`,
              sourceRange,
              nodeId,
            ),
          ])
        }
        files.push(realFile)
      } else {
        throw new ContentBuildError('HTML embed 包含不支持的文件类型', [
          diagnostic(
            articleSlug,
            'ASSET_EMBED_FILE_UNSUPPORTED',
            `HTML embed 包含不支持的目录项：${entry.name}`,
            sourceRange,
            nodeId,
          ),
        ])
      }
    }
  }
  await walk(root)
  return files.sort()
}

function deduplicateEntries(entries: AssetManifestEntry[]) {
  const deduplicated = new Map<string, AssetManifestEntry>()
  for (const entry of entries) {
    const key = entry.outputPath.toLowerCase()
    const previous = deduplicated.get(key)
    if (previous?.transform === 'sanitize-svg') continue
    deduplicated.set(key, entry)
  }
  return [...deduplicated.values()].sort((a, b) =>
    a.outputPath.localeCompare(b.outputPath, 'en'),
  )
}

function diagnostic(
  articleSlug: string,
  code: string,
  message: string,
  sourceRange: SourceRange,
  nodeId?: string,
): FrontmatterDiagnostic {
  return { code, severity: 'error', message, articleSlug, nodeId, sourceRange }
}

function validateReferenceStructure(
  nodeName: string,
  nodeId: string,
  attribute: string,
  relativePath: string,
  articleSlug: string,
  sourceRange: SourceRange,
) {
  const extension = path.posix.extname(relativePath).toLowerCase()
  const expectedExtensions = expectedExtensionsFor(nodeName, attribute)
  const invalid =
    (nodeName === 'html-embed' &&
      relativePath !== `embeds/${nodeId}/index.html`) ||
    (nodeName === 'svg-embed' && !relativePath.startsWith('media/svg/')) ||
    (attribute === 'data-src' && !relativePath.startsWith('data/')) ||
    (['video-embed', 'audio-embed'].includes(nodeName) &&
      attribute === 'src' &&
      !relativePath.startsWith('media/')) ||
    (expectedExtensions !== undefined &&
      !expectedExtensions.includes(extension))
  return invalid
    ? diagnostic(
        articleSlug,
        'ASSET_PATH_CONTRACT_INVALID',
        `资源路径不符合 ${nodeName} 的目录契约：${relativePath}`,
        sourceRange,
        nodeId,
      )
    : undefined
}

function expectedExtensionsFor(nodeName: string, attribute: string) {
  if (nodeName === 'video-embed' && attribute === 'src') return ['.mp4']
  if (nodeName === 'audio-embed' && attribute === 'src') return ['.mp3']
  if (nodeName === 'html-embed') return ['.html', '.htm']
  if (nodeName === 'svg-embed') return ['.svg']
  if (attribute === 'data-src') return ['.json']
  if (nodeName === 'image' || attribute === 'poster') {
    return ['.png', '.jpg', '.jpeg', '.webp', '.svg']
  }
  return undefined
}

async function hasExpectedFileType(filePath: string) {
  const extension = path.extname(filePath).toLowerCase()
  const bytes = await readFile(filePath)
  const text = decodeStrictText(bytes)
  const ascii = (text ?? '').slice(0, 512).trimStart().toLowerCase()
  if (extension === '.png') {
    return bytes.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    )
  }
  if (extension === '.jpg' || extension === '.jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8
  if (extension === '.webp') return bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP'
  if (extension === '.mp4') return bytes.subarray(4, 8).toString('ascii') === 'ftyp'
  if (extension === '.mp3') return bytes.subarray(0, 3).toString('ascii') === 'ID3' || (bytes[0] === 0xff && (bytes[1] ?? 0) >= 0xe0)
  if (extension === '.json' && text !== undefined) {
    try {
      JSON.parse(text)
      return true
    } catch {
      return false
    }
  }
  if (extension === '.svg') return text !== undefined && /<svg\b/.test(ascii)
  if (extension === '.html' || extension === '.htm') {
    return text !== undefined && /<(?:!doctype\s+html|html)\b/.test(ascii)
  }
  if (extension === '.woff') return bytes.subarray(0, 4).toString('ascii') === 'wOFF'
  if (extension === '.woff2') return bytes.subarray(0, 4).toString('ascii') === 'wOF2'
  if (['.css', '.js', '.mjs', '.txt'].includes(extension)) {
    return text !== undefined && text.length > 0 && !hasUnsafeTextControls(text)
  }
  return false
}

async function readJsonValue(filePath: string): Promise<unknown> {
  const text = decodeStrictText(await readFile(filePath))
  if (text === undefined) return undefined
  try {
    return JSON.parse(text) as unknown
  } catch {
    return undefined
  }
}

function decodeStrictText(bytes: Buffer) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return undefined
  }
}

function hasUnsafeTextControls(value: string) {
  return /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)
}

function relativeDisplayPath(filePath: string, packageRoot: string) {
  return path.relative(packageRoot, filePath).split(path.sep).join('/')
}
