/**
 * 活字编排：把每个粒子的整段旅程建模为确定性数据（构建期由 seed 派生），
 * 每帧用 GSAP tween 出的频道值纯函数求值——同一帧永远得到同一组变换。
 *
 * 粒子生命周期（对应 storyboard 节拍）：
 * 序幕 home（待机波浪）→ 附魔化/裂解 → 四散 → 旋涡 → 收紧 → 汇聚成书
 * → 开卷后成为页上文字 → 悬浮/游荡/文字雨 → 逐字凝聚成叙事句 → 金光暴涨中散尽
 */
import {
  JOURNEY_COPY,
  JOURNEY_SEED,
  PARTICLE_COUNTS,
  TITLE_SHARD_COLS,
  TITLE_SHARD_ROWS,
  WORLD,
} from '../constants'
import type { GlyphAtlas, UvRect } from './glyph-atlas'
import type { JourneyTypeLayout } from './pretext-layout'
import { seededRange, seededUnit } from './seeded-random'
import type { GlyphParticle, JourneyChannels, Vec3 } from '../types'

/** 书本世界尺寸（thread-book 与编排共用） */
export const BOOK = {
  width: 2.3,
  height: 3.2,
  coverThick: 0.07,
  pageBlockThick: 0.26,
  pagesW: 2.02,
  pagesH: 2.92,
  cx: 0,
  cy: WORLD.bookY,
  cz: WORLD.bookZ,
} as const

/** 封面正面 z（粒子汇聚落点所在平面） */
const COVER_FRONT_Z = BOOK.cz + BOOK.coverThick + BOOK.pageBlockThick / 2

export interface ParticleFrame {
  x: number
  y: number
  z: number
  size: number
  rot: number
  brightness: number
  /** 0 = 普通字形，1 = 符文/替换字形（副句附魔化、叙事句换字复用同一通道） */
  runeMix: number
  /** 运动方向拉伸（拖尾感），1 = 不拉伸 */
  stretch: number
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v)
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const mixVec = (out: Vec3, b: Vec3, t: number): Vec3 => ({
  x: lerp(out.x, b.x, t),
  y: lerp(out.y, b.y, t),
  z: lerp(out.z, b.z, t),
})

/** 个体错落：把频道进程在粒子间错开（spread 越大越早/晚差异越明显） */
function stag(channel: number, stagger: number, spread = 0.4): number {
  return clamp01(channel * (1 + spread) - stagger * spread)
}

/* ------------------------------------------------------------------ */
/* 构建期：粒子数据                                                    */
/* ------------------------------------------------------------------ */

