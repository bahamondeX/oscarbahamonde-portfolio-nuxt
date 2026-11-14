import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
test('booking clearly separates reservation from payment verification', () => {
  const page = read('app/pages/index.vue')
  assert.match(page, /calendar\.app\.google\/kDqLmVtrnZ8nWfgKA/)
  assert.match(page, /action="\/api\/checkout"/)
  assert.match(read('server/api/checkout.post.ts'), /mpago\.la\/1PGrFn1/)
  assert.match(page, /asociación entre pago y cita aún se revisa por separado/)
  assert.match(page, /9:00–13:00 y 14:00–17:00/)
})
test('search engines can discover canonical sitemap', () => {
  assert.match(read('public/robots.txt'), /Sitemap: https:\/\/oscarbahamonde.com\/sitemap.xml/)
  assert.match(read('public/sitemap.xml'), /<loc>https:\/\/oscarbahamonde.com\/<\/loc>/)
})
test('navigation targets exist and motion can be reduced', () => {
  const page = read('app/pages/index.vue')
  for (const target of page.matchAll(/href="#([^" ]+)"/g)) assert.ok(page.includes(`id="${target[1]}"`), target[1])
  assert.match(read('app/assets/main.css'), /prefers-reduced-motion:reduce/)
})
