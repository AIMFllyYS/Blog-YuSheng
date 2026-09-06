import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, RoundedBox } from '@react-three/drei'
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  MeshStandardMaterial,
  type Group,
  type Mesh,
  type PointLight,
  type ShaderMaterial,
} from 'three'
import { rangeProgress, smootherStep } from '../motion/math'
import type { JourneyProgressRef } from '../types'
import type { JourneyPalette } from './palette'
import {
  RADIAL_LIGHT_FRAGMENT_SHADER,
  RADIAL_LIGHT_VERTEX_SHADER,
} from './shaders'

type GateMaterials = {
  door: MeshStandardMaterial
  frame: MeshStandardMaterial
}

function useGateMaterials(palette: JourneyPalette): GateMaterials {
  const materials = useMemo(
    () => ({
      door: new MeshStandardMaterial({
        color: new Color(palette.voidRaised),
        metalness: 0.24,
        roughness: 0.58,
      }),
      frame: new MeshStandardMaterial({
        color: new Color(palette.gold),
        emissive: new Color(palette.gold),
        emissiveIntensity: 0.2,
        metalness: 0.56,
        roughness: 0.42,
      }),
    }),
    [palette],
  )

  useEffect(
    () => () => {
      Object.values(materials).forEach((material) => material.dispose())
    },
    [materials],
  )

  return materials
}

type DoorLeafProps = {
  direction: -1 | 1
  doorMaterial: MeshStandardMaterial
  frameMaterial: MeshStandardMaterial
  pivotRef: RefObject<Group | null>
}

function DoorLeaf({
  direction,
  doorMaterial,
  frameMaterial,
  pivotRef,
}: DoorLeafProps) {
  const inward = -direction

  return (
    <group ref={pivotRef} position={[direction * 2.45, 0, 0]}>
      <group position={[inward * 1.17, 0, 0]}>
        <RoundedBox args={[2.32, 6.22, 0.16]} radius={0.05} smoothness={2} material={doorMaterial} />
        {[-1.75, 1.75].map((y) => (
          <RoundedBox key={y} args={[1.66, 1.2, 0.065]} radius={0.025} smoothness={2} position={[0, y, 0.12]} material={doorMaterial} />
        ))}

        {/* A small pierced lattice, not an additional light source. */}
        {[-0.62, 0, 0.62].map((x) => (
          <group key={x} position={[x, 1.42, 0.17]}>
            <mesh material={frameMaterial} rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[0.018, 0.8, 0.018]} /></mesh>
            <mesh material={frameMaterial} rotation={[0, 0, -Math.PI / 4]}><boxGeometry args={[0.018, 0.8, 0.018]} /></mesh>
          </group>
        ))}

        <mesh material={frameMaterial} position={[0, 2.58, 0.105]}>
          <boxGeometry args={[2.08, 0.09, 0.08]} />
        </mesh>
        <mesh material={frameMaterial} position={[0, -2.58, 0.105]}>
          <boxGeometry args={[2.08, 0.09, 0.08]} />
        </mesh>
        <mesh material={frameMaterial} position={[direction * 0.92, 0, 0.105]}>
          <boxGeometry args={[0.09, 5.08, 0.08]} />
        </mesh>
        <mesh material={frameMaterial} position={[inward * 0.92, 0, 0.105]}>
          <boxGeometry args={[0.09, 5.08, 0.08]} />
        </mesh>
        <mesh material={frameMaterial} position={[0, 0, 0.105]}>
          <boxGeometry args={[1.92, 0.075, 0.08]} />
        </mesh>
        <mesh material={frameMaterial} position={[inward * 0.72, 0, 0.18]}>
          <sphereGeometry args={[0.08, 12, 8]} />
        </mesh>
        <mesh material={frameMaterial} position={[inward * 0.72, -0.13, 0.24]}>
          <torusGeometry args={[0.14, 0.022, 6, 24]} />
        </mesh>
      </group>
    </group>
  )
}

type LightGateProps = {
  palette: JourneyPalette
  progressRef: JourneyProgressRef
}