export function buildGlyphParticles(
  layout: JourneyTypeLayout,
  atlas: GlyphAtlas,
  viewportHeightPx: number,
  fovDeg: number,
): { particles: GlyphParticle[]; rects: UvRect[] } {
  const particles: GlyphParticle[] = []
  const extraRects: UvRect[] = []
  let id = 0
  const worldHeight = 2 * Math.tan(((fovDeg / 2) * Math.PI) / 180) * WORLD.cameraZ
  const s = worldHeight / viewportHeightPx
  const toWorld = (pxX: number, pxY: number): Vec3 => ({
    x: pxX * s,
    y: WORLD.titleY - pxY * s,
    z: 0,
  })
  /** 图集字形是居中绘制在格元里的，粒子尺寸需按 格元px/字形px 放大 */
  const titleCellScale = 256 / 224
  const smallCellScale = 128 / 108

  /* 标题碎片（3×4 网格子 UV 切片；序幕期 12 片无缝拼成完整字形，裂解时各自飞散） */
  for (const laidOut of layout.title.chars) {
    const slot = atlas.charSlot.get(laidOut.char)
    if (slot === undefined) continue
    const cell = atlas.rects[slot]
    const center = toWorld(laidOut.x, laidOut.y)
    const worldSize = laidOut.fontSize * s * titleCellScale
    for (let row = 0; row < TITLE_SHARD_ROWS; row += 1) {
      for (let col = 0; col < TITLE_SHARD_COLS; col += 1) {
        // 子 UV 内扩约 0.6 图集像素：吃掉线性过滤在切片边缘取到的邻格/透明像素，
        // 否则序幕期 12 片拼接处会漏出极细暗缝
        const inset = 0.6 / 2048
        const sub: UvRect = {
          u0: cell.u0 + ((cell.u1 - cell.u0) * col) / TITLE_SHARD_COLS + inset,
          u1: cell.u0 + ((cell.u1 - cell.u0) * (col + 1)) / TITLE_SHARD_COLS - inset,
          v1: cell.v1 - ((cell.v1 - cell.v0) * row) / TITLE_SHARD_ROWS - inset,
          v0: cell.v1 - ((cell.v1 - cell.v0) * (row + 1)) / TITLE_SHARD_ROWS + inset,
        }
        extraRects.push(sub)
        const sliceHome: Vec3 = {
          x: center.x + ((col + 0.5) / TITLE_SHARD_COLS - 0.5) * worldSize,
          y: center.y - ((row + 0.5) / TITLE_SHARD_ROWS - 0.5) * worldSize,
          z: center.z,
        }
        particles.push(
          makeParticle(id, 'titleShard', atlas.rects.length + extraRects.length - 1, atlas, {
            home: sliceHome,
            // size 驱动四边形高度（字高/行数），aspect = 宽/高 = 行数/列数
            homeSize: worldSize / TITLE_SHARD_ROWS,
            crackDir: {
              x: (sliceHome.x - center.x) * 2.4 + seededRange(JOURNEY_SEED, id, 11, -0.7, 0.7),
              y: (sliceHome.y - center.y) * 2.4 + seededRange(JOURNEY_SEED, id, 12, -0.4, 0.8),
              z: seededRange(JOURNEY_SEED, id, 13, -1.2, 1.6),
            },
            aspect: TITLE_SHARD_ROWS / TITLE_SHARD_COLS,
            gradBase: 1 - (row + 1) / TITLE_SHARD_ROWS,
            gradScale: 1 / TITLE_SHARD_ROWS,
          }),
        )
        id += 1
      }
    }
  }

  /* 副句字符 */
  for (const laidOut of layout.subtitle.chars) {
    const slot = atlas.charSlot.get(laidOut.char)
    if (slot === undefined) continue
    particles.push(
      makeParticle(id, 'subChar', slot, atlas, {
        home: toWorld(laidOut.x, laidOut.y),
        homeSize: laidOut.fontSize * s * smallCellScale,
        runeChar: laidOut.char,
      }),
    )
    id += 1
  }

  /* filler 活字（旋涡质量 / 书页文字 / 悬浮 / 文字雨 / 叙事句） */
  const narrativeChars = JOURNEY_COPY.narrativeLine
    .split('')
    .filter((c) => c.trim() !== '' && c !== '，')
  for (let i = 0; i < PARTICLE_COUNTS.fillerGlyphs; i += 1) {
    const angle = seededRange(JOURNEY_SEED, id, 21, 0, Math.PI * 2)
    const radius = seededRange(JOURNEY_SEED, id, 22, 3.2, 8)
    const lineOrder = i < narrativeChars.length ? i : -1
    const glyphSlot =
      lineOrder >= 0
        ? (atlas.narrativeSlot.get(narrativeChars[lineOrder] ?? '') ??
          atlas.poolSlots[i % atlas.poolSlots.length] ??
          0)
        : (atlas.poolSlots[i % atlas.poolSlots.length] ?? 0)
    particles.push(
      makeParticle(id, 'filler', glyphSlot, atlas, {
        home: {
          x: Math.cos(angle) * radius,
          y: seededRange(JOURNEY_SEED, id, 23, -3, 3),
          z: seededRange(JOURNEY_SEED, id, 24, -2, 0.5),
        },
        homeSize: seededRange(JOURNEY_SEED, id, 25, 0.1, 0.2),
        lineOrder,
      }),
    )
    id += 1
  }
  return { particles, rects: [...atlas.rects, ...extraRects] }
}

interface ParticleExtras {
  home: Vec3
  homeSize: number
  crackDir?: Vec3
  runeChar?: string
  lineOrder?: number
  aspect?: number
  gradBase?: number
  gradScale?: number
}

