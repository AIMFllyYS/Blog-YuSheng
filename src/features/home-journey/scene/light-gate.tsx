'use client'

/* eslint-disable react-hooks/immutability --
   R3F 场景文件：three.js 材质 uniform 在 useFrame 渲染循环中按帧变异，
   属于命令式外部系统，不参与 React 渲染数据流。 */

/**
 * 众妙之门（第四章 75–100%）：
 * - 75–82%：书页心金光暴涨，径向光潮占满全屏
 * - 82–88%：光潮收束，凝出拱顶门形（门框金光描边，门内白金世界）
 * - 88–95%：双扇门滑开，镜头穿门，白金闪光过渡
 * - 95–100%：一切散入尾声（门已在镜头身后）
 */
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { JOURNEY_PALETTE, WORLD } from '../constants'
import { BOOK } from '../engine/choreography'
import type { JourneyChannels } from '../types'

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v)
const smooth = (t: number): number => t * t * (3 - 2 * t)

/* 暴涨光潮：径向白金渐变 */
const burstVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const burstFragment = /* glsl */ `
  uniform float uIntensity;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * vec2(1.6, 1.0);
    float d = length(p);
    float core = exp(-d * 5.5);
    float halo = exp(-d * 1.9);
    vec3 white = vec3(1.0, 0.98, 0.93);
    vec3 gold = vec3(1.0, 0.82, 0.48);
    vec3 col = white * core * 1.6 + gold * halo;
    gl_FragColor = vec4(col * uIntensity, 1.0);
  }
`

/* 门形：拱顶门洞 SDF，门框金光描边，门内白金光 */
const gateFragment = /* glsl */ `
  uniform float uForm;
  uniform float uOpen;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    // 门洞参数（uv 空间）：底部 y=0.08，半宽 w，直边到 h-w 后接拱顶
    vec2 p = vec2(vUv.x - 0.5, vUv.y - 0.08);
    float w = 0.29;
    float h = 0.78;
    float dRect = max(max(abs(p.x) - w, -p.y), p.y - (h - w));
    float dArch = length(p - vec2(0.0, h - w)) - w;
    float d = min(dRect, dArch); // 负值在门内
    float inside = 1.0 - smoothstep(0.0, 0.012, d);

    // 门框金光描边
    float rim = exp(-abs(d) * 34.0);
    // 门内白金世界：光从门心下方涌出
    float dd = length((vUv - vec2(0.5, 0.18)) * vec2(1.0, 1.4));
    float innerLight = exp(-dd * 2.6) * (0.35 + 0.75 * uOpen);
    // 细微呼吸，让光永远是活的
    innerLight *= 0.94 + 0.06 * sin(uTime * 1.3);

    vec3 gold = vec3(1.0, 0.82, 0.48);
    vec3 white = vec3(1.0, 0.985, 0.95);
    vec3 col = gold * rim * 1.9 + white * inside * innerLight + gold * inside * 0.12;
    float alpha = clamp(rim * 1.4 + inside * innerLight, 0.0, 1.0) * uForm;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(col * uForm, alpha);
  }
`

interface LightGateProps {
  channelsRef: { current: JourneyChannels }
}

export function LightGate({ channelsRef }: LightGateProps) {
  const burstRef = useRef<THREE.Mesh>(null)
  const gateGroupRef = useRef<THREE.Group>(null)
  const leftDoorRef = useRef<THREE.Mesh>(null)
  const rightDoorRef = useRef<THREE.Mesh>(null)

  const bundle = useMemo(() => {
    const burstMat = new THREE.ShaderMaterial({
      vertexShader: burstVertex,
      fragmentShader: burstFragment,
      uniforms: { uIntensity: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const gateMat = new THREE.ShaderMaterial({
      vertexShader: burstVertex,
      fragmentShader: gateFragment,
      uniforms: { uForm: { value: 0 }, uOpen: { value: 0 }, uTime: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
    const doorMat = new THREE.MeshStandardMaterial({
      color: '#141a2e',
      roughness: 0.7,
      metalness: 0.25,
      transparent: true,
      opacity: 0,
    })
    const flashMat = new THREE.MeshBasicMaterial({
      color: '#fff6e2',
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    return { burstMat, gateMat, doorMat, flashMat }
  }, [])

  useFrame(({ clock }) => {
    const ch = channelsRef.current
    /* 光潮：暴涨后随门形凝出而快速收束（幂次衰减），尾声散尽 */
    const burstVis = smooth(clamp01(ch.burst)) * Math.pow(1 - clamp01(ch.gateForm), 1.6) * (1 - ch.unveil)
    bundle.burstMat.uniforms.uIntensity.value = burstVis * 1.35
    if (burstRef.current) {
      const s = 2.5 + smooth(clamp01(ch.burst)) * 26
      burstRef.current.scale.set(s, s, 1)
      burstRef.current.visible = burstVis > 0.003
    }

    /* 门形凝出 → 开门 → 穿门后散场 */
    const gateVis = clamp01(ch.gateForm) * (1 - smooth(clamp01((ch.passThrough - 0.86) / 0.14)))
    bundle.gateMat.uniforms.uForm.value = gateVis
    bundle.gateMat.uniforms.uOpen.value = smooth(clamp01((ch.passThrough - 0.06) / 0.5))
    bundle.gateMat.uniforms.uTime.value = clock.elapsedTime
    bundle.doorMat.opacity = gateVis * (1 - smooth(clamp01((ch.passThrough - 0.1) / 0.55)))
    if (gateGroupRef.current) {
      gateGroupRef.current.visible = gateVis > 0.003
      const s = 0.72 + 0.28 * smooth(clamp01(ch.gateForm))
      gateGroupRef.current.scale.setScalar(s)
    }
    const doorSlide = smooth(clamp01((ch.passThrough - 0.08) / 0.5)) * 1.05
    if (leftDoorRef.current) leftDoorRef.current.position.x = -0.88 - doorSlide
    if (rightDoorRef.current) rightDoorRef.current.position.x = 0.88 + doorSlide

    /* 白金闪光：穿门中段峰值 */
    const flash = Math.sin(clamp01((ch.passThrough - 0.45) / 0.55) * Math.PI)
    bundle.flashMat.opacity = flash * 0.95
  })

  return (
    <group>
      {/* 书页心喷发的光潮（起点贴着书脊金光） */}
      <mesh ref={burstRef} position={[BOOK.cx + 0.6, BOOK.cy + 0.2, 0.8]} visible={false}>
        <planeGeometry args={[1, 1]} />
        <primitive object={bundle.burstMat} attach="material" />
      </mesh>

      {/* 门形 */}
      <group ref={gateGroupRef} position={[0, 0.4, WORLD.gateZ]} visible={false}>
        <mesh>
          <planeGeometry args={[3.6, 4.8]} />
          <primitive object={bundle.gateMat} attach="material" />
        </mesh>
        <mesh ref={leftDoorRef} position={[-0.88, 0.05, 0.06]} material={bundle.doorMat}>
          <boxGeometry args={[1.72, 4.0, 0.08]} />
        </mesh>
        <mesh ref={rightDoorRef} position={[0.88, 0.05, 0.06]} material={bundle.doorMat}>
          <boxGeometry args={[1.72, 4.0, 0.08]} />
        </mesh>
      </group>

      {/* 穿门白金闪光（世界空间，镜头穿过门洞时达到峰值） */}
      <mesh position={[0, 0.4, WORLD.gateZ - 0.9]}>
        <planeGeometry args={[30, 18]} />
        <primitive object={bundle.flashMat} attach="material" />
      </mesh>
    </group>
  )
}
