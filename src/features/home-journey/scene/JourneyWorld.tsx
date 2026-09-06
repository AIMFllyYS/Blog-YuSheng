import { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import type { JourneyProgressRef } from '../types'
import { Atmosphere } from './Atmosphere'
import { GalaxyNebula } from './galaxy-nebula'
import { BoundBook } from './BoundBook'
import { JourneyCameraRig } from './JourneyCameraRig'
import { LightGate } from './LightGate'
import { readJourneyPalette } from './palette'
import { WordVortex } from './WordVortex'

type JourneyWorldProps = {
  onBookInspect?: (event: { detail: 'binding' | 'seal' | 'pages' }) => void
  progressRef: JourneyProgressRef
}

export function JourneyWorld({ onBookInspect, progressRef }: JourneyWorldProps) {
  const gl = useThree((state) => state.gl)
  const palette = useMemo(() => readJourneyPalette(gl.domElement), [gl])

  return (
    <>
      <JourneyCameraRig progressRef={progressRef} />
      <GalaxyNebula palette={palette} progressRef={progressRef} />

      <ambientLight color={palette.voidRaised} intensity={0.56} />
      <directionalLight
        color={palette.paper}
        intensity={1.34}
        position={[3.5, 7.5, 6]}
      />
      <pointLight
        color={palette.goldSoft}
        decay={1.8}
        distance={18}
        intensity={2.2}
        position={[-4, 2.5, 4]}
      />

      <Atmosphere
        gold={palette.gold}
        goldSoft={palette.goldSoft}
        starCool={palette.starCool}
        progressRef={progressRef}
      />
      <WordVortex color={palette.gold} progressRef={progressRef} />
      <BoundBook onInspect={onBookInspect} palette={palette} progressRef={progressRef} />
      <LightGate palette={palette} progressRef={progressRef} />
    </>
  )
}
