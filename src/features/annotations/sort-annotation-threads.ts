import type { SelectionDocumentIndex } from '@/features/doc-engine/selection'
import type { AnnotationThread } from '@/features/discussions/domain/discussion-thread'
import type { AnnotationThreadView } from '@/features/discussions/repository/discussion-repository'

function bodyOrder(
  thread: AnnotationThread,
  index: SelectionDocumentIndex,
): readonly [number, number] {
  if (thread.anchorState === 'orphaned') {
    return [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]
  }
  const blockOrder = index.blocks.findIndex(
    (block) => block.blockId === thread.anchor.startBlockId,
  )
  return [
    blockOrder === -1 ? Number.MAX_SAFE_INTEGER - 1 : blockOrder,
    thread.anchor.startOffset,
  ]
}

/** Body position first (reconnected coords), same locus by createdAt. Orphans last. */
export function sortAnnotationViews(
  views: readonly AnnotationThreadView[],
  index: SelectionDocumentIndex,
): readonly AnnotationThreadView[] {
  return [...views].sort((left, right) => {
    const [leftBlock, leftOffset] = bodyOrder(left.thread, index)
    const [rightBlock, rightOffset] = bodyOrder(right.thread, index)
    if (leftBlock !== rightBlock) return leftBlock - rightBlock
    if (leftOffset !== rightOffset) return leftOffset - rightOffset
    return left.thread.createdAt.localeCompare(right.thread.createdAt)
  })
}
