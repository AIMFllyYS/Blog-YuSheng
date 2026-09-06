import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  type ColorRepresentation,
  type Group,
  type LineBasicMaterial,
} from 'three'
import { rangeProgress, seededUnit, smootherStep } from '../motion/math'
import type { JourneyProgressRef } from '../types'

type WordVortexProps = {
  color: ColorRepresentation
  progressRef: JourneyProgressRef
}

function createInkWake() {
  const positions = new Float32Array(112 * 6)

  for (let index = 0; index < 112; index += 1) {
    const radius = 0.8 + seededUnit(0x17a11, index, 'radius') * 1.7
    const angle = index * 0.63
    const length = 0.009 + seededUnit(0x17a11, index, 'length') * 0.036
    const depth = (seededUnit(0x17a11, index, 'depth') - 0.5) * 0.6

    for (let endpoint = 0; endpoint < 2; endpoint += 1) {
      const offset = index * 6 + endpoint * 3
      const nextAngle = angle + endpoint * length
      positions[offset] = Math.cos(nextAngle) * radius
      positions[offset + 1] = Math.sin(nextAngle) * radius * 0.44
      positions[offset + 2] = depth
    }
  }

  return positions
}

/**
 * The readable fracture now belongs to exact source-glyph DOM windows.
 * This one-draw-call ink wake only appears after the shards have dispersed;
 * it must never replace the title with unrelated 3D boxes or fake strokes.
 */
export function WordVortex({ color, progressRef }: WordVortexProps) {
  const groupRef = useRef<Group>(null)
  const materialRef = useRef<LineBasicMaterial>(null)
  const positions = useMemo(() => createInkWake(), [])

  useFrame(() => {
    const group = groupRef.current
    const material = materialRef.current
    if (!group || !material) return

    const progress = progressRef.current.progress
    const reveal = smootherStep(rangeProgress(progress, 0.2, 0.23))
    const collapse = smootherStep(rangeProgress(progress, 0.25, 0.32))
    const opacity = reveal * (1 - collapse)
    group.visible = opacity > 0.002
    material.opacity = opacity * 0.3
    group.rotation.z = rangeProgress(progress, 0.2, 0.32) * 1.6
    group.scale.setScalar(Math.max(0.001, 1 - collapse))
  })

  return (
    <group ref={groupRef} visible={false} position={[0, 0.38, 0]}>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          ref={materialRef}
          blending={AdditiveBlending}
          color={color}
          opacity={0}
          transparent
          depthWrite={false}
        />
      </lineSegments>
    </group>
  )
}
