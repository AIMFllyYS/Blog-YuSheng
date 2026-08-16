'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { CompiledDocument } from '../doc-engine/core'

export type ExportRuntimeValue = {
  readonly articleSlug: string
  readonly document: CompiledDocument
  readonly assetManifest: readonly unknown[]
}

const ExportRuntimeContext = createContext<ExportRuntimeValue | null>(null)

export function ExportRuntimeProvider({
  articleSlug,
  assetManifest,
  children,
  document,
}: ExportRuntimeValue & { readonly children: ReactNode }) {
  return (
    <ExportRuntimeContext.Provider
      value={{ articleSlug, assetManifest, document }}
    >
      {children}
    </ExportRuntimeContext.Provider>
  )
}

export function useExportRuntime(): ExportRuntimeValue | null {
  return useContext(ExportRuntimeContext)
}
