import {
  DOCUMENT_PROTOCOL_VERSION,
  type SourceRange,
} from './document-types'
import {
  createDocumentDiagnostic,
  type DocumentDiagnostic,
} from './diagnostics'

const UTF8 = new TextEncoder()
export type StableBlockNodeType =
  | 'heading'
  | 'paragraph'
  | 'list'
  | 'listItem'
  | 'quote'
  | 'table'
  | 'tableCell'
  | 'code'
  | 'math'
  | 'mermaid'
  | 'image'
  | 'registeredComponent'
  | 'footnoteDefinition'
  | 'thematicBreak'

export function normalizeDocumentSource(source: string): string {
  return source
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .normalize('NFC')
}

export async function createDocumentFingerprint(source: string): Promise<string> {
  return sha256Hex(
    `${DOCUMENT_PROTOCOL_VERSION}\n${normalizeDocumentSource(source)}`,
  )
}

export function normalizeHeadingSlug(title: string): string {
  const slug = title
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'section'
}

export class StableIdAllocator {
  readonly #articleSlug: string
  readonly #headingCounts = new Map<string, number>()
  readonly #allocatedHeadingSlugs = new Set<string>()
  readonly #componentCounts = new Map<string, number>()
  readonly #allocatedComponentIds = new Set<string>()

  constructor(articleSlug: string) {
    this.#articleSlug = articleSlug
  }

  allocateHeading(title: string): string {
    const base = normalizeHeadingSlug(title)
    let count = (this.#headingCounts.get(base) ?? 0) + 1
    let candidate = count === 1 ? base : `${base}-${count}`
    while (this.#allocatedHeadingSlugs.has(candidate)) {
      count += 1
      candidate = `${base}-${count}`
    }
    this.#headingCounts.set(base, count)
    this.#allocatedHeadingSlugs.add(candidate)
    return candidate
  }

  allocateComponent(
    authorId: string,
    sourceRange: SourceRange,
  ): { nodeId: string; diagnostic?: DocumentDiagnostic } {
    let count = (this.#componentCounts.get(authorId) ?? 0) + 1
    if (count === 1 && !this.#allocatedComponentIds.has(authorId)) {
      this.#componentCounts.set(authorId, count)
      this.#allocatedComponentIds.add(authorId)
      return { nodeId: authorId }
    }
    count = Math.max(count, 2)
    let candidate = `${authorId}--duplicate-${count}`
    while (this.#allocatedComponentIds.has(candidate)) {
      count += 1
      candidate = `${authorId}--duplicate-${count}`
    }
    this.#componentCounts.set(authorId, count)
    this.#allocatedComponentIds.add(candidate)
    return {
      nodeId: candidate,
      diagnostic: createDocumentDiagnostic('DOC-REGISTRY-003', {
        articleSlug: this.#articleSlug,
        nodeId: authorId,
        sourceRange,
      }),
    }
  }
}

export async function createStableBlockId(input: {
  headingPath: readonly string[]
  blockType: StableBlockNodeType
  siblingIndex: number
  canonicalText: string
}): Promise<string> {
  if (!Number.isSafeInteger(input.siblingIndex) || input.siblingIndex < 0) {
    throw new RangeError('同级块序号必须是非负安全整数')
  }
  const normalizedText = normalizeBlockCanonicalText(
    input.blockType,
    input.canonicalText,
  )
  const contentFingerprint = await sha256Hex(normalizedText)
  const identity = JSON.stringify({
    protocolVersion: DOCUMENT_PROTOCOL_VERSION,
    headingPath: input.headingPath,
    blockType: input.blockType,
    siblingIndex: input.siblingIndex,
    contentFingerprint,
  })
  const identityHash = await sha256Hex(identity)
  return `block-${input.blockType}-${identityHash.slice(0, 16)}`
}

export function normalizeBlockCanonicalText(
  blockType: StableBlockNodeType,
  canonicalText: string,
): string {
  const lineNormalized = canonicalText.replace(/\r\n?/g, '\n')
  return blockType === 'code' || blockType === 'mermaid'
    ? lineNormalized
    : lineNormalized.normalize('NFC')
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', UTF8.encode(value))
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
