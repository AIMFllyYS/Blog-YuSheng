import { useEffect, useMemo, useRef } from 'react'
import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  TubeGeometry,
  Vector3,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type PointLight,
  type ShaderMaterial,
  type Texture,
} from 'three'
import { rangeProgress, smootherStep } from '../motion/math'
import type { JourneyProgressRef } from '../types'
import type { JourneyPalette } from './palette'
import { createCoverFibers } from './seeded-geometry'
import {
  BOOK_SURFACE_FRAGMENT_SHADER,
  BOOK_SURFACE_VERTEX_SHADER,
  BOOK_SEAM_FRAGMENT_SHADER,
  BOOK_SEAM_VERTEX_SHADER,
} from './book-shaders'
import {
  createBookTextureBundle,
  disposeBookTextureBundle,
} from './book-textures'
import { BOOK_PAGE_COUNT, TurningPage } from './TurningPage'

type PaperSurfaceMaterialProps = {
  inkDensity?: number
  palette: JourneyPalette
  texture?: Texture
  cloth?: boolean
}

function PaperSurfaceMaterial({
  inkDensity = 0,
  palette,
  texture,
  cloth = false,
}: PaperSurfaceMaterialProps) {
  const uniforms = useMemo(
    () => ({
      uCloth: { value: cloth ? 1 : 0 },
      uHasMap: { value: texture ? 1 : 0 },
      uGold: { value: new Color(palette.gold) },
      uInk: { value: new Color(palette.ink) },
      uInkDensity: { value: inkDensity },
      uMap: { value: texture ?? null },
      uOpacity: { value: 1 },
      uPaper: { value: new Color(palette.paper) },
      uPaperEdge: { value: new Color(palette.paperEdge) },
    }),
    [cloth, inkDensity, palette, texture],
  )

  return (
    <shaderMaterial
      vertexShader={BOOK_SURFACE_VERTEX_SHADER}
      fragmentShader={BOOK_SURFACE_FRAGMENT_SHADER}
      uniforms={uniforms}
      side={DoubleSide}
    />
  )
}

type CoverBoardProps = {
  palette: JourneyPalette
  texture: Texture
}

function CoverBoard({ palette, texture }: CoverBoardProps) {
  return (
    <RoundedBox args={[4.78, 0.12, 3.28]} radius={0.048} smoothness={3}>
      <PaperSurfaceMaterial
        cloth
        palette={palette}
        texture={texture}
        inkDensity={0.02}
      />
    </RoundedBox>
  )
}

type PageBlockProps = {
  onInspect?: () => void
  palette: JourneyPalette
  thickness: number
  texture: Texture
}

function PageBlock({ onInspect, palette, thickness, texture }: PageBlockProps) {
  return (
    <group
      onPointerDown={(event) => {
        event.stopPropagation()
        onInspect?.()
      }}
    >
      <RoundedBox args={[4.42, thickness, 3.04]} radius={0.035} smoothness={2}>
        <PaperSurfaceMaterial palette={palette} />
      </RoundedBox>
      <mesh position={[0, thickness / 2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.33, 2.95]} />
        <PaperSurfaceMaterial palette={palette} texture={texture} />
      </mesh>
    </group>
  )
}

const BOOK_CORNERS = [
  [-2.08, -1.31],
  [2.08, -1.31],
  [-2.08, 1.31],
  [2.08, 1.31],
] as const

