export const JOURNEY_CONTENT = {
  title: '羽升',
  motto: '羽化成蝶 升生不息',
  bookTitle: '羽升集',
  narrative: '把走过的路，写成可以再次抵达的光。',
  gateLine: '玄之又玄，众妙之门',
} as const

export type HomeDestination = {
  readonly id: 'blog' | 'daily' | 'works' | 'about'
  readonly label: string
  readonly eyebrow: string
  readonly description: string
  readonly href: string
  readonly available: boolean
  /** 站外链接：新标签打开，不走 next/link */
  readonly external?: boolean
}

export const HOME_DESTINATIONS: readonly HomeDestination[] = [
  {
    id: 'blog',
    label: '博客',
    eyebrow: '卷一 · 长文',
    description: '记录 AI 成长、技术判断与那些值得反复翻阅的长思考。',
    href: '/blog/',
    available: true,
  },
  {
    id: 'daily',
    label: '小日报',
    eyebrow: '卷二 · 日课',
    description: '每天清晨由电子分身折好的一份 AI 早报，按月归档、按周翻阅。',
    href: '/daily/',
    available: true,
  },
  {
    id: 'works',
    label: '作品集',
    eyebrow: '卷三 · 造物',
    description: '把想法做成真实可见、可触达、可继续生长的作品。',
    href: 'https://artifact.yusheng.husteread.com/',
    available: true,
    external: true,
  },
  {
    id: 'about',
    label: '关于我',
    eyebrow: '卷四 · 此身',
    description: '认识羽升，也认识正在被一点点写出来的电子分身。',
    href: 'https://husteread.com',
    available: true,
    external: true,
  },
]
