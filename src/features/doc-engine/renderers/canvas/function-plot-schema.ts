import { z } from 'zod'

const FINITE_NUMBER = z.number().finite()
const BOUNDED_PAIR = z
  .tuple([FINITE_NUMBER, FINITE_NUMBER])
  .refine(([start, end]) => start < end, '区间起点必须小于终点。')
  .refine(
    ([start, end]) => Math.abs(start) <= 1_000 && Math.abs(end) <= 1_000,
    '区间端点的绝对值不得超过 1000。',
  )

export const FUNCTION_PLOT_DATA_SCHEMA = z
  .object({
    expression: z.enum(['sin(x)', 'cos(x)', 'x', 'x^2']),
    domain: BOUNDED_PAIR.refine(([start, end]) => end - start <= 100),
    range: BOUNDED_PAIR.refine(([start, end]) => end - start <= 100),
    samples: z.number().int().min(16).max(1_000),
  })
  .strict()

export type FunctionPlotData = z.infer<typeof FUNCTION_PLOT_DATA_SCHEMA>
