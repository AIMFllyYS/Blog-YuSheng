import type { Metadata } from 'next'
import { AdminPanel } from '@/features/admin/admin-panel'

export const metadata: Metadata = {
  title: '后台 · 可见性',
  robots: { index: false, follow: false },
}

export default function AdminPage() {
  return <AdminPanel />
}
