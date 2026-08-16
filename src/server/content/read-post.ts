import 'server-only'

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ContentBuildError } from './content-error'
import { CONTENT_POSTS_ROOT, getArticlePackageRoot } from './content-paths'
import {
  isValidArticleSlug,
  validateFrontmatter,
  type FrontmatterDiagnostic,
  type FrontmatterV1,
} from './validate-frontmatter'

export type Post = {
  slug: string
  source: string
  body: string
  frontmatter: FrontmatterV1
  packageRoot: string
}

export async function readPost(
  slug: string,
  postsRoot = CONTENT_POSTS_ROOT,
): Promise<Post> {
  if (!isValidArticleSlug(slug)) {
    const validation = validateFrontmatter('', slug)
    const diagnostics = validation.ok ? [] : validation.diagnostics
    throw new ContentBuildError(`文章目录 slug ${slug} 不合法`, diagnostics)
  }

  const packageRoot = getArticlePackageRoot(slug, postsRoot)
  const sourcePath = path.join(packageRoot, 'index.md')
  let source: string

  try {
    source = await readFile(sourcePath, 'utf8')
  } catch {
    throw new ContentBuildError(`无法读取文章 ${slug}`, [readDiagnostic(slug)])
  }

  const validation = validateFrontmatter(source, slug)
  if (!validation.ok) {
    throw new ContentBuildError(
      `文章 ${slug} 的 frontmatter 校验失败`,
      validation.diagnostics,
    )
  }

  return {
    slug,
    source,
    body: source.slice(validation.bodyStartOffset),
    frontmatter: validation.value,
    packageRoot,
  }
}

function readDiagnostic(articleSlug: string): FrontmatterDiagnostic {
  return {
    code: 'ARTICLE_INDEX_READ_FAILED',
    severity: 'error',
    message: '文章包必须包含可读取的 index.md',
    articleSlug,
    sourceRange: {
      start: { line: 1, column: 1, offset: 0 },
      end: { line: 1, column: 1, offset: 0 },
    },
  }
}
