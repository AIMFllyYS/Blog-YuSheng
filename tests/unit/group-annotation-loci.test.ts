import { describe, expect, it } from 'vitest'

import kitchenSinkAnnotations from '../../src/features/annotations/__fixtures__/kitchen-sink-annotations.json'
import { toMemoryDiscussionSeed } from '../../src/features/annotations/__fixtures__/to-memory-seed'
import {
  groupAnnotationLoci,
  locusIdOf,
} from '../../src/features/annotations/highlights/group-annotation-loci'
import type { AnnotationThread } from '../../src/features/discussions/domain/discussion-thread'

describe('groupAnnotationLoci', () => {
  const threads = toMemoryDiscussionSeed(kitchenSinkAnnotations)
    .threads as readonly AnnotationThread[]

  it('groups two same-locus threads into one count-2 locus and excludes orphaned', () => {
    const groups = groupAnnotationLoci(threads)
    expect(groups).toHaveLength(1)
    expect(groups[0]?.threadIds).toEqual(['anno-locus-a-1', 'anno-locus-a-2'])
    expect(groups[0]?.locusId).toBe(locusIdOf(threads[0]!))
    expect(groups.some((group) => group.startBlockId === 'ghost-block-removed')).toBe(
      false,
    )
  })
})
