/**
 * 主时间线（storyboard「技术备注」：单条 master timeline，四章即四段）。
 * 时间线总时长 100 个单位 = 滚动进度 0–100%，tween 落位与节拍表百分比一一对应。
 * GSAP 只负责缓动与时间编排：tween 的全是频道值（channels）与 DOM overlay。
 * 进度完全由用户滚动驱动，无章节磁吸（snap 机制已按体验反馈移除）。
 */
import gsap from 'gsap'
import { JOURNEY_COPY } from '../constants'
import type { JourneyChannels } from '../types'

export function createInitialChannels(): JourneyChannels {
  return {
    subGlow: 0,
    idleWave: 1,
    subEnchant: 0,
    subScatter: 0,
    titleCrack: 0,
    swirl: 0,
    tighten: 0,
    bookForm: 0,
    stitch: 0,
    coverTitle: 0,
    orbit: 0,
    openCover: 0,
    flipPages: 0,
    levitate: 0,
    rain: 0,
    lineGather: 0,
    spineGlow: 0,
    burst: 0,
    gateForm: 0,
    passThrough: 0,
    unveil: 0,
  }
}

const e = {
  glow: 'power1.inOut',
  enchant: 'power2.inOut',
  scatter: 'power2.in',
  crack: 'power2.inOut',
  swirl: 'power3.inOut',
  gather: 'power2.inOut',
  settle: 'power2.out',
  reveal: 'power2.inOut',
} as const

/**
 * 构建主时间线（paused，由 ScrollTrigger scrub 驱动）。
 * root 内可寻址的 DOM overlay： [data-scroll-hint] [data-skip] [data-motto] [data-epilogue] [data-rope-item] [data-entry]
 */
export function buildMasterTimeline(ch: JourneyChannels, root: HTMLElement): gsap.core.Timeline {
  const q = gsap.utils.selector(root)
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } })

  /* 常驻 UI 初始态 */
  tl.set(q('[data-epilogue]'), { autoAlpha: 0, pointerEvents: 'none' }, 0)
  tl.set(q('[data-motto]'), { autoAlpha: 0 }, 0)
  tl.set(q('[data-rope-item]'), { yPercent: -140, autoAlpha: 0 }, 0)
  tl.set(q('[data-entry]'), { autoAlpha: 0, y: 26 }, 0)

  /* ===== 序幕 · 静场（驻留态，0% 之前） =====
     待机波浪与滚动提示呼吸由组件自身持续动画承担 */

  /* ===== 第一章 · 散（0–25%） ===== */
  // 0–3%：滚动提示淡出；副句八字逐个亮起金边；待机波浪收束
  tl.to(q('[data-scroll-hint]'), { autoAlpha: 0, duration: 2.5, ease: e.glow }, 0.5)
  tl.to(ch, { subGlow: 1, duration: 3, ease: e.glow }, 0)
  tl.to(ch, { idleWave: 0, duration: 3, ease: e.glow }, 0)
  // 3–10%：副句附魔化（闪变符文、脱离行位）→ 四散游走
  tl.to(ch, { subEnchant: 1, duration: 4, ease: e.enchant }, 3)
  tl.to(ch, { subScatter: 1, duration: 5.5, ease: e.scatter }, 4.5)
  // 10–20%：「羽升」裂解为字形碎片，镜头微推近（推近由 swirl 段相机承担）
  tl.to(ch, { titleCrack: 1, duration: 9, ease: e.crack }, 10)
  // 20–25%：全部字粒子卷入旋涡
  tl.to(ch, { swirl: 1, duration: 5, ease: e.swirl }, 20)

  /* ===== 第二章 · 聚（25–50%） ===== */
  // 25–32%：涡流收紧
  tl.to(ch, { tighten: 1, duration: 7, ease: e.gather }, 25)
  // 32–42%：粒子凝出封面，书脊针脚逐针缝出
  tl.to(ch, { bookForm: 1, duration: 10, ease: e.gather }, 32)
  tl.to(ch, { stitch: 1, duration: 7, ease: e.glow }, 34.5)
  // 42–48%：封面题字落定
  tl.to(ch, { coverTitle: 1, duration: 5, ease: e.settle }, 42.5)
  // 48–50%：镜头绕至斜俯视
  tl.to(ch, { orbit: 1, duration: 2, ease: e.reveal }, 48)

  /* ===== 第三章 · 启（50–75%） ===== */
  // 50–56%：镜头下沉贴近，封面掀开
  tl.to(ch, { openCover: 1, duration: 6, ease: e.reveal }, 50)
  // 56–66%：书页加速翻动；活字浮起/游荡/文字雨
  tl.to(ch, { flipPages: 1, duration: 10, ease: 'power1.inOut' }, 56)
  tl.to(ch, { levitate: 1, duration: 8, ease: e.enchant }, 56.5)
  tl.to(ch, { rain: 1, duration: 7, ease: e.glow }, 58.5)
  // 66–72%：叙事文案逐字凝聚成行
  tl.to(ch, { lineGather: 1, duration: 6, ease: e.settle }, 66)
  // 69–75%：页心漏出金光，越翻越亮
  tl.to(ch, { spineGlow: 1, duration: 6, ease: e.glow }, 69)

  /* ===== 第四章 · 门（75–100%） ===== */
  // 75–82%：金光暴涨占满全屏
  tl.to(ch, { burst: 1, duration: 7, ease: 'power2.in' }, 75)
  // 82–88%：光中凝出门形，点题句浮现
  tl.to(ch, { gateForm: 1, duration: 6, ease: e.reveal }, 82)
  tl.to(q('[data-motto]'), { autoAlpha: 1, duration: 2.5, ease: e.settle }, 83.5)
  // 88–95%：门开，镜头穿门（白金闪光）；点题句先行隐去
  tl.to(q('[data-motto]'), { autoAlpha: 0, duration: 2, ease: e.glow }, 89)
  tl.to(ch, { passThrough: 1, duration: 7, ease: 'power2.inOut' }, 88)
  // 95–100%：尾声揭示 —— 绳索垂落（回弹）、板块入口逐个亮起
  tl.to(ch, { unveil: 1, duration: 5, ease: e.glow }, 95)
  tl.to(q('[data-epilogue]'), { autoAlpha: 1, duration: 3, ease: e.glow }, 95)
  tl.set(q('[data-epilogue]'), { pointerEvents: 'auto' }, 97.5)
  tl.to(
    q('[data-rope-item]'),
    { yPercent: 0, autoAlpha: 1, duration: 2.6, ease: 'elastic.out(1, 0.55)', stagger: 0.28 },
    95.2,
  )
  tl.to(q('[data-entry]'), { autoAlpha: 1, y: 0, duration: 2, ease: e.settle, stagger: 0.35 }, 96.2)
  // 跳过按钮在尾声完成使命
  tl.to(q('[data-skip]'), { autoAlpha: 0, duration: 1.5, ease: e.glow }, 97)

  /* 终点定帧保险：进度 1 时所有频道必为终态 */
  tl.set(ch, { ...createInitialChannels(), idleWave: 0, subGlow: 1, subEnchant: 1, subScatter: 1, titleCrack: 1, swirl: 1, tighten: 1, bookForm: 1, stitch: 1, coverTitle: 1, orbit: 1, openCover: 1, flipPages: 1, levitate: 1, rain: 1, lineGather: 1, spineGlow: 1, burst: 1, gateForm: 1, passThrough: 1, unveil: 1 }, 100)

  return tl
}

export { JOURNEY_COPY }
