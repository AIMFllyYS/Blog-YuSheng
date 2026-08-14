'use client'

/* eslint-disable react-hooks/immutability --
   R3F 场景文件：three.js 材质/几何体在 useFrame 渲染循环中按帧变异，
   属于命令式外部系统（等价于直接操作 WebGL 状态），不参与 React 渲染数据流。 */

/**
 * 深夜星空氛围层：星星（闪烁）、星云（慢漂）、金尘（近景漂浮）。
 * 全程在场（序幕已在场、尾声仍是基调）；金光暴涨时整体压暗，尾声恢复。
 * 所有随机来自 (seed, id, channel)，无 Math.random。
 */
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { JOURNEY_PALETTE, JOURNEY_SEED, PARTICLE_COUNTS } from '../constants'
import { seededRange, seededUnit } from '../engine/seeded-random'
import type { JourneyChannels } from '../types'

interface ChannelProps {
  channelsRef: { current: JourneyChannels }
}

/* ---------------- 星星 ---------------- */

const starVertex = /* glsl */ `
  attribute vec3 aSeed; // x: 相位, y: 尺寸系数, z: 金色标记
  uniform float uTime;
  uniform float uDim;
  varying float vAlpha;
  varying float vGold;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float twinkle = 0.55 + 0.45 * sin(uTime * (0.6 + aSeed.y) + aSeed.x * 6.2831);
    vAlpha = twinkle * uDim;
    vGold = aSeed.z;
    gl_PointSize = aSeed.y * 46.0 / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`
const starFragment = /* glsl */ `
  varying float vAlpha;
  varying float vGold;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r = length(d);
    float a = smoothstep(0.5, 0.05, r) * vAlpha;
    if (a < 0.004) discard;
    vec3 paper = vec3(0.95, 0.94, 0.905);
    vec3 gold = vec3(1.0, 0.85, 0.54);
    gl_FragColor = vec4(mix(paper, gold, vGold), a);
  }
`

function Stars({ channelsRef }: ChannelProps) {
  const { geometry, material } = useMemo(() => {
    const n = PARTICLE_COUNTS.stars
    const positions = new Float32Array(n * 3)
    const seeds = new Float32Array(n * 3)
    for (let i = 0; i < n; i += 1) {
      // 球壳分布，z 偏向远处（相机后方也放一些，穿门时仍有星）
      const theta = seededRange(JOURNEY_SEED, i, 1, 0, Math.PI * 2)
      const r = seededRange(JOURNEY_SEED, i, 2, 16, 42)
      const y = seededRange(JOURNEY_SEED, i, 3, -0.75, 0.75) * r * 0.55
      positions[i * 3] = Math.cos(theta) * r
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = seededRange(JOURNEY_SEED, i, 4, -34, 6) - 8
      seeds[i * 3] = seededUnit(JOURNEY_SEED, i, 5)
      seeds[i * 3 + 1] = seededRange(JOURNEY_SEED, i, 6, 0.5, 2.2)
      seeds[i * 3 + 2] = seededUnit(JOURNEY_SEED, i, 7) < 0.16 ? 1 : 0
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3))
    const material = new THREE.ShaderMaterial({
      vertexShader: starVertex,
      fragmentShader: starFragment,
      uniforms: { uTime: { value: 0 }, uDim: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    return { geometry, material }
  }, [])

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime
    const ch = channelsRef.current
    material.uniforms.uDim.value = 1 - ch.burst * 0.75 + ch.unveil * 0.75 * ch.burst
  })

  return <points geometry={geometry} material={material} frustumCulled={false} />
}

/* ---------------- 星云 ---------------- */

function makeNebulaTexture(tintA: string, tintB: string): THREE.Texture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    grad.addColorStop(0, tintA)
    grad.addColorStop(0.45, tintB)
    grad.addColorStop(1, 'rgba(5,7,15,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function Nebulae() {
  const groupRef = useRef<THREE.Group>(null)
  const sprites = useMemo(() => {
    const configs = [
      { pos: [-16, 6, -30], scale: 34, a: 'rgba(88,72,160,0.20)', b: 'rgba(38,28,84,0.10)' },
      { pos: [14, -4, -26], scale: 26, a: 'rgba(216,173,87,0.10)', b: 'rgba(84,58,20,0.06)' },
      { pos: [2, 10, -36], scale: 44, a: 'rgba(52,64,140,0.16)', b: 'rgba(24,20,48,0.10)' },
    ]
    return configs.map((c) => ({ ...c, tex: makeNebulaTexture(c.a, c.b) }))
  }, [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    groupRef.current?.children.forEach((child, i) => {
      child.position.x = sprites[i].pos[0] + Math.sin(t * 0.03 + i * 2.1) * 1.6
      child.position.y = sprites[i].pos[1] + Math.cos(t * 0.024 + i * 1.7) * 1.1
    })
  })

  return (
    <group ref={groupRef}>
      {sprites.map((s, i) => (
        <sprite key={i} position={s.pos as [number, number, number]} scale={s.scale}>
          <spriteMaterial map={s.tex} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      ))}
    </group>
  )
}

/* ---------------- 金尘 ---------------- */

const dustVertex = /* glsl */ `
  attribute vec3 aSeed;
  uniform float uTime;
  uniform float uDim;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p.y = mod(p.y + uTime * (0.05 + aSeed.y * 0.06) + aSeed.x * 8.0, 9.0) - 4.5;
    p.x += sin(uTime * 0.4 + aSeed.x * 6.2831) * 0.35;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float twinkle = 0.5 + 0.5 * sin(uTime * (1.2 + aSeed.z * 2.0) + aSeed.x * 6.2831);
    vAlpha = twinkle * uDim;
    gl_PointSize = aSeed.y * 30.0 / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`
const dustFragment = /* glsl */ `
  varying float vAlpha;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float a = smoothstep(0.5, 0.08, length(d)) * vAlpha;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vec3(1.0, 0.83, 0.5), a * 0.8);
  }
`

function GoldDust({ channelsRef }: ChannelProps) {
  const { geometry, material } = useMemo(() => {
    const n = PARTICLE_COUNTS.goldDust
    const positions = new Float32Array(n * 3)
    const seeds = new Float32Array(n * 3)
    for (let i = 0; i < n; i += 1) {
      positions[i * 3] = seededRange(JOURNEY_SEED, i, 11, -8, 8)
      positions[i * 3 + 1] = seededRange(JOURNEY_SEED, i, 12, -4.5, 4.5)
      positions[i * 3 + 2] = seededRange(JOURNEY_SEED, i, 13, -4, 6)
      seeds[i * 3] = seededUnit(JOURNEY_SEED, i, 14)
      seeds[i * 3 + 1] = seededRange(JOURNEY_SEED, i, 15, 0.35, 1.15)
      seeds[i * 3 + 2] = seededUnit(JOURNEY_SEED, i, 16)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3))
    const material = new THREE.ShaderMaterial({
      vertexShader: dustVertex,
      fragmentShader: dustFragment,
      uniforms: { uTime: { value: 0 }, uDim: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    return { geometry, material }
  }, [])

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime
    const ch = channelsRef.current
    material.uniforms.uDim.value = 1 - ch.burst * 0.55 + ch.unveil * 0.55 * ch.burst
  })

  return <points geometry={geometry} material={material} frustumCulled={false} />
}

export function Starfield({ channelsRef }: ChannelProps) {
  return (
    <group>
      <Nebulae />
      <Stars channelsRef={channelsRef} />
      <GoldDust channelsRef={channelsRef} />
    </group>
  )
}
