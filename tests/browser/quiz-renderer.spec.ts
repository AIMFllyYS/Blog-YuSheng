import { expect, test } from '@playwright/test'

test('choice and fill quizzes grade locally without persistence or runtime JSON requests', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const writes: string[] = []
    Object.defineProperty(window, '__quizStorageWrites', {
      configurable: false,
      value: writes,
    })
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function setItem(key, value) {
      writes.push(`${key}=${value}`)
      return original.call(this, key, value)
    }
  })
  let runtimeJsonRequests = 0
  await page.route('**/data/*question*.json', (route) => {
    runtimeJsonRequests += 1
    return route.abort()
  })
  await page.goto('/blog/p0-kitchen-sink/')

  const single = page.locator('[data-node-id="choice-basics"]')
  await single.scrollIntoViewIfNeeded()
  await expect(single).toHaveAttribute('data-quiz-kind', 'choice')
  await expect(single.getByRole('radio')).toHaveCount(3)
  await single.getByLabel('content/posts/<slug>/index.md').check()
  await single.getByRole('button', { name: '检查答案' }).click()
  await expect(single.locator('[data-quiz-feedback="correct"]')).toContainText(
    '仓库中的 index.md 是正式文章正本。',
  )

  const multiple = page.locator('[data-node-id="choice-multiple"]')
  await expect(multiple.getByRole('checkbox')).toHaveCount(3)
  await multiple.getByLabel('Markdown 正文').check()
  await multiple.getByLabel('文章包内资源').check()
  await multiple.getByRole('button', { name: '检查答案' }).click()
  await expect(multiple.locator('[data-quiz-feedback="correct"]')).toBeVisible()
  await multiple.getByRole('button', { name: '重新作答' }).click()
  await multiple.getByLabel('Markdown 正文').check()
  await multiple.getByRole('button', { name: '检查答案' }).click()
  await expect(multiple.locator('[data-quiz-feedback="incorrect"]')).toBeVisible()

  const fill = page.locator('[data-node-id="fill-basics"]')
  const input = fill.getByRole('textbox')
  await input.fill('  SLUG  ')
  await fill.getByRole('button', { name: '检查答案' }).click()
  await expect(fill.locator('[data-quiz-feedback="correct"]')).toBeVisible()
  await fill.getByRole('button', { name: '重新作答' }).click()
  await input.fill('文章标识')
  await fill.getByRole('button', { name: '检查答案' }).click()
  await expect(fill.locator('[data-quiz-feedback="correct"]')).toBeVisible()
  await fill.getByRole('button', { name: '重新作答' }).click()
  await input.fill('错误答案')
  await fill.getByRole('button', { name: '检查答案' }).click()
  await expect(fill.locator('[data-quiz-feedback="incorrect"]')).toContainText(
    '回答不正确',
  )

  expect(runtimeJsonRequests).toBe(0)
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { __quizStorageWrites: string[] })
          .__quizStorageWrites,
    ),
  ).toEqual([])
})

test('quiz controls are reachable and operable from the keyboard', async ({ page }) => {
  await page.goto('/blog/p0-kitchen-sink/')
  const single = page.locator('[data-node-id="choice-basics"]')
  await single.scrollIntoViewIfNeeded()
  const firstRadio = single.getByRole('radio').first()
  await firstRadio.focus()
  await page.keyboard.press('Space')
  await expect(firstRadio).toBeChecked()
  const check = single.getByRole('button', { name: '检查答案' })
  await check.focus()
  await page.keyboard.press('Enter')
  await expect(single.locator('[data-quiz-feedback="correct"]')).toBeVisible()
})
