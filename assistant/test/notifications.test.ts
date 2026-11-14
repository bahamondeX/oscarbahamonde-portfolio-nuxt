import { test } from 'node:test'
import assert from 'node:assert/strict'
import { marshall } from '@aws-sdk/util-dynamodb'
import { processRecords, milestone, handler, defaults } from '../src/notify-lead.js'
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
