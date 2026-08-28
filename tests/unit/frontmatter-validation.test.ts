import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { validateFrontmatter } from '../../src/server/content/validate-frontmatter'

const FIXTURE_ROOT = new URL(
  '../../src/server/content/__fixtures__/',
  import.meta.url,
)
const KITCHEN_SINK = new URL(
  '../../content/posts/p0-kitchen-sink/index.md',
  import.meta.url,
)

async function fixture(name: string) {
  return readFile(fileURLToPath(new URL(name, FIXTURE_ROOT)), 'utf8')
}

describe('frontmatter v1 validation', () => {
  it('validates the one official P0 kitchen-sink article', async () => {
    const source = await readFile(fileURLToPath(KITCHEN_SINK), 'utf8')
    const result = validateFrontmatter(source, 'p0-kitchen-sink')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.title).toBe('P0 中文综合验收文章')
      expect(result.value.draft).toBe(false)
    }

    for (const tag of [
      'video-embed',
      'audio-embed',
      'canvas-render',
      'svg-embed',
      'html-embed',
      'web-embed',
      'choice-question',
      'fill-blank-question',
    ]) {
      expect(source).toContain(`<${tag}`)
    }

    expect(source).toContain('```mermaid')
    expect(source).toContain('$$')
    expect(source).toContain('![蓝紫渐变的 P0 验收封面]')
  })

  it('accepts the complete valid fixture', async () => {
    const source = await fixture('valid.md')
    const result = validateFrontmatter(source, 'p0-kitchen-sink')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toEqual({
        schemaVersion: 1,
        title: '中文验收文章',
        description: '用于验证 frontmatter v1 的合法样例',
        publishedAt: '2026-08-16T08:30:00+08:00',
        updatedAt: '2026-08-16T09:00:00+08:00',
        cover: './media/images/cover.png',
        tags: ['P0', '中文'],
        draft: false,
      })
      expect(source.slice(result.bodyStartOffset)).toContain('# 合法样例')
    }
  })

  it('accepts draft true without weakening the schema', async () => {
    const result = validateFrontmatter(
      await fixture('valid-draft.md'),
      'draft-post',
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.draft).toBe(true)
    }
  })

  it.each([
    {
      fixture: 'missing-required.md',
      code: 'FRONTMATTER_REQUIRED_FIELD_MISSING',
      field: 'description',
      line: 1,
    },
    {
      fixture: 'unknown-field.md',
      code: 'FRONTMATTER_UNKNOWN_FIELD',
      field: 'author',
      line: 6,
    },
    {
      fixture: 'bad-date.md',
      code: 'FRONTMATTER_DATE_INVALID',
      field: 'publishedAt',
      line: 5,
    },
    {
      fixture: 'bad-cover.md',
      code: 'FRONTMATTER_COVER_PATH_INVALID',
      field: 'cover',
      line: 6,
    },
    {
      fixture: 'bad-section.md',
      code: 'FRONTMATTER_SECTION_INVALID',
      field: 'section',
      line: 6,
    },
  ])('returns deterministic diagnostics for $fixture', async (expected) => {
    const result = validateFrontmatter(
      await fixture(expected.fixture),
      'fixture-post',
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.diagnostics).toHaveLength(1)
      expect(result.diagnostics[0]).toMatchObject({
        code: expected.code,
        severity: 'error',
        field: expected.field,
        articleSlug: 'fixture-post',
        sourceRange: { start: { line: expected.line, column: 1 } },
      })
    }
  })

  it('rejects missing frontmatter and invalid directory slugs', () => {
    const missing = validateFrontmatter('# 没有 frontmatter', 'missing')
    const badSlug = validateFrontmatter('---\n---\n', 'Bad_Slug')

    expect(missing).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'FRONTMATTER_MISSING' }],
    })
    expect(badSlug).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'ARTICLE_SLUG_INVALID' }],
    })
  })

  it('rejects impossible calendar dates and Windows paths', () => {
    const template = (field: string) => `---
schemaVersion: 1
title: 边界
description: 边界校验
publishedAt: 2026-02-28T08:30:00+08:00
${field}
---
`

    const impossibleDate = validateFrontmatter(
      template('updatedAt: 2026-02-30T08:30:00+08:00'),
      'boundary-post',
    )
    const windowsCover = validateFrontmatter(
      template('cover: C:\\temp\\cover.png'),
      'boundary-post',
    )

    expect(impossibleDate).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'FRONTMATTER_DATE_INVALID' }],
    })
    expect(windowsCover).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'FRONTMATTER_COVER_PATH_INVALID' }],
    })
  })

  it.each([
    './%2e%2e/secret.png',
    './%252e%252e/secret.png',
    './%25252e%25252e/secret.png',
    './media%255c..%255csecret.png',
    './%2525252525252525252e%2525252525252525252e/secret.png',
  ])('rejects encoded cover traversal: %s', (cover) => {
    const source = `---
schemaVersion: 1
title: 编码路径
description: 编码路径也不能逃逸文章包
publishedAt: 2026-08-16T08:30:00+08:00
cover: ${cover}
---
`

    expect(validateFrontmatter(source, 'boundary-post')).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'FRONTMATTER_COVER_PATH_INVALID' }],
    })
  })
})