function makeParticle(
  id: number,
  role: GlyphParticle['role'],
  glyphIndex: number,
  atlas: GlyphAtlas,
  extras: ParticleExtras,
): GlyphParticle {
  const u = (channel: number): number => seededUnit(JOURNEY_SEED, id, channel)
  const r = (channel: number, min: number, max: number): number =>
    seededRange(JOURNEY_SEED, id, channel, min, max)

  // 汇聚落点：85% 落在封面矩形上，15% 落在书脊缝线列
  const onSpine = u(31) < 0.15
  const gather: Vec3 = onSpine
    ? {
        x: BOOK.cx + BOOK.width / 2 + r(32, -0.03, 0.03),
        y: BOOK.cy + r(33, -BOOK.height / 2, BOOK.height / 2),
        z: COVER_FRONT_Z + r(34, -0.02, 0.1),
      }
    : {
        x: BOOK.cx + r(35, -BOOK.width / 2 + 0.08, BOOK.width / 2 - 0.08),
        y: BOOK.cy + r(36, -BOOK.height / 2 + 0.08, BOOK.height / 2 - 0.08),
        z: COVER_FRONT_Z + r(37, -0.02, 0.06),
      }

  // 页上文字位置：竖排八列，从右往左（传统版式）
  const col = Math.floor(u(41) * 8)
  const pagePos: Vec3 = {
    x: 0.82 - col * 0.235 + r(42, -0.03, 0.03),
    y: BOOK.cy + r(43, -1.28, 1.32),
    z: COVER_FRONT_Z + 0.02,
  }

  // 叙事句行内槽位：书上方一行
  const lineOrder = extras.lineOrder ?? -1
  const lineSlot: Vec3 =
    lineOrder >= 0
      ? {
          x: (lineOrder - 3.5) * 0.42,
          y: BOOK.cy + 1.12,
          z: 1.15,
        }
      : { x: 0, y: 0, z: 0 }

  const runeIndex =
    role === 'subChar' && extras.runeChar
      ? (atlas.runeSlot.get(extras.runeChar) ?? glyphIndex)
      : glyphIndex

  return {
    id,
    role,
    glyphIndex,
    runeIndex,
    home: extras.home,
    homeSize: extras.homeSize,
    crackDir: extras.crackDir ?? { x: 0, y: 0, z: 0 },
    scatter: {
      x: r(51, -1, 1) * r(52, 2.5, 5.5),
      y: r(53, -1, 1) * r(54, 2, 4.5),
      z: r(55, -1.5, 1.5),
    },
    vortexRadius: r(61, 1.3, 3.6),
    vortexAngle: r(62, 0, Math.PI * 2),
    vortexOmega: r(63, 4, 8.5) * (u(64) < 0.5 ? 1 : -1),
    vortexY: r(65, -1.3, 1.3),
    gather,
    pagePos,
    floatAnchor: { x: r(71, -1.4, 1.2), y: BOOK.cy + r(72, 0.7, 2.1), z: r(73, 0.5, 1.5) },
    wanderPhase: r(74, 0, Math.PI * 2),
    rainTarget: { x: r(81, -0.95, 0.95), y: BOOK.cy + r(82, -1.3, 0.9), z: COVER_FRONT_Z + 0.03 },
    rainSpeed: r(83, 0.35, 0.9),
    lineSlot,
    lineOrder,
    isRing: u(91) < 0.3,
    isRain: u(92) < 0.3,
    burstDir: {
      x: r(101, -1, 1),
      y: r(102, -1, 1),
      z: r(103, -0.4, 0.8),
    },
    stagger: u(111),
    size: r(112, 0.85, 1.2),
    aspect: extras.aspect ?? 1,
    gradBase: extras.gradBase ?? 0,
    gradScale: extras.gradScale ?? 1,
  }
}

/* ------------------------------------------------------------------ */
/* 运行期：逐帧求值                                                    */
/* ------------------------------------------------------------------ */

const VORTEX = { x: 0, y: 0.15, z: 0 }

