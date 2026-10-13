import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { loadLocalEnv } from './load-env.mjs'

loadLocalEnv()

const require = createRequire(import.meta.url)
const nextCli = require.resolve('next/dist/bin/next')
const childOptions = {
  stdio: 'inherit',
  env: process.env,
  windowsHide: true,
}

const api = spawn(process.execPath, ['scripts/dev/admin-api.mjs'], childOptions)
const next = spawn(process.execPath, [nextCli, 'dev', '-p', '9981'], childOptions)

let shuttingDown = false

function stop(code) {
  if (shuttingDown) return
  shuttingDown = true
  if (api.exitCode === null) api.kill()
  if (next.exitCode === null) next.kill()
  process.exit(code)
}

api.on('exit', (code) => {
  if (!shuttingDown) stop(code ?? 1)
})
next.on('exit', (code, signal) => {
  if (signal) stop(1)
  else if (!shuttingDown) stop(code ?? 1)
})

process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))
