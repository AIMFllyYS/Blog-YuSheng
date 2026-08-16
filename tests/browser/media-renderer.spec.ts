import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'

test('article video and audio are reachable, playable, and never autoplay', async ({
  page,
}) => {
  const packageRoot = path.join(
    process.cwd(),
    'content',
    'posts',
    'p0-kitchen-sink',
    'media',
  )
  const fixtures = new Map([
    [
      '/media/video/demo.mp4',
      { body: await readFile(path.join(packageRoot, 'video', 'demo.mp4')), contentType: 'video/mp4' },
    ],
    [
      '/media/audio/demo.mp3',
      { body: await readFile(path.join(packageRoot, 'audio', 'demo.mp3')), contentType: 'audio/mpeg' },
    ],
    [
      '/media/images/poster.png',
      { body: await readFile(path.join(packageRoot, 'images', 'poster.png')), contentType: 'image/png' },
    ],
  ])
  await page.route(/\/media\/(?:video\/demo\.mp4|audio\/demo\.mp3|images\/poster\.png)$/, async (route) => {
    const match = [...fixtures.entries()].find(([suffix]) =>
      new URL(route.request().url()).pathname.endsWith(suffix),
    )
    if (!match) return route.abort()
    await route.fulfill(match[1])
  })
  await page.goto('/blog/p0-kitchen-sink/', { waitUntil: 'networkidle' })

  const videoCard = page.locator('[data-media-renderer="video"]')
  const audioCard = page.locator('[data-media-renderer="audio"]')
  const video = videoCard.locator('video')
  const audio = audioCard.locator('audio')

  await expect(videoCard.getByText('一秒钟验收视频')).toBeVisible()
  await expect(audioCard.getByText('一秒钟验收音频')).toBeVisible()
  await expect(video).toHaveAttribute('controls', '')
  await expect(audio).toHaveAttribute('controls', '')
  await expect(video).not.toHaveAttribute('autoplay', '')
  await expect(audio).not.toHaveAttribute('autoplay', '')
  await expect(video).toHaveJSProperty('paused', true)
  await expect(audio).toHaveJSProperty('paused', true)
  await expect(video).toHaveJSProperty('currentTime', 0)
  await expect(audio).toHaveJSProperty('currentTime', 0)

  const playButton = videoCard.getByRole('button', {
    name: '播放一秒钟验收视频',
  })
  await playButton.focus()
  await expect(playButton).toBeFocused()
  await playButton.press('Enter')
  await expect.poll(() => mediaTime(video)).toBeGreaterThan(0)

  await audio.evaluate(async (element) => {
    await (element as HTMLAudioElement).play()
  })
  await expect.poll(() => mediaTime(audio)).toBeGreaterThan(0)
})

async function mediaTime(locator: import('@playwright/test').Locator) {
  return locator.evaluate((element) => (element as HTMLMediaElement).currentTime)
}
