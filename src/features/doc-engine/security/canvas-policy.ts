import { DISCUSSION_LIMITS } from './render-limits'

export const CANVAS_SECURITY_POLICY = Object.freeze({
  maxWidth: 2_048,
  maxHeight: 2_048,
  maxPixels: 4_194_304,
  maxExecutionTimeMs: 2_000,
  maxInstancesPerDocument: DISCUSSION_LIMITS.maxSafeCanvasInstances,
} as const)

export function validateCanvasRequest(input: {
  readonly width: number
  readonly height: number
  readonly executionTimeMs?: number
}): string | undefined {
  if (
    !Number.isSafeInteger(input.width) ||
    !Number.isSafeInteger(input.height) ||
    input.width <= 0 ||
    input.height <= 0 ||
    input.width > CANVAS_SECURITY_POLICY.maxWidth ||
    input.height > CANVAS_SECURITY_POLICY.maxHeight ||
    input.width * input.height > CANVAS_SECURITY_POLICY.maxPixels
  ) {
    return 'Canvas 尺寸超过集中安全预算。'
  }
  if (
    input.executionTimeMs !== undefined &&
    (!Number.isFinite(input.executionTimeMs) ||
      input.executionTimeMs < 0 ||
      input.executionTimeMs > CANVAS_SECURITY_POLICY.maxExecutionTimeMs)
  ) {
    return 'Canvas 执行时间超过集中安全预算。'
  }
  return undefined
}
