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
import { rangeProgress, smootherStep } from '../motion/math'
import {
  createDustCloud,
  createGalaxyCloud,
  createStarBand,
  createStarCloud,
  type PointCloudData,
} from './seeded-geometry'
import { POINT_FRAGMENT_SHADER, POINT_VERTEX_SHADER } from './shaders'

type PointLayerProps = {
  color: ColorRepresentation
  data: PointCloudData
  opacity: number
  scale: number
  twinkle?: number
  progressRef: JourneyProgressRef
}

function PointLayer({ color, data, opacity, scale, twinkle = 0, progressRef }: PointLayerProps) {
  const materialRef = useRef<ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({
      uColor: { value: new Color(color) },
      uOpacity: { value: opacity },
      uPixelRatio: { value: 1 },
      uScale: { value: scale },
      uTime: { value: 0 },
      uTwinkle: { value: twinkle },
    }),
    [color, opacity, scale, twinkle],
  )

  useFrame(({ clock, gl }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uPixelRatio.value = gl.getPixelRatio()
      materialRef.current.uniforms.uTime.value = progressRef.current.qaFreeze
        ? 0
        : clock.elapsedTime
      const progress = progressRef.current.progress
      const burst = smootherStep(rangeProgress(progress, 0.75, 0.86)) *
        (1 - smootherStep(rangeProgress(progress, 0.88, 0.96)))
      materialRef.current.uniforms.uOpacity.value = opacity * (1 - burst * 0.52)
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
  starCool: ColorRepresentation
  progressRef: JourneyProgressRef
}

export function Atmosphere({ gold, goldSoft, starCool, progressRef }: AtmosphereProps) {
  const starGroupRef = useRef<Group>(null)
  const dustGroupRef = useRef<Group>(null)
  const galaxyGroupRef = useRef<Group>(null)
  const galaxy = useMemo(() => createGalaxyCloud(1280, 0x5a17c9), [])
  const band = useMemo(() => createStarBand(420, 0x7a31ed), [])
  const stars = useMemo(() => createStarCloud(720, 0x5a17c9), [])
  const dust = useMemo(() => createDustCloud(260, 0xb00c51), [])

  useFrame(({ clock }) => {
    const snapshot = progressRef.current
    const progress = snapshot?.progress ?? 0
    const ambientTime = snapshot?.qaFreeze ? 0 : clock.elapsedTime

    if (starGroupRef.current) {
      starGroupRef.current.rotation.z = ambientTime * 0.001 + progress * 0.018
      starGroupRef.current.rotation.y = progress * 0.012
    }
    if (galaxyGroupRef.current) {
      galaxyGroupRef.current.rotation.z = -ambientTime * 0.0017 - progress * 0.012
      galaxyGroupRef.current.rotation.x = Math.sin(ambientTime * 0.04) * 0.018
    }

    if (dustGroupRef.current) {
      dustGroupRef.current.rotation.z = ambientTime * 0.006 + progress * 0.09
      dustGroupRef.current.position.y =
        Math.sin(ambientTime * 0.09 + progress * Math.PI * 4) * 0.035
    }
  })

  return (
    <group>
      <group ref={galaxyGroupRef}>
        <PointLayer color={goldSoft} data={galaxy} opacity={0.56} scale={2.4} twinkle={0.18} progressRef={progressRef} />
        <PointLayer color={starCool} data={band} opacity={0.68} scale={1.8} twinkle={0.34} progressRef={progressRef} />
      </group>
      <group ref={starGroupRef}>
        <PointLayer color={starCool} data={stars} opacity={0.86} scale={1.9} twinkle={0.7} progressRef={progressRef} />
        <PointLayer color={goldSoft} data={band} opacity={0.32} scale={0.72} twinkle={0.9} progressRef={progressRef} />
      </group>
      <group ref={dustGroupRef}>
        <PointLayer color={gold} data={dust} opacity={0.46} scale={0.86} twinkle={0.42} progressRef={progressRef} />
      </group>
    </group>
  )
}
