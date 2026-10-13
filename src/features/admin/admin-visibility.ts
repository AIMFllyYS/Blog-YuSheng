export type VisibilityKind = 'posts' | 'briefs'

export type VisibilityUpdate = {
  kind: VisibilityKind
  id: string
  hidden: boolean
}

type VisibilityCatalog = {
  posts: readonly { slug: string; hidden: boolean }[]
  briefs: readonly { date: string; hidden: boolean }[]
}

export function applyVisibility(catalog: VisibilityCatalog, updates: readonly VisibilityUpdate[]) {
  const posts = new Map(catalog.posts.map((post) => [post.slug, post.hidden]))
  const briefs = new Map(catalog.briefs.map((brief) => [brief.date, brief.hidden]))
  for (const update of updates) {
    const target = update.kind === 'posts' ? posts : briefs
    if (!target.has(update.id)) continue
    target.set(update.id, update.hidden)
  }
  return {
    posts: [...posts.entries()].filter(([, hidden]) => hidden).map(([id]) => id),
    briefs: [...briefs.entries()].filter(([, hidden]) => hidden).map(([id]) => id),
  }
}
