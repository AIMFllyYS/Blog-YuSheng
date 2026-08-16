import type { AnnotationThread } from '../../discussions/domain/discussion-thread'

export type AnnotationLocus = {
  readonly locusId: string
  readonly startBlockId: string
  readonly startOffset: number
  readonly endOffset: number
  readonly threadIds: readonly string[]
}

export function locusIdOf(thread: Pick<AnnotationThread, 'anchor'>): string {
  const { startBlockId, startOffset, endOffset } = thread.anchor
  return `${startBlockId}:${startOffset}:${endOffset}`
}

/** One highlight per body range. Same-locus threads share a count badge. */
export function groupAnnotationLoci(
  threads: readonly AnnotationThread[],
): readonly AnnotationLocus[] {
  const groups = new Map<string, AnnotationLocus>()
  for (const thread of threads) {
    if (thread.anchorState === 'orphaned') continue
    const locusId = locusIdOf(thread)
    const existing = groups.get(locusId)
    if (existing) {
      groups.set(locusId, {
        ...existing,
        threadIds: [...existing.threadIds, thread.id],
      })
      continue
    }
    groups.set(locusId, {
      locusId,
      startBlockId: thread.anchor.startBlockId,
      startOffset: thread.anchor.startOffset,
      endOffset: thread.anchor.endOffset,
      threadIds: [thread.id],
    })
  }
  return [...groups.values()]
}
