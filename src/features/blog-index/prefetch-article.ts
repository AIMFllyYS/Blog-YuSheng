export function blogArticleHref(slug: string) {
  return `/blog/${slug}/`
}

export function prefetchBlogArticle(
  prefetch: (href: string) => void,
  slug: string,
) {
  prefetch(blogArticleHref(slug))
}
