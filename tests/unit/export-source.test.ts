import { describe, expect, it } from 'vitest'

import {
  isArticleExportSource,
  type ArticleExportSource,
} from '../../src/features/export-service/export-source'
import { prefetchBlogArticle } from '../../src/features/blog-index/prefetch-article'

describe('export-source sidecar', () => {
  it('accepts a versioned export payload and rejects extra-shaped objects', () => {
    const payload: ArticleExportSource = {
      schemaVersion: 1,
      articleSlug: 'demo',
      documentFingerprint: 'abc',
      originalSource: '# hi\n',
      plainText: 'hi\n',
    }
    expect(isArticleExportSource(payload)).toBe(true)
    expect(isArticleExportSource({ ...payload, schemaVersion: 2 })).toBe(false)
    expect(isArticleExportSource({ articleSlug: 'demo' })).toBe(false)
  })
})

describe('intent prefetch', () => {
  it('prefetches a single article href', () => {
    const seen: string[] = []
    prefetchBlogArticle((href) => {
      seen.push(href)
    }, 'developer-vocabulary-handbook')
    expect(seen).toEqual(['/blog/developer-vocabulary-handbook/'])
  })
})
