import 'server-only'

import { z } from 'zod'
import { VFile } from 'vfile'
import { matter } from 'vfile-matter'

import { isAuthorHostedImageUrl } from '../../features/doc-engine/security/embed-iframe-policy'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const FRONTMATTER_PATTERN =
  /^---(?:\r?\n|\r)(?:([\s\S]*?)(?:\r?\n|\r))?---(?:\r?\n|\r|$)/
const DATE_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(Z|([+-])(\d{2}):(\d{2}))$/

const frontmatterSchema = z
  .object({
    schemaVersion: z.literal(1),
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    publishedAt: z.string(),
    updatedAt: z.string().optional(),
    cover: z.string().optional(),
    section: z.string().optional(),
    tags: z.array(z.string().trim().min(1)).optional(),
    draft: z.boolean().optional(),
  })
  .strict()

const ALLOWED_FIELDS = new Set(Object.keys(frontmatterSchema.shape))
const REQUIRED_FIELDS = [
  'schemaVersion',
  'title',
  'description',
  'publishedAt',
] as const

export type FrontmatterV1 = z.infer<typeof frontmatterSchema>

export type SourcePosition = {
  line: number
  column: number
  offset: number
}

export type SourceRange = {
  start: SourcePosition
  end: SourcePosition
}

export type FrontmatterDiagnostic = {
  code: string
  severity: 'error'
  message: string
  articleSlug: string
  nodeId?: string
  field?: string
  sourceRange: SourceRange
}

export type FrontmatterValidationResult =
  | {
      ok: true
      value: FrontmatterV1
      bodyStartOffset: number
    }
  | {
      ok: false
      diagnostics: FrontmatterDiagnostic[]
    }

type LocatedFrontmatter = {
  bodyStartOffset: number
  blockRange: SourceRange
  fieldRanges: ReadonlyMap<string, SourceRange>
}

export function isValidArticleSlug(articleSlug: string) {
  return SLUG_PATTERN.test(articleSlug)
}

export function validateFrontmatter(
  source: string,
  articleSlug: string,
): FrontmatterValidationResult {
  const slugDiagnostic = validateArticleSlug(source, articleSlug)
  if (slugDiagnostic) {
    return { ok: false, diagnostics: [slugDiagnostic] }
  }

  const located = locateFrontmatter(source)
  if (!located) {
    return {
      ok: false,
      diagnostics: [
        createDiagnostic(
          source,
          articleSlug,
          'FRONTMATTER_MISSING',
          '文章必须以 YAML frontmatter 开始',
          undefined,
          rangeFromOffsets(source, 0, Math.min(source.length, 3)),
        ),
      ],
    }
  }

  const file = new VFile({
    path: `content/posts/${articleSlug}/index.md`,
    value: source,
  })

  try {
    matter(file)
  } catch {
    return {
      ok: false,
      diagnostics: [
        createDiagnostic(
          source,
          articleSlug,
          'FRONTMATTER_YAML_INVALID',
          'frontmatter YAML 无法解析',
          undefined,
          located.blockRange,
        ),
      ],
    }
  }

  const raw = file.data.matter
  if (!isRecord(raw)) {
    return {
      ok: false,
      diagnostics: [
        createDiagnostic(
          source,
          articleSlug,
          'FRONTMATTER_ROOT_INVALID',
          'frontmatter 必须是键值对象',
          undefined,
          located.blockRange,
        ),
      ],
    }
  }

  const diagnostics = collectDiagnostics(source, articleSlug, raw, located)
  if (diagnostics.length > 0) {
    return { ok: false, diagnostics }
  }

  const parsed = frontmatterSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      diagnostics: [
        createDiagnostic(
          source,
          articleSlug,
          'FRONTMATTER_SCHEMA_INVALID',
          'frontmatter 不符合 v1 schema',
          undefined,
          located.blockRange,
        ),
      ],
    }
  }

  return {
    ok: true,
    value: parsed.data,
    bodyStartOffset: located.bodyStartOffset,
  }
}

