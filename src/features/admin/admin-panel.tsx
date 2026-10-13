'use client'

import { useState } from 'react'

type AdminPost = {
  slug: string
  title: string
  publishedAt: string
  hidden: boolean
}

type AdminBrief = {
  date: string
  title: string
  hidden: boolean
}

type Catalog = {
  canWrite: boolean
  posts: AdminPost[]
  briefs: AdminBrief[]
}

const API_ROOT =
  process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:9983' : ''

export function AdminPanel() {
  const [token, setToken] = useState<string | undefined>()
  const [catalog, setCatalog] = useState<Catalog | undefined>()
  const [error, setError] = useState<string | undefined>()
  const [pendingId, setPendingId] = useState<string | undefined>()
  const [query, setQuery] = useState('')

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
    setCatalog((await response.json()) as Catalog)
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
        rfa: formData.get('rfa'),
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

  async function onToggle(kind: 'posts' | 'briefs', id: string) {
    if (!token || !catalog || !catalog.canWrite) return
    const posts = catalog.posts
      .filter((post) => (post.slug === id && kind === 'posts' ? !post.hidden : post.hidden))
      .map((post) => post.slug)
    const briefs = catalog.briefs
      .filter((brief) => (brief.date === id && kind === 'briefs' ? !brief.hidden : brief.hidden))
      .map((brief) => brief.date)
    setPendingId(`${kind}:${id}`)
    setError(undefined)
    const response = await adminFetch('/api/admin/visibility', token, {
      method: 'PUT',
      body: JSON.stringify({ posts, briefs }),
    })
    setPendingId(undefined)
    if (!response.ok) {
      setError(await readError(response))
      return
    }
    setCatalog((await response.json()) as Catalog)
  }

  function logout() {
    setToken(undefined)
    setCatalog(undefined)
    setError(undefined)
  }

  const needle = query.trim().toLocaleLowerCase('zh-CN')
  const posts = filterItems(catalog?.posts ?? [], needle, (post) =>
    `${post.title} ${post.slug}`,
  )
  const briefs = filterItems(catalog?.briefs ?? [], needle, (brief) =>
    `${brief.title} ${brief.date}`,
  )

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16 text-[var(--ink)]">
      <header className="mb-10 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--ink-muted)]">羽升</p>
          <h1 className="mt-1 text-3xl">可见性</h1>
        </div>
        {catalog ? (
          <button
            className="text-sm text-[var(--ink-muted)] underline-offset-4 hover:underline"
            onClick={logout}
            type="button"
          >
            退出
          </button>
        ) : null}
      </header>

      {error ? (
        <p className="mb-6 rounded-md border border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-3 text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {catalog ? (
        <section>
          {catalog.canWrite ? (
            <p className="mb-6 text-sm text-[var(--ink-muted)]">
              关掉的项目会写进 content/visibility.json。提交并推送后，下一次构建不再导出它们。
            </p>
          ) : (
            <p className="mb-6 text-sm text-[var(--ink-muted)]">
              这里是当前这次部署的清单，不能从线上写回仓库。要改可见性，请在本地 pnpm dev 里保存后再推送。
            </p>
          )}
          <label className="mb-8 block text-sm">
            <span className="text-[var(--ink-muted)]">筛选</span>
            <input
              className="mt-2 w-full border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2"
              onChange={(event) => setQuery(event.target.value)}
              type="search"
              value={query}
            />
          </label>
          <ItemList
            canWrite={catalog.canWrite}
            items={posts.map((post) => ({
              id: post.slug,
              title: post.title,
              meta: post.slug,
              hidden: post.hidden,
            }))}
            kind="posts"
            pendingId={pendingId}
            title="博客"
            onToggle={onToggle}
          />
          <ItemList
            canWrite={catalog.canWrite}
            items={briefs.map((brief) => ({
              id: brief.date,
              title: brief.title,
              meta: brief.date,
              hidden: brief.hidden,
            }))}
            kind="briefs"
            pendingId={pendingId}
            title="早报"
            onToggle={onToggle}
          />
        </section>
      ) : (
        <form
          className="grid max-w-md gap-4"
          method="post"
          onSubmit={(event) => {
            event.preventDefault()
            void onLogin(new FormData(event.currentTarget))
          }}
        >
          <Field label="用户名" name="username" type="text" />
          <Field label="密码" name="password" type="password" />
          <Field label="RFA" name="rfa" type="password" />
          <button
            className="mt-2 border border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-2"
            type="submit"
          >
            登录
          </button>
        </form>
      )}
    </main>
  )
}

function Field({
  label,
  name,
  type,
}: {
  label: string
  name: string
  type: 'text' | 'password'
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span>{label}</span>
      <input
        autoComplete={name === 'rfa' ? 'off' : name === 'password' ? 'current-password' : 'username'}
        className="border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2"
        name={name}
        required
        spellCheck={false}
        type={type}
      />
    </label>
  )
}

function ItemList({
  title,
  kind,
  items,
  canWrite,
  pendingId,
  onToggle,
}: {
  title: string
  kind: 'posts' | 'briefs'
  items: { id: string; title: string; meta: string; hidden: boolean }[]
  canWrite: boolean
  pendingId: string | undefined
  onToggle: (kind: 'posts' | 'briefs', id: string) => Promise<void>
}) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-xl">
        {title}
        <span className="ml-2 text-sm text-[var(--ink-muted)]">{items.length}</span>
      </h2>
      <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {items.map((item) => (
          <li className="flex items-center justify-between gap-4 py-3" key={item.id}>
            <span>
              <span className="block">{item.title}</span>
              <span className="text-sm text-[var(--ink-muted)]">{item.meta}</span>
            </span>
            <button
              aria-pressed={!item.hidden}
              className="shrink-0 border border-[var(--line)] px-3 py-1 text-sm disabled:opacity-50"
              disabled={!canWrite || pendingId === `${kind}:${item.id}`}
              onClick={() => void onToggle(kind, item.id)}
              type="button"
            >
              {item.hidden ? '已隐藏' : '显示中'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function filterItems<T>(items: T[], needle: string, text: (item: T) => string) {
  if (!needle) return items
  return items.filter((item) => text(item).toLocaleLowerCase('zh-CN').includes(needle))
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
