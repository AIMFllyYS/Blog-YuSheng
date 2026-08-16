export type CanvasRendererRegistration = {
  readonly key: string
  readonly version: number
  readonly description: string
}

const REGISTRATIONS = Object.freeze<CanvasRendererRegistration[]>([
  Object.freeze({
    key: 'function-plot',
    version: 1,
    description: '受审的静态函数曲线绘制器',
  }),
])

export function hasCanvasRenderer(key: string): boolean {
  return REGISTRATIONS.some((registration) => registration.key === key)
}

export function getCanvasRendererRegistration(
  key: string,
): CanvasRendererRegistration | undefined {
  return REGISTRATIONS.find((registration) => registration.key === key)
}

export function listCanvasRendererRegistrations(): readonly CanvasRendererRegistration[] {
  return REGISTRATIONS
}
