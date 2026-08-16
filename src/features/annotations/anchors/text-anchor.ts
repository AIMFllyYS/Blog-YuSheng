import {
  type SelectionDocumentIndex,
  type SelectionBlockEntry,
} from '../../doc-engine/selection'

/** Text Anchor v1 (spec §10). Offsets are UTF-16 code units into the block's `canonicalText`. */
export type TextAnchor = {
  readonly protocolVersion: 1
  readonly articleSlug: string
  readonly documentFingerprint: string
  readonly startBlockId: string
  readonly startOffset: number
  readonly endBlockId: string
  readonly endOffset: number
  readonly exact: string
  readonly prefix: string
  readonly suffix: string
  readonly headingPath: readonly string[]
}

/** Spec §10: prefix/suffix keep at most 32 adjacent UTF-16 code units. */
export const TEXT_ANCHOR_CONTEXT_LIMIT = 32

export type AnchorCreationInput = {
  readonly articleSlug: string
  readonly index: SelectionDocumentIndex
  readonly blockId: string
  readonly startOffset: number
  readonly endOffset: number
}

export type TextAnchorDiagnostic = {
  readonly code:
    | 'ANCHOR-BLOCK-MISSING'
    | 'ANCHOR-BLOCK-NOT-ANNOTATABLE'
    | 'ANCHOR-OFFSET-INVALID'
    | 'ANCHOR-EXACT-MISMATCH'
    | 'ANCHOR-CONTEXT-TOO-LONG'
    | 'ANCHOR-CONTEXT-MISMATCH'
    | 'ANCHOR-PROTOCOL-INVALID'
  readonly message: string
}

/**
 * Create an anchor from a validated #37 mapping result. Pure and
 * deterministic: the same selection over the same compiled document always
 * produces the byte-identical serialized anchor (golden fixtures rely on it).
 */
export function createTextAnchor(
  input: AnchorCreationInput,
): { readonly anchor: TextAnchor } | { readonly diagnostics: readonly TextAnchorDiagnostic[] } {
  const entry = input.index.blocks.find(
    (block) => block.blockId === input.blockId,
  )
  if (!entry) {
    return {
      diagnostics: [
        { code: 'ANCHOR-BLOCK-MISSING', message: `块 ${input.blockId} 不在选区索引中。` },
      ],
    }
  }
  if (entry.mode !== 'text' && entry.mode !== 'whole-block') {
    return {
      diagnostics: [
        {
          code: 'ANCHOR-BLOCK-NOT-ANNOTATABLE',
          message: `块 ${input.blockId}（${entry.type}/${entry.mode}）不可字符锚定。`,
        },
      ],
    }
  }
  const canonical = entry.canonicalText
  if (
    !Number.isInteger(input.startOffset) ||
    !Number.isInteger(input.endOffset) ||
    input.startOffset < 0 ||
    input.startOffset >= input.endOffset ||
    input.endOffset > canonical.length
  ) {
    return {
      diagnostics: [
        {
          code: 'ANCHOR-OFFSET-INVALID',
          message: `偏移不满足 0 <= start < end <= ${canonical.length}：${input.startOffset}..${input.endOffset}`,
        },
      ],
    }
  }
  const exact = canonical.slice(input.startOffset, input.endOffset)
  return {
    anchor: {
      protocolVersion: 1,
      articleSlug: input.articleSlug,
      documentFingerprint: input.index.documentFingerprint,
      startBlockId: entry.blockId,
      startOffset: input.startOffset,
      endBlockId: entry.blockId,
      endOffset: input.endOffset,
      exact,
      prefix: canonical.slice(
        Math.max(0, input.startOffset - TEXT_ANCHOR_CONTEXT_LIMIT),
        input.startOffset,
      ),
      suffix: canonical.slice(
        input.endOffset,
        Math.min(canonical.length, input.endOffset + TEXT_ANCHOR_CONTEXT_LIMIT),
      ),
      headingPath: entry.headingPath,
    },
  }
}

