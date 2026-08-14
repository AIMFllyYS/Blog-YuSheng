export const JOURNEY_CONTENT = {
  title: '羽升',
  motto: '羽化成蝶 升生不息',
  bookTitle: '羽升集',
  narrative: '把走过的路，写成可以再次抵达的光。',
  gateLine: '玄之又玄，众妙之门',
} as const

export const HOME_DESTINATIONS = [
  {
    id: 'blog',
    label: '博客',
    eyebrow: '卷一 · 长文',
    description: '记录 AI 成长、技术判断与那些值得反复翻阅的长思考。',
    href: '/blog/',
    available: true,
  },
  {
    id: 'notes',
    label: '短随笔',
    eyebrow: '卷二 · 片语',
    description: '日常灵光、生活侧记与尚未长成文章的念头。',
    href: '/notes/',
    available: false,
  },
  {
    id: 'works',
    label: '作品集',
    eyebrow: '卷三 · 造物',
    description: '把想法做成真实可见、可触达、可继续生长的作品。',
    href: '/works/',
    available: false,
  },
  {
    id: 'about',
    label: '关于我',
    eyebrow: '卷四 · 此身',
    description: '认识羽升，也认识正在被一点点写出来的电子分身。',
    href: '/about/',
    available: false,
  },
] as const
