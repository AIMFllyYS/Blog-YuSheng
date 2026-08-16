export type DiscussionUser = {
  readonly id: string
  readonly displayName: string
  readonly isAuthor: boolean
}

export type AuthPort = {
  readonly getCurrentUser: () => DiscussionUser | null
  readonly subscribe: (listener: () => void) => () => void
}

export type FakeAuthRole = 'visitor' | 'member' | 'author'

export const DEV_AUTH_ROLE_KEY = 'dev-auth-role'
export const DEV_AUTH_ROLE_EVENT = 'dev:auth-role'
export const DEV_AUTHOR_USER_ID = 'dev-author'
export const DEV_MEMBER_USER_ID = 'dev-member'

const FAKE_USERS: Record<FakeAuthRole, DiscussionUser | null> = {
  visitor: null,
  member: { id: DEV_MEMBER_USER_ID, displayName: '普通成员', isAuthor: false },
  author: { id: DEV_AUTHOR_USER_ID, displayName: '羽升', isAuthor: true },
}

export function isFakeAuthRole(value: unknown): value is FakeAuthRole {
  return value === 'visitor' || value === 'member' || value === 'author'
}

function readStoredFakeAuthRole(): FakeAuthRole | undefined {
  if (typeof sessionStorage === 'undefined') return undefined
  try {
    const stored = sessionStorage.getItem(DEV_AUTH_ROLE_KEY)
    return isFakeAuthRole(stored) ? stored : undefined
  } catch {
    return undefined
  }
}

function persistFakeAuthRole(role: FakeAuthRole): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(DEV_AUTH_ROLE_KEY, role)
  } catch {
    // Private mode / disabled storage must not break the fake port.
  }
}

/**
 * P0 fake identity. UI components must depend on `AuthPort` only;
 * `_dev/` pages and the runtime factory may call this constructor.
 */
export function createFakeAuthPort(initial: FakeAuthRole = 'member') {
  let role = readStoredFakeAuthRole() ?? initial
  const listeners = new Set<() => void>()
  const notify = () => {
    for (const listener of listeners) listener()
  }
  const applyRole = (next: FakeAuthRole) => {
    if (next === role) return
    role = next
    notify()
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key !== DEV_AUTH_ROLE_KEY) return
      if (isFakeAuthRole(event.newValue)) applyRole(event.newValue)
    })
    window.addEventListener(DEV_AUTH_ROLE_EVENT, (event) => {
      if (!(event instanceof CustomEvent)) return
      if (isFakeAuthRole(event.detail)) applyRole(event.detail)
    })
  }

  return {
    getCurrentUser: () => FAKE_USERS[role],
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getRole: () => role,
    setRole: (next: FakeAuthRole) => {
      if (next === role) return
      role = next
      persistFakeAuthRole(next)
      notify()
    },
  }
}

export function createClosedAuthPort(): AuthPort {
  return {
    getCurrentUser: () => null,
    subscribe: () => () => undefined,
  }
}

export type FakeAuthPort = ReturnType<typeof createFakeAuthPort>
