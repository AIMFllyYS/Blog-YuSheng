import type { CompiledDocument, DocumentNodeType } from '../core/document-types'

/**
 * How a semantic block participates in selection anchoring.
 *
 * - `text`: character offsets into `canonicalText` are valid
 * - `whole-block`: any visual part normalizes to the full block range
 *   (spec §10 display formulas)
 * - `container`: the DOM always resolves endpoints to a more inner block
 *   (list / quote / table / footnote definition / list item)
 * - `none`: selection inside must be rejected (spec §10 v1: custom
 *   renderers and Mermaid are never character-anchored)
 */
export type SelectionBlockMode = 'text' | 'whole-block' | 'container' | 'none'

export type SelectionInlineAtomic = {
  readonly nodeId: string
  readonly kind: 'math' | 'image'
  readonly canonicalStart: number
  readonly canonicalEnd: number
}

export type SelectionBlockEntry = {
  readonly blockId: string
  readonly nodeId: string
  readonly type: DocumentNodeType
  readonly mode: SelectionBlockMode
  readonly canonicalText: string
  readonly headingPath: readonly string[]
  readonly inlineAtomics: readonly SelectionInlineAtomic[]
}

export type SelectionDocumentIndex = {
  readonly articleSlug: string
  readonly documentFingerprint: string
  readonly blocks: readonly SelectionBlockEntry[]
}

/** A DOM text run, tagged with the `data-node-id` of the `data-selectable="none"` element that owns it, if any. */
export type SelectionDomTextChunk = {
  readonly text: string
  readonly atomicNodeId: string | null
}

/** An endpoint expressed against the ordered DOM text chunks of one block. */
export type SelectionEndpointRef =
  | { readonly kind: 'text'; readonly chunkIndex: number; readonly offset: number }
  | { readonly kind: 'atomic'; readonly nodeId: string }

export type SelectionMappingRejectionReason =
  | 'cross-block'
  | 'not-annotatable'
  | 'collapsed'
  | 'outside-article'

export type SelectionMappingResult =
  | {
      readonly status: 'ok'
      readonly blockId: string
      readonly headingPath: readonly string[]
      readonly startOffset: number
      readonly endOffset: number
      readonly exact: string
    }
  | {
      readonly status: 'rejected'
      readonly reason: SelectionMappingRejectionReason
    }

/** Input consumed by the pure mapper once the browser layer normalized the Selection. */
export type SelectionMappingRequest = {
  readonly index: SelectionDocumentIndex
  readonly startBlockId: string | undefined
  readonly endBlockId: string | undefined
  readonly entry: SelectionBlockEntry
  readonly chunks: readonly SelectionDomTextChunk[]
  readonly start: SelectionEndpointRef
  readonly end: SelectionEndpointRef
}

export type SelectionIndexInput = Pick<
  CompiledDocument,
  'articleSlug' | 'documentFingerprint' | 'root'
>
