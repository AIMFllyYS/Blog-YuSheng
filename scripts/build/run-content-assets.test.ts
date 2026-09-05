import { mkdir, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { expect, test } from 'vitest'
import {
  buildContentAssets,
  copyAssetManifest,
  verifyStaticOutput,
} from '../../src/server/content'

test('builds the validated content asset manifest into out', async () => {
  const manifest = await buildContentAssets()
  const original = manifest.find(
    (entry) =>
      entry.outputPath === 'blog/p0-kitchen-sink/media/images/cover.png',
  )
  const variants = manifest.filter((entry) => entry.image?.derived)

  expect(original?.image).toMatchObject({ derived: false, format: 'png' })
  expect(variants.filter((entry) => entry.articleSlug === 'p0-kitchen-sink')).toHaveLength(6)
  for (const entry of [original!, ...variants]) {
    const outputPath = path.join(process.cwd(), 'out', entry.outputPath)
    const metadata = await sharp(outputPath).metadata()
    expect(metadata.width).toBe(entry.image?.width)
    expect(metadata.height).toBe(entry.image?.height)
    expect(
      metadata.format === entry.image?.format ||
        (entry.image?.format === 'avif' && metadata.format === 'heif'),
    ).toBe(true)
  }
  const articleHtml = await readFile(
    path.join(
      process.cwd(),
      'out',
      'blog',
      'p0-kitchen-sink',
      'index.html',
    ),
    'utf8',
  )
  const figure = articleHtml.match(
    /<figure[^>]*data-image-renderer="responsive"[\s\S]*?<\/figure>/,
  )?.[0]
  expect(figure).toBeDefined()
  expect(figure).toContain('<picture>')
  expect(figure).toContain('type="image/avif"')
  expect(figure).toContain('type="image/webp"')
  expect(figure).toContain('width="1200"')
  expect(figure).toContain('height="630"')
  expect(figure).toContain('<figcaption')
  expect(figure).toContain('P0 验收封面')
  const urls = Array.from(
    figure?.matchAll(/(?:src|srcSet)="([^"]+)"/g) ?? [],
    (match) => match[1]!,
  ).flatMap((value) =>
    value.split(',').map((candidate) => candidate.trim().split(' ')[0]!),
  )
  expect(urls).toContain('/blog/p0-kitchen-sink/media/images/cover.png')
  expect(urls.some((url) => url.endsWith('.avif'))).toBe(true)
  expect(urls.some((url) => url.endsWith('.webp'))).toBe(true)
  for (const publicUrl of urls) {
    expect(
      manifest.some((entry) => entry.publicUrl === publicUrl),
    ).toBe(true)
  }
  const isolatedOutput = path.join(
    process.cwd(),
    '.tmp',
    `postbuild-count-${crypto.randomUUID()}`,
  )
  await mkdir(isolatedOutput, { recursive: true })
  try {
    await copyAssetManifest([original!, ...variants], isolatedOutput)
    await expect(
      verifyStaticOutput(isolatedOutput, { maxFileCount: 6 }),
    ).rejects.toMatchObject({
      diagnostics: [
        expect.objectContaining({ code: 'STATIC_OUTPUT_FILE_COUNT_EXCEEDED' }),
      ],
    })
  } finally {
    await rm(isolatedOutput, { recursive: true })
  }
})