export function evaluateGlyphParticle(
  p: GlyphParticle,
  ch: JourneyChannels,
  time: number,
  out: ParticleFrame,
): void {
  let pos: Vec3 = { ...p.home }
  let size = p.homeSize
  let rot = 0
  let brightness = 1
  let runeMix = 0
  let stretch = 1

  /* ---------- 序幕：待机微动（画面永远是活的） ---------- */
  if (p.role !== 'filler') {
    const wave = Math.sin(time * 1.4 + p.stagger * Math.PI * 2) * 0.028 * ch.idleWave
    pos.y += wave
    brightness = p.role === 'titleShard' ? 0.96 : 0.86
  } else {
    // filler 序幕隐没，等待被卷入叙事
    brightness = 0
  }

  /* ---------- 副句金边预告（0–3%） ---------- */
  if (p.role === 'subChar' && ch.subGlow > 0) {
    const pulse = stag(ch.subGlow, p.stagger, 0.55)
    brightness = 0.86 + pulse * (0.4 + 0.2 * Math.sin(time * 5 + p.stagger * 12))
  }

  /* ---------- 第一章：附魔化（3–10%，副句） ---------- */
  if (p.role === 'subChar') {
    const e = stag(ch.subEnchant, p.stagger, 0.5)
    if (e > 0) {
      runeMix = Math.min(1, e * 2.2)
      const lift: Vec3 = {
        x: pos.x + Math.sin(p.stagger * 40) * 0.25 * e,
        y: pos.y + (0.35 + p.stagger * 0.5) * e,
        z: pos.z + 0.4 * e,
      }
      pos = mixVec(pos, lift, e)
      rot = e * Math.sin(time * 2 + p.wanderPhase) * 0.35
    }
    /* 副句四散游走（5–10% 起） */
    const sc = stag(ch.subScatter, p.stagger, 0.45)
    if (sc > 0) {
      const wander: Vec3 = {
        x: p.scatter.x + Math.sin(time * 0.9 + p.wanderPhase) * 0.5,
        y: p.scatter.y + Math.cos(time * 0.7 + p.wanderPhase) * 0.45,
        z: p.scatter.z,
      }
      pos = mixVec(pos, wander, sc)
      rot += sc * Math.sin(time * 1.1 + p.wanderPhase) * 0.8
      brightness = lerp(brightness, 0.9, sc)
    }
  }

  /* ---------- 第一章：标题裂解（10–20%） ---------- */
  if (p.role === 'titleShard') {
    const c = stag(ch.titleCrack, p.stagger, 0.5)
    if (c > 0) {
      const crack: Vec3 = {
        x: pos.x + p.crackDir.x * c,
        y: pos.y + p.crackDir.y * c,
        z: pos.z + p.crackDir.z * c,
      }
      pos = mixVec(pos, crack, c)
      rot = c * (p.stagger - 0.5) * 3.2
      brightness = lerp(0.96, 1, c)
    }
  }

  /* ---------- 第一章：旋涡（20–25%，全部字粒子） ---------- */
  const sw = stag(ch.swirl, p.stagger, 0.55)
  if (sw > 0) {
    const angle = p.vortexAngle + sw * p.vortexOmega + time * 0.25
    const radius = p.vortexRadius * (1 - 0.45 * sw)
    // 随旋进度收拢为倾斜圆盘（y/z 同相 → 正面看是涡旋椭圆而非横向云带）
    const vortex: Vec3 = {
      x: VORTEX.x + Math.cos(angle) * radius,
      y:
        lerp(VORTEX.y + p.vortexY * (1 - 0.5 * sw), VORTEX.y + Math.sin(angle) * radius * 0.34, sw) +
        Math.sin(time * 0.6 + p.wanderPhase) * 0.08,
      z: VORTEX.z + Math.sin(angle) * radius * 0.5,
    }
    pos = mixVec(pos, vortex, sw)
    rot = angle + Math.PI / 2
    stretch = 1 + sw * 1.8
    if (p.role === 'filler') brightness = sw * 0.85 // filler 在旋涡中显形
    runeMix = p.role === 'subChar' ? runeMix : Math.max(runeMix, 0)
  }

  /* ---------- 第二章：收紧 + 汇聚成书（25–42%） ---------- */
  const ti = stag(ch.tighten, p.stagger, 0.45)
  if (ti > 0) {
    const angle = p.vortexAngle + 1 * p.vortexOmega + ti * p.vortexOmega * 1.6 + time * 0.25
    const radius = p.vortexRadius * 0.55 * (1 - 0.8 * ti) + 0.12
    const tightening: Vec3 = {
      x: VORTEX.x + Math.cos(angle) * radius,
      y: lerp(VORTEX.y + p.vortexY * 0.5, BOOK.cy, ti),
      z: Math.sin(angle) * radius * 0.3,
    }
    pos = mixVec(pos, tightening, ti)
    rot = angle + Math.PI / 2
    brightness = p.role === 'filler' ? lerp(0.85, 1, ti) : 1
  }
  const g = stag(ch.bookForm, p.stagger, 0.5)
  if (g > 0) {
    pos = mixVec(pos, p.gather, g * g)
    rot = lerp(rot, 0, g)
    stretch = lerp(stretch, 1, g)
    size = lerp(size, p.role === 'filler' ? 0.14 : 0.2, g)
  }
  // 汇聚完成后：大部分粒子隐去（书本实体接管），三成化作环绕金尘
  const formed = stag(ch.bookForm, p.stagger, 0.15)
  if (formed > 0.85) {
    const k = clamp01((formed - 0.85) / 0.15)
    if (p.isRing) {
      const ringAngle = p.vortexAngle + time * 0.3
      // 土星环式完整椭圆：正面可读作「环绕书的一圈金尘」，前后景深有层次
      const ring: Vec3 = {
        x: BOOK.cx + Math.cos(ringAngle) * 1.85,
        y: BOOK.cy + Math.sin(ringAngle) * 0.58,
        z: Math.sin(ringAngle + 0.6) * 1.1,
      }
      pos = mixVec(pos, ring, k)
      brightness = lerp(1, 0.68, k)
      size = lerp(size, 0.09, k)
    } else {
      brightness = lerp(1, 0, k)
    }
  }

  /* ---------- 第三章：开卷活字（56–72%） ---------- */
  if (!p.isRing) {
    // 非环绕粒子在书页上重新显形为页上文字
    const appear = stag(ch.flipPages, p.stagger, 0.6)
    if (appear > 0 && g > 0.9) {
      pos = mixVec(pos, p.pagePos, appear)
      brightness = lerp(0, 0.5, appear)
      size = lerp(size, 0.1, appear)
      rot = 0
    }
    // 浮起悬停 / 游荡
    const lv = stag(ch.levitate, p.stagger, 0.55)
    if (lv > 0) {
      const hover: Vec3 = {
        x: p.floatAnchor.x + Math.sin(time * 0.5 + p.wanderPhase) * 0.22,
        y: p.floatAnchor.y + Math.sin(time * 0.8 + p.wanderPhase * 2) * 0.16,
        z: p.floatAnchor.z,
      }
      pos = mixVec(pos, hover, lv)
      brightness = lerp(brightness, 0.72, lv)
      rot = lv * Math.sin(time * 0.6 + p.wanderPhase) * 0.4
    }
    // 文字雨：一部分坠回页面（循环）
    if (p.isRain && ch.rain > 0) {
      const rainT = stag(ch.rain, p.stagger, 0.4)
      if (rainT > 0) {
        const cycle = (time * p.rainSpeed + p.stagger * 7) % 1
        const fall: Vec3 = {
          x: lerp(p.floatAnchor.x, p.rainTarget.x, cycle),
          y: lerp(p.floatAnchor.y, p.rainTarget.y, cycle * cycle),
          z: lerp(p.floatAnchor.z, p.rainTarget.z, cycle),
        }
        pos = mixVec(pos, fall, rainT)
        brightness = lerp(brightness, Math.sin(cycle * Math.PI) * 0.9, rainT)
        rot = lerp(rot, 0, rainT)
        stretch = lerp(stretch, 1.9, rainT)
      }
    }
    // 叙事句：被选中的字逐字凝聚成行
    if (p.lineOrder >= 0) {
      const lg = stag(ch.lineGather, p.lineOrder / 8, 0.6)
      if (lg > 0) {
        const slot: Vec3 = {
          ...p.lineSlot,
          y: p.lineSlot.y + Math.sin(time * 0.9 + p.lineOrder) * 0.03 * lg,
        }
        pos = mixVec(pos, slot, lg)
        runeMix = lg // filler 的 rune slot = 叙事句字形
        brightness = lerp(brightness, 1.25, lg)
        size = lerp(size, 0.3, lg)
        rot = lerp(rot, 0, lg)
        stretch = lerp(stretch, 1, lg)
      }
    } else if (ch.lineGather > 0) {
      // 其余字退场让焦
      brightness = lerp(brightness, brightness * 0.35, ch.lineGather)
    }
  }

  /* ---------- 第四章：金光暴涨，字粒子散尽（75–82%） ---------- */
  const bu = stag(ch.burst, p.stagger, 0.35)
  if (bu > 0) {
    const d = 9 + p.stagger * 6
    const burstPos: Vec3 = {
      x: p.burstDir.x * d,
      y: p.burstDir.y * d * 0.7,
      z: p.burstDir.z * d,
    }
    pos = mixVec(pos, burstPos, bu * bu)
    brightness = lerp(brightness, 0, clamp01(bu * 1.6 - 0.3))
    stretch = 1 + bu * 3
  }

  out.x = pos.x
  out.y = pos.y
  out.z = pos.z
  out.size = size * p.size
  out.rot = rot
  out.brightness = clamp01(brightness) * unveilFade(ch)
  out.runeMix = clamp01(runeMix)
  out.stretch = stretch
}

/** 尾声后字粒子不再回场（金尘由星空系统接管） */
function unveilFade(ch: JourneyChannels): number {
  return 1 - ch.unveil
}
