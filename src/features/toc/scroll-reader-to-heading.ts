export const HEADING_SCROLL_OFFSET_PX = 84

export function scrollReaderToHeading(slug: string) {
  const center = document.querySelector<HTMLElement>('[data-reader-center]')
  const target = document.getElementById(slug)
  if (!center || !target) return

  window.scrollTo({ top: 0, behavior: 'auto' })
  const top =
    center.scrollTop +
    target.getBoundingClientRect().top -
    center.getBoundingClientRect().top -
    HEADING_SCROLL_OFFSET_PX
  center.scrollTo({
    top: Math.max(0, top),
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth',
  })

  if (matchMedia('(max-width: 1024px)').matches) {
    document.querySelector<HTMLButtonElement>('[data-reader-drawer-overlay]')?.click()
  }
}