function CoverOrnaments({ material }: { material: MeshStandardMaterial }) {
  const corners = BOOK_CORNERS
  const cornerRef = useRef<InstancedMesh>(null)
  const railRef = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])

  useEffect(() => {
    const cornersMesh = cornerRef.current
    const railsMesh = railRef.current
    if (!cornersMesh || !railsMesh) return

    corners.forEach(([x, z], index) => {
      dummy.position.set(x, 0, z)
      dummy.rotation.set(0, Math.PI / 4, 0)
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      cornersMesh.setMatrixAt(index, dummy.matrix)
    })
    cornersMesh.instanceMatrix.needsUpdate = true

    ;[-1.39, 1.39].forEach((z, index) => {
      dummy.position.set(0, 0, z)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      railsMesh.setMatrixAt(index, dummy.matrix)
    })
    railsMesh.instanceMatrix.needsUpdate = true
  }, [corners, dummy])

  return (
    <group position={[0, 0.08, 0]}>
      <instancedMesh ref={cornerRef} args={[undefined, material, corners.length]}>
        <boxGeometry args={[0.17, 0.026, 0.17]} />
      </instancedMesh>
      <instancedMesh ref={railRef} args={[undefined, material, 2]}>
        <boxGeometry args={[2.4, 0.024, 0.018]} />
      </instancedMesh>
    </group>
  )
}

type BookMaterials = {
  binding: MeshStandardMaterial
  gold: MeshStandardMaterial
  pageEdge: MeshStandardMaterial
}

