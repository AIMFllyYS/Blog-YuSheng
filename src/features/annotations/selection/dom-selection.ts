import {
  type SelectionBlockEntry,
  type SelectionDocumentIndex,
  type SelectionDomTextChunk,
  type SelectionEndpointRef,
  type SelectionMappingResult,
  findSelectionEntry,
  mapDomSelection,
} from '@/features/doc-engine/selection'

type TextNodePosition = {
  readonly textNode: Text
  readonly offset: number
}

type ResolvedEndpoint =
  | { readonly kind: 'text'; readonly blockId: string | undefined; readonly position: TextNodePosition }
  | { readonly kind: 'atomic'; readonly blockId: string | undefined; readonly nodeId: string }
  | { readonly kind: 'none'; readonly blockId: string | undefined }

/**
 * Translate a real browser Selection into Canonical IR coordinates using the
 * spec §5.2 DOM source-mapping attributes (`data-block-id`,
 * `data-node-id`, `data-selectable`). The heavy lifting is the pure
 * `mapDomSelection`; this module only normalizes DOM shapes.
 */
export function mapBrowserSelection(
  selection: Selection,
  index: SelectionDocumentIndex,
  scope: ParentNode,
): SelectionMappingResult {
  if (selection.isCollapsed || rangeCountOf(selection) === 0) {
    return { status: 'rejected', reason: 'collapsed' }
  }
  const range = selection.getRangeAt(0)
  if (range.collapsed) {
    return { status: 'rejected', reason: 'collapsed' }
  }
  const start = resolveEndpoint(range.startContainer, range.startOffset, scope)
  const end = resolveEndpoint(range.endContainer, range.endOffset, scope)
  if (start.blockId === undefined || end.blockId === undefined) {
    return { status: 'rejected', reason: 'outside-article' }
  }
  if (start.blockId !== end.blockId) {
    return { status: 'rejected', reason: 'cross-block' }
  }
  const entry = findSelectionEntry(index, start.blockId)
  if (!entry || entry.mode === 'none' || entry.mode === 'container') {
    return { status: 'rejected', reason: 'not-annotatable' }
  }
  const chunks = collectBlockChunks(entry)
  const startRef = endpointRef(entry, start)
  const endRef = endpointRef(entry, end)
  if (!startRef || !endRef) {
    return { status: 'rejected', reason: 'not-annotatable' }
  }
  return mapDomSelection({
    index,
    startBlockId: start.blockId,
    endBlockId: end.blockId,
    entry,
    chunks,
    start: startRef,
    end: endRef,
  })
}

function rangeCountOf(selection: Selection): number {
  return selection.rangeCount
}

function resolveEndpoint(
  node: Node,
  offset: number,
  scope: ParentNode,
): ResolvedEndpoint {
  const position = normalizeTextPosition(node, offset)
  if (!position) {
    return { kind: 'none', blockId: blockIdOf(node, scope) }
  }
  const blockId = blockIdOf(position.textNode, scope)
  const blockElement = closestIncludingSelf(position.textNode, '[data-block-id]')
  const noneElement = closestIncludingSelf(position.textNode, '[data-selectable="none"]')
  const noneIsInsideBlock =
    noneElement !== null &&
    blockElement !== null &&
    (noneElement === blockElement || blockElement.contains(noneElement))
  if (noneIsInsideBlock) {
    const nodeId = noneElement.getAttribute('data-node-id')
    if (nodeId) return { kind: 'atomic', blockId, nodeId }
  }
  return { kind: 'text', blockId, position }
}

/**
 * `Element.closest` excludes the node itself, but selection endpoints can be
 * element containers (e.g. selectNodeContents on a Mermaid root), so match
 * from the node itself when it is an element.
 */
function closestIncludingSelf(node: Node, selector: string): HTMLElement | null {
  if (isElement(node) && node.matches(selector)) return node as HTMLElement
  const parent = node.parentElement
  return parent ? parent.closest<HTMLElement>(selector) : null
}

/**
 * Collapse element containers (offset = child index) to an adjacent text
 * boundary so every endpoint is a (Text, offset) pair the aligner consumes.
 */
