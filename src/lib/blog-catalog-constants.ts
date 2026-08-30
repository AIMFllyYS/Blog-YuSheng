/** Internal catalog identifiers shared by the content and shelf layers. */
export const UNCATEGORIZED_BOOK_SLUG = 'uncategorized' as const

/**
 * The content-engine acceptance article is the only intentional published
 * article without a registered section.
 */
export const ALLOWED_PUBLISHED_UNCATEGORIZED_SLUGS = [
  'p0-kitchen-sink',
] as const
