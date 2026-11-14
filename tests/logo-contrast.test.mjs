import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { contrast, renderedLogoContrast } from '../scripts/rendered-logo-contrast.mjs'

test('WCAG contrast has known endpoints', () => {
  assert.equal(contrast([0, 0, 0], [255, 255, 255]), 21)
  assert.equal(contrast([127, 127, 127], [127, 127, 127]), 1)
})

test('rendered test detects poor brand foreground despite large opaque white backing', async () => {
  const width = 30, height = 30
  const create = color => sharp({ create: { width, height, channels: 4, background: color } }).png().toBuffer()
  const source = await sharp(await create('#ffffff')).composite([{ input: await sharp({ create: { width: 12, height: 12, channels: 4, background: '#bbbbbb' } }).png().toBuffer(), left: 9, top: 9 }]).png().toBuffer()
  const result = await renderedLogoContrast(source, source, await create('#111827'))
  assert.equal(result.backing, 'opaque source rectangle')
  assert.ok(result.p10 < 3, 'white image rectangle must not disguise light-gray logo contrast failure')
})

test('transparent logo measurement includes the actual rendered theme filter', async () => {
  const png = async color => sharp({ create: { width: 30, height: 30, channels: 4, background: color } }).png().toBuffer()
  const source = await png('#000000')
  // Transparent outer border provides a real source alpha mask.
  const transparent = await sharp({ create: { width: 40, height: 40, channels: 4, background: '#00000000' } }).composite([{ input: source, left: 5, top: 5 }]).png().toBuffer()
  const background = await sharp({ create: { width: 40, height: 40, channels: 4, background: '#111827' } }).png().toBuffer()
  const inverted = await sharp(background).composite([{ input: await png('#ffffff'), left: 5, top: 5 }]).png().toBuffer()
  const result = await renderedLogoContrast(transparent, inverted, background)
  assert.equal(result.backing, 'rendered chip')
  assert.ok(result.p10 > 17, 'measurement must use rendered white foreground, not original black PNG')
})
