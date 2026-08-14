#!/usr/bin/env node
/**
 * verify-home-journey.mjs — 首页 3D 叙事交互断言（scripts/dev/）
 *
 * 用途：无头 Chromium 对开发服务器首页做行为级验收：
 *   1. 磁吸回卷：滚动到第一章 24% 局部进度（< SNAP_THRESHOLD 0.4）应吸回 0
 *   2. 磁吸前进：滚动到第一章 60% 局部进度应吸到章末 0.25
 *   3. 跳过按钮：点击「跳过 → 直接入门」应直达终态（尾声揭示、入口可操作）
 *   4. 入口链接：尾声入口卡应带站内 href
 *
 * 用法：node scripts/dev/verify-home-journey.mjs [--url http://localhost:9981]
 * 退出码：0 = 全部断言通过；1 = 任一断言失败 / 运行错误
 */

import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright-core'

const args = process.argv.slice(2)
function argValue(flag, fallback) {
  const i = args.indexOf(flag)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}
const url = argValue('--url', 'http://localhost:9981')

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
  throw new Error('找不到可用的 Chromium 浏览器')
}

const results = []
function check(name, ok, detail) {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

/** 当前滚动进度（与 capture 脚本同一套几何） */
function readProgress() {
  const root = document.querySelector('.journey-stage')
  if (!root) return -1
  const track = root.getBoundingClientRect().height - window.innerHeight
  return track > 0 ? (window.scrollY - root.offsetTop) / track : -1
}

function scrollToProgress(p) {
  const root = document.querySelector('.journey-stage')
  if (!root) return
  const track = root.getBoundingClientRect().height - window.innerHeight
  window.scrollTo({ top: root.offsetTop + track * p, behavior: 'instant' })
}

const browser = await chromium.launch({ executablePath: findChromium(), headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
  page.on('pageerror', (err) => console.error('[pageerror]', err.message))
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForSelector('canvas', { timeout: 15000 })
  await page.waitForTimeout(1500)

  /* 1. 磁吸回卷：0.06（第一章 local 0.24 < 0.4）→ 吸回 0 */
  await page.evaluate(scrollToProgress, 0.06)
  await page.waitForTimeout(3000)
  const p1 = await page.evaluate(readProgress)
  check('磁吸回卷（0.06 → 0）', Math.abs(p1) < 0.02, `实际进度 ${p1.toFixed(4)}`)

  /* 2. 磁吸前进：0.15（第一章 local 0.6 > 0.4）→ 吸到 0.25 */
  await page.evaluate(scrollToProgress, 0.15)
  await page.waitForTimeout(3000)
  const p2 = await page.evaluate(readProgress)
  check('磁吸前进（0.15 → 0.25）', Math.abs(p2 - 0.25) < 0.02, `实际进度 ${p2.toFixed(4)}`)

  /* 3. 跳过按钮 → 直达终态 */
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForSelector('canvas', { timeout: 15000 })
  await page.waitForTimeout(1200)
  await page.click('[data-skip]')
  await page.waitForTimeout(4000)
  const p3 = await page.evaluate(readProgress)
  const epilogueOpacity = await page.evaluate(() => {
    const el = document.querySelector('[data-epilogue]')
    return el ? Number(getComputedStyle(el).opacity) : -1
  })
  const entryState = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-entry]')]
    const links = [...document.querySelectorAll('a[data-entry]')]
    return {
      count: cards.length,
      minOpacity: Math.min(...cards.map((c) => Number(getComputedStyle(c).opacity))),
      linkCount: links.length,
      hrefs: links.map((l) => l.getAttribute('href') ?? ''),
    }
  })
  const skipHidden = await page.evaluate(() => {
    const el = document.querySelector('[data-skip]')
    return el ? Number(getComputedStyle(el).opacity) < 0.1 : false
  })
  check('跳过直达终态（进度 ≥0.96）', p3 >= 0.96, `实际进度 ${p3.toFixed(4)}`)
  check('尾声揭示（epilogue opacity ≈1）', epilogueOpacity > 0.95, `opacity ${epilogueOpacity}`)
  check(
    `入口卡全部亮起（${entryState.count} 张）`,
    entryState.count >= 4 && entryState.minOpacity > 0.9,
    `minOpacity ${entryState.minOpacity.toFixed(2)}`,
  )
  check(
    '现役入口带站内链接（筹备位为无链接占位）',
    entryState.linkCount >= 1 && entryState.hrefs.every((h) => h.startsWith('/')),
    `${entryState.linkCount} 个链接：${entryState.hrefs.join(', ')}`,
  )
  check('跳过后跳过按钮隐去', skipHidden)
} finally {
  await browser.close()
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} 项通过`)
process.exit(failed.length ? 1 : 0)
