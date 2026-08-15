export function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}
export function rangeProgress(value: number, start: number, end: number) {
  if (end <= start) return value >= end ? 1 : 0
  return clamp01((value - start) / (end - start))
}

export function smootherStep(value: number) {
  const t = clamp01(value)
  return t * t * t * (t * (t * 6 - 15) + 10)
}

export function easeOutCubic(value: number) {
  const t = clamp01(value)
  return 1 - (1 - t) ** 3
}

export function seededUnit(seed: number, id: string | number, channel: string) {
  let hash = (seed >>> 0) ^ 0x811c9dc5
  const input = `${id}:${channel}`

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }

  hash ^= hash >>> 16
  hash = Math.imul(hash, 0x7feb352d)
  hash ^= hash >>> 15
  return (hash >>> 0) / 0x100000000
}
