'use client'

/**
 * 活字粒子群：Pretext 算家位置 → 图集提供字形 → 本组件按频道逐帧求值并画出来。
 * 单个 InstancedBufferGeometry 一次 draw call 渲染全部字粒子；
 * 墨金渐变、符文闪变（runeMix）、拖尾拉伸（stretch）全在 shader 内完成。
 */
import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { WORLD } from '../constants'
import { buildGlyphParticles, evaluateGlyphParticle, type ParticleFrame } from '../engine/choreography'
import { buildGlyphAtlas } from '../engine/glyph-atlas'
import { layoutJourneyType } from '../engine/pretext-layout'
import type { JourneyChannels } from '../types'

const vertexShader = /* glsl */ `
  attribute vec3 aPos;
  attribute vec4 aMisc;   // size, rot, brightness, runeMix
  attribute vec2 aExtra;  // stretch, aspect
  attribute vec2 aGrad;   // 渐变基线/幅度（碎片取子区间，跨片连续）
  attribute vec4 aUvGlyph;
  attribute vec4 aUvRune;
  varying vec2 vUv;
  varying float vBright;
  varying float vGrad;
  void main() {
    vec2 local = position.xy + 0.5;
    float size = aMisc.x;
    float rot = aMisc.y;
    float stretch = max(aExtra.x, 0.001);
    float aspect = aExtra.y;
    vBright = aMisc.z;
    vGrad = aGrad.x + local.y * aGrad.y;
    vec2 corner = position.xy * size * vec2(aspect * stretch, 1.0 / sqrt(stretch));
    float c = cos(rot);
    float s = sin(rot);
    vec2 rotated = vec2(corner.x * c - corner.y * s, corner.x * s + corner.y * c);
    vec2 uvG = mix(aUvGlyph.xy, aUvGlyph.zw, local);
    vec2 uvR = mix(aUvRune.xy, aUvRune.zw, local);
    vUv = mix(uvG, uvR, clamp(aMisc.w, 0.0, 1.0));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(aPos + vec3(rotated, 0.0), 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform sampler2D uAtlas;
  varying vec2 vUv;
  varying float vBright;
  varying float vGrad;
  void main() {
    vec4 tex = texture2D(uAtlas, vUv);
    if (tex.a * vBright < 0.004) discard;
    // 墨金渐变：字底墨金 → 字顶亮金 → 尖端纸白（vGrad 在整字/切片间连续）
    vec3 ink = vec3(0.55, 0.44, 0.2);
    vec3 gold = vec3(1.0, 0.851, 0.541);
    vec3 paper = vec3(0.98, 0.965, 0.92);
    float g = smoothstep(0.02, 0.98, clamp(vGrad, 0.0, 1.0));
    vec3 col = mix(ink, gold, g);
    col = mix(col, paper, smoothstep(0.8, 1.0, g) * 0.6);
    gl_FragColor = vec4(col * vBright, tex.a * vBright);
  }
`

interface GlyphSwarmProps {
  channelsRef: { current: JourneyChannels }
}

export function GlyphSwarm({ channelsRef }: GlyphSwarmProps) {
  const size = useThree((s) => s.size)

  const bundle = useMemo(() => {
    const atlas = buildGlyphAtlas()
    const layout = layoutJourneyType(size.width)
    const { particles, rects } = buildGlyphParticles(layout, atlas, size.height, WORLD.cameraFov)

    const texture = new THREE.CanvasTexture(atlas.canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.generateMipmaps = true
    texture.anisotropy = 4

    const n = particles.length
    const base = new THREE.PlaneGeometry(1, 1)
    const geometry = new THREE.InstancedBufferGeometry()
    geometry.index = base.index
    geometry.setAttribute('position', base.getAttribute('position'))
    geometry.setAttribute('uv', base.getAttribute('uv'))

    const aPos = new Float32Array(n * 3)
    const aMisc = new Float32Array(n * 4)
    const aExtra = new Float32Array(n * 2)
    const aGrad = new Float32Array(n * 2)
    const aUvGlyph = new Float32Array(n * 4)
    const aUvRune = new Float32Array(n * 4)
    particles.forEach((p, i) => {
      const rect = rects[p.glyphIndex]
      const rune = rects[p.runeIndex]
      aUvGlyph.set([rect.u0, rect.v0, rect.u1, rect.v1], i * 4)
      aUvRune.set([rune.u0, rune.v0, rune.u1, rune.v1], i * 4)
      aGrad.set([p.gradBase, p.gradScale], i * 2)
      aExtra.set([1, p.aspect], i * 2)
    })
    geometry.setAttribute('aPos', new THREE.InstancedBufferAttribute(aPos, 3))
    geometry.setAttribute('aMisc', new THREE.InstancedBufferAttribute(aMisc, 4))
    geometry.setAttribute('aExtra', new THREE.InstancedBufferAttribute(aExtra, 2))
    geometry.setAttribute('aGrad', new THREE.InstancedBufferAttribute(aGrad, 2))
    geometry.setAttribute('aUvGlyph', new THREE.InstancedBufferAttribute(aUvGlyph, 4))
    geometry.setAttribute('aUvRune', new THREE.InstancedBufferAttribute(aUvRune, 4))
    geometry.instanceCount = n

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: { uAtlas: { value: texture } },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    })
    return { geometry, material, particles, texture }
  }, [size.width, size.height])

  useFrame(({ clock }) => {
    const { geometry, particles } = bundle
    const ch = channelsRef.current
    const time = clock.elapsedTime
    const aPos = geometry.getAttribute('aPos') as THREE.InstancedBufferAttribute
    const aMisc = geometry.getAttribute('aMisc') as THREE.InstancedBufferAttribute
    const aExtra = geometry.getAttribute('aExtra') as THREE.InstancedBufferAttribute
    const frame: ParticleFrame = { x: 0, y: 0, z: 0, size: 0, rot: 0, brightness: 0, runeMix: 0, stretch: 1 }
    for (let i = 0; i < particles.length; i += 1) {
      evaluateGlyphParticle(particles[i], ch, time, frame)
      aPos.setXYZ(i, frame.x, frame.y, frame.z)
      aMisc.setXYZW(i, frame.size, frame.rot, frame.brightness, frame.runeMix)
      aExtra.setXY(i, frame.stretch, particles[i].aspect)
    }
    aPos.needsUpdate = true
    aMisc.needsUpdate = true
    aExtra.needsUpdate = true
  })

  return <mesh geometry={bundle.geometry} material={bundle.material} frustumCulled={false} />
}