function normalizeTextPosition(node: Node, offset: number): TextNodePosition | undefined {
  if (isText(node)) return { textNode: node, offset }
  if (!isElement(node)) return undefined
  const forward = node.childNodes[offset]
  const forwardText = forward ? firstTextWithin(forward) : undefined
  if (forwardText) return { textNode: forwardText, offset: 0 }
  const backward = node.childNodes[offset - 1]
  const backwardText = backward ? lastTextWithin(backward) : undefined
  if (backwardText) return { textNode: backwardText, offset: backwardText.data.length }
  return undefined
}

function firstTextWithin(node: Node): Text | undefined {
  if (isText(node)) return node
  if (!isElement(node)) return undefined
  for (const child of Array.from(node.childNodes)) {
    const text = firstTextWithin(child)
    if (text) return text
  }
  return undefined
}

function lastTextWithin(node: Node): Text | undefined {
  if (isText(node)) return node
  if (!isElement(node)) return undefined
  for (const child of Array.from(node.childNodes).reverse()) {
    const text = lastTextWithin(child)
    if (text) return text
  }
  return undefined
}

function blockIdOf(node: Node, scope: ParentNode): string | undefined {
  const block = closestIncludingSelf(node, '[data-block-id]')
  if (!block) return undefined
  if (!scope.contains(block)) return undefined
  return block.getAttribute('data-block-id') ?? undefined
}

function closestNone(node: Node): HTMLElement | null {
  if (isElement(node) && node.matches('[data-selectable="none"]')) {
    return node as HTMLElement
  }
  const parent = node.parentElement
  return parent ? parent.closest<HTMLElement>('[data-selectable="none"]') : null
}

function isText(node: Node): node is Text {
  return node.nodeType === Node.TEXT_NODE
}

function isElement(node: Node): node is Element {
  return node.nodeType === Node.ELEMENT_NODE
}

function collectBlockChunks(entry: SelectionBlockEntry): SelectionDomTextChunk[] {
  const container = document.querySelector<HTMLElement>(
    `[data-block-id="${cssEscape(entry.blockId)}"]`,
  )
  if (!container) return []
  const chunks: SelectionDomTextChunk[] = []
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  let current = walker.nextNode()
  while (current) {
    if (isText(current) && !isBlockChromeText(current)) {
      const noneElement = closestNone(current)
      const withinContainer =
        noneElement && (noneElement === container || container.contains(noneElement))
      chunks.push({
        text: current.data,
        atomicNodeId: withinContainer
          ? noneElement.getAttribute('data-node-id')
          : null,
      })
    }
    current = walker.nextNode()
  }
  return chunks
}

/**
 * Per-block UI chrome (code language badges, copy buttons, hidden labels)
 * never participates in canonical text; both walkers skip it identically.
 */
function isBlockChromeText(node: Text): boolean {
  const parent = node.parentElement
  if (!parent) return false
  return parent.closest('button, figcaption, [aria-hidden="true"]') !== null
}

function cssEscape(value: string): string {
  return window.CSS?.escape ? window.CSS.escape(value) : value.replace(/"/g, '\\"')
}

function endpointRef(
  entry: SelectionBlockEntry,
  endpoint: ResolvedEndpoint,
): SelectionEndpointRef | undefined {
  if (endpoint.kind === 'atomic') {
    return entry.inlineAtomics.some((atomic) => atomic.nodeId === endpoint.nodeId)
      ? { kind: 'atomic', nodeId: endpoint.nodeId }
      : undefined
  }
  if (endpoint.kind !== 'text') return undefined
  const container = document.querySelector<HTMLElement>(
    `[data-block-id="${cssEscape(entry.blockId)}"]`,
  )
  if (!container) return undefined
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  let chunkIndex = -1
  let current = walker.nextNode()
  while (current) {
    if (isText(current) && !isBlockChromeText(current)) {
      chunkIndex += 1
      if (current === endpoint.position.textNode) {
        return { kind: 'text', chunkIndex, offset: endpoint.position.offset }
      }
    }
    current = walker.nextNode()
  }
  return undefined
}
