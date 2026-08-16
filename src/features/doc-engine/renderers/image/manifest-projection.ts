import {
  normalizeArticleImageRelativePath,
  type InlineImageNode,
  type BlockImageNode,
} from '../../core'

export type ResponsiveImageSources = Readonly<{
  fallback: string
  avifSrcSet?: string
  webpSrcSet?: string
  sizes?: string
}>

const ARTICLE_IMAGE_SIZES =
  '(max-width: 768px) calc(100vw - 2.5rem), min(56rem, calc(100vw - 5rem))'

export function projectResponsiveImageSources(
  node: InlineImageNode | BlockImageNode,
  articleSlug: string,
  manifest: readonly unknown[],
): ResponsiveImageSources {
  if (!node.src.startsWith('./')) {
    return Object.freeze({ fallback: node.src })
  }

  const relativePath = normalizeArticleImageRelativePath(node.src)
  const outputPath = `blog/${articleSlug}/${relativePath}`
  const entries = manifest.flatMap(readImageEntry)
  const original = entries.find(
    (entry) =>
      entry.articleSlug === articleSlug &&
      entry.outputPath === outputPath &&
      entry.image.derived === false,
  )
  const fallback = original
    ? encodePublicUrl(original.publicUrl)
    : encodeArticleImageUrl(articleSlug, relativePath)
  const variants = entries
    .filter(
      (entry) =>
        entry.articleSlug === articleSlug &&
        entry.derivedFrom === outputPath &&
        entry.image.derived === true,
    )
    .sort((left, right) => left.image.width - right.image.width)

  const avifSrcSet = buildSourceSet(variants, 'avif')
  const webpSrcSet = buildSourceSet(variants, 'webp')
  return Object.freeze({
    fallback,
    ...(avifSrcSet ? { avifSrcSet } : {}),
    ...(webpSrcSet ? { webpSrcSet } : {}),
    ...(avifSrcSet || webpSrcSet ? { sizes: ARTICLE_IMAGE_SIZES } : {}),
  })
}

type ManifestImageEntry = Readonly<{
  articleSlug: string
  outputPath: string
  publicUrl: string
  derivedFrom?: string
  image: Readonly<{
    width: number
    format: string
    derived: boolean
  }>
}>

function readImageEntry(value: unknown): readonly ManifestImageEntry[] {
  if (!value || typeof value !== 'object') return []
  const entry = value as Record<string, unknown>
  const image = entry.image
  if (!image || typeof image !== 'object') return []
  const imageRecord = image as Record<string, unknown>
  if (
    typeof entry.articleSlug !== 'string' ||
    typeof entry.outputPath !== 'string' ||
    typeof entry.publicUrl !== 'string' ||
    (entry.derivedFrom !== undefined && typeof entry.derivedFrom !== 'string') ||
    typeof imageRecord.width !== 'number' ||
    !Number.isSafeInteger(imageRecord.width) ||
    imageRecord.width <= 0 ||
    typeof imageRecord.format !== 'string' ||
    typeof imageRecord.derived !== 'boolean'
  ) {
    return []
  }
  return [
    {
      articleSlug: entry.articleSlug,
      outputPath: entry.outputPath,
      publicUrl: entry.publicUrl,
      ...(typeof entry.derivedFrom === 'string'
        ? { derivedFrom: entry.derivedFrom }
        : {}),
      image: {
        width: imageRecord.width,
        format: imageRecord.format,
        derived: imageRecord.derived,
      },
    },
  ]
}

function buildSourceSet(
  entries: readonly ManifestImageEntry[],
  format: 'avif' | 'webp',
): string | undefined {
  const candidates = entries
    .filter((entry) => entry.image.format === format)
    .map((entry) => `${encodePublicUrl(entry.publicUrl)} ${entry.image.width}w`)
  return candidates.length > 0 ? candidates.join(', ') : undefined
}

function encodeArticleImageUrl(articleSlug: string, relativePath: string): string {
  const encodedPath = relativePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return `/blog/${encodeURIComponent(articleSlug)}/${encodedPath}`
}

function encodePublicUrl(value: string): string {
  return value
    .split('/')
    .map((segment, index) =>
      index === 0 ? '' : encodeURIComponent(segment),
    )
    .join('/')
}
