import type { NextConfig } from 'next'
import bundleAnalyzer from '@next/bundle-analyzer'

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
}

const analyze = process.env.ANALYZE === 'true'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: analyze,
  openAnalyzer: false,
})

const analyzed = withBundleAnalyzer(nextConfig)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function relaxCssModulePurity(config: unknown): void {
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) visit(item)
      return
    }
    if (!isRecord(node)) return
    if (Array.isArray(node.oneOf)) visit(node.oneOf)
    if (Array.isArray(node.rules)) visit(node.rules)
    const uses = node.use
    const list = Array.isArray(uses) ? uses : uses ? [uses] : []
    for (const use of list) {
      if (!isRecord(use)) continue
      const loader = use.loader
      if (typeof loader !== 'string' || !loader.includes('css-loader')) continue
      if (!isRecord(use.options) || !isRecord(use.options.modules)) continue
      if (use.options.modules.mode === 'pure') use.options.modules.mode = 'local'
    }
  }
  if (isRecord(config) && isRecord(config.module)) visit(config.module.rules)
}

type NextWebpack = NonNullable<NextConfig['webpack']>

export default analyze
  ? {
      ...analyzed,
      webpack(...args: Parameters<NextWebpack>) {
        const [config, options] = args
        relaxCssModulePurity(config)
        if (typeof analyzed.webpack === 'function') {
          return analyzed.webpack(config, options)
        }
        return config
      },
    }
  : nextConfig
