import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { PerspectiveCamera, Vector3 } from 'three'
import { rangeProgress, smootherStep } from '../motion/math'
import type { JourneyProgressRef } from '../types'

type JourneyCameraRigProps = {
  progressRef: JourneyProgressRef
}

function mix(start: number, end: number, progress: number) {
  return start + (end - start) * progress
}

export function JourneyCameraRig({ progressRef }: JourneyCameraRigProps) {
  const target = useMemo(() => new Vector3(), [])

  useFrame(({ camera }) => {
    const progress = progressRef.current?.progress ?? 0
    let cameraX = 0
    let cameraY = 0.1
    let cameraZ = mix(10.5, 9.35, smootherStep(rangeProgress(progress, 0, 0.22)))
    let targetY = 0
    let targetZ = 0
    let fieldOfView = 43

    if (progress >= 0.47 && progress < 0.5) {
      const orbit = smootherStep(rangeProgress(progress, 0.47, 0.5))
      cameraX = mix(0, 1.1, orbit)
      cameraY = mix(0.1, 5.35, orbit)
      cameraZ = mix(9.35, 7.1, orbit)
      targetY = mix(0, -0.12, orbit)
    } else if (progress >= 0.5 && progress < 0.56) {
      const descend = smootherStep(rangeProgress(progress, 0.5, 0.56))
      cameraX = mix(1.1, 0.72, descend)
      cameraY = mix(5.35, 4.55, descend)
      cameraZ = mix(7.1, 6.18, descend)
      targetY = -0.12
      fieldOfView = mix(43, 40.5, descend)
    } else if (progress >= 0.56 && progress < 0.75) {
      const openBook = smootherStep(rangeProgress(progress, 0.56, 0.75))
      cameraX = mix(0.72, 0.2, openBook)
      cameraY = mix(4.55, 5.65, openBook)
      cameraZ = mix(6.18, 7.45, openBook)
      targetY = mix(-0.12, 0, openBook)
      fieldOfView = mix(40.5, 43.5, openBook)
    } else if (progress >= 0.75 && progress < 0.82) {
      const riseToGate = smootherStep(rangeProgress(progress, 0.75, 0.82))
      cameraX = mix(0.2, 0, riseToGate)
      cameraY = mix(5.65, 0.35, riseToGate)
      cameraZ = mix(7.45, 10, riseToGate)
      targetY = mix(0, 0.2, riseToGate)
      fieldOfView = mix(43.5, 47, riseToGate)
    } else if (progress >= 0.82 && progress < 0.88) {
      const gateReveal = smootherStep(rangeProgress(progress, 0.82, 0.88))
      cameraY = mix(0.35, 0.2, gateReveal)
      cameraZ = mix(10, 9.5, gateReveal)
      targetY = 0.2
      fieldOfView = mix(47, 44, gateReveal)
    } else if (progress >= 0.88 && progress < 0.95) {
      const passage = smootherStep(rangeProgress(progress, 0.88, 0.95))
      cameraY = mix(0.2, 0.02, passage)
      cameraZ = mix(9.5, -3.8, passage)
      targetY = mix(0.2, 0.02, passage)
      targetZ = mix(0, -10, passage)
      fieldOfView = mix(44, 49, passage)
    } else if (progress >= 0.95) {
      const epilogue = smootherStep(rangeProgress(progress, 0.95, 1))
      cameraY = 0.02
      cameraZ = mix(-3.8, -5.2, epilogue)
      targetZ = mix(-10, -17, epilogue)
      fieldOfView = mix(49, 44, epilogue)
    }

    camera.position.set(cameraX, cameraY, cameraZ)
    target.set(0, targetY, targetZ)
    camera.lookAt(target)

    if (camera instanceof PerspectiveCamera && camera.fov !== fieldOfView) {
      camera.fov = fieldOfView
      camera.updateProjectionMatrix()
    }
  })

  return null
}
