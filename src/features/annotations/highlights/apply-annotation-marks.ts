import type { AnnotationLocus } from './group-annotation-loci'

function cssEscape(value: string): string {
  return window.CSS?.escape ? window.CSS.escape(value) : value.replace(/"/g, '\\"')
}

function isChromeText(node: Text): boolean {
  const parent = node.parentElement
  if (!parent) return false
  return parent.closest('button, figcaption, [aria-hidden="true"]') !== null
}

function collectAnnotatableTextNodes(block: Element): Text[] {
  const texts: Text[] = []
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text
    if (!isChromeText(text) && text.data.length > 0) texts.push(text)
  }
  return texts
}

function locate(
  texts: readonly Text[],
  target: number,
): { readonly node: Text; readonly offset: number } | undefined {
  let seen = 0
  for (const text of texts) {
    if (target <= seen + text.data.length) {
      return { node: text, offset: target - seen }
    }
    seen += text.data.length
  }
  return undefined
}

function unwrapMark(mark: HTMLElement): void {
  const parent = mark.parentNode
  if (!parent) return
  while (mark.firstChild) parent.insertBefore(mark.firstChild, mark)
  parent.removeChild(mark)
  if (parent instanceof Element) parent.normalize()
}

function wrapCanonicalRange(
  block: Element,
  startOffset: number,
  endOffset: number,
  locus: AnnotationLocus,
): HTMLElement | undefined {
  const texts = collectAnnotatableTextNodes(block)
  const start = locate(texts, startOffset)
  const end = locate(texts, endOffset)
  if (!start || !end) return undefined

  const range = document.createRange()
  range.setStart(start.node, start.offset)
  range.setEnd(end.node, end.offset)
  if (range.collapsed) return undefined

  const ancestor =
    range.commonAncestorContainer instanceof Element
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement
  if (ancestor?.closest('mark.anno')) return undefined

  const mark = document.createElement('mark')
  mark.className = 'anno'
  mark.dataset.anno = locus.locusId
  if (locus.threadIds.length > 1) {
    mark.dataset.count = String(locus.threadIds.length)
  }

  try {
    range.surroundContents(mark)
  } catch {
    const contents = range.extractContents()
    mark.appendChild(contents)
    range.insertNode(mark)
  }
  return mark
}

export function applyAnnotationHighlights(
  root: ParentNode,
  loci: readonly AnnotationLocus[],
): () => void {
  const marks: HTMLElement[] = []
  const ordered = [...loci].sort((left, right) => {
    if (left.startBlockId !== right.startBlockId) return 0
    return right.startOffset - left.startOffset
  })
  for (const locus of ordered) {
    const block = root.querySelector(`[data-block-id="${cssEscape(locus.startBlockId)}"]`)
    if (!block) continue
    const mark = wrapCanonicalRange(block, locus.startOffset, locus.endOffset, locus)
    if (mark) marks.push(mark)
  }
  return () => {
    for (const mark of marks) unwrapMark(mark)
  }
}

export function flashElement(element: Element): void {
  element.classList.remove('flash')
  if (element instanceof HTMLElement) void element.offsetWidth
  element.classList.add('flash')
  window.setTimeout(() => element.classList.remove('flash'), 1200)
}

export function scrollMarkIntoCenter(locusId: string): HTMLElement | undefined {
  const center = document.querySelector<HTMLElement>('[data-reader-center]')
  const mark = center?.querySelector<HTMLElement>(
    `mark.anno[data-anno="${cssEscape(locusId)}"]`,
  )
  if (!center || !mark) return undefined
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const markRect = mark.getBoundingClientRect()
  const centerRect = center.getBoundingClientRect()
  center.scrollTo({
    top: center.scrollTop + (markRect.top - centerRect.top) - 160,
    behavior: reduced ? 'auto' : 'smooth',
  })
  return mark
}

export function scrollThreadIntoView(locusId: string): HTMLElement | undefined {
  const card = document.querySelector<HTMLElement>(
    `[data-annotation-thread][data-anno="${cssEscape(locusId)}"]`,
  )
  if (!card) return undefined
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  card.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
  return card
}
