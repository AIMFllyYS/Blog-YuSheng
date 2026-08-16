import type { DocumentNode } from '../core'
import { KatexDiscussionRenderer } from '../renderers/katex/discussion-renderer'
import {
  DocumentRenderer,
  type DocumentRendererProps,
} from './document-renderer'

export type DiscussionDocumentRendererProps = Omit<
  DocumentRendererProps,
  | 'developmentCrashComponentIds'
  | 'discussionMathRenderer'
  | 'profile'
>

export function DiscussionDocumentRenderer(
  props: DiscussionDocumentRendererProps,
) {
  return DocumentRenderer({
    ...props,
    profile: 'discussion',
    discussionMathRenderer: renderDiscussionMath,
  })
}

function renderDiscussionMath(
  node: Extract<DocumentNode, { type: 'math' }>,
) {
  return (
    <KatexDiscussionRenderer
      key={`${node.nodeId}:${node.display}:${node.value}`}
      node={node}
    />
  )
}
