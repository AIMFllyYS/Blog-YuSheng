'use client'

import { useEffect, useState } from 'react'

/**
 * Client-safe discussion body. `DiscussionDocumentRenderer` is a Server
 * Component that statically imports server-only article renderers, so cards
 * reuse the same `sanitizeDiscussionRead` path it uses to prepare discussion
 * documents, then paint the sanitized HTML. The parser is loaded only when a
 * card actually mounts so it stays out of the reading-page first-screen graph.
 */
export function DiscussionEntryBody({
  entryId,
  source,
}: {
  readonly entryId: string
  readonly source: string
}) {
  const [html, setHtml] = useState<string>()

  useEffect(() => {
    let cancelled = false
    void import('@/features/doc-engine/security/sanitize-discussion').then(
      ({ sanitizeDiscussionRead }) => {
        if (cancelled) return undefined
        return sanitizeDiscussionRead({ entryId, source }).then((result) => {
          if (!cancelled) setHtml(result.sanitizedHtml)
        })
      },
    )
    return () => {
      cancelled = true
    }
  }, [entryId, source])

  if (!html) return null
  return (
    <div
      data-document-profile="discussion"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
