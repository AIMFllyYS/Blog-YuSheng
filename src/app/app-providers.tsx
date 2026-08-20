'use client'

import type { ReactNode } from 'react'
import { FallingToastProvider } from '@/components/ui/falling-toast'

export function AppProviders({ children }: { readonly children: ReactNode }) {
  return <FallingToastProvider>{children}</FallingToastProvider>
}
