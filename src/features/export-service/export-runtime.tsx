'use client'

import { createContext, useContext, type ReactNode } from 'react'

export type ExportRuntimeValue = {
  readonly articleSlug: string
}

const ExportRuntimeContext = createContext<ExportRuntimeValue | null>(null)

export function ExportRuntimeProvider({
  articleSlug,
  children,
}: ExportRuntimeValue & { readonly children: ReactNode }) {
  return (
    <ExportRuntimeContext.Provider value={{ articleSlug }}>
      {children}
    </ExportRuntimeContext.Provider>
  )
}

export function useExportRuntime(): ExportRuntimeValue | null {
  return useContext(ExportRuntimeContext)
}
