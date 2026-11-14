import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import ts from 'typescript'
test('booking API runtime is identical to the pre-redesign baseline', () => {
  const hashes = JSON.parse(readFileSync(new URL('booking-runtime.sha256.json', import.meta.url), 'utf8'))
  for (const [file, expected] of Object.entries(hashes)) {
    const source = readFileSync(new URL('../' + file, import.meta.url), 'utf8')
    const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, removeComments: true } }).outputText
    assert.equal(createHash('sha256').update(code).digest('hex'), expected, file)
  }
})
