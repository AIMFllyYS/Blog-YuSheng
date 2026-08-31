import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from 'vitest'

import { writeAnchorManifests } from '../../src/server/content'

const FULL_CATALOG_BUILD_TIMEOUT_MS = 30_000

test(
  'writes a read-only anchor manifest beside every generated article',
  async () => {
    const written = await writeAnchorManifests()
    expect(written).toContain(
      path.join('blog', 'p0-kitchen-sink', 'anchor-manifest.json'),
    )
    expect(written).toContain(
      path.join('blog', 'p0-kitchen-sink', 'export-source.json'),
    )

    const manifestPath = path.join(
      process.cwd(),
      'out',
      'blog',
      'p0-kitchen-sink',
      'anchor-manifest.json',
    )
    const parsed = JSON.parse(await readFile(manifestPath, 'utf8')) as {
      protocolVersion: string
      articleSlug: string
      documentFingerprint: string
      blocks: {
        blockId: string
        mode: string
        canonicalText: string
        headingPath: string[]
      }[]
    }
    expect(parsed.protocolVersion).toBe('text-anchor-v1')
    expect(parsed.articleSlug).toBe('p0-kitchen-sink')
    expect(parsed.documentFingerprint).toMatch(/^[0-9a-f]{64}$/u)
    const heading = parsed.blocks.find(
      (block) => block.blockId === 'markdown-与-gfm',
    )
    expect(heading?.mode).toBe('text')
    expect(heading?.canonicalText).toBe('Markdown 与 GFM')
    expect(parsed.blocks.some((block) => block.mode === 'whole-block')).toBe(
      true,
    )

    const exportPath = path.join(
      process.cwd(),
      'out',
      'blog',
      'p0-kitchen-sink',
      'export-source.json',
    )
    const exportSource = JSON.parse(await readFile(exportPath, 'utf8')) as {
      schemaVersion: number
      articleSlug: string
      originalSource: string
      plainText: string
    }
    expect(exportSource.schemaVersion).toBe(1)
    expect(exportSource.articleSlug).toBe('p0-kitchen-sink')
    expect(exportSource.originalSource).toContain('schemaVersion: 1')
    expect(exportSource.plainText.length).toBeGreaterThan(20)
  },
  // This integration test recompiles the complete published catalog and writes
  // every article sidecar. EdgeOne shared runners can exceed Vitest's 5 s unit
  // test default as the catalog grows, even when generation is healthy.
  FULL_CATALOG_BUILD_TIMEOUT_MS,
)
