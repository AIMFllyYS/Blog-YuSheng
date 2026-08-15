'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas, type RootState, useFrame, useThree } from '@react-three/fiber'
import {
  ACESFilmicToneMapping,
  Color,
  SRGBColorSpace,
} from 'three'
import type { JourneyScene3DProps } from '../types'
import { JourneyWorld } from './JourneyWorld'
import { readJourneyPalette } from './palette'

function RenderDiagnostics({ enabled }: { enabled: boolean }) {
  const gl = useThree((state) => state.gl)
  const canvasRef = useRef(gl.domElement)

  useFrame(() => {
    const canvas = canvasRef.current
    if (!enabled && canvas.dataset.journeyObserveRender !== 'true') return
    const current = Number(canvas.dataset.journeyRenderCount ?? 0)
    canvas.dataset.journeyRenderCount = String(current + 1)
  })

  return null
}

export function JourneyCanvas({
  diagnostics = false,
  progressRef,
  renderRequestRef,
  onCanvasReady,
}: JourneyScene3DProps) {
  const initialFrameloop = diagnostics ? 'demand' : 'always'
  const [frameloop, setFrameloop] = useState<'always' | 'demand'>(
    initialFrameloop,
  )
  const frameloopRef = useRef<'always' | 'demand'>(initialFrameloop)

  const handleCreated = useCallback(
    ({ gl, invalidate }: RootState) => {
      const palette = readJourneyPalette(gl.domElement)
      const requestRender = () => {
        const nextFrameloop =
          diagnostics || progressRef.current.progress >= 0.95 ? 'demand' : 'always'

        gl.domElement.dataset.journeyFrameloop = nextFrameloop
        if (frameloopRef.current !== nextFrameloop) {
          frameloopRef.current = nextFrameloop
          setFrameloop(nextFrameloop)
        }
        invalidate()
      }

      renderRequestRef.current = requestRender
      if (diagnostics) gl.domElement.dataset.journeyRenderCount = '0'
      gl.setClearColor(new Color(palette.void), 1)
      gl.outputColorSpace = SRGBColorSpace
      gl.toneMapping = ACESFilmicToneMapping
      gl.toneMappingExposure = 1.08
      requestRender()
      onCanvasReady?.()
    },
    [diagnostics, onCanvasReady, progressRef, renderRequestRef],
  )

  useEffect(
    () => () => {
      renderRequestRef.current = null
    },
    [renderRequestRef],
  )

  return (
    <Canvas
      aria-hidden="true"
      camera={{ far: 80, fov: 43, near: 0.05, position: [0, 0.1, 10.5] }}
      dpr={[1, 1.6]}
      frameloop={frameloop}
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
      <RenderDiagnostics enabled={diagnostics} />
      <JourneyWorld progressRef={progressRef} />
    </Canvas>
  )
}