function collectDiagnostics(
  source: string,
  articleSlug: string,
  raw: Record<string, unknown>,
  located: LocatedFrontmatter,
): FrontmatterDiagnostic[] {
  const diagnostics: FrontmatterDiagnostic[] = []
  const rangeFor = (field: string) =>
    located.fieldRanges.get(field) ?? located.blockRange

  for (const field of REQUIRED_FIELDS) {
    if (!Object.hasOwn(raw, field)) {
      diagnostics.push(
        createDiagnostic(
          source,
          articleSlug,
          'FRONTMATTER_REQUIRED_FIELD_MISSING',
          `缺少必填字段 ${field}`,
          field,
          located.blockRange,
        ),
      )
    }
  }

  for (const field of Object.keys(raw).sort()) {
    if (!ALLOWED_FIELDS.has(field)) {
      diagnostics.push(
        createDiagnostic(
          source,
          articleSlug,
          'FRONTMATTER_UNKNOWN_FIELD',
          `未知字段 ${field}`,
          field,
          rangeFor(field),
        ),
      )
    }
  }

  if (Object.hasOwn(raw, 'schemaVersion') && raw.schemaVersion !== 1) {
    diagnostics.push(
      createDiagnostic(
        source,
        articleSlug,
        'FRONTMATTER_SCHEMA_VERSION_INVALID',
        'schemaVersion 必须为 1',
        'schemaVersion',
        rangeFor('schemaVersion'),
      ),
    )
  }

  validateNonEmptyString(
    diagnostics,
    source,
    articleSlug,
    raw,
    'title',
    rangeFor('title'),
  )
  validateNonEmptyString(
    diagnostics,
    source,
    articleSlug,
    raw,
    'description',
    rangeFor('description'),
  )
  validateDateField(
    diagnostics,
    source,
    articleSlug,
    raw,
    'publishedAt',
    rangeFor('publishedAt'),
  )
  validateDateField(
    diagnostics,
    source,
    articleSlug,
    raw,
    'updatedAt',
    rangeFor('updatedAt'),
  )

  if (Object.hasOwn(raw, 'cover')) {
    if (typeof raw.cover !== 'string' || !isAllowedCover(raw.cover)) {
      diagnostics.push(
        createDiagnostic(
          source,
          articleSlug,
          'FRONTMATTER_COVER_PATH_INVALID',
          'cover 必须是文章包内的安全相对路径，或作者托管域名上的 HTTPS 图片',
          'cover',
          rangeFor('cover'),
        ),
      )
    }
  }

  if (Object.hasOwn(raw, 'section')) {
    if (typeof raw.section !== 'string' || !SLUG_PATTERN.test(raw.section)) {
      diagnostics.push(
        createDiagnostic(
          source,
          articleSlug,
          'FRONTMATTER_SECTION_INVALID',
          'section 必须是 kebab-case slug，且须在 content/sections.yml 注册',
          'section',
          rangeFor('section'),
        ),
      )
    }
  }

  if (Object.hasOwn(raw, 'tags')) {
    if (
      !Array.isArray(raw.tags) ||
      raw.tags.some((tag) => typeof tag !== 'string' || tag.trim().length === 0)
    ) {
      diagnostics.push(
        createDiagnostic(
          source,
          articleSlug,
          'FRONTMATTER_TAGS_INVALID',
          'tags 必须是非空字符串数组',
          'tags',
          rangeFor('tags'),
        ),
      )
    }
  }

  if (Object.hasOwn(raw, 'draft') && typeof raw.draft !== 'boolean') {
    diagnostics.push(
      createDiagnostic(
        source,
        articleSlug,
        'FRONTMATTER_DRAFT_INVALID',
        'draft 必须是布尔值',
        'draft',
        rangeFor('draft'),
      ),
    )
  }

  return diagnostics
}

function validateArticleSlug(
  source: string,
  articleSlug: string,
): FrontmatterDiagnostic | undefined {
  if (isValidArticleSlug(articleSlug)) {
    return undefined
  }

  return createDiagnostic(
    source,
    articleSlug,
    'ARTICLE_SLUG_INVALID',
    '文章目录 slug 必须是小写英文或数字组成的 kebab-case',
    undefined,
    rangeFromOffsets(source, 0, Math.min(source.length, 3)),
  )
}

function validateNonEmptyString(
  diagnostics: FrontmatterDiagnostic[],
  source: string,
  articleSlug: string,
  raw: Record<string, unknown>,
  field: 'title' | 'description',
  sourceRange: SourceRange,
) {
  if (
    Object.hasOwn(raw, field) &&
    (typeof raw[field] !== 'string' || raw[field].trim().length === 0)
  ) {
    diagnostics.push(
      createDiagnostic(
        source,
        articleSlug,
        'FRONTMATTER_TEXT_INVALID',
        `${field} 必须是非空字符串`,
        field,
        sourceRange,
      ),
    )
  }
}

