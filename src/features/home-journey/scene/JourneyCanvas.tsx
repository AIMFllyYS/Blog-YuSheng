'use client'

import {
  Component,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { Canvas, type RootState, useFrame, useThree } from '@react-three/fiber'
import { ACESFilmicToneMapping, Color, Mesh, ShaderMaterial, SRGBColorSpace, Texture } from 'three'
import {
  createJourneyQualitySampler,
  getJourneyDpr,
  getJourneyFrameloop,
  isJourneyRenderActive,
  JOURNEY_MAX_DPR,
  resetJourneyQualityWindow,
  sampleJourneyQuality,
  type JourneyFrameloop,
  type JourneyRenderQuality,
} from '../motion/render-policy'
import type { JourneyProgressRef, JourneyScene3DProps } from '../types'
import { JourneyWorld } from './JourneyWorld'
import { readJourneyPalette } from './palette'

const CONTEXT_OPTIONS = {
  alpha: false,
  antialias: true,
  powerPreference: 'high-performance',
} as const

function canCreateWebGL2Context() {
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl2', CONTEXT_OPTIONS)
    if (!context || !('getExtension' in context)) return false
    context.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}

function CanvasUnavailable({ onError }: { onError?: () => void }) {
  useEffect(() => {
    onError?.()
  }, [onError])

  return (
    <div role="status" className="flex h-full items-center justify-center font-serif text-sm text-[var(--journey-paper)]">
      当前设备暂不支持星河绘制，正在展开阅读入口…
    </div>
  )
}

class JourneyCanvasBoundary extends Component<
  { children: ReactNode; onError?: () => void },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed
      ? <CanvasUnavailable onError={this.props.onError} />
      : this.props.children
  }
}

function RenderDiagnostics({ enabled }: { enabled: boolean }) {
  const get = useThree((state) => state.get)

  useEffect(() => {
    const canvas = get().gl.domElement
    if (enabled) canvas.dataset.journeyRenderCount = '0'
    return () => {
      delete canvas.dataset.journeyRenderCount
    }
  }, [enabled, get])

  useFrame(({ gl }) => {
    const canvas = gl.domElement
    if (!enabled && canvas.dataset.journeyObserveRender !== 'true') return
    const current = Number(canvas.dataset.journeyRenderCount ?? 0)
    canvas.dataset.journeyRenderCount = String(current + 1)
  })

  return null
}

function PrepareScene({ onReady, onError }: { onReady?: () => void; onError?: () => void }) {
  const get = useThree((state) => state.get)
  const onReadyRef = useRef(onReady)
  const onErrorRef = useRef(onError)
  useEffect(() => { onReadyRef.current = onReady; onErrorRef.current = onError }, [onReady, onError])
  useEffect(() => {
    let active = true
    const { gl, scene, camera, invalidate } = get()
    // Upload the small procedural textures before scrolling encounters them.
    scene.traverse((object) => {
      if (!(object instanceof Mesh)) return
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      for (const material of materials) {
        if (material instanceof ShaderMaterial) {
          for (const uniform of Object.values(material.uniforms)) {
            if (uniform.value instanceof Texture) gl.initTexture(uniform.value)
          }
        } else if ('map' in material && material.map instanceof Texture) gl.initTexture(material.map)
      }
    })
    void gl.compileAsync(scene, camera).then(() => {
      if (!active) return
      invalidate()
      onReadyRef.current?.()
    }).catch(() => { if (active) onErrorRef.current?.() })
    return () => { active = false }
  }, [get])
  return null
}

function PerformanceGovernor({
  diagnostics,
  progressRef,
  onQualityChange,
}: {
  diagnostics: boolean
  progressRef: JourneyProgressRef
  onQualityChange: (quality: JourneyRenderQuality) => void
}) {
  const sampleRef = useRef(createJourneyQualitySampler())
  const get = useThree((state) => state.get)
  const dpr = useThree((state) => state.viewport.dpr)

  useEffect(() => {
    const canvas = get().gl.domElement
    canvas.dataset.journeyQuality = sampleRef.current.quality
    canvas.dataset.journeyDpr = String(dpr)
    return () => {
      delete canvas.dataset.journeyQuality
      delete canvas.dataset.journeyDpr
    }
  }, [dpr, get])

  useFrame(({ gl, frameloop, setDpr, viewport }, delta) => {
    const sample = sampleRef.current
    const deterministic = diagnostics || progressRef.current.qaFreeze
    if (deterministic || frameloop !== 'always') {
      resetJourneyQualityWindow(sample)
      if (!deterministic || sample.quality === 'high') return
      sample.quality = 'high'
      sample.cooldown = 0
    } else if (!sampleJourneyQuality(sample, delta)) {
      return
    }

    // Keep Fiber's viewport/DPR store in sync with the backing WebGL renderer.
    const dpr = getJourneyDpr(sample.quality, window.devicePixelRatio)
    if (viewport.dpr !== dpr) setDpr(dpr)
    gl.domElement.dataset.journeyQuality = sample.quality
    gl.domElement.dataset.journeyDpr = String(dpr)
    onQualityChange(sample.quality)
  })

  return null
}

