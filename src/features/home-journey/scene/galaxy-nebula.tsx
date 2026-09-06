import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, DataTexture, LinearFilter, RGBAFormat, SRGBColorSpace, type ShaderMaterial } from 'three'
import type { JourneyProgressRef } from '../types'
import { rangeProgress, smootherStep } from '../motion/math'
import type { JourneyPalette } from './palette'

const WIDTH = 768
const HEIGHT = 512

function hash(x: number, y: number) {
  let value = Math.imul(x, 374761393) + Math.imul(y, 668265263)
  value = Math.imul(value ^ (value >>> 13), 1274126177)
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296
}

function noise(x: number, y: number) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const u = fx * fx * (3 - 2 * fx)
  const v = fy * fy * (3 - 2 * fy)
  return (hash(ix, iy) * (1 - u) + hash(ix + 1, iy) * u) * (1 - v) +
    (hash(ix, iy + 1) * (1 - u) + hash(ix + 1, iy + 1) * u) * v
}

function fractal(x: number, y: number) {
  return noise(x, y) * 0.5 + noise(x * 2.03 + 17, y * 2.03 - 13) * 0.27 +
    noise(x * 4.09 - 9, y * 4.09 + 23) * 0.14 + noise(x * 8.21, y * 8.21) * 0.09
}

/** Baked once at mount: a low-resolution dust photograph built from seeded
 * density fields. No image download and no full-screen fractal work per frame. */
function bakeNebula(palette: JourneyPalette) {
  const pixels = new Uint8Array(WIDTH * HEIGHT * 4)
  const dark = new Color(palette.void).convertLinearToSRGB()
  const blue = new Color(palette.starCool).convertLinearToSRGB()
  const gold = new Color(palette.goldSoft).convertLinearToSRGB()
  const cloud = new Color(palette.nebula).convertLinearToSRGB()

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const u = x / WIDTH - 0.5
      const v = y / HEIGHT - 0.5
      const along = u * 1.75 + v * 0.55
      const cross = v - u * 0.58
      const warp = fractal(along * 3.2 + 31, cross * 7 + 18)
      const filaments = fractal(along * 6.5 + warp * 2, cross * 17.5 - warp * 3)
      const vein = cross + 0.085 + (warp - 0.5) * 0.24 + Math.sin(along * 5) * 0.023
      const band = Math.exp(-Math.pow(vein / 0.155, 2))
      const halo = Math.exp(-Math.pow(vein / 0.34, 2))
      const darkVein = Math.exp(-Math.pow((vein - 0.005 - (filaments - 0.5) * 0.09) / 0.026, 2))
      const clumps = Math.pow(Math.max(0, filaments - 0.22), 1.45) * 2.2
      const density = band * clumps * (1 - darkVein * 0.84)
      const nucleus = Math.exp(-Math.pow((along - 0.46) / 0.29, 2))
      // A quiet center keeps the title and book readable; the brighter core
      // lives upper-right rather than behind the headline.
      const central = 1 - Math.exp(-(u * u * 28 + v * v * 35)) * 0.45
      const warmth = Math.min(0.82, nucleus * 0.62 + filaments * 0.14)
      const offset = (y * WIDTH + x) * 4
      const channels = ['r', 'g', 'b'] as const
      for (let channel = 0; channel < 3; channel += 1) {
        const key = channels[channel]
        const tint = blue[key] * (1 - warmth) + gold[key] * warmth
        const value = dark[key] + cloud[key] * halo * 0.2 + tint * density * central * (0.38 + nucleus * 0.18)
        pixels[offset + channel] = Math.round(Math.min(1, value) * 255)
      }
      pixels[offset + 3] = 255
    }
  }
  const texture = new DataTexture(pixels, WIDTH, HEIGHT, RGBAFormat)
  texture.colorSpace = SRGBColorSpace
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.needsUpdate = true
  return texture
}

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.99999, 1.0);
  }
`
const FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uProgress;
  uniform float uDim;
  uniform vec2 uPointer;
  varying vec2 vUv;
  void main() {
    vec2 uv = (vUv - 0.5) * 0.88 + 0.5;
    uv += vec2(uProgress * 0.018, uProgress * 0.01) + uPointer * 0.005;
    vec3 color = texture2D(uMap, uv).rgb;
    gl_FragColor = vec4(color * uDim, 1.0);
    #include <colorspace_fragment>
  }
`

export function GalaxyNebula({ palette, progressRef }: { palette: JourneyPalette; progressRef: JourneyProgressRef }) {
  const materialRef = useRef<ShaderMaterial>(null)
  const texture = useMemo(() => bakeNebula(palette), [palette])
  const uniforms = useMemo(() => ({
    uMap: { value: texture },
    uProgress: { value: 0 },
    uDim: { value: 1 },
    uPointer: { value: [0, 0] },
  }), [texture])
  useEffect(() => () => texture.dispose(), [texture])
  useFrame(({ pointer }) => {
    const material = materialRef.current
    if (!material) return
    const { progress, qaFreeze } = progressRef.current
    const burst = smootherStep(rangeProgress(progress, 0.75, 0.84)) * (1 - smootherStep(rangeProgress(progress, 0.9, 0.98)))
    material.uniforms.uProgress.value = progress
    material.uniforms.uDim.value = 1 - burst * 0.52
    const offset = material.uniforms.uPointer.value as number[]
    offset[0] = qaFreeze ? 0 : offset[0] + (pointer.x - offset[0]) * 0.025
    offset[1] = qaFreeze ? 0 : offset[1] + (pointer.y - offset[1]) * 0.025
  })
  return (
    <mesh frustumCulled={false} renderOrder={-100} raycast={() => null}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial ref={materialRef} uniforms={uniforms} vertexShader={VERTEX} fragmentShader={FRAGMENT} depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}
