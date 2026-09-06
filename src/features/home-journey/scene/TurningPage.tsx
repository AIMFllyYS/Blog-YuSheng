import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  Color,
  DoubleSide,
  PlaneGeometry,
  type Mesh,
  type ShaderMaterial,
  type Texture,
} from 'three'
import { rangeProgress, smootherStep } from '../motion/math'
import type { JourneyProgressRef } from '../types'
import type { JourneyPalette } from './palette'
import {
  BOOK_PAGE_FRAGMENT_SHADER,
  BOOK_PAGE_VERTEX_SHADER,
} from './book-shaders'

type TurningPageProps = {
  index: number
  palette: JourneyPalette
  pageTexture: Texture
  onInspect?: () => void
  progressRef: JourneyProgressRef
}

export const BOOK_PAGE_COUNT = 8

export function TurningPage({
  index,
  onInspect,
  pageTexture,
  palette,
  progressRef,
}: TurningPageProps) {
  const meshRef = useRef<Mesh>(null)
  const materialRef = useRef<ShaderMaterial>(null)
  const geometry = useMemo(() => {
    const page = new PlaneGeometry(4.42, 3.02, 40, 2)
    page.translate(2.21, 0, 0)
    page.rotateX(-Math.PI / 2)
    return page
  }, [])
  const uniforms = useMemo(
    () => ({
      uOpacity: { value: 1 },
      uPaperEdge: { value: new Color(palette.paperEdge) },
      uTexture: { value: pageTexture },
      uTurn: { value: 0 },
      uWidth: { value: 4.42 },
    }),
    [pageTexture, palette.paperEdge],
  )

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame(() => {
    const mesh = meshRef.current
    const material = materialRef.current

    if (!mesh || !material) return

    const progress = progressRef.current?.progress ?? 0
    const start = 0.555 + index * 0.009
    const turn = smootherStep(rangeProgress(progress, start, start + 0.07))

    mesh.visible = progress >= 0.495 && progress <= 0.86
    // The uppermost right sheet moves first, becoming the bottom left sheet.
    // The shared stack settles onto its board instead of floating above it.
    const rightHeight = 0.254 + (BOOK_PAGE_COUNT - 1 - index) * 0.009
    const leftHeight = 0.008 + index * 0.009
    mesh.position.y = rightHeight + (leftHeight - rightHeight) * turn
    material.uniforms.uTurn.value = turn
  })

  return (
    <mesh
      ref={meshRef}
      frustumCulled={false}
      geometry={geometry}
      onPointerDown={(event) => {
        event.stopPropagation()
        onInspect?.()
      }}
      position={[-2.3, 0.254 + (BOOK_PAGE_COUNT - 1 - index) * 0.009, 0]}
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={BOOK_PAGE_VERTEX_SHADER}
        fragmentShader={BOOK_PAGE_FRAGMENT_SHADER}
        uniforms={uniforms}
        side={DoubleSide}
      />
    </mesh>
  )
}