/**
 * Validate a (possibly untrusted) anchor against a selection index: protocol,
 * block presence, offset invariants, exact/prefix/suffix consistency and the
 * 32-unit context limit. Pure; P1 write paths re-run this server-side.
 */
export function validateTextAnchor(
  anchor: TextAnchor,
  index: SelectionDocumentIndex,
): readonly TextAnchorDiagnostic[] {
  const diagnostics: TextAnchorDiagnostic[] = []
  if (anchor.protocolVersion !== 1) {
    diagnostics.push({
      code: 'ANCHOR-PROTOCOL-INVALID',
      message: `协议版本必须为 1，收到 ${String(anchor.protocolVersion)}。`,
    })
    return diagnostics
  }
  if (anchor.articleSlug !== index.articleSlug) {
    diagnostics.push({
      code: 'ANCHOR-BLOCK-MISSING',
      message: `锚点文章 ${anchor.articleSlug} 与索引文章 ${index.articleSlug} 不一致。`,
    })
    return diagnostics
  }
  if (anchor.prefix.length > TEXT_ANCHOR_CONTEXT_LIMIT || anchor.suffix.length > TEXT_ANCHOR_CONTEXT_LIMIT) {
    diagnostics.push({
      code: 'ANCHOR-CONTEXT-TOO-LONG',
      message: 'prefix/suffix 超出 32 个 UTF-16 code unit 上限。',
    })
  }
  if (anchor.startBlockId !== anchor.endBlockId) {
    diagnostics.push({
      code: 'ANCHOR-OFFSET-INVALID',
      message: 'v1 锚点必须落在单一语义块内（startBlockId !== endBlockId）。',
    })
    return diagnostics
  }
  const entry = index.blocks.find((block) => block.blockId === anchor.startBlockId)
  if (!entry) {
    diagnostics.push({
      code: 'ANCHOR-BLOCK-MISSING',
      message: `块 ${anchor.startBlockId} 不在选区索引中。`,
    })
    return diagnostics
  }
  const canonical = entry.canonicalText
  if (
    anchor.startOffset < 0 ||
    anchor.startOffset >= anchor.endOffset ||
    anchor.endOffset > canonical.length
  ) {
    diagnostics.push({
      code: 'ANCHOR-OFFSET-INVALID',
      message: `偏移越界：${anchor.startOffset}..${anchor.endOffset}（长度 ${canonical.length}）。`,
    })
    return diagnostics
  }
  if (canonical.slice(anchor.startOffset, anchor.endOffset) !== anchor.exact) {
    diagnostics.push({
      code: 'ANCHOR-EXACT-MISMATCH',
      message: 'exact 与区间文本不一致。',
    })
  }
  if (
    canonical.slice(Math.max(0, anchor.startOffset - anchor.prefix.length), anchor.startOffset) !== anchor.prefix ||
    canonical.slice(anchor.endOffset, anchor.endOffset + anchor.suffix.length) !== anchor.suffix
  ) {
    diagnostics.push({
      code: 'ANCHOR-CONTEXT-MISMATCH',
      message: 'prefix/suffix 与相邻上下文不一致。',
    })
  }
  return diagnostics
}

/** Deterministic serialization for golden fixtures and persistence. */
export function serializeTextAnchor(anchor: TextAnchor): string {
  return JSON.stringify({
    protocolVersion: anchor.protocolVersion,
    articleSlug: anchor.articleSlug,
    documentFingerprint: anchor.documentFingerprint,
    startBlockId: anchor.startBlockId,
    startOffset: anchor.startOffset,
    endBlockId: anchor.endBlockId,
    endOffset: anchor.endOffset,
    exact: anchor.exact,
    prefix: anchor.prefix,
    suffix: anchor.suffix,
    headingPath: anchor.headingPath,
  })
}

export type { SelectionBlockEntry }
