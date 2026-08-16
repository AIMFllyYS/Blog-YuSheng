'use client'

import { useEffect, useRef, useState } from 'react'

export function CopyCodeButton({ source }: { readonly source: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const mounted = useRef(true)
  const operation = useRef(0)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      operation.current += 1
      if (resetTimer.current) clearTimeout(resetTimer.current)
    }
  }, [])

  async function copy(): Promise<void> {
    if (resetTimer.current) {
      clearTimeout(resetTimer.current)
      resetTimer.current = undefined
    }
    const currentOperation = operation.current + 1
    operation.current = currentOperation
    let nextStatus: 'copied' | 'failed'
    try {
      await navigator.clipboard.writeText(source)
      nextStatus = 'copied'
    } catch {
      nextStatus = 'failed'
    }
    if (!mounted.current || operation.current !== currentOperation) return
    setStatus(nextStatus)
    resetTimer.current = setTimeout(() => setStatus('idle'), 2_000)
  }

  const label =
    status === 'copied' ? '已复制' : status === 'failed' ? '复制失败' : '复制'
  return (
    <button
      aria-label={label === '复制' ? '复制代码' : label}
      className="min-h-8 rounded-sm border border-[var(--line)] bg-[var(--bg-elevated)] px-2.5 py-1 text-xs text-[var(--ink-muted)] transition-colors duration-[var(--dur-fast)] hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      data-code-copy-status={status}
      onClick={copy}
      type="button"
    >
      {label}
      <span aria-live="polite" className="sr-only">
        {status === 'copied' ? '代码已复制到剪贴板' : status === 'failed' ? '代码复制失败' : ''}
      </span>
    </button>
  )
}
