'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

import { reconnectTextAnchor } from '@/features/annotations/anchors'
import { sortAnnotationViews } from '@/features/annotations/sort-annotation-threads'
import {
  emptySelectionIndex,
  loadArticleAnchorManifest,
  type SelectionDocumentIndex,
} from '@/features/doc-engine/selection'

import { type AuthPort, type DiscussionUser } from '../domain/auth-port'
import {
  DISCUSSION_WRITES_OPEN,
  areDiscussionWritesOpen,
} from '../domain/discussion-write-gate'
import { useLocalAuthorMode } from '../domain/use-local-author-mode'
import type {
  AnnotationThreadView,
  DiscussionRepository,
} from '../repository/discussion-repository'
import type { MemoryDiscussionSeed } from '../repository/memory-discussion-repository'
import {
  createDefaultAuthPort,
  createDefaultSessionRepository,
} from './resolve-runtime-ports'

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

function subscribeToHydration(): () => void {
  return () => undefined
}

function clientHydrated(): true {
  return true
}

function serverHydrated(): false {
  return false
}

export type DiscussionRuntimeProviderProps = {
  readonly articleSlug: string
  readonly children: ReactNode
  readonly seed?: MemoryDiscussionSeed
  readonly selectionIndex?: SelectionDocumentIndex
  readonly auth?: AuthPort
  readonly repo?: DiscussionRepository
}

export function DiscussionRuntimeProvider({
  articleSlug,
  children,
  seed,
  selectionIndex: injectedIndex,
  auth: injectedAuth,
  repo: injectedRepo,
}: DiscussionRuntimeProviderProps) {
  const { enabled: localAuthorMode } = useLocalAuthorMode()
  const writesOpen = areDiscussionWritesOpen(localAuthorMode)
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    clientHydrated,
    serverHydrated,
  )
  const auth = useMemo(
    () => injectedAuth ?? createDefaultAuthPort(localAuthorMode),
    [injectedAuth, localAuthorMode],
  )
  const repo = useMemo(
    () =>
      injectedRepo ??
      createDefaultSessionRepository(articleSlug, hydrated, seed),
    [articleSlug, hydrated, injectedRepo, seed],
  )
  const [user, setUser] = useState<DiscussionUser | null>(() =>
    injectedAuth
      ? injectedAuth.getCurrentUser()
      : DISCUSSION_WRITES_OPEN
        ? SSR_MEMBER
        : null,
  )
  const [threads, setThreads] = useState<readonly AnnotationThreadView[]>([])
  const [revision, setRevision] = useState(0)
  const [ready, setReady] = useState(false)
  const [fetchedIndex, setFetchedIndex] = useState<SelectionDocumentIndex | null>(
    null,
  )
  const resolvedIndex =
    injectedIndex ??
    (fetchedIndex?.articleSlug === articleSlug
      ? fetchedIndex
      : emptySelectionIndex(articleSlug))

  const refresh = useCallback(async () => {
    const listed = await repo.listAnnotationThreads(articleSlug)
    setThreads(sortAnnotationViews(listed, resolvedIndex))
    setRevision((current) => current + 1)
  }, [articleSlug, repo, resolvedIndex])

  useEffect(() => {
    const sync = () => setUser(auth.getCurrentUser())
    queueMicrotask(sync)
    return auth.subscribe(sync)
  }, [auth])

  useEffect(() => {
    if (injectedIndex) return
    let cancelled = false
    void loadArticleAnchorManifest(articleSlug)
      .then((index) => {
        if (!cancelled) setFetchedIndex(index)
      })
      .catch(() => {
        if (!cancelled) setFetchedIndex(emptySelectionIndex(articleSlug))
      })
    return () => {
      cancelled = true
    }
  }, [articleSlug, injectedIndex])

  useEffect(() => {
    if (!resolvedIndex.documentFingerprint) return
    let cancelled = false
    const boot = async () => {
      const listed = await repo.listAnnotationThreads(articleSlug)
      for (const view of listed) {
        const reconnection = reconnectTextAnchor(view.thread.anchor, resolvedIndex)
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
  }, [articleSlug, refresh, repo, resolvedIndex])

  return (
    <DiscussionRuntimeContext.Provider
      value={{
        user,
        auth,
        repo,
        articleSlug,
        selectionIndex: resolvedIndex,
        revision,
        threads,
        writesOpen,
        ready,
        refresh,
      }}
    >
      <span
        data-selection-index-ready={
          resolvedIndex.documentFingerprint ? 'true' : 'false'
        }
        hidden
      />
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
