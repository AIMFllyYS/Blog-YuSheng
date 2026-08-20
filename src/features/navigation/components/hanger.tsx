import type { ReactNode } from 'react'

type HangerProps = {
  children: ReactNode
  className?: string
  id: string
  ropeLength?: string
}

export function Hanger({
  children,
  className = '',
  id,
  ropeLength = '2.5rem',
}: HangerProps) {
  return (
    <div
      className={`flex min-w-0 flex-col items-center overflow-visible ${className}`}
      data-home-hanger={id}
      data-rope-hanger={id}
    >
      <span
        aria-hidden="true"
        className="block w-px shrink-0 bg-[var(--ink-muted)] shadow-[1px_0_0_var(--line)]"
        style={{ height: ropeLength }}
      />
      <span
        aria-hidden="true"
        className="-mb-px block size-2 rounded-full border border-[var(--line)] bg-[var(--ink-muted)]"
      />
      {children}
    </div>
  )
}
