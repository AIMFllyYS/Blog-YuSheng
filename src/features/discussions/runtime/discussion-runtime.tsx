'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import { reconnectTextAnchor } from '@/features/annotations/anchors'
import { sortAnnotationViews } from '@/features/annotations/sort-annotation-threads'
import type { SelectionDocumentIndex } from '@/features/doc-engine/selection'

import {
  createClosedAuthPort,
  createFakeAuthPort,
  type AuthPort,
  type DiscussionUser,
} from '../domain/auth-port'
import { DISCUSSION_WRITES_OPEN } from '../domain/discussion-write-gate'
import {
  createMemoryDiscussionRepository,
  type MemoryDiscussionSeed,
} from '../repository/memory-discussion-repository'
import type {
  AnnotationThreadView,
  DiscussionRepository,
} from '../repository/discussion-repository'

export type DiscussionRuntimeValue = {
  readonly user: DiscussionUser | null
  readonly auth: AuthPort
  readonly repo: DiscussionRepository
  readonly articleSlug: string
  readonly selectionIndex: SelectionDocumentIndex
  readonly revision: number
  readonly threads: readonly AnnotationThreadView[]
  readonly writesOpen: boolean
  readonly ready: boolean
  readonly refresh: () => Promise<void>
}

const DiscussionRuntimeContext = createContext<DiscussionRuntimeValue | null>(null)

const SSR_MEMBER: DiscussionUser = {
  id: 'dev-member',
  displayName: '普通成员',
  isAuthor: false,
}

export function DiscussionRuntimeProvider({
  articleSlug,
  children,
  seed,
  selectionIndex,
}: {
  readonly articleSlug: string
  readonly children: ReactNode
  readonly seed?: MemoryDiscussionSeed
  readonly selectionIndex: SelectionDocumentIndex
}) {
  const [auth] = useState(() =>
    DISCUSSION_WRITES_OPEN ? createFakeAuthPort('member') : createClosedAuthPort(),
  )
  const [repo] = useState(() =>
    createMemoryDiscussionRepository({
      seed,
      writesOpen: DISCUSSION_WRITES_OPEN,
    }),
  )
  const [user, setUser] = useState<DiscussionUser | null>(
    DISCUSSION_WRITES_OPEN ? SSR_MEMBER : null,
  )
  const [threads, setThreads] = useState<readonly AnnotationThreadView[]>([])
  const [revision, setRevision] = useState(0)
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    const listed = await repo.listAnnotationThreads(articleSlug)
    setThreads(sortAnnotationViews(listed, selectionIndex))
    setRevision((current) => current + 1)
  }, [articleSlug, repo, selectionIndex])

  useEffect(() => {
    const sync = () => setUser(auth.getCurrentUser())
    queueMicrotask(sync)
    return auth.subscribe(sync)
  }, [auth])

  useEffect(() => {
    let cancelled = false
    const boot = async () => {
      const listed = await repo.listAnnotationThreads(articleSlug)
      for (const view of listed) {
        const reconnection = reconnectTextAnchor(view.thread.anchor, selectionIndex)
        const nextAnchor =
          reconnection.status === 'reattached' && reconnection.reconnected
            ? reconnection.reconnected
            : view.thread.anchor
        if (
          reconnection.status !== view.thread.anchorState ||
          nextAnchor !== view.thread.anchor
        ) {
          repo.replaceThread({
            ...view.thread,
            anchor: nextAnchor,
            anchorState: reconnection.status,
          })
        }
      }
      if (cancelled) return
      await refresh()
      if (!cancelled) setReady(true)
    }
    void boot()
    return () => {
      cancelled = true
    }
  }, [articleSlug, refresh, repo, selectionIndex])

  return (
    <DiscussionRuntimeContext.Provider
      value={{
        user,
        auth,
        repo,
        articleSlug,
        selectionIndex,
        revision,
        threads,
        writesOpen: DISCUSSION_WRITES_OPEN,
        ready,
        refresh,
      }}
    >
      {children}
    </DiscussionRuntimeContext.Provider>
  )
}

export function useDiscussionRuntime(): DiscussionRuntimeValue {
  const value = useContext(DiscussionRuntimeContext)
  if (!value) {
    throw new Error('useDiscussionRuntime 必须在 DiscussionRuntimeProvider 内使用')
  }
  return value
}
