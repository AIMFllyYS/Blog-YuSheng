import { spawn } from 'node:child_process'
import { readdir, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
const projectRoot = process.cwd()
const analyze = process.env.ANALYZE === 'true'

// `pnpm dev` mirrors article assets into public/ so Next dev can serve them.
// `output: 'export'` copies public/ verbatim into out/, so a stale mirror would
// smuggle deleted or renamed files into the static output. Keep in sync with
// src/server/content/dev-asset-mirror.ts.
async function cleanDevAssetMirror() {
  const publicRoot = path.join(projectRoot, 'public')
  await rm(path.join(publicRoot, 'blog'), { recursive: true, force: true })
  await rm(path.join(publicRoot, 'media'), { recursive: true, force: true })
  const embedsRoot = path.join(publicRoot, 'embeds')
  let entries = []
  try {
    entries = await readdir(embedsRoot, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (entry.name === '_runtime') continue
    await rm(path.join(embedsRoot, entry.name), {
      recursive: true,
      force: true,
    })
  }
}

function run(args, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      stdio: 'inherit',
      env: process.env,
      windowsHide: true,
    })
    child.on('error', reject)
    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`[build] ${label} terminated by signal ${signal}`))
        return
      }
      if (code !== 0) {
        reject(new Error(`[build] ${label} exited with code ${code}`))
        return
      }
      resolve()
    })
  })
}

async function main() {
  await cleanDevAssetMirror()

  const nextArgs = [require.resolve('next/dist/bin/next'), 'build']
  if (analyze) {
    nextArgs.push('--webpack')
    console.warn(
      '[build] ANALYZE=true uses webpack and overwrites out/. Official first-screen numbers need pnpm build with ANALYZE unset afterwards.',
    )
  }
  await run(nextArgs, 'next build')

  // Article assets and anchor manifests are written into out/ here rather than
  // by a postbuild hook: EdgeOne runs `pnpm run build`, and relying on pnpm's
  // pre/post script lifecycle would let a config change silently ship a static
  // site with no article media while the build still exits 0. Vitest is the
  // runner because the emitters are TypeScript with `server-only` imports that
  // scripts/build/vitest.config.ts already aliases away.
  const vitestRoot = path.dirname(require.resolve('vitest/package.json'))
  await run(
    [
      path.join(vitestRoot, 'vitest.mjs'),
      'run',
      '--config',
      'scripts/build/vitest.config.ts',
    ],
    'content asset emit',
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
