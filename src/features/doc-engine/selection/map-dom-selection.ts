import {
  type SelectionBlockEntry,
  type SelectionDomTextChunk,
  type SelectionEndpointRef,
  type SelectionMappingRequest,
  type SelectionMappingResult,
} from './selection-types'

/**
 * Map one normalized DOM selection to Canonical IR coordinates (spec §10):
 * `0 <= startOffset < endOffset <= canonicalText.length` with
 * `exact === canonicalText.slice(startOffset, endOffset)`, or a rejection
 * with a reason the toolbar (#39) can phrase for humans.
 *
 * Endpoints are ranges, not points: an endpoint inside an inline atomic
 * (formula) contributes the atomic's full canonical range, so selecting any
 * visual part of a formula normalizes to the whole formula node (spec §10).
 */
export function mapDomSelection(
  request: SelectionMappingRequest,
): SelectionMappingResult {
  if (request.startBlockId !== request.endBlockId) {
    return rejected('cross-block')
  }
  if (request.entry.mode === 'none' || request.entry.mode === 'container') {
    return rejected('not-annotatable')
  }
  const aligned = alignChunks(request.entry, request.chunks)
  if (!aligned.ok) return rejected('not-annotatable')
  const start = endpointRange(
    request.entry,
    request.chunks,
    aligned.chunkStarts,
    request.start,
  )
  const end = endpointRange(
    request.entry,
    request.chunks,
    aligned.chunkStarts,
    request.end,
  )
  if (!start.ok || !end.ok) return rejected('not-annotatable')
  const startOffset = Math.min(start.low, end.low)
  const endOffset = Math.max(start.high, end.high)
  if (startOffset === endOffset) return rejected('collapsed')
  if (startOffset < 0 || endOffset > request.entry.canonicalText.length) {
    return rejected('not-annotatable')
  }
  return {
    status: 'ok',
    blockId: request.entry.blockId,
    headingPath: request.entry.headingPath,
    startOffset,
    endOffset,
    exact: request.entry.canonicalText.slice(startOffset, endOffset),
  }
}

function rejected(
  reason: Extract<SelectionMappingResult, { status: 'rejected' }>['reason'],
) {
  return { status: 'rejected' as const, reason }
}

/**
 * Sequentially match the ordered DOM text chunks against the canonical text
 * split by inline atomics. Plain chunks always sit inside one canonical
 * piece because DOM text nodes never cross element boundaries; an atomic
 * with DOM presence (KaTeX renders many internal text nodes) is matched by
 * nodeId with consecutive runs collapsed, and an atomic without DOM
 * presence (images) is skipped silently when the next chunk proves it.
 */
function alignChunks(
  entry: SelectionBlockEntry,
  chunks: readonly SelectionDomTextChunk[],
): { ok: true; chunkStarts: readonly number[] } | { ok: false } {
  const chunkStarts: number[] = []
  let canonicalCursor = 0
  let atomicIndex = 0
  for (const chunk of chunks) {
    const expected = entry.inlineAtomics[atomicIndex]
    if (chunk.atomicNodeId === null) {
      let cursor = canonicalCursor
      let index = atomicIndex
      for (;;) {
        const pending = entry.inlineAtomics[index]
        const pieceEnd = pending
          ? pending.canonicalStart
          : entry.canonicalText.length
        if (
          cursor + chunk.text.length <= pieceEnd &&
          entry.canonicalText.startsWith(chunk.text, cursor)
        ) {
          chunkStarts.push(cursor)
          canonicalCursor = cursor + chunk.text.length
          atomicIndex = index
          break
        }
        if (pending && cursor === pending.canonicalStart) {
          cursor = pending.canonicalEnd
          index += 1
          continue
        }
        return { ok: false }
      }
      continue
    }
    if (expected && expected.nodeId === chunk.atomicNodeId) {
      if (canonicalCursor !== expected.canonicalStart) return { ok: false }
      chunkStarts.push(NOT_TEXT_CHUNK)
      canonicalCursor = expected.canonicalEnd
      atomicIndex += 1
      continue
    }
    const previous = entry.inlineAtomics[atomicIndex - 1]
    if (previous && previous.nodeId === chunk.atomicNodeId) {
      chunkStarts.push(NOT_TEXT_CHUNK)
      continue
    }
    return { ok: false }
  }
  return { ok: true, chunkStarts }
}

const NOT_TEXT_CHUNK = -1

function endpointRange(
  entry: SelectionBlockEntry,
  chunks: readonly SelectionDomTextChunk[],
  chunkStarts: readonly number[],
  endpoint: SelectionEndpointRef,
): { ok: true; low: number; high: number } | { ok: false } {
  if (endpoint.kind === 'atomic') {
    const atomic = entry.inlineAtomics.find(
      (candidate) => candidate.nodeId === endpoint.nodeId,
    )
    if (!atomic) return { ok: false }
    return {
      ok: true,
      low: atomic.canonicalStart,
      high: atomic.canonicalEnd,
    }
  }
  const start = chunkStarts[endpoint.chunkIndex]
  const chunk = chunks[endpoint.chunkIndex]
  if (start === undefined || chunk === undefined || start === NOT_TEXT_CHUNK) {
    return { ok: false }
  }
  if (endpoint.offset < 0 || endpoint.offset > chunk.text.length) {
    return { ok: false }
  }
  return { ok: true, low: start + endpoint.offset, high: start + endpoint.offset }
}
