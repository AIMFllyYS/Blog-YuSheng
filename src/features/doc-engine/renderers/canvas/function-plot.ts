import type { FunctionPlotData } from './function-plot-schema'

export function drawFunctionPlot(
  canvas: HTMLCanvasElement,
  data: FunctionPlotData,
  zoom: number,
  deadlineAt = Number.POSITIVE_INFINITY,
): void {
  const context = canvas.getContext('2d')
  if (!context) throw new Error('浏览器无法创建 Canvas 2D 上下文。')
  const { width, height } = canvas
  const [x0, x1] = data.domain
  const middle = (data.range[0] + data.range[1]) / 2
  const span = (data.range[1] - data.range[0]) / zoom
  const y0 = middle - span / 2
  const y1 = middle + span / 2
  const px = (x: number) => ((x - x0) / (x1 - x0)) * width
  const py = (y: number) => height - ((y - y0) / (y1 - y0)) * height
  context.clearRect(0, 0, width, height)
  context.fillStyle = '#f7efd9'
  context.fillRect(0, 0, width, height)
  context.strokeStyle = '#a58d68'
  context.lineWidth = 1
  context.beginPath()
  context.moveTo(0, py(0)); context.lineTo(width, py(0))
  context.moveTo(px(0), 0); context.lineTo(px(0), height)
  context.stroke()
  context.strokeStyle = '#794018'
  context.lineWidth = 2
  context.beginPath()
  for (let index = 0; index <= data.samples; index += 1) {
    if (index % 32 === 0 && performance.now() > deadlineAt) {
      throw new Error('Canvas 绘制超过集中执行时间预算。')
    }
    const x = x0 + ((x1 - x0) * index) / data.samples
    const y = evaluate(data.expression, x)
    if (index === 0) context.moveTo(px(x), py(y))
    else context.lineTo(px(x), py(y))
  }
  context.stroke()
  canvas.dataset.canvasDrawn = 'true'
}

function evaluate(expression: FunctionPlotData['expression'], x: number): number {
  if (expression === 'sin(x)') return Math.sin(x)
  if (expression === 'cos(x)') return Math.cos(x)
  if (expression === 'x^2') return x * x
  return x
}
