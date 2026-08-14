'use client'

import { useCallback } from 'react'
import { Canvas, type RootState } from '@react-three/fiber'
import {
  ACESFilmicToneMapping,
  Color,
  SRGBColorSpace,
} from 'three'
import type { JourneyScene3DProps } from '../types'
import { JourneyWorld } from './JourneyWorld'
import { readJourneyPalette } from './palette'

export function JourneyCanvas({
  progressRef,
  onCanvasReady,
}: JourneyScene3DProps) {
  const handleCreated = useCallback(
    ({ gl }: RootState) => {
      const palette = readJourneyPalette(gl.domElement)

      gl.setClearColor(new Color(palette.void), 1)
      gl.outputColorSpace = SRGBColorSpace
      gl.toneMapping = ACESFilmicToneMapping
      gl.toneMappingExposure = 1.08
      onCanvasReady?.()
    },
    [onCanvasReady],
  )

  return (
    <Canvas
      aria-hidden="true"
      camera={{ far: 80, fov: 43, near: 0.05, position: [0, 0.1, 10.5] }}
      dpr={[1, 1.6]}
      gl={{
        alpha: false,
        antialias: true,
        powerPreference: 'high-performance',
      }}
      onCreated={handleCreated}
      style={{
        background: 'var(--journey-void)',
        display: 'block',
        height: '100%',
        width: '100%',
      }}
    >
      <JourneyWorld progressRef={progressRef} />
    </Canvas>
  )
}
