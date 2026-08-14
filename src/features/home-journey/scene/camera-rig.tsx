'use client'

/**
 * 相机导轨：整段叙事的镜头语言，全部由频道驱动（确定性，无自身状态）。
 * 章节姿态链：基位 →（散）推近 →（聚）绕至斜俯视 →（启）下沉贴书 →（门）退后迎光
 * → 逼近光门 → 穿门（fov 冲击）→ 尾声归位。
 */
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { WORLD } from '../constants'
import type { JourneyChannels } from '../types'
import { BOOK } from '../engine/choreography'

interface Pose {
  pos: [number, number, number]
  look: [number, number, number]
  fov: number
}

const BASE: Pose = { pos: [0, 0.3, WORLD.cameraZ], look: [0, 0.1, 0], fov: WORLD.cameraFov }

const smooth = (t: number): number => t * t * (3 - 2 * t)
const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v)

export function CameraRig({ channelsRef }: { channelsRef: { current: JourneyChannels } }) {
  const lookTarget = useRef(new THREE.Vector3(...BASE.look))

  useFrame(({ camera }) => {
    const ch = channelsRef.current
    const cam = camera as THREE.PerspectiveCamera

    const pose: Pose = { pos: [...BASE.pos], look: [...BASE.look], fov: BASE.fov }
    const apply = (channel: number, to: Partial<Pose>, ease: (t: number) => number = smooth) => {
      const t = ease(clamp01(channel))
      if (t <= 0) return
      if (to.pos) pose.pos = pose.pos.map((v, i) => v + ((to.pos as number[])[i] - v) * t) as Pose['pos']
      if (to.look)
        pose.look = pose.look.map((v, i) => v + ((to.look as number[])[i] - v) * t) as Pose['look']
      if (to.fov !== undefined) pose.fov += (to.fov - pose.fov) * t
    }

    // 第一章 20–25%：镜头微推近旋涡
    apply(ch.swirl, { pos: [0, 0.15, 7.1] })
    // 第二章 48–50%：绕至斜俯视看书
    apply(ch.orbit, {
      pos: [3.4, 2.7, 5.2],
      look: [BOOK.cx, BOOK.cy, BOOK.cz],
    })
    // 第三章 50–56%：下沉贴近书；翻页期间缓慢漂移保持活感
    apply(ch.openCover, { pos: [0.55, 0.95, 3.6], look: [0.2, 0.05, 0.2] })
    apply(ch.flipPages * 0.5, { pos: [0.3, 0.75, 3.3] })
    // 第四章 75–82%：退后迎光暴涨
    apply(ch.burst, { pos: [0, 0.4, 6.0], look: [0, 0.2, 0], fov: 56 })
    // 82–88%：逼近光门
    apply(ch.gateForm, { pos: [0, 0.3, 1.8], look: [0, 0.35, WORLD.gateZ], fov: 55 })
    // 88–95%：穿门（fov 冲击后回收）
    const pt = clamp01(ch.passThrough)
    if (pt > 0) {
      const t = smooth(pt)
      apply(t, { pos: [0, 0.35, -8.5], look: [0, 0.35, -12] }, (v) => v)
      pose.fov += Math.sin(t * Math.PI) * 13
    }
    // 95–100%：尾声归位（星空成为主页背景）
    apply(ch.unveil, { ...BASE })

    cam.position.set(...pose.pos)
    lookTarget.current.set(...pose.look)
    cam.lookAt(lookTarget.current)
    if (Math.abs(cam.fov - pose.fov) > 0.01) {
      cam.fov = pose.fov
      cam.updateProjectionMatrix()
    }
  })

  return null
}
