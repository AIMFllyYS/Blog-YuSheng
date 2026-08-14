'use client'

/* eslint-disable react-hooks/immutability --
   R3F 场景文件：three.js 材质/几何体在 useFrame 渲染循环中按帧变异，
   属于命令式外部系统，不参与 React 渲染数据流。 */

/**
 * 线装古籍（storyboard 书的形象：宣纸质感、线装针脚）。
 * - 第二章：粒子凝出封面（玄青布面 + 边框）、书脊四眼线装逐针「缝」出（drawRange 描线感）、题签落定
 * - 第三章：封面绕右脊掀开（线装书装帧方向），书页逐页翻动（顶点卷曲 shader），页心漏金光
 * - 第四章：书在金光暴涨中化作光（整体淡出）
 * 页内文字为画布纹理（竖排从右往左）；活字浮起由 glyph-swarm 承担。
 */
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { GLYPH_POOL, JOURNEY_COPY, JOURNEY_FONT_STACK, JOURNEY_PALETTE, JOURNEY_SEED } from '../constants'
import { BOOK } from '../engine/choreography'
import { seededRange, seededUnit } from '../engine/seeded-random'
import type { JourneyChannels } from '../types'

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v)
const smooth = (t: number): number => t * t * (3 - 2 * t)

const FLIP_PAGE_COUNT = 8

/* ---------------- 画布纹理 ---------------- */

