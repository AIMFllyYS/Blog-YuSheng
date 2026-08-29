import {
  createClosedAuthPort,
  createFakeAuthPort,
  type AuthPort,
} from '../domain/auth-port'
import { DISCUSSION_WRITES_OPEN } from '../domain/discussion-write-gate'
import { readLocalAuthorMode } from '../domain/local-author-mode'
import type { DiscussionRepository } from '../repository/discussion-repository'
import { createLocalStorageDiscussionRepository } from '../repository/local-storage-discussion-repository'
import {
  createMemoryDiscussionRepository,
  type MemoryDiscussionSeed,
} from '../repository/memory-discussion-repository'

export type ResolveDiscussionRuntimePortsInput = {
  readonly articleSlug: string
  readonly hydrated: boolean
  readonly localAuthorMode: boolean
  readonly seed?: MemoryDiscussionSeed
  readonly auth?: AuthPort
  readonly repo?: DiscussionRepository
}

export type ResolvedDiscussionRuntimePorts = {
  readonly auth: AuthPort
  readonly repo: DiscussionRepository
}

export function createDefaultAuthPort(localAuthorMode: boolean): AuthPort {
  if (localAuthorMode) {
    const port = createFakeAuthPort('author')
    port.setRole('author')
    return port
  }
  return DISCUSSION_WRITES_OPEN ? createFakeAuthPort('member') : createClosedAuthPort()
}

export function createDefaultSessionRepository(
  articleSlug: string,
  hydrated: boolean,
  seed?: MemoryDiscussionSeed,
): DiscussionRepository {
  const getWritesOpen = () => DISCUSSION_WRITES_OPEN || readLocalAuthorMode()
  if (!hydrated) {
    return createMemoryDiscussionRepository({ writesOpen: getWritesOpen })
  }
  return createLocalStorageDiscussionRepository({
    articleSlug,
    seed: process.env.NODE_ENV !== 'production' ? seed : undefined,
    getWritesOpen,
  })
}

/**
 * P0 default factories stay here so P1 adapters can replace auth/repo
 * without forking the Provider. Injected instances win; hydration must
 * not swap an injected repo for localStorage.
 */
export function resolveDiscussionRuntimePorts(
  input: ResolveDiscussionRuntimePortsInput,
): ResolvedDiscussionRuntimePorts {
  return {
    auth: input.auth ?? createDefaultAuthPort(input.localAuthorMode),
    repo:
      input.repo ??
      createDefaultSessionRepository(input.articleSlug, input.hydrated, input.seed),
  }
}
