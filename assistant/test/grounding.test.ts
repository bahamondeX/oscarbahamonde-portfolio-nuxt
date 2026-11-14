import { test } from 'node:test'
import assert from 'node:assert/strict'
import { groundAnswer, renderFact } from '../src/grounding.js'
import { allFactRecords } from '../src/retrieval.js'
import { runAgent } from '../src/agent.js'

test('record references are rendered from source including scope, exact dates and expired status', () => {
  for (const locale of ['en', 'es'] as const) {
    for (const record of allFactRecords(locale).filter(r => ['employment','certification','service'].includes(r.type))) {
      const result = groundAnswer(`[[fact:${record.id}]]`, locale, '')
      assert.equal(result.answer, renderFact(record, locale), record.id)
      assert.doesNotMatch(result.answer, /\[\[fact:|undefined|\[object Object\]/)
    }
  }
})
test('wrong role/date/company and certification claims cannot override their source records', () => {
  const wrong = 'Oscar currently works at Dynata as CEO since 2010.\n\nOscar holds Certified Interplanetary Architect from Fake Institute.'
  const result = groundAnswer(wrong, 'en', 'Tell me about Oscar career')
  assert.match(result.answer, /Site Reliability Engineer/)
  assert.match(result.answer, /January 2025.*March 2026/)
  assert.doesNotMatch(result.answer, /CEO|2010|currently|Interplanetary|Fake Institute/)
  assert.ok(result.corrections.some(c => c.reason === 'unverified_biographical_claim_removed'))
  const unknown = groundAnswer('Oscar worked at Google as CFO.', 'en', '')
  assert.doesNotMatch(unknown.answer, /Google|CFO/)
})
test('forged source references and source-adjacent false claims are replaced before display', () => {
  const result = groundAnswer('[[fact:service:custom]] A fixed S/50 platform is guaranteed by Friday.\n\n[[fact:employment:invented]]', 'es', '')
  assert.match(result.answer, /desde S\/4,500/)
  assert.doesNotMatch(result.answer, /S\/50|guaranteed|Friday|invented/)
  assert.ok(result.corrections.some(c => c.reason === 'unknown_source_reference'))
})
test('unknown facts remain unknown and technical examples retain their content', () => {
  const negative = 'I do not have a verified record that Oscar worked at Google.'
  assert.equal(groundAnswer(negative, 'en', '').answer, negative)
  const technical = 'Use event-driven workers for bursts.\n\n```sh\necho "$HOME $1"\n```\n\nUse monitoring and IAM policies.'
  assert.equal(groundAnswer(technical, 'en', '').answer, technical)
  const credentialsCode = '```python\ncredentials = session.get_credentials()\n```'
  assert.equal(groundAnswer(credentialsCode, 'en', 'Show AWS SDK authentication code').answer, credentialsCode)
})
test('no unvalidated date/credential delta leaks through the Lambda stream or stored history', async () => {
  const visible: string[] = [], saved: string[] = [], events: string[] = []
  const raw = 'Oscar currently works at Dynata since 2010 as CEO.'
  const client = { send: async () => ({ stream: (async function* () {
    for (const text of raw) yield { contentBlockDelta: { contentBlockIndex: 0, delta: { text } } }
    yield { messageStop: { stopReason: 'end_turn' } }
  })() }) }
  const store = { history: async () => [], message: async (_: string, role: string, text: string) => { if(role === 'assistant') saved.push(text) }, update: async () => {}, pendingAction: async () => { throw Error('unexpected tool') } }
  await runAgent({id:'grounding-test',locale:'en',tokens:0,consentAt:'2026-11-14'},'Where did Oscar work?',(kind,data)=>{
    events.push(kind)
    if(kind === 'delta') { assert.doesNotMatch(data.text,/2010|CEO|currently/); visible.push(data.text) }
  },client,undefined,store)
  assert.equal(visible.join(''),saved[0])
  assert.equal(events[0],'grounding')
  assert.equal(events.at(-1),'done')
  assert.ok(visible.length > 1)
})

test('code formatting and unrelated negation cannot bypass biography checks', () => {
  const code = groundAnswer('```json\n{"employer":"Dynata","role":"CEO","start":"2010"}\n```', 'en', 'Tell me about Oscar')
  assert.doesNotMatch(code.answer, /CEO|2010/)
  assert.match(code.answer, /Site Reliability Engineer/)
  const mixed = groundAnswer('I do not have that detail. But Oscar worked at Google as CFO.', 'en', '')
  assert.doesNotMatch(mixed.answer, /Google|CFO/)
})

test('achievement dates stay associated with the achievement, not any year in the corpus', () => {
  for (const raw of ['Oscar ingresó en primer puesto a la PUCP en 2023.', 'Oscar ganó el hackathon AWS en 2007.']) {
    const result = groundAnswer(raw, 'es', '')
    assert.match(result.answer, /PUCP en 2007/)
    assert.match(result.answer, /Perú 2023/)
    assert.doesNotMatch(result.answer, /PUCP en 2023|hackathon AWS en 2007/)
  }
})
test('omitted subjects, inverted employer claims and fabricated booking confirmation are checked', () => {
  assert.doesNotMatch(groundAnswer('Tiene la certificación Certified Kubernetes Administrator (CKA) emitida en 2022.', 'es', '').answer, /CKA|2022/)
  assert.doesNotMatch(groundAnswer('Su empleador actual es Google.', 'es', '').answer, /Google/)
  const booking = groundAnswer('Tu cita está confirmada para mañana a las 10:00. No necesitas pagar.', 'es', '')
  assert.doesNotMatch(booking.answer, /mañana|10:00|No necesitas pagar/)
  assert.match(booking.answer, /webhook de pago aprobado/)
  assert.doesNotMatch(groundAnswer('The appointment is not confirmed yet. I have booked your slot for tomorrow.', 'en', '').answer, /I have booked|tomorrow/)
})
test('multiple services on one line keep their separate exact starting prices and scopes', () => {
  const result = groundAnswer('Landing S/500, AI assistant S/1500, SaaS platform S/4500.', 'en', '')
  assert.match(result.answer, /landing page — from S\/500/)
  assert.match(result.answer, /AI assistants — from S\/1,500/)
  assert.match(result.answer, /platform — from S\/4,500/)
})

test('ambiguous source names in ordinary technical advice do not become career claims', () => {
  for (const text of ['In plain English, indexes work like a book index: 1 lookup.', 'Design Thinking has 5 common stages.', 'Data & Analytics workloads commonly use 3 layers.', 'Para organizar un hackathon, define el alcance.'])
    assert.equal(groundAnswer(text, 'en', 'Explain this concept').answer, text)
  const code = "```python\nprint('Hola')\n```"
  assert.equal(groundAnswer(code, 'es', 'Oscar, enséñame un ejemplo de Python').answer, code)
})
test('a quoted service does not authorize delivery guarantees or fictitious email receipts', () => {
  const answer = groundAnswer('Una landing: S/500, entrega garantizada en 2 días.', 'es', 'Quiero una landing').answer
  assert.match(answer,/S\/500/)
  assert.doesNotMatch(answer,/2 días|garantizada/)
  assert.match(answer,/deben acordarse/)
  assert.doesNotMatch(groundAnswer('Ya envié el correo a Oscar.', 'es', '').answer,/Ya envié/)
})
