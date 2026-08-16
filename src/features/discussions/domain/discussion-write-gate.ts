/** Public cloud writes. Production static deploys stay closed. */
export const DISCUSSION_WRITES_OPEN = process.env.NODE_ENV !== 'production'

/** Local author mode can open writes without turning on public cloud writes. */
export function areDiscussionWritesOpen(localAuthorMode: boolean): boolean {
  return DISCUSSION_WRITES_OPEN || localAuthorMode
}
