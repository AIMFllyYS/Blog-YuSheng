'use client'

import { useState } from 'react'
import { AdminDesk, type AdminCatalog } from '@/features/admin/admin-desk'

const API_ROOT =
  process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:9983' : ''

export function AdminPanel() {
  const [token, setToken] = useState<string | undefined>()
  const [catalog, setCatalog] = useState<AdminCatalog | undefined>()
  const [error, setError] = useState<string | undefined>()
  const [pending, setPending] = useState(false)

  async function loadCatalog(nextToken: string) {
    const response = await adminFetch('/api/admin/catalog', nextToken)
    if (response.status === 401) {
      setToken(undefined)
      setCatalog(undefined)
      setError('登录已失效，请重新登录')
      return
    }
    if (!response.ok) {
      setError(await readError(response))
      return
    }
    setToken(nextToken)
    setCatalog((await response.json()) as AdminCatalog)
    setError(undefined)
  }

  async function onLogin(formData: FormData) {
    setError(undefined)
    const response = await fetch(`${API_ROOT}/api/admin/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username: formData.get('username'),
        password: formData.get('password'),
        code: formData.get('code'),
      }),
    })
    if (!response.ok) {
      setError(await readError(response))
      return
    }
    const body = (await response.json()) as { token?: string }
    if (!body.token) {
      setError('登录没有返回会话')
      return
    }
    await loadCatalog(body.token)
  }

  async function onApply(next: { posts: string[]; briefs: string[] }) {
    if (!token || !catalog) return
    setPending(true)
    setError(undefined)
    const response = await adminFetch('/api/admin/visibility', token, {
      method: 'PUT',
      body: JSON.stringify(next),
    })
    setPending(false)
    if (!response.ok) {
      setError(await readError(response))
      return
    }
    setCatalog((await response.json()) as AdminCatalog)
  }

  function logout() {
    setToken(undefined)
    setCatalog(undefined)
    setError(undefined)
  }

  if (catalog && token) {
    return (
      <AdminDesk
        catalog={catalog}
        error={error}
        onApply={onApply}
        onLogout={logout}
        pending={pending}
      />
    )
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-6 py-16 text-[var(--ink)]">
      <p className="text-sm text-[var(--ink-muted)]">羽升</p>
      <h1 className="mt-1 text-3xl">可见性</h1>
      {error ? (
        <p className="mt-6 border border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-3 text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <form
        className="mt-8 grid gap-4"
        method="post"
        onSubmit={(event) => {
          event.preventDefault()
          void onLogin(new FormData(event.currentTarget))
        }}
      >
        <Field label="用户名" name="username" type="text" />
        <Field label="密码" name="password" type="password" />
        <Field autoComplete="one-time-code" inputMode="numeric" label="验证码" name="code" type="text" />
        <button className="mt-2 border border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-2" type="submit">
          登录
        </button>
      </form>
    </main>
  )
}

function Field({
  label,
  name,
  type,
  autoComplete = name === 'password' ? 'current-password' : 'username',
  inputMode,
}: {
  label: string
  name: string
  type: 'text' | 'password'
  autoComplete?: string
  inputMode?: 'numeric'
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span>{label}</span>
      <input
        autoComplete={autoComplete}
        className="border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2"
        inputMode={inputMode}
        maxLength={name === 'code' ? 6 : undefined}
        name={name}
        pattern={name === 'code' ? '[0-9]{6}' : undefined}
        required
        spellCheck={false}
        type={type}
      />
    </label>
  )
}

async function adminFetch(pathname: string, token: string, init?: RequestInit) {
  const headers = new Headers(init?.headers)
  headers.set('authorization', `Bearer ${token}`)
  if (init?.body) headers.set('content-type', 'application/json')
  return fetch(`${API_ROOT}${pathname}`, { ...init, headers })
}

async function readError(response: Response) {
  try {
    const body = (await response.json()) as { error?: string }
    return body.error ?? '请求没有完成'
  } catch {
    return '请求没有完成'
  }
}
