import { FUNCTION_PLOT_DATA_SCHEMA } from '../renderers/canvas/function-plot-schema'

export type CanvasRendererModule = typeof import('../renderers/canvas/function-plot')

export type CanvasRendererRegistration = {
  readonly key: string
  readonly version: number
  readonly description: string
  readonly validateData: (value: unknown) => boolean
  readonly parseData: (value: unknown) => unknown | undefined
  readonly load: () => Promise<CanvasRendererModule>
  readonly draw: (
    canvas: HTMLCanvasElement,
    data: unknown,
    zoom: number,
    deadlineAt: number,
  ) => Promise<void>
}

const REGISTRATIONS = Object.freeze<CanvasRendererRegistration[]>([
  Object.freeze({
    key: 'function-plot',
    version: 1,
    description: '受审的静态函数曲线绘制器',
    validateData: (value: unknown) => FUNCTION_PLOT_DATA_SCHEMA.safeParse(value).success,
    parseData: (value: unknown) => {
      const parsed = FUNCTION_PLOT_DATA_SCHEMA.safeParse(value)
      return parsed.success ? parsed.data : undefined
    },
    load: () => import('../renderers/canvas/function-plot'),
    draw: async (canvas, data, zoom, deadlineAt) => {
      const parsed = FUNCTION_PLOT_DATA_SCHEMA.safeParse(data)
      if (!parsed.success) throw new Error('Canvas 数据未通过受审 schema。')
      const implementation = await import('../renderers/canvas/function-plot')
      implementation.drawFunctionPlot(canvas, parsed.data, zoom, deadlineAt)
    },
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