function RenderLifecycle({
  diagnostics,
  progressRef,
  renderRequestRef,
  onFrameloopChange,
  onCanvasError,
}: Pick<JourneyScene3DProps, 'progressRef' | 'renderRequestRef' | 'onCanvasError'> & {
  diagnostics: boolean
  onFrameloopChange: (frameloop: JourneyFrameloop) => void
}) {
  const get = useThree((state) => state.get)

  useEffect(() => {
    if (!onCanvasError) return
    const canvas = get().gl.domElement
    canvas.addEventListener('webglcontextlost', onCanvasError)
    return () => canvas.removeEventListener('webglcontextlost', onCanvasError)
  }, [get, onCanvasError])

  useEffect(() => {
    const canvas = get().gl.domElement
    const bounds = canvas.getBoundingClientRect()
    let inViewport = bounds.width > 0 && bounds.height > 0 &&
      bounds.bottom > 0 && bounds.right > 0 &&
      bounds.top < window.innerHeight && bounds.left < window.innerWidth

    const requestRender = () => {
      const conditions = {
        diagnostics,
        qaFreeze: progressRef.current.qaFreeze,
        progress: progressRef.current.progress,
        documentVisible: document.visibilityState !== 'hidden',
        inViewport,
      }
      const frameloop = getJourneyFrameloop(conditions)
      const state = get()
      canvas.dataset.journeyVisibility = conditions.documentVisible ? 'visible' : 'hidden'
      canvas.dataset.journeyViewport = inViewport ? 'inside' : 'outside'
      canvas.dataset.journeyFrameloop = frameloop
      if (state.frameloop !== frameloop) state.setFrameloop(frameloop)
      onFrameloopChange(frameloop)
      // Hidden/offscreen scroll or visibility events must not wake the canvas.
      if (isJourneyRenderActive(conditions)) state.invalidate()
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return
        inViewport = entry.isIntersecting
        requestRender()
      },
      { threshold: 0.01 },
    )
    observer.observe(canvas)
    document.addEventListener('visibilitychange', requestRender)
    renderRequestRef.current = requestRender
    requestRender()

    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', requestRender)
      if (renderRequestRef.current === requestRender) renderRequestRef.current = null
      get().setFrameloop('demand')
      delete canvas.dataset.journeyVisibility
      delete canvas.dataset.journeyViewport
      delete canvas.dataset.journeyFrameloop
    }
  }, [diagnostics, get, onFrameloopChange, progressRef, renderRequestRef])

  return null
}

export function JourneyCanvas({
  diagnostics = false,
  onBookInspect,
  progressRef,
  renderRequestRef,
  onCanvasReady,
  onCanvasError,
}: JourneyScene3DProps) {
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null)
  const [frameloop, setFrameloop] = useState<JourneyFrameloop>('demand')
  const [quality, setQuality] = useState<JourneyRenderQuality>('high')
  const frameloopRef = useRef<JourneyFrameloop>('demand')

  useEffect(() => {
    // Probe once after the first paint. Release the probe context immediately.
    const frame = window.requestAnimationFrame(() => {
      setWebglAvailable(canCreateWebGL2Context())
    })
    return () => window.cancelAnimationFrame(frame)
  }, [])

  const handleFrameloopChange = useCallback((next: JourneyFrameloop) => {
    if (frameloopRef.current === next) return
    frameloopRef.current = next
    setFrameloop(next)
  }, [])

  const handleCreated = useCallback(
    ({ gl }: RootState) => {
      const palette = readJourneyPalette(gl.domElement)
      gl.setClearColor(new Color(palette.void), 1)
      gl.outputColorSpace = SRGBColorSpace
      gl.toneMapping = ACESFilmicToneMapping
      gl.toneMappingExposure = 1.08
    },
    [],
  )

  if (webglAvailable === null) return null
  if (!webglAvailable) return <CanvasUnavailable onError={onCanvasError} />

  return (
    <JourneyCanvasBoundary onError={onCanvasError}>
      <Canvas
        aria-hidden="true"
        camera={{ far: 80, fov: 43, near: 0.05, position: [0, 0.1, 10.5] }}
        dpr={quality === 'low' ? 1 : [1, JOURNEY_MAX_DPR]}
        fallback={<span>当前浏览器不支持星河绘制。</span>}
        frameloop={frameloop}
        gl={CONTEXT_OPTIONS}
        onCreated={handleCreated}
        style={{ background: 'var(--journey-void)', display: 'block', height: '100%', width: '100%' }}
      >
        <RenderDiagnostics enabled={diagnostics} />
        <PerformanceGovernor diagnostics={diagnostics} onQualityChange={setQuality} progressRef={progressRef} />
        <RenderLifecycle
          diagnostics={diagnostics}
          onFrameloopChange={handleFrameloopChange}
          onCanvasError={onCanvasError}
          progressRef={progressRef}
          renderRequestRef={renderRequestRef}
        />
        <JourneyWorld onBookInspect={onBookInspect} progressRef={progressRef} />
        <PrepareScene onReady={onCanvasReady} onError={onCanvasError} />
      </Canvas>
    </JourneyCanvasBoundary>
  )
}
