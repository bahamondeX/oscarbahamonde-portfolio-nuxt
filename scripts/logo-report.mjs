import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
const root = new URL('../docs/audit/after/', import.meta.url)
await mkdir(root, { recursive: true })
const entries = JSON.parse(await readFile(new URL('../data/experience.json', import.meta.url), 'utf8'))
const logoCount = entries.filter(item => item.logo).length
const variants = []
for (const folder of await readdir(new URL('logo-captures/', root)).catch(() => [])) {
  try { variants.push(JSON.parse(await readFile(new URL(`logo-captures/${folder}/results.json`, root), 'utf8'))) } catch {}
}
const expected = ['es', 'en'].flatMap(locale => ['light', 'dark'].flatMap(theme => ['desktop', 'mobile'].map(device => `${locale}-${theme}-${device}`)))
const missing = expected.filter(name => !variants.some(v => v.variant === name))
const results = variants.flatMap(v => v.results)
const complete = missing.length === 0 && variants.every(v => v.results.length === logoCount)
const report = {
  generatedAt: new Date().toISOString(), status: !complete ? 'incomplete' : results.every(r => r.pass) ? 'passed' : 'failed',
  threshold: 3, statistic: 'p10 of eroded solid foreground pixels', expectedVariants: 8, expectedLogosPerVariant: logoCount,
  missingVariants: missing, measuredLogos: results.length, failures: results.filter(r => !r.pass),
  limitation: 'Brand contrast metric is not an exhaustive WCAG conformance audit. Missing variants never count as passed.', variants,
}
await writeFile(new URL('logo-contrast-rendered.json', root), JSON.stringify(report, null, 2))
console.log(JSON.stringify({ status: report.status, measured: results.length, failures: report.failures.length, missing }))
if (report.status !== 'passed') process.exitCode = 1
