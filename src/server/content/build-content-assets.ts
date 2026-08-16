import 'server-only'

import { copyFile, mkdir, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { ContentBuildError } from './content-error'
import {
  createAssetManifest,
  MAX_STATIC_FILE_BYTES,
  MAX_STATIC_FILE_COUNT,
  type AssetManifestEntry,
} from './asset-manifest'
import type { FrontmatterDiagnostic } from './validate-frontmatter'

export async function buildContentAssets(
  outputRoot = path.join(process.cwd(), 'out'),
) {
  const manifest = await createAssetManifest()
  await copyAssetManifest(manifest, outputRoot)
  await verifyStaticOutput(outputRoot)
  return manifest
}

export async function copyAssetManifest(
  manifest: readonly AssetManifestEntry[],
  outputRoot: string,
) {
  for (const entry of manifest) {
    const destination = path.resolve(outputRoot, entry.outputPath)
    const relative = path.relative(path.resolve(outputRoot), destination)
    if (
      relative === '..' ||
      relative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relative)
    ) {
      throw new ContentBuildError('静态资源目标路径越界', [
        manifestDiagnostic(
          entry.articleSlug,
          'ASSET_OUTPUT_PATH_INVALID',
          `静态资源目标路径越界：${entry.outputPath}`,
        ),
      ])
    }
    await mkdir(path.dirname(destination), { recursive: true })
    await copyFile(entry.sourcePath, destination)
  }
}

export async function verifyStaticOutput(
  outputRoot: string,
  limits: { maxFileBytes?: number; maxFileCount?: number } = {},
) {
  const maxFileBytes = limits.maxFileBytes ?? MAX_STATIC_FILE_BYTES
  const maxFileCount = limits.maxFileCount ?? MAX_STATIC_FILE_COUNT
  const files = await collectFiles(outputRoot)
  const diagnostics: FrontmatterDiagnostic[] = []

  if (files.length > maxFileCount) {
    diagnostics.push(
      manifestDiagnostic(
        '__static_output__',
        'STATIC_OUTPUT_FILE_COUNT_EXCEEDED',
        `静态产物文件数 ${files.length} 超过上限 ${maxFileCount}`,
      ),
    )
  }
  for (const filePath of files) {
    const file = await stat(filePath)
    if (file.size > maxFileBytes) {
      diagnostics.push(
        manifestDiagnostic(
          '__static_output__',
          'STATIC_OUTPUT_FILE_TOO_LARGE',
          `静态产物超过单文件上限：${path.relative(outputRoot, filePath)}`,
        ),
      )
    }
  }
  if (diagnostics.length > 0) {
    throw new ContentBuildError('静态产物限制校验失败', diagnostics)
  }
  return { fileCount: files.length }
}

async function collectFiles(root: string) {
  const files: string[] = []
  async function walk(directory: string) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name)
      if (entry.isDirectory()) await walk(target)
      else if (entry.isFile()) files.push(target)
    }
  }
  await walk(root)
  return files
}

function manifestDiagnostic(
  articleSlug: string,
  code: string,
  message: string,
): FrontmatterDiagnostic {
  return {
    code,
    severity: 'error',
    message,
    articleSlug,
    sourceRange: {
      start: { line: 1, column: 1, offset: 0 },
      end: { line: 1, column: 1, offset: 0 },
    },
  }
}
