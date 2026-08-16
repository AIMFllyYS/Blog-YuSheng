import 'server-only'

import { createHash } from 'node:crypto'
import { mkdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import sharp, { type Metadata } from 'sharp'
import type { AssetManifestEntry } from './asset-manifest'
import { ContentBuildError } from './content-error'
import type { FrontmatterDiagnostic } from './validate-frontmatter'

sharp.cache({ files: 0 })

export const IMAGE_VARIANT_WIDTHS = [480, 960, 1440] as const
export const MAX_IMAGE_VARIANT_BYTES = 300 * 1024
const IMAGE_FORMATS = [
  { format: 'avif', quality: 50 },
  { format: 'webp', quality: 75 },
] as const
const RASTER_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp'])
const IMAGE_PIPELINE_VERSION = 'v1'

export async function transformContentImages(
  manifest: readonly AssetManifestEntry[],
  cacheRoot = path.join(process.cwd(), '.tmp', 'image-cache'),
) {
  await mkdir(cacheRoot, { recursive: true })
  const enriched: AssetManifestEntry[] = []
  const variants: AssetManifestEntry[] = []
  const outputOwners = new Map<string, string>()
  const diagnostics: FrontmatterDiagnostic[] = []

  for (const entry of manifest) {
    if (!isRasterImage(entry)) {
      enriched.push(entry)
      continue
    }

    let sourceMetadata: Metadata
    try {
      sourceMetadata = await sharp(entry.sourcePath, { pages: -1 }).metadata()
    } catch {
      diagnostics.push(
        imageDiagnostic(
          entry,
          'IMAGE_DECODE_FAILED',
          `sharp 无法解码图片：${entry.outputPath}`,
        ),
      )
      continue
    }
    if ((sourceMetadata.pages ?? 1) > 1) {
      diagnostics.push(
        imageDiagnostic(
          entry,
          'IMAGE_ANIMATION_UNSUPPORTED',
          `P0 图片流水线不接受动画或多页图片：${entry.outputPath}`,
        ),
      )
      continue
    }
    const width = sourceMetadata.autoOrient.width ?? sourceMetadata.width
    const height = sourceMetadata.autoOrient.height ?? sourceMetadata.height
    if (!width || !height || !sourceMetadata.format) {
      diagnostics.push(
        imageDiagnostic(
          entry,
          'IMAGE_DIMENSIONS_MISSING',
          `图片缺少可用宽高：${entry.outputPath}`,
        ),
      )
      continue
    }
    const sourceBytes = await readFile(entry.sourcePath)
    if (sourceBytes.byteLength > MAX_IMAGE_VARIANT_BYTES) {
      diagnostics.push(
        imageDiagnostic(
          entry,
          'IMAGE_ORIGINAL_TOO_LARGE',
          `图片原始兜底超过 300 KB：${entry.outputPath}`,
        ),
      )
      continue
    }
    enriched.push({
      ...entry,
      image: {
        width,
        height,
        format: sourceMetadata.format,
        derived: false,
      },
    })

    const sourceHash = createHash('sha256').update(sourceBytes).digest('hex')
    for (const targetWidth of IMAGE_VARIANT_WIDTHS) {
      if (targetWidth > width) continue
      for (const { format, quality } of IMAGE_FORMATS) {
        const outputPath = variantOutputPath(entry, targetWidth, format)
        const outputKey = outputPath.toLowerCase()
        const previous = outputOwners.get(outputKey)
        if (previous && previous !== entry.sourcePath) {
          diagnostics.push(
            imageDiagnostic(
              entry,
              'IMAGE_VARIANT_OUTPUT_COLLISION',
              `图片变体目标冲突：${outputPath}`,
            ),
          )
          continue
        }
        outputOwners.set(outputKey, entry.sourcePath)

        const cachePath = path.join(
          cacheRoot,
          `${IMAGE_PIPELINE_VERSION}-sharp-${sharp.versions.sharp}-${sourceHash}-${targetWidth}-${format}-q${quality}.${format}`,
        )
        let metadata: Metadata
        try {
          metadata = await ensureVariant(
            entry.sourcePath,
            cachePath,
            targetWidth,
            format,
            quality,
          )
        } catch {
          diagnostics.push(
            imageDiagnostic(
              entry,
              'IMAGE_TRANSFORM_FAILED',
              `sharp 无法完整解码或转换图片：${entry.outputPath}`,
            ),
          )
          continue
        }
        const cacheFile = await stat(cachePath)
        if (cacheFile.size > MAX_IMAGE_VARIANT_BYTES) {
          diagnostics.push(
            imageDiagnostic(
              entry,
              'IMAGE_VARIANT_TOO_LARGE',
              `图片变体超过 300 KB：${outputPath}`,
            ),
          )
          continue
        }
        if (!metadata.width || !metadata.height) {
          diagnostics.push(
            imageDiagnostic(
              entry,
              'IMAGE_VARIANT_DIMENSIONS_MISSING',
              `图片变体缺少宽高：${outputPath}`,
            ),
          )
          continue
        }
        variants.push({
          id: `${entry.id}:variant:${targetWidth}:${format}`,
          articleSlug: entry.articleSlug,
          nodeId: entry.nodeId,
          nodeName: entry.nodeName,
          attribute: entry.attribute,
          sourcePath: cachePath,
          outputPath,
          publicUrl: `/${outputPath}`,
          bytes: cacheFile.size,
          derivedFrom: entry.outputPath,
          sourceRange: entry.sourceRange,
          image: {
            width: metadata.width,
            height: metadata.height,
            format,
            derived: true,
            quality,
          },
        })
      }
    }
  }

  if (diagnostics.length > 0) {
    throw new ContentBuildError('构建期图片转换失败', diagnostics)
  }
  return [
    ...new Map(
      [...enriched, ...variants].map((entry) => [
        entry.outputPath.toLowerCase(),
        entry,
      ]),
    ).values(),
  ].sort((left, right) => left.outputPath.localeCompare(right.outputPath, 'en'))
}

function isRasterImage(entry: AssetManifestEntry) {
  return (
    (entry.nodeName === 'image' || entry.attribute === 'poster') &&
    RASTER_EXTENSIONS.has(path.extname(entry.sourcePath).toLowerCase())
  )
}

function variantOutputPath(
  entry: AssetManifestEntry,
  width: number,
  format: 'avif' | 'webp',
) {
  const filename = path.parse(entry.sourcePath).name
  return path.posix.join(
    'media',
    entry.articleSlug,
    `${filename}-${width}.${format}`,
  )
}

async function ensureVariant(
  sourcePath: string,
  cachePath: string,
  width: number,
  format: 'avif' | 'webp',
  quality: number,
) {
  try {
    const cached = await sharp(cachePath).metadata()
    if (cached.width === width && matchesSharpFormat(cached.format, format)) {
      return cached
    }
  } catch {
    // Cache miss or corrupt cache: rebuild the exact content-addressed file.
  }

  let pipeline = sharp(sourcePath).autoOrient().resize({
    width,
    withoutEnlargement: true,
  })
  pipeline =
    format === 'avif'
      ? pipeline.avif({ quality })
      : pipeline.webp({ quality })
  await pipeline.toFile(cachePath)
  return sharp(cachePath).metadata()
}

function matchesSharpFormat(
  actual: string | undefined,
  expected: 'avif' | 'webp',
) {
  return actual === expected || (expected === 'avif' && actual === 'heif')
}

function imageDiagnostic(
  entry: AssetManifestEntry,
  code: string,
  message: string,
): FrontmatterDiagnostic {
  return {
    code,
    severity: 'error',
    message,
    articleSlug: entry.articleSlug,
    nodeId: entry.nodeId,
    sourceRange: entry.sourceRange,
  }
}
