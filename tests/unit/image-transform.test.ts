import { randomFillSync } from 'node:crypto'
import { copyFile, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { afterEach, describe, expect, it } from 'vitest'
import {
  createAssetManifest,
  MAX_IMAGE_VARIANT_BYTES,
  transformContentImages,
  type AssetManifestEntry,
} from '../../src/server/content'

const temporaryRoots: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true })),
  )
})

describe('build-time image variants', () => {
  it('creates the locked widths and formats without upscaling', async () => {
    const cacheRoot = await createTemporaryRoot('variants')
    const manifest = await transformContentImages(
      await createAssetManifest(),
      cacheRoot,
    )
    const variants = manifest.filter((entry) => entry.image?.derived)
    const summary = variants.map((entry) => ({
      outputPath: entry.outputPath,
      width: entry.image?.width,
      height: entry.image?.height,
      format: entry.image?.format,
    }))

    expect(summary).toEqual([
      {
        outputPath: 'media/p0-kitchen-sink/cover-480.avif',
        width: 480,
        height: 252,
        format: 'avif',
      },
      {
        outputPath: 'media/p0-kitchen-sink/cover-480.webp',
        width: 480,
        height: 252,
        format: 'webp',
      },
      {
        outputPath: 'media/p0-kitchen-sink/cover-960.avif',
        width: 960,
        height: 504,
        format: 'avif',
      },
      {
        outputPath: 'media/p0-kitchen-sink/cover-960.webp',
        width: 960,
        height: 504,
        format: 'webp',
      },
      {
        outputPath: 'media/p0-kitchen-sink/poster-480.avif',
        width: 480,
        height: 270,
        format: 'avif',
      },
      {
        outputPath: 'media/p0-kitchen-sink/poster-480.webp',
        width: 480,
        height: 270,
        format: 'webp',
      },
    ])
    expect(variants.every((entry) => entry.bytes <= MAX_IMAGE_VARIANT_BYTES)).toBe(
      true,
    )
    expect(
      variants.every(
        (entry) =>
          entry.image?.quality ===
          (entry.image?.format === 'avif' ? 50 : 75),
      ),
    ).toBe(true)
    expect(
      variants.every((entry) => entry.derivedFrom?.endsWith('.png')),
    ).toBe(true)
    expect(summary.some((entry) => entry.width === 1440)).toBe(false)
  })

  it('records original image dimensions for the future IR compiler', async () => {
    const manifest = await transformContentImages(
      await createAssetManifest(),
      await createTemporaryRoot('dimensions'),
    )

    expect(
      manifest.find(
        (entry) =>
          entry.outputPath ===
          'blog/p0-kitchen-sink/media/images/cover.png',
      )?.image,
    ).toEqual({ width: 1200, height: 630, format: 'png', derived: false })
  })

  it('creates every locked width for images at least 1440px wide', async () => {
    const root = await createTemporaryRoot('all-widths')
    const source = path.join(root, 'wide.png')
    await sharp({
      create: {
        width: 1600,
        height: 800,
        channels: 3,
        background: '#663399',
      },
    })
      .png()
      .toFile(source)

    const manifest = await transformContentImages(
      [imageEntry(source, 'wide')],
      path.join(root, 'cache'),
    )
    expect(
      manifest
        .filter((entry) => entry.image?.derived)
        .map((entry) => `${entry.image?.width}:${entry.image?.format}`),
    ).toEqual([
      '1440:avif',
      '1440:webp',
      '480:avif',
      '480:webp',
      '960:avif',
      '960:webp',
    ])
  })

  it('records visual dimensions after applying EXIF orientation', async () => {
    const root = await createTemporaryRoot('orientation')
    const source = path.join(root, 'oriented.jpg')
    await sharp({
      create: {
        width: 40,
        height: 80,
        channels: 3,
        background: '#663399',
      },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toFile(source)

    const manifest = await transformContentImages(
      [imageEntry(source, 'oriented')],
      path.join(root, 'cache'),
    )
    expect(manifest[0]?.image).toMatchObject({
      width: 80,
      height: 40,
      format: 'jpeg',
      derived: false,
    })
  })

  it('reuses content-addressed cache files on repeat transforms', async () => {
    const cacheRoot = await createTemporaryRoot('cache')
    const sourceManifest = await createAssetManifest()
    const first = await transformContentImages(sourceManifest, cacheRoot)
    const firstVariant = first.find((entry) => entry.image?.derived)
    expect(firstVariant).toBeDefined()
    const before = await stat(firstVariant!.sourcePath)

    const second = await transformContentImages(sourceManifest, cacheRoot)
    const matching = second.find(
      (entry) => entry.outputPath === firstVariant!.outputPath,
    )
    const after = await stat(matching!.sourcePath)

    expect(matching?.sourcePath).toBe(firstVariant?.sourcePath)
    expect(after.mtimeMs).toBe(before.mtimeMs)
  })

  it('writes actual AVIF and WebP cache files with recorded dimensions', async () => {
    const manifest = await transformContentImages(
      await createAssetManifest(),
      await createTemporaryRoot('decode'),
    )
    for (const entry of manifest.filter((item) => item.image?.derived)) {
      const metadata = await sharp(entry.sourcePath).metadata()
      expect(metadata).toMatchObject({
        width: entry.image?.width,
        height: entry.image?.height,
      })
      expect(
        metadata.format === entry.image?.format ||
          (entry.image?.format === 'avif' && metadata.format === 'heif'),
      ).toBe(true)
    }
  })

  it('rejects variant output collisions from distinct same-name sources', async () => {
    const root = await createTemporaryRoot('collision')
    const first = path.join(root, 'one/photo.png')
    const second = path.join(root, 'two/photo.png')
    await mkdir(path.dirname(first), { recursive: true })
    await mkdir(path.dirname(second), { recursive: true })
    const source = path.join(
      process.cwd(),
      'content/posts/p0-kitchen-sink/media/images/cover.png',
    )
    await copyFile(source, first)
    await copyFile(source, second)

    await expect(
      transformContentImages(
        [imageEntry(first, 'one'), imageEntry(second, 'two')],
        path.join(root, 'cache'),
      ),
    ).rejects.toMatchObject({
      diagnostics: expect.arrayContaining([
        expect.objectContaining({ code: 'IMAGE_VARIANT_OUTPUT_COLLISION' }),
      ]),
    })
  })

  it('fails deterministically when sharp cannot decode a manifest image', async () => {
    const root = await createTemporaryRoot('invalid')
    const invalid = path.join(root, 'invalid.png')
    await writeFile(invalid, 'not an image', 'utf8')

    await expect(
      transformContentImages(
        [imageEntry(invalid, 'invalid')],
        path.join(root, 'cache'),
      ),
    ).rejects.toMatchObject({
      diagnostics: [expect.objectContaining({ code: 'IMAGE_DECODE_FAILED' })],
    })
  })

  it('normalizes pixel decode failures after readable metadata', async () => {
    const root = await createTemporaryRoot('truncated')
    const complete = path.join(root, 'complete.jpg')
    const truncated = path.join(root, 'truncated.jpg')
    await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: '#663399',
      },
    })
      .jpeg()
      .toFile(complete)
    const bytes = await readFile(complete)
    await writeFile(truncated, bytes.subarray(0, 300))

    await expect(
      transformContentImages(
        [imageEntry(truncated, 'truncated')],
        path.join(root, 'cache'),
      ),
    ).rejects.toMatchObject({
      diagnostics: expect.arrayContaining([
        expect.objectContaining({ code: 'IMAGE_TRANSFORM_FAILED' }),
      ]),
    })
  })

  it('rejects animated raster sources before generating variants', async () => {
    const root = await createTemporaryRoot('animated')
    const source = path.join(root, 'animated.webp')
    await writeFile(
      source,
      Buffer.from(
        'UklGRoQAAABXRUJQVlA4WAoAAAACAAAADwAADwAAQU5JTQYAAAD/////AABBTk1GKAAAAAAAAAAAAA8AAA8AAMgAAAJWUDhMDwAAAC8PwAMABxD1j/4HIqL/AQBBTk1GKAAAAAAAAAAAAA8AAA8AAMgAAABWUDhMDwAAAC8PwAMABxDR//4HIqL/AQA=',
        'base64',
      ),
    )

    await expect(
      transformContentImages(
        [imageEntry(source, 'animated')],
        path.join(root, 'cache'),
      ),
    ).rejects.toMatchObject({
      diagnostics: [
        expect.objectContaining({ code: 'IMAGE_ANIMATION_UNSUPPORTED' }),
      ],
    })
  })

  it('rejects an oversized original fallback even when no variant is generated', async () => {
    const root = await createTemporaryRoot('fallback-budget')
    const source = path.join(root, 'small-noise.png')
    const pixels = Buffer.alloc(400 * 400 * 3)
    randomFillSync(pixels)
    await sharp(pixels, {
      raw: { width: 400, height: 400, channels: 3 },
    })
      .png()
      .toFile(source)

    await expect(
      transformContentImages(
        [imageEntry(source, 'small-noise')],
        path.join(root, 'cache'),
      ),
    ).rejects.toMatchObject({
      diagnostics: [
        expect.objectContaining({ code: 'IMAGE_ORIGINAL_TOO_LARGE' }),
      ],
    })
  })

})

async function createTemporaryRoot(label: string) {
  const root = path.join(
    process.cwd(),
    '.tmp',
    `image-${label}-${crypto.randomUUID()}`,
  )
  temporaryRoots.push(root)
  await mkdir(root, { recursive: true })
  return root
}

function imageEntry(sourcePath: string, id: string): AssetManifestEntry {
  return {
    id,
    articleSlug: 'collision-post',
    nodeId: id,
    nodeName: 'image',
    attribute: 'src',
    sourcePath,
    outputPath: `blog/collision-post/${id}/photo.png`,
    publicUrl: `/blog/collision-post/${id}/photo.png`,
    bytes: 3655,
    sourceRange: {
      start: { line: 1, column: 1, offset: 0 },
      end: { line: 1, column: 1, offset: 0 },
    },
  }
}
