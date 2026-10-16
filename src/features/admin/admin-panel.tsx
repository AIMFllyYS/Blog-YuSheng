'use client'

import { useState } from 'react'
import { useFallingToast } from '@/components/ui/falling-toast'
import { AdminDesk, type AdminCatalog } from '@/features/admin/admin-desk'
import { AdminLoginStage } from '@/features/admin/admin-login-stage'
import styles from '@/features/admin/admin.module.css'
import { RopeNavigation } from '@/features/navigation'

const API_ROOT =
  process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:9983' : ''

export function AdminPanel() {
  const { notify } = useFallingToast()
  const [token, setToken] = useState<string | undefined>()
  const [catalog, setCatalog] = useState<AdminCatalog | undefined>()
  const [error, setError] = useState<string | undefined>()
  const [pending, setPending] = useState(false)
  const [loggingIn, setLoggingIn] = useState(false)

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
    notify('已启封藏书司检校台')
  }

  async function onLogin(formData: FormData) {
    setError(undefined)
    setLoggingIn(true)
    try {
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
    } finally {
      setLoggingIn(false)
    }
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
    const updated = (await response.json()) as AdminCatalog
    setCatalog(updated)
    notify('已同步可见性清单至仓库')
  }

  function logout() {
    setToken(undefined)
    setCatalog(undefined)
    setError(undefined)
    notify('已封存退出检校台')
  }

  return (
    <main
      className={styles.page}
      data-admin-page={catalog && token ? 'desk' : 'login'}
    >
      {/* 顶部常驻绳挂顶棚：高度固定，不随下方工作区滚动而流失 */}
      <div className={styles.topRopeBand}>
        <div aria-hidden="true" className={styles.canopyCornerLeft}>
          <span className={styles.canopySeal}>司印</span>
          <span className={styles.canopyLabel}>羽升书房 · 藏书司内阁</span>
        </div>
        <RopeNavigation />
        <div aria-hidden="true" className={styles.canopyCornerRight}>
          <span className={styles.canopyLabel}>
            {catalog && token
              ? catalog.canWrite
                ? 'GitHub 仓库直写已就绪'
                : '只读快照检视模式'
              : '三因子门禁待核验'}
          </span>
        </div>
      </div>

      {/* 下方全屏工作台壳体（占满剩余 100dvh 高度与 100vw 宽度，无空余白边） */}
      <div className={styles.workbenchShell}>
        {catalog && token ? (
          <AdminDesk
            catalog={catalog}
            error={error}
            onApply={onApply}
            onLogout={logout}
            pending={pending}
          />
        ) : (
          <AdminLoginStage
            error={error}
            loggingIn={loggingIn}
            onLogin={onLogin}
          />
        )}
      </div>
    </main>
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
