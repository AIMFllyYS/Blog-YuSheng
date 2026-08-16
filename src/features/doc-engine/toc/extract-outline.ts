import type {
  CompiledDocument,
  DocumentNode,
  HeadingNode,
} from '../core'

export type OutlineEmbedMarkers = {
  readonly customTag: boolean
  readonly image: boolean
  readonly mindmap: boolean
}

export type OutlineItem = {
  readonly nodeId: string
  readonly blockId: string
  readonly slug: string
  readonly title: string
  readonly depth: HeadingNode['depth']
  readonly characterCount: number
  readonly embeds: OutlineEmbedMarkers
  readonly children: readonly OutlineItem[]
}

export type DocumentOutline = {
  /** Visible grapheme count for the complete document, including pre-heading text. */
  readonly characterCount: number
  /** Complete heading hierarchy for the conventional table of contents. */
  readonly items: readonly OutlineItem[]
  /** Primary article sections consumed by the graphical skeleton view. */
  readonly primarySections: readonly OutlineItem[]
}

type MutableOutlineItem = {
  readonly nodeId: string
  readonly blockId: string
  readonly slug: string
  readonly title: string
  readonly depth: HeadingNode['depth']
  characterCount: number
  readonly embeds: {
    customTag: boolean
    image: boolean
    mindmap: boolean
  }
  readonly children: MutableOutlineItem[]
}

/**
 * Extract both TOC modes in one depth-first pass over the Canonical IR.
 * Markdown source and rendered DOM are intentionally not consulted here.
 */
export function extractOutline(document: CompiledDocument): DocumentOutline {
  const items: MutableOutlineItem[] = []
  const headingStack: MutableOutlineItem[] = []
  let firstRootBlockNodeId: string | undefined
  let rootLevelH1Count = 0
  let documentCharacterCount = 0

  visit(document.root)

  const frozenItems = Object.freeze(items.map(freezeItem))
  const possibleArticleTitle = frozenItems[0]
  const frontmatterTitle = readFrontmatterTitle(document.frontmatter)
  const articleTitleMatches =
    frontmatterTitle === undefined ||
    normalizeTitle(frontmatterTitle) === normalizeTitle(possibleArticleTitle?.title ?? '')
  const primarySections =
    frozenItems.length === 1 &&
    possibleArticleTitle?.depth === 1 &&
    possibleArticleTitle.nodeId === firstRootBlockNodeId &&
    rootLevelH1Count === 1 &&
    articleTitleMatches &&
    possibleArticleTitle.children.length > 0
      ? possibleArticleTitle.children
      : frozenItems

  return Object.freeze({
    characterCount: documentCharacterCount,
    items: frozenItems,
    primarySections,
  })

  function visit(
    node: DocumentNode,
    countText = true,
    collectHeadings = true,
    isRootChild = false,
  ): void {
    if (node.type === 'heading') {
      if (!collectHeadings) {
        if (countText) addCharacters(node.canonicalText)
        for (const child of node.children) visit(child, false, false)
        return
      }

      if (isRootChild && node.depth === 1) rootLevelH1Count += 1
      const titleCount = countCharacters(node.canonicalText)
      documentCharacterCount += titleCount
      for (const ancestor of headingStack) {
        if (ancestor.depth < node.depth) ancestor.characterCount += titleCount
      }

      while (
        headingStack.length > 0 &&
        headingStack[headingStack.length - 1]!.depth >= node.depth
      ) {
        headingStack.pop()
      }

      const item: MutableOutlineItem = {
        nodeId: node.nodeId,
        blockId: node.blockId,
        slug: node.slug,
        title: node.canonicalText,
        depth: node.depth,
        characterCount: 0,
        embeds: { customTag: false, image: false, mindmap: false },
        children: [],
      }
      const parent = headingStack[headingStack.length - 1]
      if (parent) parent.children.push(item)
      else items.push(item)
      headingStack.push(item)

      for (const child of node.children) visit(child, false, collectHeadings)
      return
    }

    recordEmbed(node)

    switch (node.type) {
      case 'text':
      case 'inlineCode':
      case 'footnoteReference':
        if (countText) addCharacters(node.canonicalText)
        return
      case 'math':
      case 'code':
      case 'mermaid':
        if (countText) addCharacters(node.canonicalText)
        return
      case 'image':
        if (countText) addCharacters(node.alt)
        return
      case 'registeredComponent':
        if (node.children.length === 0) {
          if (countText) addCharacters(node.canonicalText)
          return
        }
        for (const child of node.children) visit(child, countText, false)
        return
      case 'root':
        firstRootBlockNodeId = node.children[0]?.nodeId
        for (const child of node.children) visit(child, countText, collectHeadings, true)
        return
      case 'paragraph':
      case 'emphasis':
      case 'strong':
      case 'delete':
      case 'link':
      case 'list':
      case 'listItem':
      case 'quote':
      case 'table':
      case 'tableRow':
      case 'tableCell':
      case 'footnoteDefinition':
        for (const child of node.children) visit(child, countText, collectHeadings)
        return
      case 'thematicBreak':
        return
    }
  }

  function addCharacters(value: string): void {
    const count = countCharacters(value)
    documentCharacterCount += count
    for (const heading of headingStack) heading.characterCount += count
  }

  function recordEmbed(node: DocumentNode): void {
    if (node.type === 'image') {
      markActiveHeadings('image')
      return
    }
    if (
      node.type === 'mermaid' &&
      isMindmapDiagram(node.value)
    ) {
      markActiveHeadings('mindmap')
      return
    }
    if (node.type !== 'registeredComponent') return
    if (node.name === 'audio-embed') return
    markActiveHeadings(node.name === 'mindmap-embed' ? 'mindmap' : 'customTag')
  }

  function markActiveHeadings(marker: keyof OutlineEmbedMarkers): void {
    for (const heading of headingStack) heading.embeds[marker] = true
  }
}

function countCharacters(value: string): number {
  let count = 0
  for (const segment of GRAPHEME_SEGMENTER.segment(value)) {
    if (!/^\s+$/u.test(segment.segment)) count += 1
  }
  return count
}

const GRAPHEME_SEGMENTER = new Intl.Segmenter(undefined, {
  granularity: 'grapheme',
})

function isMindmapDiagram(value: string): boolean {
  const lines = value.replace(/\r\n?/g, '\n').split('\n')
  let inFrontmatter = false
  let inDirective = false

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue
    if (inFrontmatter) {
      if (line === '---') inFrontmatter = false
      continue
    }
    if (inDirective) {
      if (line.includes('}%%')) inDirective = false
      continue
    }
    if (line === '---') {
      inFrontmatter = true
      continue
    }
    if (line.startsWith('%%{')) {
      if (!line.includes('}%%')) inDirective = true
      continue
    }
    if (line.startsWith('%%')) continue
    return /^mindmap(?:\s|$)/iu.test(line)
  }
  return false
}

function readFrontmatterTitle(frontmatter: unknown): string | undefined {
  if (!frontmatter || typeof frontmatter !== 'object') return undefined
  const title = (frontmatter as { title?: unknown }).title
  return typeof title === 'string' ? title : undefined
}

function normalizeTitle(value: string): string {
  return value.normalize('NFC').replace(/\s+/gu, ' ').trim()
}

function freezeItem(item: MutableOutlineItem): OutlineItem {
  return Object.freeze({
    nodeId: item.nodeId,
    blockId: item.blockId,
    slug: item.slug,
    title: item.title,
    depth: item.depth,
    characterCount: item.characterCount,
    embeds: Object.freeze({ ...item.embeds }),
    children: Object.freeze(item.children.map(freezeItem)),
  })
}
