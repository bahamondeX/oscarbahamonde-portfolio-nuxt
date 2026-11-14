import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
test('search engines can discover canonical sitemap', () => {
  assert.match(read('public/robots.txt'), /Sitemap: https:\/\/oscarbahamonde.com\/sitemap.xml/)
  assert.match(read('public/sitemap.xml'), /<loc>https:\/\/oscarbahamonde.com\/<\/loc>/)
})
test('navigation targets exist and motion can be reduced', () => {
  const page = read('app/pages/index.vue')
  for (const target of page.matchAll(/href="#([^" ]+)"/g)) assert.ok(page.includes(`id="${target[1]}"`), target[1])
  assert.match(read('app/assets/main.css'), /prefers-reduced-motion:reduce/)
})
