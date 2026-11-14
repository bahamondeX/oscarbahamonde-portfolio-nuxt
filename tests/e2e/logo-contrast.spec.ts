import { test, expect } from '@playwright/test'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { renderedLogoContrast } from '../../scripts/rendered-logo-contrast.mjs'
const entries = JSON.parse(readFileSync(new URL('../../data/experience.json', import.meta.url), 'utf8')) as { logo: string | null }[]

for (const locale of ['es', 'en']) for (const theme of ['light', 'dark']) {
  test(`${locale}/${theme}: rendered experience logo contrast`, async ({ page }, info) => {
    test.setTimeout(180_000)
    const variant = `${locale}-${theme}-${info.project.name}`
    const directory = path.join(process.cwd(), 'docs/audit/after/logo-captures', variant)
    await mkdir(directory, { recursive: true })
    await page.addInitScript(value => localStorage.setItem('portfolio-theme', value), theme)
    await page.goto(`/${locale}`)
    await expect(page.locator('html')).toHaveClass(new RegExp(theme))
    const logos = page.locator('.company-logo-chip > img')
    expect(await logos.count()).toBe(entries.filter(item => item.logo).length)
    const results = []
    for (const logo of await logos.all()) {
      // Center the image above the fixed dock; "if needed" can leave it occluded.
      await logo.evaluate(el => el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }))
      await expect(logo).toBeVisible()
      await expect.poll(() => logo.evaluate(el => {
        const box = el.getBoundingClientRect()
        return [[.05, .05], [.95, .05], [.05, .95], [.95, .95], [.5, .5]].every(([x, y]) =>
          document.elementFromPoint(box.x + box.width * x, box.y + box.height * y) === el)
      })).toBe(true)
      await expect.poll(() => logo.evaluate(el => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0)).toBe(true)
      const src = (await logo.getAttribute('src'))!
      const name = (await logo.getAttribute('alt')) || src
      const id = (await logo.locator('xpath=ancestor::li[@data-company-id]').getAttribute('data-company-id'))!
      expect(src).toMatch(/^\/logos\/[\w-]+\.png$/)
      const box = await logo.boundingBox()
      // Locator screenshots follow the element after scrolling, avoiding viewport/document mismatch.
      const visible = await logo.screenshot({ animations: 'disabled', scale: 'css' })
      const originalOpacity = await logo.evaluate(el => (el as HTMLElement).style.opacity)
      let hidden: Buffer
      try {
        // Opacity preserves the box and screenshot eligibility.
        await logo.evaluate(el => { (el as HTMLElement).style.opacity = '0' })
        hidden = await logo.screenshot({ animations: 'disabled', scale: 'css' })
      } finally {
        await logo.evaluate((el, value) => { (el as HTMLElement).style.opacity = value }, originalOpacity)
      }
      await writeFile(path.join(directory, `${id}.png`), visible)
      await writeFile(path.join(directory, `${id}-background.png`), hidden!)
      const source = await readFile(path.join(process.cwd(), 'public', src.slice(1)))
      const result = { id, name, src, locale, theme, device: info.project.name, box, ...await renderedLogoContrast(source, visible, hidden!) }
      results.push({ ...result, pass: result.p10 >= 3 })
      await info.attach(`${variant}-${id}`, { body: visible, contentType: 'image/png' })
      expect.soft(result.p10, `${name}: ${JSON.stringify(result)}`).toBeGreaterThanOrEqual(3)
    }
    await writeFile(path.join(directory, 'results.json'), JSON.stringify({
      checkedAt: new Date().toISOString(), url: page.url(), variant,
      viewport: page.viewportSize(), browser: info.project.use.browserName || 'chromium',
      measurement: '10th percentile of eroded solid brand foreground against rendered backing; minimum and fractionAbove3 also recorded', results,
    }, null, 2))
  })
}
