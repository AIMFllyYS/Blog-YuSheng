'use client'

import { useEffect, useState } from 'react'

import {
  DEV_AUTH_ROLE_EVENT,
  DEV_AUTH_ROLE_KEY,
  isFakeAuthRole,
  type FakeAuthRole,
} from '@/features/discussions/domain/auth-port'

const ROLES: ReadonlyArray<{ readonly role: FakeAuthRole; readonly label: string }> = [
  { role: 'visitor', label: '访客' },
  { role: 'member', label: '普通用户' },
  { role: 'author', label: '作者' },
]

export function AuthPortSwitch() {
  const [current, setCurrent] = useState<FakeAuthRole>('member')

  useEffect(() => {
    const stored = sessionStorage.getItem(DEV_AUTH_ROLE_KEY)
    if (!isFakeAuthRole(stored)) return
    queueMicrotask(() => setCurrent(stored))
  }, [])

  const choose = (role: FakeAuthRole) => {
    sessionStorage.setItem(DEV_AUTH_ROLE_KEY, role)
    window.dispatchEvent(new CustomEvent(DEV_AUTH_ROLE_EVENT, { detail: role }))
    setCurrent(role)
  }

  return (
    <main className="mx-auto min-h-screen max-w-lg px-5 py-12 text-[var(--ink)]">
      <h1 className="mb-3 text-2xl">AuthPort 假身份</h1>
      <p className="mb-8 text-sm leading-7 text-[var(--ink-muted)]">
        选择后写入 sessionStorage（{DEV_AUTH_ROLE_KEY}），再打开
        /blog/p0-kitchen-sink/ 即可用该身份验证注释权限。
      </p>
      <div className="flex flex-wrap gap-3">
        {ROLES.map((item) => (
          <button
            aria-pressed={current === item.role}
            className="rounded-sm border border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-2 text-sm tracking-widest data-[active=true]:border-[var(--accent)] data-[active=true]:text-[var(--accent)]"
            data-active={current === item.role}
            data-dev-auth-role={item.role}
            key={item.role}
            onClick={() => choose(item.role)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
    </main>
  )
}
