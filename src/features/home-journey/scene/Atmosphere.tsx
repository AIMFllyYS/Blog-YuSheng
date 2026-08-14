import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  Color,
  type ColorRepresentation,
  type Group,
  type ShaderMaterial,
} from 'three'
import type { JourneyProgressRef } from '../types'
import { createDustCloud, createStarCloud, type PointCloudData } from './seeded-geometry'
import { POINT_FRAGMENT_SHADER, POINT_VERTEX_SHADER } from './shaders'

type PointLayerProps = {
  color: ColorRepresentation
  data: PointCloudData
  opacity: number
  scale: number
}

function PointLayer({ color, data, opacity, scale }: PointLayerProps) {
  const materialRef = useRef<ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({
      uColor: { value: new Color(color) },
      uOpacity: { value: opacity },
      uPixelRatio: { value: 1 },
      uScale: { value: scale },
    }),
    [color, opacity, scale],
  )

  useFrame(({ gl }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uPixelRatio.value = gl.getPixelRatio()
    }
  })

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[data.sizes, 1]} />
        <bufferAttribute attach="attributes-aAlpha" args={[data.alphas, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={POINT_VERTEX_SHADER}
        fragmentShader={POINT_FRAGMENT_SHADER}
        uniforms={uniforms}
        blending={AdditiveBlending}
        depthTest
        depthWrite={false}
        transparent
      />
    </points>
  )
}

type AtmosphereProps = {
  gold: ColorRepresentation
  goldSoft: ColorRepresentation
  progressRef: JourneyProgressRef
}

export function Atmosphere({ gold, goldSoft, progressRef }: AtmosphereProps) {
  const starGroupRef = useRef<Group>(null)
  const dustGroupRef = useRef<Group>(null)
  const stars = useMemo(() => createStarCloud(920, 0x5a17c9), [])
  const dust = useMemo(() => createDustCloud(260, 0xb00c51), [])

  useFrame(({ clock }) => {
    const snapshot = progressRef.current
    const progress = snapshot?.progress ?? 0
    const ambientTime = snapshot?.qaFreeze ? 0 : clock.elapsedTime

    if (starGroupRef.current) {
      starGroupRef.current.rotation.z = ambientTime * 0.0007
      starGroupRef.current.rotation.y = progress * 0.012
    }

    if (dustGroupRef.current) {
      dustGroupRef.current.rotation.z = ambientTime * 0.006 + progress * 0.04
      dustGroupRef.current.position.y = Math.sin(ambientTime * 0.09) * 0.035
    }
  })

  return (
    <group>
      <group ref={starGroupRef}>
        <PointLayer color={goldSoft} data={stars} opacity={0.58} scale={1} />
      </group>
      <group ref={dustGroupRef}>
        <PointLayer color={gold} data={dust} opacity={0.52} scale={0.82} />
      </group>
    </group>
  )
}