function validateDateField(
  diagnostics: FrontmatterDiagnostic[],
  source: string,
  articleSlug: string,
  raw: Record<string, unknown>,
  field: 'publishedAt' | 'updatedAt',
  sourceRange: SourceRange,
) {
  if (
    Object.hasOwn(raw, field) &&
    (typeof raw[field] !== 'string' || !isZonedIso8601(raw[field]))
  ) {
    diagnostics.push(
      createDiagnostic(
        source,
        articleSlug,
        'FRONTMATTER_DATE_INVALID',
        `${field} 必须是带时区的 ISO 8601 日期`,
        field,
        sourceRange,
      ),
    )
  }
}

function isZonedIso8601(value: string): boolean {
  const match = DATE_PATTERN.exec(value)
  if (!match) {
    return false
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6] ?? '0')
  const offsetHour = Number(match[9] ?? '0')
  const offsetMinute = Number(match[10] ?? '0')
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()

  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth &&
    hour <= 23 &&
    minute <= 59 &&
    second <= 59 &&
    offsetHour <= 23 &&
    offsetMinute <= 59 &&
    Number.isFinite(Date.parse(value))
  )
}

function isAllowedCover(value: string): boolean {
  return isPackageRelativePath(value) || isAuthorHostedImageUrl(value)
}

function isPackageRelativePath(value: string): boolean {
  const trimmed = value.trim()
  if (hasUnsafePathSyntax(trimmed)) {
    return false
  }

  let decoded = trimmed
  try {
    for (let index = 0; index < 8; index += 1) {
      const next = decodeURIComponent(decoded)
      if (next === decoded) {
        return !hasUnsafePathSyntax(decoded)
      }
      decoded = next
      if (hasUnsafePathSyntax(decoded)) {
        return false
      }
    }
  } catch {
    return false
  }

  // Excessive nested encoding is ambiguous across URL/filesystem boundaries.
  // If eight rounds did not stabilize, reject instead of guessing.
  return false
}

function hasUnsafePathSyntax(value: string): boolean {
  if (
    value.length === 0 ||
    value.includes('\\') ||
    value.includes('\0') ||
    value.includes('?') ||
    value.includes('#') ||
    value.startsWith('/') ||
    /^[a-z][a-z\d+.-]*:/i.test(value)
  ) {
    return true
  }

  const segments = value.split('/')
  return segments.some((segment) => segment === '..' || segment === '')
}

function locateFrontmatter(source: string): LocatedFrontmatter | undefined {
  const match = FRONTMATTER_PATTERN.exec(source)
  if (!match) {
    return undefined
  }

  const yaml = match[1] ?? ''
  const openingLineLength = source.startsWith('---\r\n') ? 5 : 4
  const fieldRanges = new Map<string, SourceRange>()
  const keyPattern = /^([A-Za-z_][A-Za-z0-9_-]*):/gm

  for (const keyMatch of yaml.matchAll(keyPattern)) {
    const key = keyMatch[1]
    if (key && keyMatch.index !== undefined) {
      const start = openingLineLength + keyMatch.index
      fieldRanges.set(key, rangeFromOffsets(source, start, start + key.length))
    }
  }

  return {
    bodyStartOffset: match[0].length,
    blockRange: rangeFromOffsets(source, 0, match[0].length),
    fieldRanges,
  }
}

function createDiagnostic(
  _source: string,
  articleSlug: string,
  code: string,
  message: string,
  field: string | undefined,
  sourceRange: SourceRange,
): FrontmatterDiagnostic {
  return {
    code,
    severity: 'error',
    message,
    articleSlug,
    ...(field ? { field } : {}),
    sourceRange,
  }
}

function rangeFromOffsets(
  source: string,
  startOffset: number,
  endOffset: number,
): SourceRange {
  return {
    start: positionAt(source, startOffset),
    end: positionAt(source, endOffset),
  }
}

function positionAt(source: string, targetOffset: number): SourcePosition {
  const offset = Math.max(0, Math.min(targetOffset, source.length))
  let line = 1
  let lineStart = 0

  for (let index = 0; index < offset; index += 1) {
    if (source.charCodeAt(index) === 10) {
      line += 1
      lineStart = index + 1
    }
  }

  return {
    line,
    column: offset - lineStart + 1,
    offset,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
