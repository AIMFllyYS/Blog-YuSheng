#!/usr/bin/env node
/**
 * capture-home-journey.mjs — 首页 3D 叙事分幕截图验收工具（scripts/dev/）
 *
 * 用途：启动无头 Chromium，访问开发服务器首页，按滚动进度逐幕截图，
 *      供 home-journey 的视觉验收对照 storyboard 逐镜检查。
 *
 * 用法：
 *   node scripts/dev/capture-home-journey.mjs [--url http://localhost:9981] [--out .captures]
 *                                             [--progress 0,0.08,...,1] [--mobile] [--reduced]
 *
 * 参数：
 *   --url       开发服务器地址（默认 http://localhost:9981，见 docs/conventions/ports-and-env.md）
 *   --out       截图输出目录（默认 .captures/home-journey，已 gitignore 之外请自行清理）
 *   --progress  逗号分隔的进度列表（0–1），默认覆盖各章关键帧
 *   --mobile    移动端视口 + 触屏指针（验收 D12 卡片入口降级）
 *   --reduced   模拟 prefers-reduced-motion（验收直接呈现终态）
 *
 * 退出码：0 = 全部截图成功；1 = 参数/连接/渲染错误
 *
 * 说明：Chromium 使用本机 Playwright 缓存（~/AppData/Local/ms-playwright），
 *      不下载浏览器；找不到时回退系统 Edge/Chrome。
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright-core'

const args = process.argv.slice(2)
function argValue(flag, fallback) {
  const i = args.indexOf(flag)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}
if (args.includes('--help')) {
  console.log('node scripts/dev/capture-home-journey.mjs [--url URL] [--out DIR] [--progress 0,..,1] [--mobile] [--reduced]')
  process.exit(0)
}

const url = argValue('--url', 'http://localhost:9981')
const outDir = resolve(argValue('--out', '.captures/home-journey'))
const isMobile = args.includes('--mobile')
const isReduced = args.includes('--reduced')
const defaultProgress = [0, 0.02, 0.06, 0.15, 0.23, 0.3, 0.38, 0.46, 0.53, 0.6, 0.68, 0.73, 0.79, 0.85, 0.92, 0.975, 1]
const progressList = argValue('--progress', '')
  ? argValue('--progress', '').split(',').map(Number)
  : defaultProgress

function findChromium() {
  const cache = join(homedir(), 'AppData', 'Local', 'ms-playwright')
  if (existsSync(cache)) {
    const dirs = ['chromium-1234', 'chromium-1228', 'chromium-1223', 'chromium-1208', 'chromium-1187']
    for (const d of dirs) {
      const exe = join(cache, d, 'chrome-win', 'chrome.exe')
      if (existsSync(exe)) return exe
    }
  }
  const fallbacks = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ]
  for (const exe of fallbacks) if (existsSync(exe)) return exe
  throw new Error('找不到可用的 Chromium 浏览器（ms-playwright 缓存 / Chrome / Edge）')
}

const executablePath = findChromium()
mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })
try {
  const page = await browser.newPage({
    viewport: isMobile ? { width: 390, height: 844 } : { width: 1600, height: 900 },
    deviceScaleFactor: 1,
    isMobile,
    hasTouch: isMobile,
    reducedMotion: isReduced ? 'reduce' : 'no-preference',
    colorScheme: 'light',
  })
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.error('[console.error]', msg.text())
  })
  page.on('pageerror', (err) => console.error('[pageerror]', err.message))

  const mode = isMobile ? 'mobile' : isReduced ? 'reduced' : 'desktop'
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
  // 等 GL 画布就绪（移动端/reduced 无画布，直接过）
  await page
    .waitForSelector('canvas', { timeout: 15000 })
    .catch(() => console.warn('[warn] 未检测到 canvas（移动端/reduced 属预期）'))
  await page.waitForTimeout(1200)

  const meta = []
  for (const p of progressList) {
    if (!isMobile && !isReduced) {
      await page.evaluate((progress) => {
        const root = document.querySelector('.journey-stage')
        if (!root) return
        const track = root.getBoundingClientRect().height - window.innerHeight
        const top = root.offsetTop + track * progress
        window.scrollTo({ top, behavior: 'instant' })
      }, p)
      // scrub:1 平滑追赶需要留出时间
      await page.waitForTimeout(1600)
    }
    const name = `${mode}-p${String(Math.round(p * 1000)).padStart(4, '0')}.png`
    await page.screenshot({ path: join(outDir, name) })
    meta.push({ progress: p, file: name })
    console.log(`[shot] ${name}`)
  }
  writeFileSync(join(outDir, `manifest-${mode}.json`), JSON.stringify({ url, mode, shots: meta }, null, 2))
  console.log(`\n完成：${meta.length} 张截图 → ${outDir}`)
} finally {
  await browser.close()
}
