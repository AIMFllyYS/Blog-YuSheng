/**
 * home-journey 常量 —— 首页 3D 叙事的全部可调参数与文案。
 * 依据 docs/designs/home-journey-storyboard.md（逐镜节拍表）。
 * 视觉基调固定一套（D11），不随主题切换；UI 挂件颜色走主题 token，不走这里。
 */

/** 确定性种子：所有程序化随机都从 (seed, elementId, channel) 派生，禁止运行时 Math.random */
export const JOURNEY_SEED = 20260814

/** 固定视觉基调（D11）：深夜星空 + 金光 */
export const JOURNEY_PALETTE = {
  /** 深空底色 */
  space: '#05070f',
  /** 星云紫 */
  nebula: '#1a1430',
  /** 纸白（文字/书页） */
  paper: '#f2efe7',
  /** 金光主色 */
  gold: '#d8ad57',
  /** 高亮金光（光门/书缝） */
  goldHot: '#ffd98a',
  /** 墨金渐变的墨端 */
  inkGold: '#6b5320',
  /** 线装书封面：玄青 */
  cover: '#27304b',
  /** 丝线（书脊针脚） */
  thread: '#d9cba8',
} as const

/** 文案（storyboard 待定项：封面书名、第三章叙事句、第四章点题句均为占位，收口时改这里） */
export const JOURNEY_COPY = {
  title: '羽升',
  subtitle: '羽化成蝶 升生不息',
  /** TODO(storyboard 待定项): 封面书名占位「羽升集」 */
  bookTitle: '羽升集',
  /** TODO(storyboard 待定项): 第三章叙事文案占位 */
  narrativeLine: '字落成书，书启为门',
  /** TODO(storyboard 待定项): 第四章点题句，占位用道德经原文 */
  gateMotto: '玄之又玄，众妙之门',
  skip: '跳过 ⤍ 直接入门',
  scrollHint: '向下滚动 · 启卷',
} as const

/**
 * 章节边界（滚动进度 0–1）。四章 + 尾声，与节拍表百分比一一对应。
 * snap 点 = 各章终点。
 */
export const CHAPTER_RANGES = {
  prologue: [0, 0] as const,
  scatter: [0, 0.25] as const, // 第一章 · 散
  gather: [0.25, 0.5] as const, // 第二章 · 聚
  open: [0.5, 0.75] as const, // 第三章 · 启
  gate: [0.75, 1] as const, // 第四章 · 门 + 尾声
}

/** 钉屏总滚动长度（800vh：加长轨道让每章节奏从容，动画进度完全由滚动控制） */
export const JOURNEY_SCROLL_VH = 800

/** 文字排版参数（Pretext 用）：字号随视口缩放，在布局时计算 */
export const TYPE_SCALE = {
  /** 主标题字号 = min(视口宽 * 此系数, 上限px) */
  titleVwFactor: 0.16,
  titleMaxPx: 220,
  subtitleVwFactor: 0.038,
  subtitleMaxPx: 44,
  /** 副句相对主标题的垂直间距（以主标题字号倍数计） */
  subtitleGapFactor: 0.9,
} as const

/** 粒子规模（按性能实测可下调） */
export const PARTICLE_COUNTS = {
  stars: 1600,
  goldDust: 260,
  /**  filler 活字（游荡/文字雨/书页字来源） */
  fillerGlyphs: 520,
} as const

/**
 * 「羽升」裂解时的字形碎片网格（3 列 × 4 行 = 12 片/字，近似笔画裂解）。
 * 碎片取字符图集格元的子 UV（不单独绘制，保证渐变连续、无接缝）。
 * 真笔画拆分需要字体轮廓数据，实现期用碎片近似。
 */
export const TITLE_SHARD_COLS = 3
export const TITLE_SHARD_ROWS = 4

/** 文字雨与书页用字池：取自《道德经》首章，与点题句呼应 */
export const GLYPH_POOL =
  '道可道非常名名可名非常无名天地之始有名万物之母故常无欲以观其妙常有欲以观其徼此两者同出而异名同谓之玄玄之又玄众妙之门'

/** 附魔化符文池：副句字符乱码闪变用（字形近篆/符，常见字体可渲染） */
export const RUNE_POOL = '爻彡卍玄炁癿厶巛卩攵夂灬爫罒習覺靈鳳昇'

/** 活字字体栈：与 frontend-design 第二节一致（自托管子集化字体为后续工序，先走降级栈） */
export const JOURNEY_FONT_STACK =
  '"Source Han Serif SC", "Noto Serif SC", "Songti SC", "SimSun", serif'

/**
 * 板块入口（尾声主页本体 + 移动端卡片共用，D12/D13）。
 * href 为 null 表示预留板块（/notes/、/works/、/about/ 留位未实现）。
 */
export const SECTION_ENTRIES = [
  {
    id: 'blog',
    href: '/blog/',
    title: '博客',
    desc: '记录 AI 成长、沉淀方法论的长文书架',
    tag: '现役',
  },
  {
    id: 'notes',
    href: null,
    title: '短随笔',
    desc: '不成文的短内容、生活记录与唠嗑',
    tag: '筹备中',
  },
  {
    id: 'works',
    href: null,
    title: '作品集',
    desc: '项目与作品，带演示链接',
    tag: '筹备中',
  },
  {
    id: 'about',
    href: null,
    title: '关于我',
    desc: '羽升的电子分身与自我介绍',
    tag: '筹备中',
  },
] as const

/** 世界坐标尺度：虚拟文字平面在 z=0，相机初始 z=9 */
export const WORLD = {
  cameraZ: 9,
  /** 相机视场角（度），文字 px→世界坐标映射依赖它 */
  cameraFov: 50,
  /** 标题中心在文字平面上的 y 偏移 */
  titleY: 0.55,
  /** 书在场景中的中心 */
  bookY: -0.15,
  bookZ: 0,
  /** 光门与相机的距离 */
  gateZ: -6,
} as const
