export const SHOW_ANNOTATIONS_PANE_EVENT = 'reader:show-annotations'
export const FOCUS_ANNOTATION_EVENT = 'reader:focus-annotation'

export function revealAnnotationsPane(): void {
  if (document.body.classList.contains('reader-right-collapsed')) {
    window.dispatchEvent(new Event('reader:workspace-toggle'))
  }
  window.dispatchEvent(new Event(SHOW_ANNOTATIONS_PANE_EVENT))
}

export function focusAnnotationLocus(locusId: string): void {
  window.dispatchEvent(new CustomEvent(FOCUS_ANNOTATION_EVENT, { detail: locusId }))
}

export function isFocusAnnotationDetail(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}
