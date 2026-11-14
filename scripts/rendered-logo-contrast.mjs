import sharp from 'sharp'

export const luminance = (rgb) => {
  const linear = rgb.slice(0, 3).map(value => (value /= 255) <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
  return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2]
}
export const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05)

/** Compare actual browser-rendered solid logo pixels with their actual backing.
 * Transparent logos use a second capture with the image hidden. Opaque source
 * rectangles use the rendered flat corner backing, never the chip outside it.
 * Edges are eroded by 1px to exclude antialiasing; internal brand colors remain.
 */
export async function renderedLogoContrast(source, visible, hidden) {
  const rendered = await sharp(visible).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const background = await sharp(hidden).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = rendered.info
  if (background.info.width !== width || background.info.height !== height) throw Error('Screenshot dimensions changed between captures')
  const original = await sharp(source).resize(width, height, { fit: 'fill', kernel: 'nearest' }).ensureAlpha().raw().toBuffer()
  const pixel = (buffer, x, y) => [...buffer.subarray((y * width + x) * 4, (y * width + x) * 4 + 4)]
  const corners = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]]
  const cornerPixels = corners.map(([x, y]) => pixel(original, x, y))
  const distance = (a, b) => Math.max(...a.slice(0, 3).map((channel, i) => Math.abs(channel - b[i])))
  const flatBacking = cornerPixels.every(p => p[3] >= 230 && distance(p, cornerPixels[0]) <= 12)
  const renderedBacking = flatBacking ? pixel(rendered.data, 0, 0) : null
  const mask = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const p = pixel(original, x, y)
    mask[y * width + x] = +(p[3] >= 230 && (!flatBacking || distance(p, cornerPixels[0]) > 30))
  }
  const ratios = []
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    if (![-1, 0, 1].every(dy => [-1, 0, 1].every(dx => mask[(y + dy) * width + x + dx]))) continue
    ratios.push(contrast(pixel(rendered.data, x, y), renderedBacking || pixel(background.data, x, y)))
  }
  if (ratios.length < 20) throw Error('Too few recognizable solid foreground pixels; inspect logo resolution/visibility')
  ratios.sort((a, b) => a - b)
  return { foregroundPixels: ratios.length, backing: flatBacking ? 'opaque source rectangle' : 'rendered chip', minimum: ratios[0], p10: ratios[Math.floor(ratios.length * .1)], median: ratios[Math.floor(ratios.length * .5)], fractionAbove3: ratios.filter(ratio => ratio >= 3).length / ratios.length }
}
