import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  MeshStandardMaterial,
  type Group,
  type MeshBasicMaterial,
  type PointLight,
} from 'three'
import { rangeProgress, smootherStep } from '../motion/math'
import type { JourneyProgressRef } from '../types'
import type { JourneyPalette } from './palette'
import { createCoverFibers } from './seeded-geometry'
import { PAPER_FRAGMENT_SHADER, PAPER_VERTEX_SHADER } from './shaders'
import { TurningPage } from './TurningPage'

type PaperSurfaceMaterialProps = {
  inkDensity?: number
  palette: JourneyPalette
}

function PaperSurfaceMaterial({
  inkDensity = 0,
  palette,
}: PaperSurfaceMaterialProps) {
  const uniforms = useMemo(
    () => ({
      uInk: { value: new Color(palette.ink) },
      uInkDensity: { value: inkDensity },
      uOpacity: { value: 1 },
      uPaper: { value: new Color(palette.paper) },
      uPaperEdge: { value: new Color(palette.paperEdge) },
    }),
    [inkDensity, palette],
  )

  return (
    <shaderMaterial
      vertexShader={PAPER_VERTEX_SHADER}
      fragmentShader={PAPER_FRAGMENT_SHADER}
      uniforms={uniforms}
      side={DoubleSide}
    />
  )
}

type CoverBoardProps = {
  palette: JourneyPalette
}

function CoverBoard({ palette }: CoverBoardProps) {
  return (
    <mesh>
      <boxGeometry args={[4.78, 0.12, 3.28, 14, 1, 10]} />
      <PaperSurfaceMaterial palette={palette} inkDensity={0.16} />
    </mesh>
  )
}

type PageBlockProps = {
  palette: JourneyPalette
  thickness: number
}

function PageBlock({ palette, thickness }: PageBlockProps) {
  return (
    <mesh>
      <boxGeometry args={[4.42, thickness, 3.04, 12, 2, 8]} />
      <PaperSurfaceMaterial palette={palette} inkDensity={0.08} />
    </mesh>
  )
}

type BookMaterials = {
  gold: MeshStandardMaterial
  ink: MeshStandardMaterial
  pageEdge: MeshStandardMaterial
}

