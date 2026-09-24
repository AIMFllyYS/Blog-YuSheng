// 逐帧渲染 composition.html → MP4（H.264 + AAC）。
//
// 依赖不进项目 package.json：在任意工作目录装好后用 PROMO_DEPS 指过来
//   npm i playwright-core @fontsource/noto-serif-sc @fontsource/ma-shan-zheng @fontsource/jetbrains-mono
//   PROMO_DEPS=<该目录> FFMPEG=<ffmpeg 路径> node render.mjs [--stills 1.2,5.6] [--fps 60] [--out out/x.mp4]
//
// 音频由 music.py 生成，默认读 out/music.wav。

import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { spawn, execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const deps = process.env.PROMO_DEPS ?? here
const require = createRequire(path.join(deps, 'package.json'))
const { chromium } = require('playwright-core')

const args = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : fallback
}
const FPS = Number(opt('fps', 60))
const DURATION = Number(opt('duration', 30))
const OUT = path.resolve(here, opt('out', 'out/yusheng-blog-promo.mp4'))
const AUDIO = path.resolve(here, opt('audio', 'out/music.wav'))
const STILLS = opt('stills', null)
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg'
const CHROME = process.env.CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.js': 'text/javascript' }
const server = createServer(async (req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  let file
  if (url === '/' || url === '/composition.html') file = path.join(here, 'composition.html')
  else if (url.startsWith('/fonts/')) {
    const [, , pkg, ...rest] = url.split('/')
    file = path.join(deps, 'node_modules/@fontsource', pkg, ...rest)
  } else file = path.join(here, url)
  try {
    const body = await readFile(file)
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404).end()
  }
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const port = server.address().port

const browser = await chromium.launch({ executablePath: CHROME, args: ['--force-color-profile=srgb', '--disable-lcd-text', '--font-render-hinting=none'] })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()) })
page.on('pageerror', (e) => console.error('[pageerror]', e.message))
await page.goto(`http://127.0.0.1:${port}/composition.html`)
const info = await page.evaluate(() => window.__ready)
console.log('ready', info)

await mkdir(path.dirname(OUT), { recursive: true })

if (STILLS) {
  const dir = path.join(path.dirname(OUT), 'stills')
  await mkdir(dir, { recursive: true })
  for (const s of STILLS.split(',').map(Number)) {
    await page.evaluate((t) => window.__render(t), s)
    const f = path.join(dir, `t${s.toFixed(2).padStart(5, '0')}.jpg`)
    await page.screenshot({ path: f, type: 'jpeg', quality: 88 })
    console.log('still', f)
  }
} else {
  const total = Math.round(FPS * DURATION)
  const ff = spawn(FFMPEG, [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-i', AUDIO,
    '-map', '0:v', '-map', '1:a',
    '-c:v', 'libx264', '-preset', 'slow', '-b:v', '6M', '-maxrate', '8M', '-bufsize', '16M', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-movflags', '+faststart',
    '-af', 'volume=-3dB', // music.wav 约 -11 LUFS → 约 -14
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-t', String(DURATION),
    OUT,
  ], { stdio: ['pipe', 'inherit', 'inherit'] })
  const t0 = Date.now()
  for (let i = 0; i < total; i++) {
    await page.evaluate(([t, f]) => window.__render(t, f), [i / FPS, i])
    const buf = await page.screenshot({ type: 'jpeg', quality: 94 })
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r))
    if (i % 60 === 0) console.log(`frame ${i}/${total}  ${((Date.now() - t0) / 1000).toFixed(0)}s`)
  }
  ff.stdin.end()
  await new Promise((r, j) => ff.on('close', (c) => (c === 0 ? r() : j(new Error('ffmpeg exit ' + c)))))
  console.log('wrote', OUT)
  try { console.log(execFileSync(FFMPEG, ['-hide_banner', '-i', OUT], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })) } catch (e) { console.log(String(e.stderr).split('\n').filter((l) => /Duration|Stream/.test(l)).join('\n')) }
}

await browser.close()
server.close()
