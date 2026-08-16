import { mkdir, rm } from 'node:fs/promises'
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
  expect(variants).toHaveLength(6)
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
