import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import sharp from 'sharp'

import baselines from '../fixtures/personal-content-fidelity.json'
import { compileArticleDocumentWithDiagnostics } from '../../src/features/doc-engine/core/compile-document'
import type { DocumentNode } from '../../src/features/doc-engine/core/document-types'
import { createAssetManifest } from '../../src/server/content/asset-manifest'
import { ContentBuildError } from '../../src/server/content/content-error'
import { assembleExport } from '../../src/features/export-service'
import structureRegistry from '../fixtures/personal-content-structure.json'

type StructurePlan = { headings: string[]; restoreOrdinalLists: string[] }
const structures: Readonly<Record<string, StructurePlan>> = structureRegistry

const assets = createAssetManifest().then((entries) => Promise.all(
  entries.filter((entry) => baselines.some((baseline) => baseline.slug === entry.articleSlug)).map(async (entry) => {
    if (!/\.(?:png|jpe?g|webp)$/i.test(entry.sourcePath)) return entry
    const metadata = await sharp(entry.sourcePath).metadata()
    return {
      ...entry,
      image: { width: metadata.width!, height: metadata.height!, format: metadata.format!, derived: false },
    }
  }),
)).catch((error: unknown) => {
  if (error instanceof ContentBuildError) throw new Error(JSON.stringify(error.diagnostics))
  throw error
})

function authorText(node: DocumentNode, svgText: ReadonlyMap<string, string>, structure?: StructurePlan): string {
  if (node.type === 'heading' && structure?.headings.includes(node.canonicalText)) return ''
  if (node.type === 'image') return svgText.get(node.src) ?? ''
  if (node.type === 'registeredComponent' && node.name === 'svg-embed') return svgText.get(node.componentId) ?? ''
  if (node.type === 'registeredComponent' && ['html-embed', 'web-embed', 'canvas-render', 'svg-embed'].includes(node.name)) return ''
  if (node.type === 'list' && node.ordered && structure?.restoreOrdinalLists.some((prefix) =>
    node.children[0]?.canonicalText.replace(/\s/gu, '').startsWith(prefix),
  )) return node.children.map((child, index) => `${(node.start ?? 1) + index}.` + authorText(child, svgText, structure)).join('')
  if ('children' in node) return node.children.map((child) => authorText(child, svgText, structure)).join('')
  if (node.type === 'text' || node.type === 'inlineCode' || node.type === 'code' || node.type === 'math') return node.value
  return ''
}

function digest(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

describe('personal materials: frozen words beneath the presentation layer', () => {
  it.each(baselines)('$slug preserves the frozen author text and metadata', async (entry) => {
    const source = (await readFile(path.join(process.cwd(), 'content/posts', entry.slug, 'index.md'), 'utf8')).replace(/\r\n/g, '\n')
    const metadata = source.match(/^---\n[\s\S]*?\n---\n/)?.[0]
    expect(metadata, 'frontmatter must remain present').toBeDefined()
    expect(digest(metadata!)).toBe(entry.frontmatterSha256)
    const result = await compileArticleDocumentWithDiagnostics({ articleSlug: entry.slug, source, frontmatter: {}, assetManifest: await assets })
    expect(result.diagnostics.filter((item) => item.severity === 'error')).toEqual([])
    const [pageTitle, ...body] = result.document.root.children
    expect(pageTitle?.type).toBe('heading')
    const svgText = new Map(entry.svg.map((item) => [item.id, item.text]))
    for (const item of entry.svg) {
      const svg = (await readFile(path.join(process.cwd(), item.path), 'utf8')).replace(/\r\n/g, '\n')
      expect(digest(svg)).toBe(item.sha256)
      if ('renderedPath' in item && typeof item.renderedPath === 'string') {
        expect(createHash('sha256').update(await readFile(path.join(process.cwd(), item.renderedPath))).digest('hex')).toBe(item.renderedSha256)
      }
    }
    const structure = structures[entry.slug]
    for (const heading of structure?.headings ?? []) {
      expect(body.filter((node) => node.type === 'heading' && node.canonicalText === heading)).toHaveLength(1)
    }
    const text = body.map((node) => authorText(node, svgText, structure)).join('').normalize('NFC').replace(/\s/gu, '')
    if (process.env.FIDELITY_DIAGNOSTICS === '1') {
      const directory = path.join(process.cwd(), '.tmp/content-fidelity/compiled-text')
      await mkdir(directory, { recursive: true })
      await writeFile(path.join(directory, `${entry.slug}.txt`), text, 'utf8')
    }
    expect(digest(text), 'content differs from the independently extracted, reviewed plain-text baseline').toBe(entry.authorTextSha256)
    for (const format of ['markdown', 'text'] as const) {
      const exported = assembleExport({ document: result.document, assetManifest: await assets, format, scope: 'body-only' })
      expect(exported.ok, `${entry.slug} ${format} export`).toBe(true)
      if (!exported.ok) continue
      const value = new TextDecoder('utf-8').decode(exported.artifact.bytes)
      if (format === 'markdown') expect(value).toBe(source)
      else expect(value).not.toMatch(/<\/?(?:html-embed|aside-note|text-mark|inset-card|timeline-block)\b/)
      expect(result.document.originalSource).toBe(source)
    }
  })
})