export function LightGate({ palette, progressRef }: LightGateProps) {
  const gateRef = useRef<Group>(null)
  const leftDoorRef = useRef<Group>(null)
  const rightDoorRef = useRef<Group>(null)
  const surgeRef = useRef<Mesh>(null)
  const surgeMaterialRef = useRef<ShaderMaterial>(null)
  const portalMaterialRef = useRef<ShaderMaterial>(null)
  const portalLightRef = useRef<PointLight>(null)
  const materials = useGateMaterials(palette)
  const surgeUniforms = useMemo(
    () => ({
      uCore: { value: new Color(palette.paper) },
      uEdge: { value: new Color(palette.gold) },
      uInnerRadius: { value: 0.11 },
      uOpacity: { value: 0 },
    }),
    [palette],
  )
  const portalUniforms = useMemo(
    () => ({
      uCore: { value: new Color(palette.paper) },
      uEdge: { value: new Color(palette.goldSoft) },
      uInnerRadius: { value: 0.3 },
      uOpacity: { value: 0 },
    }),
    [palette],
  )

  useFrame(() => {
    const gate = gateRef.current
    const leftDoor = leftDoorRef.current
    const rightDoor = rightDoorRef.current
    const surge = surgeRef.current
    const surgeMaterial = surgeMaterialRef.current
    const portalMaterial = portalMaterialRef.current

    if (
      !gate ||
      !leftDoor ||
      !rightDoor ||
      !surge ||
      !surgeMaterial ||
      !portalMaterial
    ) {
      return
    }

    const progress = progressRef.current?.progress ?? 0
    const surgeRise = smootherStep(rangeProgress(progress, 0.75, 0.82))
    const surgeFall = 1 - smootherStep(rangeProgress(progress, 0.825, 0.885))
    const surgeStrength = surgeRise * surgeFall
    const formation = smootherStep(rangeProgress(progress, 0.815, 0.88))
    const opening = smootherStep(rangeProgress(progress, 0.88, 0.95))
    // Hand the radiance to the screen-space exposure before the camera crosses
    // this plane. Otherwise near-plane clipping removes a full-screen light in
    // one frame at ~92.5% of the journey.
    const portalFade = 1 - smootherStep(rangeProgress(progress, 0.903, 0.919))
    const gateScale = Math.max(0.0001, formation)

    surge.visible = surgeStrength > 0.002
    surge.position.set(0, 0, 0)
    surge.scale.setScalar(0.45 + surgeRise * 18)
    surgeMaterial.uniforms.uOpacity.value = surgeStrength * 0.96

    gate.visible = progress >= 0.8 && progress <= 0.985
    gate.scale.setScalar(gateScale)
    leftDoor.rotation.y = opening * 1.34
    rightDoor.rotation.y = -opening * 1.34
    portalMaterial.uniforms.uOpacity.value = formation * portalFade * 0.92
    if (portalLightRef.current) {
      portalLightRef.current.intensity =
        surgeStrength * 14 + formation * portalFade * 7
    }
  })

  return (
    <group>
      <Billboard position={[0, 0.25, 0.45]}>
        <mesh ref={surgeRef} renderOrder={30}>
          <planeGeometry args={[1, 1]} />
          <shaderMaterial
            ref={surgeMaterialRef}
            vertexShader={RADIAL_LIGHT_VERTEX_SHADER}
            fragmentShader={RADIAL_LIGHT_FRAGMENT_SHADER}
            uniforms={surgeUniforms}
            blending={AdditiveBlending}
            depthTest={false}
            depthWrite={false}
            side={DoubleSide}
            transparent
          />
        </mesh>
      </Billboard>

      <group ref={gateRef} position={[0, 0.2, 0]}>
        <mesh material={materials.door} position={[-2.68, 0, 0]}>
          <boxGeometry args={[0.38, 7.05, 0.46, 2, 10, 2]} />
        </mesh>
        <mesh material={materials.door} position={[2.68, 0, 0]}>
          <boxGeometry args={[0.38, 7.05, 0.46]} />
        </mesh>
        <mesh material={materials.door} position={[0, 3.45, 0]}>
          <boxGeometry args={[5.72, 0.4, 0.46]} />
        </mesh>
        <mesh material={materials.door} position={[0, -3.45, 0]}>
          <boxGeometry args={[5.72, 0.24, 0.46]} />
        </mesh>

        {[-2.69, 2.69].map((x) => <mesh key={x} material={materials.frame} position={[x, 0, 0.24]}><boxGeometry args={[0.036, 6.8, 0.016]} /></mesh>)}
        {[-3.44, 3.44].map((y) => <mesh key={y} material={materials.frame} position={[0, y, 0.24]}><boxGeometry args={[5.4, 0.036, 0.016]} /></mesh>)}

        <mesh position={[0, 0, -0.2]} renderOrder={4}>
          <planeGeometry args={[5.08, 6.62]} />
          <shaderMaterial
            ref={portalMaterialRef}
            vertexShader={RADIAL_LIGHT_VERTEX_SHADER}
            fragmentShader={RADIAL_LIGHT_FRAGMENT_SHADER}
            uniforms={portalUniforms}
            blending={AdditiveBlending}
            depthWrite={false}
            side={DoubleSide}
            transparent
          />
        </mesh>

        <DoorLeaf
          direction={-1}
          doorMaterial={materials.door}
          frameMaterial={materials.frame}
          pivotRef={leftDoorRef}
        />
        <DoorLeaf
          direction={1}
          doorMaterial={materials.door}
          frameMaterial={materials.frame}
          pivotRef={rightDoorRef}
        />

      </group>
      <pointLight ref={portalLightRef} color={palette.gold} distance={16} decay={1.45} intensity={0} position={[0, 0, 1.5]} />
    </group>
  )
}
