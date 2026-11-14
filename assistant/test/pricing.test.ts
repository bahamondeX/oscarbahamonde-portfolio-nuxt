import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createPricingFilter, sanitizePricing } from '../src/pricing.js'
import { runAgent } from '../src/agent.js'

test('unsupported vendor currency amounts and complete ranges are replaced without losing technical guidance', () => {
  const raw = 'Lambda: $0.20/month; Kubernetes: USD 20–50 per month.\nRAG uses retrieval and generation; token volume affects cost.'
  const result = sanitizePricing(raw, 'en', 'Explain Lambda versus Kubernetes')
  assert.equal(result.filteredAmounts, 2)
  assert.equal(result.answer, 'Lambda: pricing to verify/month; Kubernetes: pricing to verify per month.\nRAG uses retrieval and generation; token volume affects cost.')
  assert.doesNotMatch(sanitizePricing('Asistentes de IA S/1500–4500; proveedor 1500 USD.', 'es', '').answer, /1500|4500/)
  assert.equal(sanitizePricing('Estimate: 20–50 USD; S/1500–S/4500.', 'en', '').filteredAmounts, 2)
})

test('only the matching published service price is preserved, including headings and formatted prices', () => {
  const text = '## Landing\nDesde S/500.\nAI assistants: S/1,500.\nSystems integration: S/3,500.\nSaaS platform: S/4,500.\nConsulta de 30 minutos: S/20.'
  assert.equal(sanitizePricing(text, 'en', '').answer, text)
  const wrong = sanitizePricing('SaaS platform: S/1500.\nSystems integration: S/1500.\nLambda: $1500.', 'en', '')
  assert.equal(wrong.filteredAmounts, 3)
  assert.doesNotMatch(wrong.answer, /1500/)
  assert.equal(sanitizePricing('Desde S/500.', 'es', '¿Cuánto cuesta una landing?').answer, 'Desde S/500.')
  assert.equal(sanitizePricing('Starts at S/1,500.', 'en', 'What is the starting price for a website with a content panel?').filteredAmounts, 0)
  assert.equal(sanitizePricing('Landing S/500; AI assistant S/1500; platform S/4500.', 'en', '').filteredAmounts, 0)
  assert.equal(sanitizePricing('Landing: S/500 al mes.', 'es', '').filteredAmounts, 1)
  assert.equal(sanitizePricing('S/20 por consulta de 30 min.', 'es', '').filteredAmounts, 0)
  assert.equal(sanitizePricing('El pago es S/20.', 'es', '¿Puedo confirmar mi cita antes de pagar MercadoPago?').filteredAmounts, 0)
})

test('an explicitly visitor-supplied budget may be repeated, but is not an authorized quote', () => {
  const visitor = 'Tengo un presupuesto de S/2000.'
  assert.equal(sanitizePricing('Tu presupuesto S/2000 requiere definir prioridades.', 'es', visitor).filteredAmounts, 0)
  assert.equal(sanitizePricing('Integración de sistemas por S/2000.', 'es', visitor).filteredAmounts, 1)
  assert.equal(sanitizePricing('Tu presupuesto S/2500.', 'es', visitor).filteredAmounts, 1)
  assert.equal(sanitizePricing('Your budget $0.20.', 'en', 'Does Lambda cost $0.20?').filteredAmounts, 1)
  const mixed = sanitizePricing('Tu presupuesto S/2000; integración de sistemas S/2000.', 'es', visitor)
  assert.equal(mixed.filteredAmounts, 1)
  assert.equal(mixed.answer, 'Tu presupuesto S/2000; integración de sistemas tarifa por verificar.')
})

test('code and shell variables are preserved rather than mistaken for financial claims', () => {
  const code = 'Use `$HOME`, `$1` and `awk \'{print $2}\'`.\n```sh\necho "$1 $HOME"\n```\nLambda costs $0.20 per month.'
  const answer = sanitizePricing(code, 'en', '').answer
  assert.ok(answer.includes('Use `$HOME`, `$1` and `awk \'{print $2}\'`.'))
  assert.ok(answer.includes('echo "$1 $HOME"'))
  assert.doesNotMatch(answer, /0\.20/)
})

test('every possible delta boundary has identical safe output and never releases partial currency claims', () => {
  const text = 'Architecture first.\nLambda $0.20/month; cluster $20–50/month.\nAI assistants start at S/1500.'
  const expected = sanitizePricing(text, 'en', '').answer
  for (let split = 0; split <= text.length; split++) {
    const filter = createPricingFilter('en', '')
    const first = filter.push(text.slice(0, split))
    assert.doesNotMatch(first, /\$|0\.20|20–50/)
    const output = first + filter.push(text.slice(split)) + filter.finish()
    assert.equal(output, expected, `split ${split}`)
  }
  const filter = createPricingFilter('en', '')
  let output = ''
  for (const char of text) output += filter.push(char)
  output += filter.finish()
  assert.equal(output, expected)
})

test('Lambda SSE and saved assistant history contain only the same sanitized answer', async () => {
  const emitted: string[] = [], saved: any[] = []
  const store = {
    history: async () => [], message: async (_: string, role: string, content: string) => { saved.push({ role, content }) },
    update: async () => {}, pendingAction: async () => { throw Error('unexpected action') },
  }
  const chunks = ['Use Lambda for bursts.\nMonthly cost $', '0.', '20 versus $20', '–', '50 for Kubernetes.\nAI assistants start at S/', '1500.']
  const client = { send: async () => ({ stream: (async function* () {
    for (const text of chunks) yield { contentBlockDelta: { contentBlockIndex: 0, delta: { text } } }
    yield { messageStop: { stopReason: 'end_turn' } }
  })() }) }
  await runAgent({ id: 'pricing-test', locale: 'en', consentAt: '2026-11-14', tokens: 0 }, 'Explain architecture', (kind, data) => {
    if (kind === 'delta') { assert.doesNotMatch(data.text, /\$|0\.20|20–50/); emitted.push(data.text) }
  }, client, undefined, store)
  const answer = emitted.join('')
  assert.match(answer, /Use Lambda for bursts/)
  assert.match(answer, /S\/1500/)
  assert.equal(saved.find(row => row.role === 'assistant').content, answer)
  assert.ok(emitted.length > 1)
})
