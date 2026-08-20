import type { ReactNode } from 'react'
import { BlogFirstPaintBoot } from '@/features/boot'

export default function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <div className="contents">
      <BlogFirstPaintBoot />
      {children}
    </div>
  )
}
