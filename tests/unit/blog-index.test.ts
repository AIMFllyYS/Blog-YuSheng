import { describe, expect, it } from 'vitest'
import {
  createBlogIndexEntries,
  estimateReadingMinutes,
} from '../../src/features/blog-index/create-blog-index-entries'
import type { PostSummary } from '../../src/server/content'

describe('blog index build-time entries', () => {
  it('derives a minimum-one-minute estimate from canonical outline text', async () => {
    const source = `---
schemaVersion: 1
title: 长文测试
description: 用于验证预计阅读时长
publishedAt: 2026-08-16T10:00:00+08:00
draft: false
---

# 长文测试

${'字'.repeat(501)}
`
    const post: PostSummary = {
      slug: 'reading-time-test',
      source,
      frontmatter: {
        schemaVersion: 1,
        title: '长文测试',
        description: '用于验证预计阅读时长',
        publishedAt: '2026-08-16T10:00:00+08:00',
        draft: false,
      },
    }

    await expect(createBlogIndexEntries([post])).resolves.toEqual([
      expect.objectContaining({
        slug: 'reading-time-test',
        characterCount: 505,
        readingMinutes: 2,
      }),
    ])
    expect(estimateReadingMinutes(0)).toBe(1)
    expect(estimateReadingMinutes(-50)).toBe(1)
  })

  it.each([
    {
      name: 'without headings',
      body: '字'.repeat(501),
      expectedCount: 501,
    },
    {
      name: 'with a preface before its first heading',
      body: `${'字'.repeat(501)}\n\n# 后续章节\n\n短文`,
      expectedCount: 507,
    },
  ])('counts the complete document $name', async ({ body, expectedCount }) => {
    const source = `---
schemaVersion: 1
title: 完整计数
description: 覆盖标题前正文
publishedAt: 2026-08-16T10:00:00+08:00
draft: false
---

${body}
`
    const post: PostSummary = {
      slug: 'complete-count',
      source,
      frontmatter: {
        schemaVersion: 1,
        title: '完整计数',
        description: '覆盖标题前正文',
        publishedAt: '2026-08-16T10:00:00+08:00',
        draft: false,
      },
    }

    await expect(createBlogIndexEntries([post])).resolves.toEqual([
      expect.objectContaining({
        characterCount: expectedCount,
        readingMinutes: 2,
      }),
    ])
  })
})
