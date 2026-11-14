import { test } from 'node:test'
import assert from 'node:assert/strict'
import { marshall } from '@aws-sdk/util-dynamodb'
import { processRecords, milestone, handler, defaults } from '../src/notify-lead.js'
import { mediaWaitState } from '../src/media-status.js'
function record(eventName: string, status = 'open', old = 'open') {
  return {
    eventName,
    eventID: 'event1',
    dynamodb: {
      SequenceNumber: '1',
      NewImage: marshall({
        id: 'lead1',
        sessionId: 'session1',
        name: 'Test Visitor',
        email: 'lead@example.com',
        service: 'AI',
        budget: 'S/1500',
        updatedAt: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + 1000,
        status,
      }),
      OldImage: eventName === 'MODIFY' ? marshall({ status: old }) : undefined,
    },
  }
}
function mock(fail = false) {
  const seen = new Set<string>(),
    sent: Buffer[] = []
  const deps: any = {
    get: async () => ({ ttl: Math.floor(Date.now() / 1000) + 1000 }),
    lease: async (id: string) => !seen.has(id),
    update: async (_t: string, id: string, value: any) => {
      if (value.done) seen.add(id)
    },
    history: async () => [
      { role: 'user', content: 'Entire original transcript' },
      { role: 'assistant', content: 'Reply' },
    ],
    attachments: async () => ({
      attachments: [{ name: 'audio.webm', type: 'audio/webm', bytes: Buffer.from('audio') }],
      links: '',
    }),
    summarize: async () => 'Summary',
    mediaWait: async () => {},
    send: async (raw: Buffer) => {
      if (fail) throw Error('gmail unavailable')
      sent.push(raw)
    },
  }
  return { deps, sent }
}
test('INSERT immediate delivery, duplicate stream records idempotent after successful send', async () => {
  const { deps, sent } = mock()
  const event: any = { Records: [record('INSERT'), record('INSERT')] }
  assert.deepEqual(await processRecords(event, deps), { batchItemFailures: [] })
  assert.equal(sent.length, 1)
  assert.match(sent[0]!.toString(), /Reply-To: lead@example.com/)
})
test('MODIFY qualification sends final transcript, summary and audio exactly once per completed milestone', async () => {
  const { deps, sent } = mock()
  const event: any = {
    Records: [
      record('MODIFY', 'qualified'),
      record('MODIFY', 'qualified'),
      record('MODIFY', 'closed', 'qualified'),
    ],
  }
  assert.deepEqual(await processRecords(event, deps), { batchItemFailures: [] })
  assert.equal(sent.length, 1)
  const raw = sent[0]!.toString()
  assert.match(raw, /transcript.txt/)
  assert.match(raw, /audio.webm/)
})
test('Gmail failure returns sequence number for retries and DLQ, never acknowledges dropped lead', async () => {
  const { deps, sent } = mock(true)
  assert.deepEqual(await processRecords({ Records: [record('INSERT')] } as any, deps), {
    batchItemFailures: [{ itemIdentifier: '1' }],
  })
  assert.equal(sent.length, 0)
})
test('TTL deletes never send notifications', () =>
  assert.equal(milestone({ eventName: 'REMOVE' }), null))

test('AWS Lambda Context cannot replace notification dependencies', async () => {
  const original = { ...defaults }
  const { deps, sent } = mock()
  Object.assign(defaults, deps)
  try {
    const invoke: any = handler
    assert.deepEqual(await invoke({ Records: [record('INSERT')] }, { awsRequestId: 'lambda-context' }), { batchItemFailures: [] })
    assert.equal(sent.length, 1)
  } finally { Object.assign(defaults, original) }
})

function emailHtml(raw: Buffer) {
  const body = raw.toString().split('Content-Transfer-Encoding: base64\r\n\r\n')[1]!.split('\r\n--')[0]!
  return Buffer.from(body.replace(/\r\n/g, ''), 'base64').toString()
}
test('failed media cannot block final lead delivery or drop valid originals and transcript', async () => {
  const { deps, sent } = mock()
  deps.get = async () => ({ ttl: Math.floor(Date.now() / 1000) + 1000, files: [
    { id: 'bad', name: 'bad.pdf', processed: true, validated: false, status: 'failed' },
    { id: 'audio', name: 'audio.webm', processed: true, validated: true, status: 'failed' },
  ] })
  assert.deepEqual(await processRecords({ Records: [record('MODIFY', 'closed')] } as any, deps), { batchItemFailures: [] })
  assert.equal(sent.length, 1)
  const raw = sent[0]!.toString(), html = emailHtml(sent[0]!)
  assert.match(raw, /audio.webm/)
  assert.match(raw, /transcript.txt/)
  assert.match(html, /Entire original transcript/)
  assert.match(html, /bad.pdf.*No se adjunta contenido sin validar/)
  assert.match(html, /audio.webm.*No se completó la transcripción/)
})
test('recent pending media retries finitely then delivers valid originals with an explicit processing note', async () => {
  const { deps, sent } = mock()
  let state: any = {}
  const files = [{ name: 'audio.webm', processed: false, validated: true, status: 'processing', createdAt: Date.now() }]
  deps.get = async (_t: string, id: string) => id.startsWith('notify#') ? state : { ttl: Math.floor(Date.now() / 1000) + 1000, files }
  deps.update = async (_t: string, _id: string, value: any) => { state = { ...state, ...value } }
  const event = { Records: [record('MODIFY', 'closed')] } as any
  for (let n = 0; n < 3; n++) {
    assert.deepEqual(await processRecords(event, deps), { batchItemFailures: [{ itemIdentifier: '1' }] })
    assert.equal(sent.length, 0)
  }
  assert.deepEqual(await processRecords(event, deps), { batchItemFailures: [] })
  assert.equal(state.mediaWaitAttempts, 3)
  assert.match(sent[0]!.toString(), /audio.webm/)
  assert.match(emailHtml(sent[0]!), /No se completó la transcripción/)
  assert.deepEqual(await processRecords(event, deps), { batchItemFailures: [] })
  assert.equal(sent.length, 1)
})
test('abandoned uploads expire from the processing wait and failed files are terminal', () => {
  assert.equal(mediaWaitState([{ createdAt: Date.now() - 6 * 60000, processed: false }], 0).wait, false)
  assert.equal(mediaWaitState([{ createdAt: Date.now(), status: 'failed' }], 0).wait, false)
  assert.equal(mediaWaitState([{ createdAt: Date.now(), status: 'abandoned' }], 0).wait, false)
})
