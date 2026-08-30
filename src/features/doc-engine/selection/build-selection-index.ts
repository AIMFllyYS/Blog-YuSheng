import type {
  BlockNode,
  HeadingNode,
  InlineNode,
  TableCellNode,
} from '../core/document-types'
import type { ListItemNode } from '../core/document-types'

type AnySemanticBlock = BlockNode | ListItemNode | TableCellNode
import {
  type SelectionBlockEntry,
  type SelectionDocumentIndex,
  type SelectionIndexInput,
  type SelectionInlineAtomic,
} from './selection-types'

type HeadingStackItem = { readonly depth: HeadingNode['depth']; readonly slug: string }

/**
 * Build the selection-side projection of a compiled document: every semantic
 * block that carries `data-block-id` in the DOM, with the canonical text and
 * inline atomic ranges the pure selection mapper aligns against. Pure and
 * deterministic so #38 can freeze identical data into golden fixtures.
 */
export function buildSelectionIndex(
  document: SelectionIndexInput,
): SelectionDocumentIndex {
  const blocks: SelectionBlockEntry[] = []
  const headingStack: HeadingStackItem[] = []
  collectBlocks(document.root.children, blocks, headingStack)
  return {
    articleSlug: document.articleSlug,
    documentFingerprint: document.documentFingerprint,
    blocks,
  }
}

function collectBlocks(
  nodes: readonly BlockNode[],
  blocks: SelectionBlockEntry[],
  headingStack: HeadingStackItem[],
): void {
  nodes.forEach((node) => {
    if (node.type === 'heading') {
      while (headingStack.at(-1) && headingStack.at(-1)!.depth >= node.depth) {
        headingStack.pop()
      }
      const headingPath = [...headingStack.map((item) => item.slug), node.slug]
      headingStack.push({ depth: node.depth, slug: node.slug })
      blocks.push(entryOf(node, 'text', headingPath))
      return
    }
    const headingPath = headingStack.map((item) => item.slug)
    switch (node.type) {
      case 'paragraph':
        blocks.push(entryOf(node, 'text', headingPath))
        return
      case 'code':
        blocks.push(entryOf(node, 'text', headingPath))
        return
      case 'list':
        blocks.push(entryOf(node, 'container', headingPath))
        node.children.forEach((item) => {
          blocks.push(entryOf(item, 'container', headingPath))
          collectBlocks(item.children, blocks, headingStack)
        })
        return
      case 'quote':
      case 'footnoteDefinition':
        blocks.push(entryOf(node, 'container', headingPath))
        collectBlocks(node.children, blocks, headingStack)
        return
      case 'table':
        blocks.push(entryOf(node, 'container', headingPath))
        node.children.forEach((row) => {
          row.children.forEach((cell) => {
            blocks.push(entryOf(cell, 'text', headingPath))
          })
        })
        return
      case 'math':
        if (node.display) {
          blocks.push(entryOf(node, 'whole-block', headingPath))
        }
        return
      case 'mermaid':
      case 'image':
      case 'thematicBreak':
        blocks.push(entryOf(node, 'none', headingPath))
        return
      case 'registeredComponent':
        if (node.selectable === 'text-range') {
          collectBlocks(node.children, blocks, headingStack)
          return
        }
        blocks.push(entryOf(node, 'none', headingPath))
        return
    }
  })
}

function entryOf(
  node: AnySemanticBlock,
  mode: SelectionBlockEntry['mode'],
  headingPath: readonly string[],
): SelectionBlockEntry {
  const inlineAtomics =
    mode === 'text' || mode === 'whole-block'
      ? atomicsOf(node)
      : []
  return {
    blockId: node.blockId,
    nodeId: node.nodeId,
    type: node.type,
    mode,
    canonicalText: node.canonicalText,
    headingPath,
    inlineAtomics,
  }
}

/**
 * Inline math and inline images are the only inline nodes whose DOM text
 * diverges from `canonicalText` (KaTeX renders glyphs, images render no
 * text), so the mapper only needs their canonical ranges. Positions follow
 * the concatenation order of `compileInline` exactly.
 */
function atomicsOf(node: AnySemanticBlock): readonly SelectionInlineAtomic[] {
  if (node.type === 'math' && node.display) {
    return [
      {
        nodeId: node.nodeId,
        kind: 'math',
        canonicalStart: 0,
        canonicalEnd: node.canonicalText.length,
      },
    ]
  }
  if (node.type === 'heading' || node.type === 'paragraph' || node.type === 'tableCell') {
    const atomics: SelectionInlineAtomic[] = []
    collectInlineAtomics(node.children, { length: 0 }, atomics)
    return atomics
  }
  return []
}

function collectInlineAtomics(
  nodes: readonly InlineNode[],
  cursor: { length: number },
  atomics: SelectionInlineAtomic[],
): void {
  for (const node of nodes) {
    const start = cursor.length
    if (node.type === 'math') {
      atomics.push({
        nodeId: node.nodeId,
        kind: 'math',
        canonicalStart: start,
        canonicalEnd: start + node.canonicalText.length,
      })
      cursor.length = start + node.canonicalText.length
      continue
    }
    if (node.type === 'image') {
      atomics.push({
        nodeId: node.nodeId,
        kind: 'image',
        canonicalStart: start,
        canonicalEnd: start + node.alt.length,
      })
      cursor.length = start + node.alt.length
      continue
    }
    cursor.length = start + inlineCanonicalLength(node)
  }
}

function inlineCanonicalLength(node: InlineNode): number {
  if (
    node.type === 'emphasis' ||
    node.type === 'strong' ||
    node.type === 'delete' ||
    node.type === 'link'
  ) {
    const cursor = { length: 0 }
    collectInlineAtomics(node.children, cursor, [])
    return cursor.length
  }
  if (node.type === 'image') return node.alt.length
  return node.canonicalText.length
}

export function findSelectionEntry(
  index: SelectionDocumentIndex,
  blockId: string | undefined,
): SelectionBlockEntry | undefined {
  if (!blockId) return undefined
  return index.blocks.find((block) => block.blockId === blockId)
}
