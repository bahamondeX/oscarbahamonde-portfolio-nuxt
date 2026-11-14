import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { renderedLogoContrast } from '../../scripts/rendered-logo-contrast.mjs'

for (const theme of ['light', 'dark']) test(`${theme}: rendered experience logos have at least 3:1 recognizable foreground contrast`, async ({ page }, info) => {
  test.setTimeout(120_000)
  await page.addInitScript(value => localStorage.setItem('portfolio-theme', value), theme)
  await page.goto('/es')
  await expect(page.locator('html')).toHaveClass(new RegExp(theme))
  const logos = page.locator('.company-logo-chip > img')
  expect(await logos.count()).toBeGreaterThanOrEqual(5)
  const results = []
  for (const logo of await logos.all()) {
    await logo.scrollIntoViewIfNeeded()
    await expect(logo).toBeVisible()
    await expect.poll(() => logo.evaluate(el => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0)).toBe(true)
    const src = await logo.getAttribute('src')
    const name = (await logo.getAttribute('alt')) || src!
    expect(src).toMatch(/^\/logos\/[\w-]+\.png$/)
    const box = await logo.boundingBox()
    const visible = await page.screenshot({ clip: box!, animations: 'disabled' })
    await logo.evaluate(el => { (el as HTMLElement).style.visibility = 'hidden' })
    const hidden = await page.screenshot({ clip: box!, animations: 'disabled' })
    await logo.evaluate(el => { (el as HTMLElement).style.visibility = '' })
    const source = await readFile(path.join(process.cwd(), 'public', src!.slice(1)))
    const result = { name, theme, ...await renderedLogoContrast(source, visible, hidden) }
    results.push(result)
    await info.attach(`${theme}-${name.replace(/[^a-z0-9]/gi, '-')}`, { body: visible, contentType: 'image/png' })
    // p10 >= 3 means at least 90% of solid recognizable foreground clears 3:1.
    // No average across transparent areas or flat opaque backing can mask failure.
    expect.soft(result.p10, `${name}: ${JSON.stringify(result)}`).toBeGreaterThanOrEqual(3)
  }
  await info.attach(`contrast-${theme}.json`, { body: JSON.stringify(results, null, 2), contentType: 'application/json' })
})
