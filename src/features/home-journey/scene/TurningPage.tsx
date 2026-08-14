import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  Color,
  DoubleSide,
  PlaneGeometry,
  type Mesh,
  type ShaderMaterial,
} from 'three'
import { easeOutCubic, rangeProgress } from '../motion/math'
import type { JourneyProgressRef } from '../types'
import type { JourneyPalette } from './palette'
import {
  TURNING_PAGE_FRAGMENT_SHADER,
  TURNING_PAGE_VERTEX_SHADER,
} from './shaders'

type TurningPageProps = {
  index: number
  palette: JourneyPalette
  progressRef: JourneyProgressRef
}

export function TurningPage({ index, palette, progressRef }: TurningPageProps) {
  const meshRef = useRef<Mesh>(null)
  const materialRef = useRef<ShaderMaterial>(null)
  const geometry = useMemo(() => {
    const page = new PlaneGeometry(4.42, 3.02, 24, 4)
    page.translate(2.21, 0, 0)
    page.rotateX(-Math.PI / 2)
    return page
  }, [])
  const uniforms = useMemo(
    () => ({
      uInk: { value: new Color(palette.ink) },
      uOpacity: { value: 1 },
      uPaper: { value: new Color(palette.paper) },
      uPaperEdge: { value: new Color(palette.paperEdge) },
      uTurn: { value: 0 },
    }),
    [palette],
  )

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame(() => {
    const mesh = meshRef.current
    const material = materialRef.current

    if (!mesh || !material) return

    const progress = progressRef.current?.progress ?? 0
    const start = 0.555 + index * 0.009
    const turn = easeOutCubic(rangeProgress(progress, start, start + 0.055))

    mesh.visible = progress >= 0.495 && progress <= 0.86
    material.uniforms.uTurn.value = turn
  })

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={[-2.3, 0.278 + index * 0.009, 0]}
      renderOrder={8 + index}
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={TURNING_PAGE_VERTEX_SHADER}
        fragmentShader={TURNING_PAGE_FRAGMENT_SHADER}
        uniforms={uniforms}
        side={DoubleSide}
        transparent
      />
    </mesh>
  )
}
