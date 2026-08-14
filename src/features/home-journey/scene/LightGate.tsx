import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
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
        metalness: 0.08,
        roughness: 0.48,
      }),
      frame: new MeshStandardMaterial({
        color: new Color(palette.gold),
        emissive: new Color(palette.gold),
        emissiveIntensity: 0.74,
        metalness: 0.22,
        roughness: 0.3,
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
        <mesh material={doorMaterial}>
          <boxGeometry args={[2.32, 6.22, 0.16]} />
        </mesh>

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
          <sphereGeometry args={[0.09, 18, 12]} />
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
    const portalFade = 1 - smootherStep(rangeProgress(progress, 0.935, 0.975))
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
        <mesh material={materials.frame} position={[-2.68, 0, 0]}>
          <boxGeometry args={[0.38, 7.05, 0.46]} />
        </mesh>
        <mesh material={materials.frame} position={[2.68, 0, 0]}>
          <boxGeometry args={[0.38, 7.05, 0.46]} />
        </mesh>
        <mesh material={materials.frame} position={[0, 3.45, 0]}>
          <boxGeometry args={[5.72, 0.4, 0.46]} />
        </mesh>
        <mesh material={materials.frame} position={[0, -3.45, 0]}>
          <boxGeometry args={[5.72, 0.24, 0.46]} />
        </mesh>

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

        <pointLight
          ref={portalLightRef}
          color={palette.gold}
          distance={16}
          decay={1.45}
          intensity={0}
          position={[0, 0, 1.5]}
        />
      </group>
    </group>
  )
}
