import type { SelectionDocumentIndex } from '../../doc-engine/selection'

import { type TextAnchor, type TextAnchorDiagnostic, TEXT_ANCHOR_CONTEXT_LIMIT } from './text-anchor'

export type AnchorReconnectionStatus = 'attached' | 'reattached' | 'orphaned'

export type AnchorReconnection = {
  readonly status: AnchorReconnectionStatus
  /** The original anchor, never mutated; orphaned entries stay in lists (spec §10). */
  readonly anchor: TextAnchor
  /** Rewritten coordinates for the current document when reattached. */
  readonly reconnected: TextAnchor | undefined
  readonly diagnostics: readonly TextAnchorDiagnostic[]
}

/**
 * Reconnect an anchor against the current selection index using the locked
 * order (spec §10 + #38 rulings): block ID hit with intact text and context
 * → `attached` (block may have moved); otherwise exact text search with
 * prefix/suffix context, preferring the candidate closest to the original
 * heading path, document order breaking ties → `reattached`; nothing found →
 * `orphaned`. prefix/suffix mismatch never blocks reconnection but downgrades
 * to `reattached` with a diagnostic.
 */
export function reconnectTextAnchor(
  anchor: TextAnchor,
  index: SelectionDocumentIndex,
): AnchorReconnection {
  const entry = index.blocks.find((block) => block.blockId === anchor.startBlockId)
  if (entry && entry.mode !== 'container' && entry.mode !== 'none') {
    const canonical = entry.canonicalText
    const offsetsIntact =
      anchor.startOffset >= 0 &&
      anchor.startOffset < anchor.endOffset &&
      anchor.endOffset <= canonical.length &&
      canonical.slice(anchor.startOffset, anchor.endOffset) === anchor.exact
    if (offsetsIntact) {
      const prefix = canonical.slice(
        Math.max(0, anchor.startOffset - TEXT_ANCHOR_CONTEXT_LIMIT),
        anchor.startOffset,
      )
      const suffix = canonical.slice(
        anchor.endOffset,
        Math.min(canonical.length, anchor.endOffset + TEXT_ANCHOR_CONTEXT_LIMIT),
      )
      if (prefix === anchor.prefix && suffix === anchor.suffix) {
        return { status: 'attached', anchor, reconnected: undefined, diagnostics: [] }
      }
      return {
        status: 'reattached',
        anchor,
        reconnected: rewrite(anchor, index, entry.blockId, anchor.startOffset, anchor.endOffset, entry.headingPath),
        diagnostics: [
          { code: 'ANCHOR-CONTEXT-MISMATCH', message: '块命中但相邻上下文变化，降级为 reattached。' },
        ],
      }
    }
  }

  const candidates = collectExactCandidates(anchor.exact, index)
  if (candidates.length === 0) {
    return {
      status: 'orphaned',
      anchor,
      reconnected: undefined,
      diagnostics: [
        { code: 'ANCHOR-BLOCK-MISSING', message: 'exact 在当前文档中已不存在，锚点失联。' },
      ],
    }
  }
  const best = rankCandidates(candidates, anchor.headingPath)
  const diagnostics: TextAnchorDiagnostic[] = []
  if (best.entry.blockId === anchor.startBlockId && best.start === anchor.startOffset) {
    diagnostics.push({
      code: 'ANCHOR-CONTEXT-MISMATCH',
      message: '同位命中但上下文校验未通过，降级为 reattached。',
    })
  }
  return {
    status: 'reattached',
    anchor,
    reconnected: rewrite(anchor, index, best.entry.blockId, best.start, best.end, best.entry.headingPath),
    diagnostics,
  }
}

type ExactCandidate = {
  readonly entry: SelectionDocumentIndex['blocks'][number]
  readonly start: number
  readonly end: number
}

function collectExactCandidates(
  exact: string,
  index: SelectionDocumentIndex,
): readonly ExactCandidate[] {
  if (exact.length === 0) return []
  const candidates: ExactCandidate[] = []
  for (const entry of index.blocks) {
    if (entry.mode !== 'text' && entry.mode !== 'whole-block') continue
    const canonical = entry.canonicalText
    let cursor = canonical.indexOf(exact)
    while (cursor !== -1) {
      candidates.push({ entry, start: cursor, end: cursor + exact.length })
      cursor = canonical.indexOf(exact, cursor + 1)
    }
  }
  return candidates
}

/**
 * Closest to the original heading path wins: exact path equality first, then
 * the longest shared path prefix, then the earliest document order (the block
 * order of the index), per the #38 ruling.
 */
function rankCandidates(
  candidates: readonly ExactCandidate[],
  originalPath: readonly string[],
): ExactCandidate {
  let best = candidates[0]!
  let bestScore = score(best.entry.headingPath, originalPath)
  for (const candidate of candidates.slice(1)) {
    const scoreValue = score(candidate.entry.headingPath, originalPath)
    if (scoreValue > bestScore) {
      best = candidate
      bestScore = scoreValue
    }
  }
  return best
}

function score(path: readonly string[], originalPath: readonly string[]): number {
  if (path.length === originalPath.length && path.every((slug, i) => slug === originalPath[i])) {
    return Number.MAX_SAFE_INTEGER
  }
  let shared = 0
  while (shared < path.length && shared < originalPath.length && path[shared] === originalPath[shared]) {
    shared += 1
  }
  return shared
}

function rewrite(
  anchor: TextAnchor,
  index: SelectionDocumentIndex,
  blockId: string,
  start: number,
  end: number,
  headingPath: readonly string[],
): TextAnchor {
  return {
    ...anchor,
    documentFingerprint: index.documentFingerprint,
    startBlockId: blockId,
    startOffset: start,
    endBlockId: blockId,
    endOffset: end,
    headingPath,
  }
}
