import type { RopeProfile } from './rope-profile'

export type RopeSlotId =
  | 'brand'
  | 'blog'
  | 'notes'
  | 'works'
  | 'export'
  | 'share'
  | 'github'
  | 'theme'
  | 'audio'
  | 'settings'

export type RopeSlotKind = 'scroll' | 'bookmark' | 'charm'
export type RopeSlotCluster = 'left' | 'right'
export type RopeSlotVisibility = 'show' | 'desktop'
export type RopeSlotAction = 'export' | 'share' | 'theme' | 'audio' | 'settings'

export type RopeSlot = {
  readonly id: RopeSlotId
  readonly kind: RopeSlotKind
  readonly cluster: RopeSlotCluster
  readonly label?: string
  readonly tip: string
  readonly href?: string
  readonly external?: boolean
  readonly action?: RopeSlotAction
  readonly visibility: Partial<Record<RopeProfile, RopeSlotVisibility>>
  readonly ropeLength: Partial<Record<RopeProfile | 'hubCompact', string>>
}

export const GITHUB_REPO_HREF = 'https://github.com/AIMFllyYS/Blog-YuSheng'

export const ROPE_SLOTS: readonly RopeSlot[] = [
  {
    id: 'brand',
    kind: 'scroll',
    cluster: 'left',
    label: '羽升',
    tip: '回到首页',
    href: '/',
    visibility: { hub: 'show', article: 'show' },
    ropeLength: { hub: '2.8rem', hubCompact: '2.15rem', article: '30px' },
  },
  {
    id: 'blog',
    kind: 'bookmark',
    cluster: 'left',
    label: '博客',
    tip: '文章列表',
    href: '/blog/',
    visibility: { hub: 'desktop', article: 'desktop' },
    ropeLength: { hub: '3.85rem', article: '42px' },
  },
  {
    id: 'notes',
    kind: 'bookmark',
    cluster: 'left',
    label: '随笔',
    tip: '短随笔',
    href: '/notes/',
    visibility: { hub: 'desktop' },
    ropeLength: { hub: '3.15rem' },
  },
  {
    id: 'works',
    kind: 'bookmark',
    cluster: 'left',
    label: '作品集',
    tip: '作品与项目',
    href: '/works/',
    visibility: { hub: 'desktop' },
    ropeLength: { hub: '3.55rem' },
  },
  {
    id: 'export',
    kind: 'bookmark',
    cluster: 'right',
    label: '导出',
    tip: '导出本文',
    action: 'export',
    visibility: { article: 'show' },
    ropeLength: { article: '36px' },
  },
  {
    id: 'share',
    kind: 'charm',
    cluster: 'right',
    tip: '复制分享链接',
    action: 'share',
    visibility: { article: 'desktop' },
    ropeLength: { article: '38px' },
  },
  {
    id: 'github',
    kind: 'charm',
    cluster: 'right',
    tip: '打开 GitHub 仓库',
    href: GITHUB_REPO_HREF,
    external: true,
    visibility: { article: 'show' },
    ropeLength: { article: '32px' },
  },
  {
    id: 'theme',
    kind: 'charm',
    cluster: 'right',
    tip: '切换阅读主题',
    action: 'theme',
    visibility: { hub: 'show', article: 'show' },
    ropeLength: { hub: '2.35rem', hubCompact: '3.1rem', article: '26px' },
  },
  {
    id: 'audio',
    kind: 'charm',
    cluster: 'right',
    tip: '界面音效开关',
    action: 'audio',
    visibility: { hub: 'show', article: 'desktop' },
    ropeLength: { hub: '3.2rem', hubCompact: '2.4rem', article: '40px' },
  },
  {
    id: 'settings',
    kind: 'charm',
    cluster: 'right',
    tip: '主题与音效',
    action: 'settings',
    visibility: { hub: 'show', article: 'show' },
    ropeLength: { hub: '2.65rem', hubCompact: '3.35rem', article: '28px' },
  },
]

export function slotVisibility(
  slot: RopeSlot,
  profile: RopeProfile,
): RopeSlotVisibility | 'hide' {
  return slot.visibility[profile] ?? 'hide'
}

export function isSlotRendered(
  slot: RopeSlot,
  profile: RopeProfile,
  compact: boolean,
): boolean {
  const visibility = slotVisibility(slot, profile)
  if (visibility === 'hide') return false
  if (compact && visibility === 'desktop') return false
  return true
}

export function slotDesktopClassName(
  slot: RopeSlot,
  profile: RopeProfile,
): string {
  if (slotVisibility(slot, profile) !== 'desktop') return ''
  return profile === 'article' ? 'max-[520px]:hidden' : 'max-sm:hidden'
}

export function slotRopeLength(
  slot: RopeSlot,
  profile: RopeProfile,
  compact: boolean,
): string {
  if (compact && slot.ropeLength.hubCompact) return slot.ropeLength.hubCompact
  return slot.ropeLength[profile] ?? '2.5rem'
}

export function visibleSlots(
  profile: RopeProfile,
  compact: boolean,
): readonly RopeSlot[] {
  return ROPE_SLOTS.filter((slot) => isSlotRendered(slot, profile, compact))
}
