'use client'

import { useEffect, useState } from 'react'

import { sanitizeDiscussionRead } from '@/features/doc-engine/security/sanitize-discussion'

/**
 * Client-safe discussion body. `DiscussionDocumentRenderer` is a Server
 * Component that statically imports server-only article renderers, so cards
 * reuse the same `sanitizeDiscussionRead` path it uses to prepare discussion
 * documents, then paint the sanitized HTML.
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
    void sanitizeDiscussionRead({ entryId, source }).then((result) => {
      if (!cancelled) setHtml(result.sanitizedHtml)
    })
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