function useBookMaterials(palette: JourneyPalette): BookMaterials {
  const materials = useMemo(
    () => ({
      binding: new MeshStandardMaterial({
        color: new Color(palette.paperEdge),
        emissive: new Color(palette.goldSoft),
        emissiveIntensity: 0.18,
        metalness: 0.24,
        roughness: 0.48,
        transparent: true,
        opacity: 0,
      }),
      gold: new MeshStandardMaterial({
        color: new Color(palette.gold),
        emissive: new Color(palette.gold),
        emissiveIntensity: 0.7,
        metalness: 0.16,
        roughness: 0.32,
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
  titleTexture: Texture
  onInspect?: () => void
}

function CoverInscription({
  goldMaterial,
  titleTexture,
  onInspect,
}: CoverInscriptionProps) {
  return (
    <group>
      <mesh
        material={goldMaterial}
        position={[-0.44, 0, 0]}
        scale={[1, 1, 1.08]}
      >
        <boxGeometry args={[0.028, 0.028, 2.12]} />
      </mesh>
      <mesh
        material={goldMaterial}
        position={[0.44, 0, 0]}
        scale={[1, 1, 1.08]}
      >
        <boxGeometry args={[0.028, 0.028, 2.12]} />
      </mesh>
      <mesh material={goldMaterial} position={[0, 0, -1.14]}>
        <boxGeometry args={[0.9, 0.028, 0.028]} />
      </mesh>
      <mesh material={goldMaterial} position={[0, 0, 1.14]}>
        <boxGeometry args={[0.9, 0.028, 0.028]} />
      </mesh>
      <mesh
        onPointerDown={(event) => {
          event.stopPropagation()
          onInspect?.()
        }}
        position={[0, 0.022, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[0.74, 2.14]} />
        <meshBasicMaterial
          map={titleTexture}
          opacity={0.98}
          toneMapped={false}
          transparent
        />
      </mesh>
    </group>
  )
}

type BindingCurveProps = {
  material: MeshStandardMaterial
  progressRef: JourneyProgressRef
  geometry: TubeGeometry
  indexCount: number
  onInspect?: () => void
}

function BindingCurve({
  geometry,
  indexCount,
  material,
  onInspect,
  progressRef,
}: BindingCurveProps) {
  const meshRef = useRef<Mesh<TubeGeometry, MeshStandardMaterial>>(null)

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const progress = progressRef.current?.progress ?? 0
    const reveal = smootherStep(rangeProgress(progress, 0.35, 0.43))
    mesh.geometry.setDrawRange(0, Math.floor(indexCount * reveal))
    mesh.material.opacity = reveal * 0.94
  })

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      onPointerDown={(event) => {
        event.stopPropagation()
        onInspect?.()
      }}
      renderOrder={11}
    />
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

  const horizontalRef = useRef<InstancedMesh>(null)
  const verticalRef = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])

  useEffect(() => {
    const horizontal = horizontalRef.current
    const vertical = verticalRef.current
    if (!horizontal || !vertical) return
    levels.forEach((level, index) => {
      dummy.position.set(0, level, 1.526)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      horizontal.setMatrixAt(index, dummy.matrix)
      dummy.position.set(2.216, level, 0)
      dummy.updateMatrix()
      vertical.setMatrixAt(index, dummy.matrix)
    })
    horizontal.instanceMatrix.needsUpdate = true
    vertical.instanceMatrix.needsUpdate = true
  }, [dummy, levels])

  return (
    <group>
      <instancedMesh ref={horizontalRef} args={[undefined, material, levels.length]}>
        <boxGeometry args={[4.36, 0.008, 0.012]} />
      </instancedMesh>
      <instancedMesh ref={verticalRef} args={[undefined, material, levels.length]}>
        <boxGeometry args={[0.012, 0.008, 2.98]} />
      </instancedMesh>
    </group>
  )
}

type BoundBookProps = {
  palette: JourneyPalette
  progressRef: JourneyProgressRef
  onInspect?: (event: { detail: 'binding' | 'seal' | 'pages' }) => void
}

export function BoundBook({ palette, progressRef, onInspect }: BoundBookProps) {
  const bookRef = useRef<Group>(null)
  const topCoverRef = useRef<Group>(null)
  const leftPageBlockRef = useRef<Group>(null)
  const seamRef = useRef<Group>(null)
  const seamCoreMaterialRef = useRef<MeshBasicMaterial>(null)
  const seamHaloMaterialRef = useRef<ShaderMaterial>(null)
  const seamLightRef = useRef<PointLight>(null)
  const titleRef = useRef<Group>(null)
  const materials = useBookMaterials(palette)
  const textures = useMemo(
    () => createBookTextureBundle(palette, 0xc0a3e),
    [palette],
  )
  const seamUniforms = useMemo(
    () => ({
      uColor: { value: new Color(palette.goldSoft) },
      uOpacity: { value: 0 },
    }),
    [palette.goldSoft],
  )
  const coverFibers = useMemo(() => createCoverFibers(0xc0a3e), [])
  const bindingGeometry = useMemo(() => {
    const points = [-1.14, -0.4, 0.4, 1.14].flatMap((z) => [
      [-2.34, 0.24, z - 0.16],
      [-2.13, 0.29, z - 0.08],
      [-2.12, 0.43, z + 0.02],
      [-2.34, 0.47, z + 0.12],
      [-2.34, 0.25, z + 0.18],
    ])
    const curve = new CatmullRomCurve3(
      points.map(([x, y, z]) => new Vector3(x, y, z)),
      false,
      'centripetal',
      0.36,
    )
    const geometry = new TubeGeometry(curve, 180, 0.017, 6, false)
    geometry.setDrawRange(0, 0)
    return geometry
  }, [])
  const bindingIndexCount = bindingGeometry.index?.count ?? 0

  useEffect(
    () => () => {
      disposeBookTextureBundle(textures)
      bindingGeometry.dispose()
    },
    [bindingGeometry, textures],
  )

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
    const overheadTurn = smootherStep(rangeProgress(progress, 0.47, 0.5))
    const open = smootherStep(rangeProgress(progress, 0.5, 0.56))
    const bookScale = Math.max(0.0001, formation * departure * (1 - open * 0.24))
    const seamGlow = smootherStep(rangeProgress(progress, 0.715, 0.75)) *
      (1 - smootherStep(rangeProgress(progress, 0.8, 0.85)))

    book.visible = progress >= 0.3 && progress <= 0.87
    book.scale.setScalar(bookScale)
    book.position.set(
      2.39 * open * bookScale,
      Math.sin(ambientTime * 0.23 + progress * Math.PI * 4) * 0.035 - open * 0.24,
      0,
    )
    book.rotation.set((1 - overheadTurn) * 1.18, -0.08 + overheadTurn * 0.12, 0)
    topCover.rotation.z = Math.PI * open

    const leftStack = smootherStep(rangeProgress(open, 0.72, 1))
    leftPageBlock.visible = leftStack > 0.001
    leftPageBlock.scale.set(1, Math.max(0.001, leftStack), 1)

    if (titleRef.current) {
      const titleProgress = smootherStep(rangeProgress(progress, 0.42, 0.48))
      titleRef.current.scale.setScalar(Math.max(0.0001, titleProgress))
    }

    seam.visible = seamGlow > 0.002
    seam.scale.set(0.82 + seamGlow * 0.7, 1, 1)
    seamCoreMaterial.opacity = seamGlow
    seamHaloMaterial.uniforms.uOpacity.value = seamGlow * 0.28

    if (seamLightRef.current) {
      seamLightRef.current.intensity = seamGlow * 8.5
    }
  })

  return (
    <>
    <group ref={bookRef}>
      <group position={[0, -0.34, 0]}>
        <CoverBoard palette={palette} texture={textures.cover} />
        <CoverOrnaments material={materials.gold} />
      </group>

      <group position={[0, -0.035, 0]}>
        <PageBlock
          onInspect={() => onInspect?.({ detail: 'pages' })}
          palette={palette}
          texture={textures.pages}
          thickness={0.48}
        />
        <PageEdgeLines material={materials.pageEdge} />
      </group>

      <group ref={leftPageBlockRef} position={[-4.52, -0.11, 0]}>
        <PageBlock
          onInspect={() => onInspect?.({ detail: 'pages' })}
          palette={palette}
          texture={textures.pages}
          thickness={0.2}
        />
      </group>

      <group ref={topCoverRef} position={[-2.39, 0, 0]}>
        {/* Hinge at the middle of the spine: the closed top board at +.34
            becomes the lower left board at -.34 after a half-turn. */}
        <group position={[2.39, 0.34, 0]}>
          <CoverBoard palette={palette} texture={textures.cover} />
          <CoverOrnaments material={materials.gold} />
          <lineSegments position={[0, 0.067, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[coverFibers, 3]} />
            </bufferGeometry>
            <lineBasicMaterial
              color={palette.paperEdge}
              opacity={0.13}
              transparent
            />
          </lineSegments>
          <group ref={titleRef} position={[1.12, 0.078, 0]}>
            <CoverInscription
              goldMaterial={materials.gold}
              onInspect={() => onInspect?.({ detail: 'seal' })}
              titleTexture={textures.title}
            />
          </group>
        </group>
      </group>

      <mesh material={materials.pageEdge} position={[-2.31, 0.03, 0]}>
        <boxGeometry args={[0.18, 0.68, 3.2]} />
      </mesh>
      <mesh material={materials.gold} position={[1.94, 0.19, 1.14]} rotation={[0, 0.02, 0]}>
        <boxGeometry args={[0.44, 0.025, 0.74]} />
      </mesh>

      <BindingCurve
        geometry={bindingGeometry}
        indexCount={bindingIndexCount}
        material={materials.binding}
        onInspect={() => onInspect?.({ detail: 'binding' })}
        progressRef={progressRef}
      />

      {Array.from({ length: BOOK_PAGE_COUNT }, (_, index) => (
        <TurningPage
          key={index}
          index={index}
          palette={palette}
          pageTexture={textures.pages}
          onInspect={() => onInspect?.({ detail: 'pages' })}
          progressRef={progressRef}
        />
      ))}

      <group ref={seamRef} position={[-2.3, 0.37, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.78, 3.24]} />
          <shaderMaterial
            ref={seamHaloMaterialRef}
            blending={AdditiveBlending}
            depthWrite={false}
            vertexShader={BOOK_SEAM_VERTEX_SHADER}
            fragmentShader={BOOK_SEAM_FRAGMENT_SHADER}
            uniforms={seamUniforms}
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
      </group>
    </group>
    {/* Keep the light count stable while the book is hidden. Visibility-based
        light removal recompiles every lit material during chapter transitions. */}
    <pointLight ref={seamLightRef} color={palette.gold} distance={8} decay={1.7} intensity={0} position={[0, 0.37, 0]} />
    </>
  )
}
