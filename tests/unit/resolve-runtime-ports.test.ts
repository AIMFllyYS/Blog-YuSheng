import { describe, expect, it } from 'vitest'

import { createClosedAuthPort, createFakeAuthPort } from '../../src/features/discussions'
import { createMemoryDiscussionRepository } from '../../src/features/discussions/repository/memory-discussion-repository'
import {
  createDefaultAuthPort,
  resolveDiscussionRuntimePorts,
} from '../../src/features/discussions/runtime/resolve-runtime-ports'

describe('resolveDiscussionRuntimePorts', () => {
  it('returns the injected auth and repo instances unchanged', () => {
    const auth = createClosedAuthPort()
    const repo = createMemoryDiscussionRepository({ writesOpen: true })
    const resolved = resolveDiscussionRuntimePorts({
      articleSlug: 'p0-kitchen-sink',
      hydrated: true,
      localAuthorMode: true,
      auth,
      repo,
    })
    expect(resolved.auth).toBe(auth)
    expect(resolved.repo).toBe(repo)
    expect(resolved.auth.getCurrentUser()).toBeNull()
  })

  it('does not swap an injected repo when hydration flips', () => {
    const repo = createMemoryDiscussionRepository({ writesOpen: true })
    const before = resolveDiscussionRuntimePorts({
      articleSlug: 'p0-kitchen-sink',
      hydrated: false,
      localAuthorMode: false,
      repo,
    })
    const after = resolveDiscussionRuntimePorts({
      articleSlug: 'p0-kitchen-sink',
      hydrated: true,
      localAuthorMode: false,
      repo,
    })
    expect(before.repo).toBe(repo)
    expect(after.repo).toBe(repo)
  })

  it('omitting auth still uses the default author port when local author mode is on', () => {
    const resolved = resolveDiscussionRuntimePorts({
      articleSlug: 'p0-kitchen-sink',
      hydrated: false,
      localAuthorMode: true,
    })
    expect(resolved.auth.getCurrentUser()?.id).toBe('dev-author')
    expect(resolved.auth.getCurrentUser()?.isAuthor).toBe(true)
  })

  it('omitting repo still switches from memory to a new instance after hydration', () => {
    const before = resolveDiscussionRuntimePorts({
      articleSlug: 'p0-kitchen-sink',
      hydrated: false,
      localAuthorMode: false,
    })
    const after = resolveDiscussionRuntimePorts({
      articleSlug: 'p0-kitchen-sink',
      hydrated: true,
      localAuthorMode: false,
    })
    expect(after.repo).not.toBe(before.repo)
  })

  it('keeps the P0 fake author port when local author mode is on and nothing is injected', () => {
    const port = createDefaultAuthPort(true)
    expect(port.getCurrentUser()?.id).toBe('dev-author')
    expect(port.getCurrentUser()?.isAuthor).toBe(true)
  })

  it('keeps the P0 member or closed port when local author mode is off', () => {
    const port = createDefaultAuthPort(false)
    const user = port.getCurrentUser()
    if (process.env.NODE_ENV === 'production') {
      expect(user).toBeNull()
      return
    }
    expect(user?.id).toBe('dev-member')
    expect(user?.isAuthor).toBe(false)
  })

  it('does not treat a fake author as injected identity', () => {
    const visitor = createFakeAuthPort('visitor')
    const resolved = resolveDiscussionRuntimePorts({
      articleSlug: 'p0-kitchen-sink',
      hydrated: false,
      localAuthorMode: true,
      auth: visitor,
    })
    expect(resolved.auth).toBe(visitor)
    expect(resolved.auth.getCurrentUser()).toBeNull()
  })
})
