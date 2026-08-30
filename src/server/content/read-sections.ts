import 'server-only'

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import {
  ALLOWED_PUBLISHED_UNCATEGORIZED_SLUGS,
  UNCATEGORIZED_BOOK_SLUG,
} from '../../lib/blog-catalog-constants'
import { ContentBuildError } from './content-error'
import { CONTENT_SECTIONS_PATH } from './content-paths'
import { parseYamlDocument } from './parse-yaml'
import type { FrontmatterDiagnostic } from './validate-frontmatter'

const SECTION_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const REGISTRY_SLUG = 'content/sections.yml'

const sectionSchema = z
  .object({
    slug: z.string().regex(SECTION_SLUG_PATTERN),
    title: z.string().trim().min(1),
    summary: z.string().trim().min(1).optional(),
    order: z.number().int(),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
  })
  .strict()

const registrySchema = z
  .object({
    sections: z.array(sectionSchema),
  })
  .strict()

export type SectionDefinition = z.infer<typeof sectionSchema>

/**
 * 读取板块注册表。文件不存在视为「未注册任何板块」；
 * 文件存在但无法解析或不合 schema 时抛出 ContentBuildError。
 */
export async function listSections(
  sectionsPath = CONTENT_SECTIONS_PATH,
): Promise<readonly SectionDefinition[]> {
  let source: string
  try {
    source = await readFile(sectionsPath, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    throw new ContentBuildError('无法读取板块注册表', [
      registryDiagnostic('SECTIONS_REGISTRY_READ_FAILED', '板块注册表读取失败'),
    ])
  }

  let raw: unknown
  try {
    raw = parseYamlDocument(source)
  } catch {
    throw new ContentBuildError('板块注册表 YAML 无法解析', [
      registryDiagnostic(
        'SECTIONS_REGISTRY_YAML_INVALID',
        '板块注册表 YAML 无法解析',
      ),
    ])
  }

  const parsed = registrySchema.safeParse(raw)
  if (!parsed.success) {
    throw new ContentBuildError('板块注册表不符合 schema', [
      registryDiagnostic(
        'SECTIONS_REGISTRY_INVALID',
        '板块注册表必须是 sections 数组，且每项含 slug/title/order（color 可选，形如 #a9762f），slug 为 kebab-case，不接受未知字段',
      ),
    ])
  }

  const seen = new Set<string>()
  const seenOrders = new Set<number>()
  const seenColors = new Set<string>()
  for (const section of parsed.data.sections) {
    if (section.slug === UNCATEGORIZED_BOOK_SLUG) {
      throw new ContentBuildError('板块注册表使用了保留 slug', [
        registryDiagnostic(
          'SECTIONS_REGISTRY_RESERVED_SLUG',
          `板块 slug ${UNCATEGORIZED_BOOK_SLUG} 是散页内部保留值，不能注册`,
        ),
      ])
    }
    if (seen.has(section.slug)) {
      throw new ContentBuildError('板块注册表存在重复 slug', [
        registryDiagnostic(
          'SECTIONS_REGISTRY_DUPLICATE_SLUG',
          `板块 slug ${section.slug} 重复注册`,
        ),
      ])
    }
    seen.add(section.slug)

    if (seenOrders.has(section.order)) {
      throw new ContentBuildError('板块注册表存在重复 order', [
        registryDiagnostic(
          'SECTIONS_REGISTRY_DUPLICATE_ORDER',
          `板块 order ${section.order} 重复注册`,
        ),
      ])
    }
    seenOrders.add(section.order)

    if (section.color) {
      const normalizedColor = section.color.toLowerCase()
      if (seenColors.has(normalizedColor)) {
        throw new ContentBuildError('板块注册表存在重复 color', [
          registryDiagnostic(
            'SECTIONS_REGISTRY_DUPLICATE_COLOR',
            `板块 color ${section.color} 重复注册`,
          ),
        ])
      }
      seenColors.add(normalizedColor)
    }
  }

  return Object.freeze(
    [...parsed.data.sections].sort(
      (left, right) =>
        left.order - right.order || left.slug.localeCompare(right.slug, 'en'),
    ),
  )
}

/** 与 postsRoot 同级的 content 目录下定位注册表（测试可用临时 postsRoot）。 */
export function sectionsPathForPostsRoot(postsRoot: string): string {
  return path.join(path.dirname(postsRoot), 'sections.yml')
}

/** 文章 frontmatter.section 必须命中已注册板块 slug，否则构建失败。 */
export function assertKnownSections(
  posts: ReadonlyArray<{
    slug: string
    frontmatter: { section?: string }
  }>,
  sections: readonly SectionDefinition[],
): void {
  const known = new Set(sections.map((section) => section.slug))
  const diagnostics: FrontmatterDiagnostic[] = []

  for (const post of posts) {
    const section = post.frontmatter.section
    if (section !== undefined && !known.has(section)) {
      diagnostics.push({
        code: 'FRONTMATTER_SECTION_UNKNOWN',
        severity: 'error',
        message: `板块 ${section} 未在 content/sections.yml 注册`,
        articleSlug: post.slug,
        field: 'section',
        sourceRange: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 1, offset: 0 },
        },
      })
    }
  }

  if (diagnostics.length > 0) {
    throw new ContentBuildError('存在未注册的文章板块', diagnostics)
  }
}

/** 正式文章必须选方向；仅保留黄金验收文作为有意的散页。 */
export function assertPublishedSections(
  posts: ReadonlyArray<{
    slug: string
    frontmatter: { section?: string; draft?: boolean }
  }>,
): void {
  const diagnostics: FrontmatterDiagnostic[] = []

  for (const post of posts) {
    if (
      post.frontmatter.draft !== true &&
      post.frontmatter.section === undefined &&
      !ALLOWED_PUBLISHED_UNCATEGORIZED_SLUGS.some(
        (slug) => slug === post.slug,
      )
    ) {
      diagnostics.push({
        code: 'PUBLISHED_POST_SECTION_REQUIRED',
        severity: 'error',
        message: `正式文章必须填写 section；仅允许 ${UNCATEGORIZED_BOOK_SLUG} 白名单文章省略`,
        articleSlug: post.slug,
        field: 'section',
        sourceRange: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 1, offset: 0 },
        },
      })
    }
  }

  if (diagnostics.length > 0) {
    throw new ContentBuildError('存在未归类的正式文章', diagnostics)
  }
}

function registryDiagnostic(
  code: string,
  message: string,
): FrontmatterDiagnostic {
  return {
    code,
    severity: 'error',
    message,
    articleSlug: REGISTRY_SLUG,
    sourceRange: {
      start: { line: 1, column: 1, offset: 0 },
      end: { line: 1, column: 1, offset: 0 },
    },
  }
}
