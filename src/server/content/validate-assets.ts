import 'server-only'

import { realpath } from 'node:fs/promises'
import path from 'node:path'
import type {
  FrontmatterDiagnostic,
  SourcePosition,
  SourceRange,
} from './validate-frontmatter'

const MAX_DECODE_ROUNDS = 8

export type AssetPathValidationResult =
  | { ok: true; absolutePath: string; relativePath: string }
  | { ok: false; diagnostics: readonly FrontmatterDiagnostic[] }

type AssetPathInput = {
  articleRoot: string
  articleSlug: string
  relativePath: string
  source: string
  sourceOffset: number
  sourceLength?: number
}

export async function validateArticleAssetPath({
  articleRoot,
  articleSlug,
  relativePath,
  source,
  sourceOffset,
  sourceLength,
}: AssetPathInput): Promise<AssetPathValidationResult> {
  const decoded = decodeSafeRelativePath(relativePath)
  if (!decoded) {
    return invalidPathResult(
      source,
      articleSlug,
      sourceOffset,
      relativePath,
      sourceLength,
    )
  }

  let realRoot: string
  let realAsset: string
  try {
    realRoot = await realpath(articleRoot)
    realAsset = await realpath(path.resolve(realRoot, decoded))
  } catch {
    return {
      ok: false,
      diagnostics: [
        createAssetDiagnostic(
          source,
          articleSlug,
          'ARTICLE_ASSET_NOT_FOUND',
          `文章资源不存在：${relativePath}`,
          sourceOffset,
          sourceLength ?? relativePath.length,
        ),
      ],
    }
  }

  const relativeToRoot = path.relative(realRoot, realAsset)
  if (
    relativeToRoot.length === 0 ||
    relativeToRoot === '..' ||
    relativeToRoot.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeToRoot)
  ) {
    return invalidPathResult(
      source,
      articleSlug,
      sourceOffset,
      relativePath,
      sourceLength,
    )
  }

  return {
    ok: true,
    absolutePath: realAsset,
    relativePath: path.posix.normalize(decoded),
  }
}

export function decodeSafeRelativePath(value: string): string | undefined {
  let decoded = value.trim()
  if (hasUnsafePathSyntax(decoded)) {
    return undefined
  }

  try {
    for (let index = 0; index < MAX_DECODE_ROUNDS; index += 1) {
      const next = decodeURIComponent(decoded)
      if (next === decoded) {
        return hasUnsafePathSyntax(decoded) ? undefined : decoded
      }
      decoded = next
      if (hasUnsafePathSyntax(decoded)) {
        return undefined
      }
    }
  } catch {
    return undefined
  }

  return undefined
}

function hasUnsafePathSyntax(value: string) {
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

function invalidPathResult(
  source: string,
  articleSlug: string,
  sourceOffset: number,
  relativePath: string,
  sourceLength = relativePath.length,
): AssetPathValidationResult {
  return {
    ok: false,
    diagnostics: [
      createAssetDiagnostic(
        source,
        articleSlug,
        'ARTICLE_ASSET_PATH_INVALID',
        `文章资源路径必须留在当前文章包内：${relativePath}`,
        sourceOffset,
        sourceLength,
      ),
    ],
  }
}

function createAssetDiagnostic(
  source: string,
  articleSlug: string,
  code: string,
  message: string,
  sourceOffset: number,
  length: number,
): FrontmatterDiagnostic {
  const start = Math.max(0, Math.min(source.length, sourceOffset))
  const end = Math.max(start, Math.min(source.length, start + length))
  return {
    code,
    severity: 'error',
    message,
    articleSlug,
    sourceRange: rangeFromOffsets(source, start, end),
  }
}

function rangeFromOffsets(source: string, start: number, end: number): SourceRange {
  return {
    start: positionFromOffset(source, start),
    end: positionFromOffset(source, end),
  }
}

function positionFromOffset(source: string, offset: number): SourcePosition {
  const preceding = source.slice(0, offset)
  const lines = preceding.split(/\r\n|\r|\n/)
  return {
    line: lines.length,
    column: (lines.at(-1)?.length ?? 0) + 1,
    offset,
  }
}
