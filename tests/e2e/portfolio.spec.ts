import { test, expect, type Page } from '@playwright/test'

const slot = '2030-11-20T14:00:00.000Z'

test.beforeEach(async ({ page }) => {
  // No external booking, email, model call or payment is made by this suite.
  await page.route('**/api/availability?**', route => route.fulfill({ json: { slots: [slot], timezone: 'America/Lima' } }))
  await page.route('**/api/checkout', route => route.fulfill({ status: 409, json: { message: 'Horario ocupado (prueba)' } }))
})

async function fitsViewport(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
  const dock = await page.locator('.dock-wrap').boundingBox()
  expect(dock).not.toBeNull()
  expect(dock!.x).toBeGreaterThanOrEqual(0)
  expect(dock!.x + dock!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1)
}

for (const locale of ['es', 'en']) {
  for (const theme of ['light', 'dark']) {
    test(`${locale}/${theme}: nine sections, metadata, visible content, no overflow or browser errors`, async ({ page }, info) => {
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
      await page.addInitScript(value => localStorage.setItem('portfolio-theme', value), theme)
      await page.goto(`/${locale}`)
      await expect(page.locator('html')).toHaveClass(new RegExp(theme))
      await expect(page.locator('section[data-section]')).toHaveCount(9)
      await expect(page.locator('.dock-link')).toHaveCount(9)
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://oscarbahamonde.com/${locale}`)
      await expect(page.locator('link[rel="alternate"][hreflang="es"]')).toHaveAttribute('href', 'https://oscarbahamonde.com/es')
      await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute('href', 'https://oscarbahamonde.com/en')
      await expect(page.locator('meta[name="theme-color"][media]')).toHaveCount(2)
      await expect(page.locator('.header-socials a')).toHaveCount(5)
      await fitsViewport(page)
      await page.screenshot({ path: info.outputPath(`${locale}-${theme}-hero.png`) })
      await page.locator('.dock-services').click()
      await expect(page.locator('.dock-services')).toHaveAttribute('aria-current', 'location')
      await expect(page.locator('#services')).toContainText('500')
      await fitsViewport(page)
      expect(errors).toEqual([])
    })
  }
}

test('language changes without a reload and theme preference survives reload', async ({ page }) => {
  await page.goto('/es')
  await page.evaluate(() => { (window as any).__e2eNavigationMarker = 'retained' })
  await page.locator('.language-button').click()
  await expect(page).toHaveURL(/\/en(?:$|#)/)
  expect(await page.evaluate(() => (window as any).__e2eNavigationMarker)).toBe('retained')
  await expect(page.locator('html')).toHaveAttribute('lang', /en/)
  await page.locator('.theme-button').click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect(page.locator('.language-button')).toContainText('EN')
})

test('keyboard booking keeps 30 minute S/20 flow and explains occupied slot', async ({ page }) => {
  let payload: any
  await page.route('**/api/checkout', async route => {
    payload = route.request().postDataJSON()
    await route.fulfill({ status: 409, json: { message: 'Horario ocupado (prueba)' } })
  })
  await page.goto('/es')
  await page.locator('.dock-contact').click()
  // Availability is lazy-loaded when the booking card enters the viewport.
  await page.locator('.booking-flow').scrollIntoViewIfNeeded()
  const option = page.locator('.slot').first()
  await expect(option).toBeVisible()
  await option.focus()
  await page.keyboard.press('Enter')
  await page.locator('#meeting-name').fill('Visitante de prueba')
  await page.locator('#meeting-email').fill('visitor@example.test')
  await expect(page.locator('.booking-flow form')).toContainText('30 min')
  await expect(page.locator('.booking-flow button[type="submit"]')).toContainText('20')
  await page.locator('.booking-flow button[type="submit"]').click()
  await expect(page.locator('.booking-flow [role="alert"]')).toContainText('Horario ocupado')
  expect(payload).toEqual({ start: slot, name: 'Visitante de prueba', email: 'visitor@example.test' })
})

test('assistant opens separately, accepts draft before consent, restores focus and draft', async ({ page }) => {
  await page.goto('/es')
  const launcher = page.locator('.assistant-launcher')
  const dialog = page.getByRole('dialog', { name: 'Asistente de Oscar' })
  await launcher.click()
  await expect(launcher).toHaveAttribute('aria-expanded', 'true')
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('.suggestion-grid button')).toHaveCount(4)
  const composer = dialog.getByRole('textbox', { name: 'Escribe tu mensaje' })
  await expect(composer).toBeEnabled()
  await expect(dialog.locator('input[type="checkbox"]')).toHaveCount(0)
  await composer.fill('¿Qué incluye una landing?')
  await expect(dialog.getByRole('button', { name: 'Enviar mensaje', exact: true })).toBeEnabled()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(launcher).toBeFocused()
  await launcher.click()
  await expect(composer).toHaveValue('¿Qué incluye una landing?')
  const box = await dialog.boundingBox()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1)
  expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1)
})

test('Medium pagination retains first page and exposes article metadata', async ({ page }) => {
  const feed = await (await page.request.get('/api/blog?page=1')).json()
  expect(feed.total).toBeGreaterThanOrEqual(10)
  await page.goto('/es')
  await page.locator('.dock-blog').click()
  const articles = page.locator('.blog-card')
  await expect(articles).toHaveCount(6)
  const first = await articles.first().locator('h3').innerText()
  for (let next = 2; next <= feed.pages; next++) {
    await page.getByRole('button', { name: 'Cargar más artículos' }).click()
    await expect(articles).toHaveCount(Math.min(next * 6, feed.total))
  }
  await expect(articles.first().locator('h3')).toHaveText(first)
  expect(await articles.locator('time[datetime]').count()).toBe(feed.total)
  for (const language of await articles.evaluateAll(elements => elements.map(el => el.getAttribute('lang')))) expect(['es', 'en']).toContain(language)
  await fitsViewport(page)
})