/** 玄青布面封面 + 古籍边框线 */
function makeCoverTexture(): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 704
  const ctx = c.getContext('2d')
  if (ctx) {
    ctx.fillStyle = JOURNEY_PALETTE.cover
    ctx.fillRect(0, 0, 512, 704)
    // 布纹：细密经纬噪点
    for (let i = 0; i < 5200; i += 1) {
      const x = seededRange(JOURNEY_SEED, i, 201, 0, 512)
      const y = seededRange(JOURNEY_SEED, i, 202, 0, 704)
      const light = seededUnit(JOURNEY_SEED, i, 203) > 0.5
      ctx.fillStyle = light ? 'rgba(255,255,255,0.028)' : 'rgba(0,0,0,0.05)'
      ctx.fillRect(x, y, 1.4, 1.4)
    }
    // 双线边框（古籍封面版式）
    ctx.strokeStyle = 'rgba(216,173,87,0.4)'
    ctx.lineWidth = 3
    ctx.strokeRect(26, 26, 460, 652)
    ctx.lineWidth = 1.2
    ctx.strokeRect(38, 38, 436, 628)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/** 宣纸书页 + 竖排文字（从右往左列）+ 纤维做旧 */
function makePageTexture(): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 768
  const ctx = c.getContext('2d')
  if (ctx) {
    ctx.fillStyle = JOURNEY_PALETTE.paper
    ctx.fillRect(0, 0, 512, 768)
    // 纤维丝
    for (let i = 0; i < 260; i += 1) {
      const x = seededRange(JOURNEY_SEED, i, 211, 0, 512)
      const y = seededRange(JOURNEY_SEED, i, 212, 0, 768)
      const len = seededRange(JOURNEY_SEED, i, 213, 6, 30)
      const ang = seededRange(JOURNEY_SEED, i, 214, 0, Math.PI)
      ctx.strokeStyle = `rgba(120,100,60,${seededRange(JOURNEY_SEED, i, 215, 0.02, 0.05)})`
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len)
      ctx.stroke()
    }
    // 做旧边缘
    const vg = ctx.createRadialGradient(256, 384, 200, 256, 384, 520)
    vg.addColorStop(0, 'rgba(0,0,0,0)')
    vg.addColorStop(1, 'rgba(122,84,16,0.13)')
    ctx.fillStyle = vg
    ctx.fillRect(0, 0, 512, 768)
    // 竖排文字：6 列从右往左（疏朗版式，避免与活字云抢焦）
    ctx.fillStyle = 'rgba(44,38,32,0.42)'
    ctx.font = `500 24px ${JOURNEY_FONT_STACK}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    for (let col = 0; col < 6; col += 1) {
      const x = 462 - col * 72
      for (let row = 0; row < 11; row += 1) {
        const char = GLYPH_POOL[Math.floor(seededUnit(JOURNEY_SEED, col * 31 + row, 216) * GLYPH_POOL.length)]
        ctx.fillText(char, x, 64 + row * 60)
      }
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/** 题签（封面左侧竖排书名，storyboard 占位「羽升集」） */
function makeLabelTexture(): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 384
  const ctx = c.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#efe3c8'
    ctx.fillRect(0, 0, 128, 384)
    ctx.strokeStyle = 'rgba(44,38,32,0.6)'
    ctx.lineWidth = 3
    ctx.strokeRect(8, 8, 112, 368)
    ctx.fillStyle = '#2c2620'
    ctx.font = `600 62px ${JOURNEY_FONT_STACK}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    JOURNEY_COPY.bookTitle.split('').forEach((char, i) => {
      ctx.fillText(char, 64, 84 + i * 108)
    })
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/* ---------------- 书页卷曲 shader ---------------- */

const pageVertex = /* glsl */ `
  uniform float uFlip;   // 翻动角（弧度）
  uniform float uCurl;   // 卷曲强度
  uniform float uWidth;
  varying vec2 vUv;
  varying float vShade;
  void main() {
    vUv = uv;
    vec3 pos = position; // x ∈ [-uWidth, 0]，铰链在 x=0
    float t = -pos.x / uWidth; // 0=铰链 → 1=自由边
    float ang = uFlip - uCurl * sin(t * 3.14159) * sin(min(uFlip, 3.14159));
    float c = cos(ang);
    float s = sin(ang);
    vec3 p = vec3(pos.x * c, pos.y, -pos.x * s);
    vShade = 1.0 - 0.5 * sin(t * 3.14159) * abs(sin(uFlip));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`
const pageFragment = /* glsl */ `
  uniform sampler2D uTex;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vShade;
  void main() {
    // 背面水平翻转 UV，修正 DoubleSide 下文字镜像；并压暗作「纸背」
    vec2 uv = gl_FrontFacing ? vUv : vec2(1.0 - vUv.x, vUv.y);
    vec4 tex = texture2D(uTex, uv);
    float shade = vShade * (gl_FrontFacing ? 1.0 : 0.72);
    gl_FragColor = vec4(tex.rgb * shade, tex.a * uOpacity);
    if (gl_FragColor.a < 0.004) discard;
  }
`

/* ---------------- 组件 ---------------- */

interface ThreadBookProps {
  channelsRef: { current: JourneyChannels }
}

export function ThreadBook({ channelsRef }: ThreadBookProps) {
  const groupRef = useRef<THREE.Group>(null)
  const hingeRef = useRef<THREE.Group>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const glowLightRef = useRef<THREE.PointLight>(null)

  const bundle = useMemo(() => {
    const coverTex = makeCoverTexture()
    const pageTex = makePageTexture()
    const labelTex = makeLabelTexture()

    const coverMat = new THREE.MeshStandardMaterial({
      map: coverTex,
      roughness: 0.85,
      metalness: 0.05,
      transparent: true,
      opacity: 0,
    })
    const blockMat = new THREE.MeshStandardMaterial({
      color: JOURNEY_PALETTE.paper,
      roughness: 0.95,
      transparent: true,
      opacity: 0,
    })
    const labelMat = new THREE.MeshBasicMaterial({
      map: labelTex,
      transparent: true,
      opacity: 0,
      toneMapped: false,
    })
    const stitchMat = new THREE.MeshBasicMaterial({
      color: JOURNEY_PALETTE.thread,
      transparent: true,
      opacity: 0,
    })
    const glowMat = new THREE.MeshBasicMaterial({
      color: JOURNEY_PALETTE.goldHot,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    })

    // 书页（逐页翻动，顶点卷曲）
    const pageGeo = new THREE.PlaneGeometry(BOOK.pagesW, BOOK.pagesH, 28, 1)
    pageGeo.translate(-BOOK.pagesW / 2, 0, 0) // 铰链移到 x=0（右脊侧）
    const pageMats: THREE.ShaderMaterial[] = []
    for (let i = 0; i < FLIP_PAGE_COUNT; i += 1) {
      pageMats.push(
        new THREE.ShaderMaterial({
          vertexShader: pageVertex,
          fragmentShader: pageFragment,
          uniforms: {
            uFlip: { value: 0 },
            uCurl: { value: 0.85 },
            uWidth: { value: BOOK.pagesW },
            uTex: { value: pageTex },
            uOpacity: { value: 0 },
          },
          transparent: true,
          side: THREE.DoubleSide,
        }),
      )
    }

    // 四眼线装针脚路径：竖向主线贴封面右缘，孔位间绕脊，上下边缘回绕
    const hx = BOOK.cx + BOOK.width / 2 - 0.16 // 孔位列（贴脊）
    const ex = BOOK.cx + BOOK.width / 2 + 0.02 // 绕脊点（恰好包住书脊棱）
    const fz = BOOK.coverThick + BOOK.pageBlockThick / 2 + 0.005
    const hy = BOOK.height / 2
    const stitchPts = [
      new THREE.Vector3(hx, hy + 0.02, fz * 0.6),
      new THREE.Vector3(hx, hy * 0.72, fz),
      new THREE.Vector3(ex, hy * 0.55, 0.02),
      new THREE.Vector3(hx, hy * 0.38, fz),
      new THREE.Vector3(hx, hy * 0.1, fz),
      new THREE.Vector3(ex, -hy * 0.02, 0.02),
      new THREE.Vector3(hx, -hy * 0.24, fz),
      new THREE.Vector3(hx, -hy * 0.5, fz),
      new THREE.Vector3(ex, -hy * 0.68, 0.02),
      new THREE.Vector3(hx, -hy * 0.86, fz),
      new THREE.Vector3(hx, -hy - 0.02, fz * 0.6),
    ]
    const stitchCurve = new THREE.CatmullRomCurve3(stitchPts)
    const stitchGeo = new THREE.TubeGeometry(stitchCurve, 220, 0.011, 6, false)
    const stitchIndexCount = stitchGeo.index ? stitchGeo.index.count : 0
    stitchGeo.setDrawRange(0, 0)

    return { coverMat, blockMat, labelMat, stitchMat, glowMat, pageMats, pageGeo, stitchGeo, stitchIndexCount }
  }, [])

  useFrame(() => {
    const ch = channelsRef.current
    const group = groupRef.current
    if (!group) return

    /* 凝集成形（32–42%）：透明 → 实体，轻微放大定稳 */
    const form = smooth(clamp01(ch.bookForm * 1.35))
    /* 金光暴涨（75–82%）：书化作光散尽 */
    const burstFade = smooth(clamp01((ch.burst - 0.35) / 0.55))
    const vis = form * (1 - burstFade)
    group.visible = vis > 0.002
    if (!group.visible) return

    group.scale.setScalar(0.9 + 0.1 * form)
    bundle.coverMat.opacity = vis
    bundle.blockMat.opacity = vis * clamp01(ch.bookForm * 1.8)
    bundle.stitchMat.opacity = vis

    /* 针脚逐针缝出（描线感） */
    const count = Math.floor(bundle.stitchIndexCount * clamp01(ch.stitch))
    bundle.stitchGeo.setDrawRange(0, count)

    /* 题签落定（42–48%） */
    bundle.labelMat.opacity = clamp01(ch.coverTitle) * vis

    /* 封面掀开（绕右脊，线装书装帧方向） */
    if (hingeRef.current) {
      hingeRef.current.rotation.y = clamp01(ch.openCover) * Math.PI * 0.985
    }

    /* 书页逐页加速翻动 */
    const pageVis = clamp01(ch.openCover * 3) * vis
    bundle.pageMats.forEach((mat, i) => {
      const local = clamp01(ch.flipPages * (FLIP_PAGE_COUNT + 1.2) - i * 0.9)
      mat.uniforms.uFlip.value = local * Math.PI * 0.97
      mat.uniforms.uOpacity.value = pageVis
    })

    /* 页心漏金光（69–75% 起，随 burst 汇入全屏金光）。
       叙事句阅读期（lineGather 满、burst 未起）光带收敛 55%，让凝聚成行的字清晰可读 */
    const glow = clamp01(ch.spineGlow) * (1 - burstFade * 0.4)
    const readDamp = 1 - clamp01(ch.lineGather) * 0.55 * (1 - clamp01(ch.burst * 2))
    bundle.glowMat.opacity = glow * (0.25 + 0.75 * clamp01(ch.burst * 2)) * readDamp
    if (glowRef.current) {
      const widen = 0.12 + glow * 0.5 + ch.burst * 1.6
      glowRef.current.scale.set(widen, 1 + glow * 0.15, 1)
    }
    if (glowLightRef.current) {
      glowLightRef.current.intensity = glow * 6 + ch.burst * 24
    }
  })

  const spineX = BOOK.cx + BOOK.width / 2

  return (
    <group ref={groupRef} position={[BOOK.cx, BOOK.cy, BOOK.cz]} visible={false}>
      {/* 下封面 */}
      <mesh position={[0, 0, -(BOOK.pageBlockThick / 2 + BOOK.coverThick / 2)]} material={bundle.coverMat}>
        <boxGeometry args={[BOOK.width, BOOK.height, BOOK.coverThick]} />
      </mesh>
      {/* 书页块 */}
      <mesh material={bundle.blockMat}>
        <boxGeometry args={[BOOK.pagesW, BOOK.pagesH, BOOK.pageBlockThick]} />
      </mesh>
      {/* 上封面（铰链在右脊，掀开方向遵线装书装帧） */}
      <group ref={hingeRef} position={[BOOK.width / 2, 0, BOOK.pageBlockThick / 2 + BOOK.coverThick / 2]}>
        <mesh position={[-BOOK.width / 2, 0, 0]} material={bundle.coverMat}>
          <boxGeometry args={[BOOK.width, BOOK.height, BOOK.coverThick]} />
        </mesh>
        {/* 题签（cover 左上部，随封面一起掀开） */}
        <mesh position={[-BOOK.width / 2 - 0.62, 0.78, BOOK.coverThick / 2 + 0.002]} material={bundle.labelMat}>
          <planeGeometry args={[0.5, 1.42]} />
        </mesh>
      </group>
      {/* 可翻书页（铰链在右脊） */}
      {bundle.pageMats.map((mat, i) => (
        <group
          key={i}
          position={[BOOK.pagesW / 2, 0, BOOK.pageBlockThick / 2 - 0.012 - i * 0.011]}
        >
          <mesh geometry={bundle.pageGeo} material={mat} />
        </group>
      ))}
      {/* 线装针脚 */}
      <mesh geometry={bundle.stitchGeo} material={bundle.stitchMat} position={[0, 0, 0]} />
      {/* 页心金光 */}
      <mesh ref={glowRef} position={[spineX - 0.35, 0, 0.16]} material={bundle.glowMat}>
        <planeGeometry args={[1, BOOK.pagesH]} />
      </mesh>
      <pointLight
        ref={glowLightRef}
        position={[spineX - 0.3, 0, 0.9]}
        color={JOURNEY_PALETTE.goldHot}
        intensity={0}
        distance={14}
        decay={2}
      />
    </group>
  )
}
