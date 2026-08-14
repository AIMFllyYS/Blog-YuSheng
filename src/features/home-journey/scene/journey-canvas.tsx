'use client'

/**
 * GL 场景根（仅客户端经 next/dynamic 加载；移动端与 reduced-motion 永不下载本 chunk）。
 * 场景固定一套视觉（D11）；frameloop 常开 —— 序幕待机微动要求画面永远是活的。
 */
import { Canvas } from '@react-three/fiber'
import type { RefObject } from 'react'
import { JOURNEY_PALETTE, WORLD } from '../constants'
import type { JourneyChannels } from '../types'
import { CameraRig } from './camera-rig'
import { GlyphSwarm } from './glyph-swarm'
import { LightGate } from './light-gate'
import { Starfield } from './starfield'
import { ThreadBook } from './thread-book'

interface JourneyCanvasProps {
  channelsRef: RefObject<JourneyChannels>
  onReady: () => void
}

export default function JourneyCanvas({ channelsRef, onReady }: JourneyCanvasProps) {
  return (
    <div className="absolute inset-0" role="img" aria-label="羽升 · 羽化成蝶 升生不息 · 星空活字叙事">
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        camera={{ fov: WORLD.cameraFov, near: 0.1, far: 90, position: [0, 0.3, WORLD.cameraZ] }}
        onCreated={() => onReady()}
      >
        <color attach="background" args={[JOURNEY_PALETTE.space]} />
        <fog attach="fog" args={[JOURNEY_PALETTE.space, 14, 60]} />
        <ambientLight intensity={0.62} />
        <directionalLight position={[3, 5, 6]} intensity={1.7} color="#ffedd0" />
        <directionalLight position={[-4, 1.5, 3]} intensity={0.5} color="#8fa3d8" />
        <Starfield channelsRef={channelsRef} />
        <GlyphSwarm channelsRef={channelsRef} />
        <ThreadBook channelsRef={channelsRef} />
        <LightGate channelsRef={channelsRef} />
        <CameraRig channelsRef={channelsRef} />
      </Canvas>
    </div>
  )
}
