import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  Color,
  type ColorRepresentation,
  type InstancedMesh,
  type MeshStandardMaterial,
  Object3D,
} from 'three'
import { rangeProgress, smootherStep } from '../motion/math'
import type { JourneyProgressRef } from '../types'
import { createGlyphStrokes } from './seeded-geometry'

type WordVortexProps = {
  color: ColorRepresentation
  progressRef: JourneyProgressRef
}

export function WordVortex({ color, progressRef }: WordVortexProps) {
  const meshRef = useRef<InstancedMesh>(null)
  const materialRef = useRef<MeshStandardMaterial>(null)
  const strokes = useMemo(() => createGlyphStrokes(72, 0x17a11), [])
  const transform = useMemo(() => new Object3D(), [])

  useFrame(({ clock }) => {
    const mesh = meshRef.current
    const material = materialRef.current

    if (!mesh || !material) return

    const snapshot = progressRef.current
    const progress = snapshot?.progress ?? 0
    const ambientTime = snapshot?.qaFreeze ? 0 : clock.elapsedTime
    const scatter = smootherStep(rangeProgress(progress, 0.075, 0.2))
    const vortex = smootherStep(rangeProgress(progress, 0.18, 0.25))
    const collapse = smootherStep(rangeProgress(progress, 0.25, 0.32))
    const reveal = smootherStep(rangeProgress(progress, 0.065, 0.135))
    const dissolve = 1 - smootherStep(rangeProgress(progress, 0.315, 0.385))
    const opacity = reveal * dissolve

    mesh.visible = opacity > 0.002
    material.opacity = opacity * 0.94
    material.emissiveIntensity = 0.82 + collapse * 1.85

    if (!mesh.visible) return

    strokes.forEach((stroke, index) => {
      const liveAngle =
        stroke.angle + collapse * 4.2 + progress * 0.18 + ambientTime * 0.018
      const tightenedRadius = stroke.radius * (1 - collapse * 0.93)
      const vortexX = Math.cos(liveAngle) * tightenedRadius
      const vortexY = Math.sin(liveAngle) * tightenedRadius * 0.57
      const vortexZ = stroke.depth * (1 - collapse * 0.72)
      const scatteredX = stroke.scatterX * scatter
      const scatteredY = stroke.scatterY * scatter
      const scatteredZ = stroke.scatterZ * scatter
      const centerX = scatteredX + (vortexX - scatteredX) * vortex
      const centerY = scatteredY + (vortexY - scatteredY) * vortex
      const centerZ = scatteredZ + (vortexZ - scatteredZ) * vortex
      const tangent = liveAngle + Math.PI / 2
      const localX =
        (Math.cos(tangent) * stroke.strokeOffsetX -
          Math.sin(tangent) * stroke.strokeOffsetY) *
        (1 - collapse)
      const localY =
        (Math.sin(tangent) * stroke.strokeOffsetX +
          Math.cos(tangent) * stroke.strokeOffsetY) *
        (1 - collapse)
      const particleScale = 0.68 + vortex * 0.32 - collapse * 0.48

      transform.position.set(centerX + localX, centerY + localY, centerZ)
      transform.rotation.set(
        (stroke.depth / 2.8) * 0.22,
        (stroke.scatterZ / 5.5) * 0.3,
        tangent + stroke.strokeAngle,
      )
      transform.scale.set(
        0.05 * particleScale,
        stroke.strokeLength * particleScale,
        0.036 * particleScale,
      )
      transform.updateMatrix()
      mesh.setMatrixAt(index, transform.matrix)
    })

    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, strokes.length]}
      frustumCulled={false}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        ref={materialRef}
        color={new Color(color)}
        emissive={new Color(color)}
        emissiveIntensity={1}
        metalness={0.18}
        opacity={0}
        roughness={0.34}
        transparent
        depthWrite={false}
      />
    </instancedMesh>
  )
}
