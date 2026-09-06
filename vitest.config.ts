import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      'server-only': fileURLToPath(
        new URL('./tests/stubs/server-only.ts', import.meta.url),
      ),
    },
  },
  test: {
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    // Content fixtures run native AVIF transforms. Parallel forks compete
    // for the hosted runner's CPUs and can exceed the unchanged 5s timeout.
    ...(process.env.CI ? { minWorkers: 1, maxWorkers: 1 } : {}),
  },
})
