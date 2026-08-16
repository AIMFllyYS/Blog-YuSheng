import 'server-only'

import type { FrontmatterDiagnostic } from './validate-frontmatter'

export class ContentBuildError extends Error {
  readonly diagnostics: readonly FrontmatterDiagnostic[]

  constructor(message: string, diagnostics: readonly FrontmatterDiagnostic[]) {
    super(message)
    this.name = 'ContentBuildError'
    this.diagnostics = diagnostics
  }
}
