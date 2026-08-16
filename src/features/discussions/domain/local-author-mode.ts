export const LOCAL_AUTHOR_MODE_KEY = 'blog-yusheng:local-author-mode:v1'
export const LOCAL_AUTHOR_MODE_EVENT = 'blog-yusheng:local-author-mode'

export function readLocalAuthorMode(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(LOCAL_AUTHOR_MODE_KEY) === '1'
  } catch {
    return false
  }
}

export function writeLocalAuthorMode(enabled: boolean): void {
  if (typeof window === 'undefined') return
  try {
    if (enabled) {
      window.localStorage.setItem(LOCAL_AUTHOR_MODE_KEY, '1')
    } else {
      window.localStorage.removeItem(LOCAL_AUTHOR_MODE_KEY)
    }
  } catch {
    // Private mode / quota must not break the settings panel.
  }
  window.dispatchEvent(
    new CustomEvent(LOCAL_AUTHOR_MODE_EVENT, { detail: enabled }),
  )
}

export function subscribeLocalAuthorMode(
  listener: (enabled: boolean) => void,
): () => void {
  if (typeof window === 'undefined') return () => undefined

  const onCustom = (event: Event) => {
    if (event instanceof CustomEvent && typeof event.detail === 'boolean') {
      listener(event.detail)
      return
    }
    listener(readLocalAuthorMode())
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key !== LOCAL_AUTHOR_MODE_KEY) return
    listener(event.newValue === '1')
  }

  window.addEventListener(LOCAL_AUTHOR_MODE_EVENT, onCustom)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(LOCAL_AUTHOR_MODE_EVENT, onCustom)
    window.removeEventListener('storage', onStorage)
  }
}
