/**
 * 确定性随机：从 (seed, elementId, channel) 派生，禁止消耗全局随机流。
 * 元素重排不改变既有元素的取值（skill：deterministic procedural motion）。
 */

/** 32 位哈希混合（splitmix 风格） */
function mix32(n: number): number {
  n |= 0
  n = Math.imul(n ^ (n >>> 16), 0x21f0aaad)
  n = Math.imul(n ^ (n >>> 15), 0x735a2d97)
  return (n ^ (n >>> 15)) >>> 0
}

/** 由 (seed, elementId, channel) 得到 [0, 1) 的确定性随机值 */
export function seededUnit(seed: number, elementId: number, channel: number): number {
  const h = mix32(seed ^ mix32(elementId * 0x9e3779b1 + channel * 0x85ebca77))
  return h / 4294967296
}

/** [min, max) 区间的确定性随机值 */
export function seededRange(
  seed: number,
  elementId: number,
  channel: number,
  min: number,
  max: number,
): number {
  return min + seededUnit(seed, elementId, channel) * (max - min)
}
