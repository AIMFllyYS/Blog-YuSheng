import type { SelectionMappingResult } from '@/features/doc-engine/selection'

export const ANNOTATE_SELECTION_EVENT = 'reader:annotate-selection'

export type AnnotateSelectionDetail = {
  readonly exact: string
  readonly headingPath: readonly string[]
  readonly mapping: Extract<SelectionMappingResult, { status: 'ok' }>
}

export function isAnnotateSelectionDetail(
  value: unknown,
): value is AnnotateSelectionDetail {
  if (typeof value !== 'object' || value === null) return false
  if (!('exact' in value) || !('headingPath' in value) || !('mapping' in value)) {
    return false
  }
  if (typeof value.exact !== 'string' || !Array.isArray(value.headingPath)) {
    return false
  }
  if (!value.headingPath.every((item) => typeof item === 'string')) return false
  const mapping = value.mapping
  if (typeof mapping !== 'object' || mapping === null) return false
  if (!('status' in mapping) || mapping.status !== 'ok') return false
  return true
}

export function truncateQuote(exact: string, limit = 90): string {
  return exact.length > limit ? `${exact.slice(0, limit)}…` : exact
}
