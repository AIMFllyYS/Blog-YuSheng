import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      'server-only': fileURLToPath(
        new URL('../../tests/stubs/server-only.ts', import.meta.url),
      ),
    },
  },
  test: {
    testTimeout: 60_000,
    hookTimeout: 60_000,
    include: [
      'scripts/build/run-content-assets.test.ts',
      'scripts/build/run-brief-assets.test.ts',
      'scripts/build/verify-katex-static-render.test.tsx',
      'scripts/build/write-anchor-manifests.test.ts',
      'scripts/build/verify-article-payload.test.ts',
    ],
  },
})
