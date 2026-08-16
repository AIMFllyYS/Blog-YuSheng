import { expect, test } from '@playwright/test'

const EXPECTED_CODE = [
  '// 中文注释：复制内容必须逐字一致',
  'export function greet(name: string) {',
  '  const message = `你好，${name}`',
  '',
  '  return message + " / " + "这是一条用于验证横向滚动而不会撑破正文栏的超长代码行。".repeat(6)',
  '}',
].join('\n')

test('server-highlighted code remains scrollable and copies exactly', async ({
  context,
  page,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: 'http://localhost:9981',
  })
  await page.goto('/_dev/code-renderer/')

  const codeBlock = page.locator('[data-code-renderer="shiki-server"]')
  await expect(codeBlock).toBeVisible()
  await expect(codeBlock).toHaveAttribute('data-language', 'ts')
  expect(await codeBlock.locator('[data-code-token="true"]').count()).toBeGreaterThan(4)
  expect(
    await codeBlock.locator('code').evaluate((element) => element.textContent),
  ).toBe(EXPECTED_CODE)
  await expect(page.getByText('const answer = 42')).toBeVisible()

  const pre = codeBlock.locator('pre')
  expect(
    await pre.evaluate((element) => element.scrollWidth > element.clientWidth),
  ).toBe(true)

  const copy = page.getByRole('button', { name: '复制代码' })
  await copy.focus()
  await expect(copy).toBeFocused()
  await copy.press('Enter')
  await expect(page.getByRole('button', { name: '已复制' })).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(async () =>
        (await navigator.clipboard.readText()).replace(/\r\n/g, '\n'),
      ),
    )
    .toBe(EXPECTED_CODE)
})

test('the latest copy operation owns the visible result', async ({ page }) => {
  await page.addInitScript(() => {
    const operations: Array<{
      resolve: () => void
      reject: () => void
    }> = []
    Object.defineProperty(window, '__copyOperations', {
      configurable: true,
      value: operations,
    })
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: () =>
          new Promise<void>((resolve, reject) => {
            operations.push({ resolve, reject: () => reject(new Error('denied')) })
          }),
      },
    })
  })
  await page.goto('/_dev/code-renderer/')
  const copy = page.getByRole('button', { name: '复制代码' })
  await copy.click()
  await copy.click()
  await page.evaluate(() => {
    const operations = (window as unknown as {
      __copyOperations: Array<{ resolve: () => void; reject: () => void }>
    }).__copyOperations
    operations[1]?.resolve()
  })
  await expect(page.getByRole('button', { name: '已复制' })).toBeVisible()
  await page.evaluate(() => {
    const operations = (window as unknown as {
      __copyOperations: Array<{ resolve: () => void; reject: () => void }>
    }).__copyOperations
    operations[0]?.reject()
  })
  await expect(page.getByRole('button', { name: '已复制' })).toBeVisible()
})