function useBookMaterials(palette: JourneyPalette): BookMaterials {
  const materials = useMemo(
    () => ({
      gold: new MeshStandardMaterial({
        color: new Color(palette.gold),
        emissive: new Color(palette.gold),
        emissiveIntensity: 0.7,
        metalness: 0.16,
        roughness: 0.32,
      }),
      ink: new MeshStandardMaterial({
        color: new Color(palette.ink),
        metalness: 0.05,
        roughness: 0.54,
      }),
      pageEdge: new MeshStandardMaterial({
        color: new Color(palette.paperEdge),
        roughness: 0.82,
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

type CoverInscriptionProps = {
  goldMaterial: MeshStandardMaterial
  inkMaterial: MeshStandardMaterial
}

function CoverInscription({
  goldMaterial,
  inkMaterial,
}: CoverInscriptionProps) {
  return (
    <group>
      <mesh material={goldMaterial} position={[-0.36, 0, 0]}>
        <boxGeometry args={[0.032, 0.028, 1.72]} />
      </mesh>
      <mesh material={goldMaterial} position={[0.36, 0, 0]}>
        <boxGeometry args={[0.032, 0.028, 1.72]} />
      </mesh>
      <mesh material={goldMaterial} position={[0, 0, -0.845]}>
        <boxGeometry args={[0.75, 0.028, 0.032]} />
      </mesh>
      <mesh material={goldMaterial} position={[0, 0, 0.845]}>
        <boxGeometry args={[0.75, 0.028, 0.032]} />
      </mesh>

      {/* The title is deliberately an abstract ink impression until copy is final. */}
      <mesh material={inkMaterial} position={[-0.1, 0.018, -0.48]}>
        <boxGeometry args={[0.1, 0.032, 0.42]} />
      </mesh>
      <mesh material={inkMaterial} position={[0.09, 0.018, -0.31]} rotation={[0, 0.15, 0]}>
        <boxGeometry args={[0.1, 0.032, 0.48]} />
      </mesh>
      <mesh material={inkMaterial} position={[-0.08, 0.018, 0.16]} rotation={[0, -0.32, 0]}>
        <boxGeometry args={[0.1, 0.032, 0.44]} />
      </mesh>
      <mesh material={inkMaterial} position={[0.1, 0.018, 0.4]}>
        <boxGeometry args={[0.1, 0.032, 0.46]} />
      </mesh>
    </group>
  )
}

type BindingStitchProps = {
  inkMaterial: MeshStandardMaterial
  z: number
}

function BindingStitch({ inkMaterial, z }: BindingStitchProps) {
  return (
    <group position={[-2.3, 0, z]}>
      <mesh
        material={inkMaterial}
        position={[0.22, 0.412, 0]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.036, 0.036, 0.7, 10]} />
      </mesh>
      <mesh material={inkMaterial} position={[0.58, 0.412, 0]}>
        <cylinderGeometry args={[0.067, 0.067, 0.02, 18]} />
      </mesh>
      <mesh material={inkMaterial} position={[-0.12, 0.02, 0]}>
        <cylinderGeometry args={[0.036, 0.036, 0.78, 10]} />
      </mesh>
    </group>
  )
}

type PageEdgeLinesProps = {
  material: MeshStandardMaterial
}

function PageEdgeLines({ material }: PageEdgeLinesProps) {
  const levels = useMemo(
    () => Array.from({ length: 10 }, (_, index) => -0.205 + index * 0.045),
    [],
  )

  return (
    <group>
      {levels.map((level) => (
        <group key={level}>
          <mesh material={material} position={[0, level, 1.526]}>
            <boxGeometry args={[4.36, 0.008, 0.012]} />
          </mesh>
          <mesh material={material} position={[2.216, level, 0]}>
            <boxGeometry args={[0.012, 0.008, 2.98]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

type BoundBookProps = {
  palette: JourneyPalette
  progressRef: JourneyProgressRef
}

export function BoundBook({ palette, progressRef }: BoundBookProps) {
  const bookRef = useRef<Group>(null)
  const topCoverRef = useRef<Group>(null)
  const leftPageBlockRef = useRef<Group>(null)
  const seamRef = useRef<Group>(null)
  const seamCoreMaterialRef = useRef<MeshBasicMaterial>(null)
  const seamHaloMaterialRef = useRef<MeshBasicMaterial>(null)
  const seamLightRef = useRef<PointLight>(null)
  const titleRef = useRef<Group>(null)
  const stitchRefs = useRef<Array<Group | null>>([])
  const materials = useBookMaterials(palette)
  const coverFibers = useMemo(() => createCoverFibers(0xc0a3e), [])
  const stitchPositions = [-1.14, -0.4, 0.4, 1.14]

  useFrame(({ clock }) => {
    const book = bookRef.current
    const topCover = topCoverRef.current
    const leftPageBlock = leftPageBlockRef.current
    const seam = seamRef.current
    const seamCoreMaterial = seamCoreMaterialRef.current
    const seamHaloMaterial = seamHaloMaterialRef.current

    if (
      !book ||
      !topCover ||
      !leftPageBlock ||
      !seam ||
      !seamCoreMaterial ||
      !seamHaloMaterial
    ) {
      return
    }

    const snapshot = progressRef.current
    const progress = snapshot?.progress ?? 0
    const ambientTime = snapshot?.qaFreeze ? 0 : clock.elapsedTime
    const formation = smootherStep(rangeProgress(progress, 0.32, 0.45))
    const departure = 1 - smootherStep(rangeProgress(progress, 0.79, 0.86))
    const bookScale = Math.max(0.0001, formation * departure)
    const overheadTurn = smootherStep(rangeProgress(progress, 0.47, 0.5))
    const open = smootherStep(rangeProgress(progress, 0.5, 0.56))
    const seamGlow = smootherStep(rangeProgress(progress, 0.715, 0.75)) *
      (1 - smootherStep(rangeProgress(progress, 0.8, 0.85)))

    book.visible = progress >= 0.3 && progress <= 0.87
    book.scale.setScalar(bookScale)
    book.position.set(
      2.3 * open,
      Math.sin(ambientTime * 0.23) * 0.035,
      0,
    )
    book.rotation.set((1 - overheadTurn) * 1.18, -0.08 + overheadTurn * 0.12, 0)
    topCover.rotation.z = Math.PI * open

    leftPageBlock.visible = open > 0.01
    leftPageBlock.scale.set(1, Math.max(0.025, open), 1)

    stitchRefs.current.forEach((stitch, index) => {
      if (!stitch) return
      const stitchProgress = smootherStep(
        rangeProgress(progress, 0.355 + index * 0.014, 0.4 + index * 0.014),
      )
      stitch.scale.setScalar(Math.max(0.0001, stitchProgress))
    })

    if (titleRef.current) {
      const titleProgress = smootherStep(rangeProgress(progress, 0.42, 0.48))
      titleRef.current.scale.setScalar(Math.max(0.0001, titleProgress))
    }

    seam.visible = seamGlow > 0.002
    seam.scale.set(0.82 + seamGlow * 0.7, 1, 1)
    seamCoreMaterial.opacity = seamGlow
    seamHaloMaterial.opacity = seamGlow * 0.38

    if (seamLightRef.current) {
      seamLightRef.current.intensity = seamGlow * 8.5
    }
  })

  return (
    <group ref={bookRef}>
      <group position={[0, -0.34, 0]}>
        <CoverBoard palette={palette} />
      </group>

      <group position={[0, -0.035, 0]}>
        <PageBlock palette={palette} thickness={0.48} />
        <PageEdgeLines material={materials.pageEdge} />
      </group>

      <group ref={leftPageBlockRef} position={[-4.52, -0.11, 0]}>
        <PageBlock palette={palette} thickness={0.2} />
      </group>

      <group ref={topCoverRef} position={[-2.39, 0.34, 0]}>
        <group position={[2.39, 0, 0]}>
          <CoverBoard palette={palette} />
        </group>
        <lineSegments position={[2.39, 0.067, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[coverFibers, 3]} />
          </bufferGeometry>
          <lineBasicMaterial
            color={palette.paperEdge}
            opacity={0.28}
            transparent
          />
        </lineSegments>
        <group ref={titleRef} position={[3.12, 0.078, 0]}>
          <CoverInscription
            goldMaterial={materials.gold}
            inkMaterial={materials.ink}
          />
        </group>
      </group>

      <mesh material={materials.pageEdge} position={[-2.31, 0.03, 0]}>
        <boxGeometry args={[0.18, 0.68, 3.2]} />
      </mesh>

      {stitchPositions.map((z, index) => (
        <group
          key={z}
          ref={(stitch) => {
            stitchRefs.current[index] = stitch
          }}
        >
          <BindingStitch inkMaterial={materials.ink} z={z} />
        </group>
      ))}

      {Array.from({ length: 8 }, (_, index) => (
        <TurningPage
          key={index}
          index={index}
          palette={palette}
          progressRef={progressRef}
        />
      ))}

      <group ref={seamRef} position={[-2.3, 0.37, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.78, 3.24]} />
          <meshBasicMaterial
            ref={seamHaloMaterialRef}
            blending={AdditiveBlending}
            color={palette.goldSoft}
            depthWrite={false}
            opacity={0}
            side={DoubleSide}
            transparent
          />
        </mesh>
        <mesh>
          <boxGeometry args={[0.055, 0.07, 3.16]} />
          <meshBasicMaterial
            ref={seamCoreMaterialRef}
            blending={AdditiveBlending}
            color={palette.gold}
            depthWrite={false}
            opacity={0}
            transparent
          />
        </mesh>
        <pointLight
          ref={seamLightRef}
          color={palette.gold}
          distance={8}
          decay={1.7}
          intensity={0}
        />
      </group>
    </group>
  )
}
