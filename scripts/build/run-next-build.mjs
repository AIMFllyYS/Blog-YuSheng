import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const nextCli = require.resolve('next/dist/bin/next')
const analyze = process.env.ANALYZE === 'true'
const args = [nextCli, 'build']
if (analyze) {
  args.push('--webpack')
  console.warn(
    '[build] ANALYZE=true uses webpack and overwrites out/. Official first-screen numbers need pnpm build with ANALYZE unset afterwards.',
  )
}

const child = spawn(process.execPath, args, {
  stdio: 'inherit',
  env: process.env,
  windowsHide: true,
})
child.on('exit', (code, signal) => {
  if (signal || code) process.exit(code ?? 1)
  import('../lib/write-admin-catalog.mjs')
    .then((mod) => mod.writeAdminCatalog())
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
})
