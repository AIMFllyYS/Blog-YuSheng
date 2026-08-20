'use client'

import dynamic from 'next/dynamic'
import { useRef } from 'react'
import { usePopoverPosition } from '../use-popover-position'

const ExportMenu = dynamic(
  () =>
    import('@/features/export-service/export-menu').then(
      (module) => module.ExportMenu,
    ),
  { ssr: false },
)

export function ExportPopover({ panelId }: { readonly panelId: string }) {
  const panelRef = useRef<HTMLElement>(null)
  const position = usePopoverPosition(panelId, panelRef)

  return (
    <section
      aria-label="导出"
      className="pointer-events-auto fixed z-[var(--z-overlay)] w-[min(22.5rem,calc(100vw-1.5rem))] origin-top rounded border border-[var(--line)] bg-[var(--bg-elevated)] p-4 text-[var(--ink)] shadow-[0_24px_60px_var(--shadow-color)] animate-[reader-pop_var(--dur-pop)_var(--ease-pop)_both]"
      id={panelId}
      ref={panelRef}
      role="dialog"
      style={position}
    >
      <ExportMenu />
    </section>
  )
}
