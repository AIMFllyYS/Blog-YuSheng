/**
 * home-journey 共享类型。
 * 叙事由「频道（channel）」驱动：GSAP 主时间线只 tween 频道值（0–1），
 * R3F 场景每帧从频道求值粒子/书本/相机状态 —— 缓动语义归 GSAP，位置计算是确定性的。
 */

/** 主时间线 tween 的频道集合；每帧由场景消费 */
export interface JourneyChannels {
  /* 序幕 */
  /** 副句八字金边亮起（预告要动的是它们） */
  subGlow: number
  /** 待机波浪幅度（序幕恒活，第一章启动后归零） */
  idleWave: number
  /* 第一章 · 散 */
  /** 副句附魔化（字形闪变符文 + 脱离行位飘起） */
  subEnchant: number
  /** 副句粒子四散游走 */
  subScatter: number
  /** 「羽升」裂解为字形碎片 */
  titleCrack: number
  /** 全部字粒子卷入旋涡 */
  swirl: number
  /* 第二章 · 聚 */
  /** 涡流收紧、粒子向中心加速 */
  tighten: number
  /** 书本实体显形（封面宣纸纹理凝出） */
  bookForm: number
  /** 书脊针脚逐针缝出 */
  stitch: number
  /** 封面题字落定 */
  coverTitle: number
  /** 相机绕至斜俯视 */
  orbit: number
  /* 第三章 · 启 */
  /** 相机下沉贴书、封面掀开 */
  openCover: number
  /** 书页加速翻动 */
  flipPages: number
  /** 字从页面浮起悬停 / 游荡 */
  levitate: number
  /** 部分字坠为文字雨落回页面 */
  rain: number
  /** 叙事文案逐字凝聚成行 */
  lineGather: number
  /** 页心漏金光，越翻越亮 */
  spineGlow: number
  /* 第四章 · 门 + 尾声 */
  /** 金光暴涨占满全屏 */
  burst: number
  /** 光中凝出门形 */
  gateForm: number
  /** 门开、镜头穿门（白金闪光） */
  passThrough: number
  /** 尾声揭示：光散，主页本体呈现 */
  unveil: number
}

/** 场景每帧读取的上下文：频道 + 环境量 */
export interface JourneyFrameState {
  channels: JourneyChannels
  /** 主时间线总进度 0–1 */
  progress: number
  /** 场景时钟（秒），只驱动待机微动；reduced-motion 下冻结 */
  time: number
  /** 视口宽高比 */
  aspect: number
}

export type Vec3 = { x: number; y: number; z: number }

/** 单个活字粒子的确定性编排数据（构建期一次性由 seed 派生） */
export interface GlyphParticle {
  /** 稳定 id，派生随机数的 elementId */
  id: number
  role: 'titleShard' | 'subChar' | 'filler'
  /** 字 atlas 中的索引（普通字形 / 符文变体） */
  glyphIndex: number
  runeIndex: number
  /** 家位置（Pretext 算出，文字平面世界坐标） */
  home: Vec3
  homeSize: number
  /** 标题碎片的裂解方向（仅 titleShard） */
  crackDir: Vec3
  /** 散开目标（球面随机方向） */
  scatter: Vec3
  /** 旋涡参数：半径、初始角、角速度、垂直偏移 */
  vortexRadius: number
  vortexAngle: number
  vortexOmega: number
  vortexY: number
  /** 汇聚落点：书封面/书脊上的目标 */
  gather: Vec3
  /** 开卷后页上文字位置（竖排列） */
  pagePos: Vec3
  /** 悬浮锚点（书上空）与游荡相位 */
  floatAnchor: Vec3
  wanderPhase: number
  /** 文字雨：落回书页的落点与下落速度系数 */
  rainTarget: Vec3
  rainSpeed: number
  /** 逐字凝聚行内的目标位置与序号（-1 = 不参与叙事句） */
  lineSlot: Vec3
  lineOrder: number
  /** 汇聚成书后是否留作环绕金尘 */
  isRing: boolean
  /** 第三章是否化作文字雨 */
  isRain: boolean
  /** 金光暴涨时的飞散方向 */
  burstDir: Vec3
  /** 个体错落（stagger），0–1，把频道进程在粒子间错开 */
  stagger: number
  size: number
  /** 粒子四边形宽高比（标题碎片为 4/3，其余为 1） */
  aspect: number
  /** 墨金渐变坐标：g = gradBase + quadLocalY * gradScale（碎片按切片位置取子区间，保证跨片连续） */
  gradBase: number
  gradScale: number
}
