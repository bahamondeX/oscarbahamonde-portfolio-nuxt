import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runAgent } from '../src/agent.js'
const session = { id: 'session-test', locale: 'es', tokens: 0 }
function storage() {
  const rows: any[] = []
  return {
    rows,
    history: async () => [],
    message: async (_id: string, role: string, content: string) => {
      rows.push({ role, content })
    },
    update: async () => {},
    pendingAction: async (_s: any, name: any, args: any) => ({
      id: crypto.randomUUID(),
      name,
      args,
      confirmationRequired: true,
    }),
  }
}
async function* stream(events: any[]) {
  yield* events
}
test('ConverseStream forwards guarded chunks and persists both observable messages', async () => {
  const events: any[] = [],
    store = storage()
  const client = {
    send: async (command: any) => {
      assert.equal(command.input.guardrailConfig.streamProcessingMode, 'sync')
      assert.equal(command.input.toolConfig.tools.length, 5)
      return {
        stream: stream([
          {
            contentBlockDelta: {
              contentBlockIndex: 0,
              delta: { text: 'Hola, soy la IA de Oscar.' },
            },
          },
          { messageStop: { stopReason: 'end_turn' } },
          { metadata: { usage: { totalTokens: 30 } } },
        ]),
      }
    },
  }
  await runAgent(session, 'Hola', (k, d) => events.push([k, d]), client, undefined, store)
  assert.equal(events[0][0], 'delta')
  assert.equal(events.at(-1)[0], 'done')
  assert.equal(store.rows.length, 2)
})
test('email tool request becomes a pending confirmation and never executes on model instruction alone', async () => {
  let count = 0,
    calls = 0
  const events: any[] = [],
    store = storage()
  const client = {
    send: async () => ({
      stream: stream(
        ++count === 1
          ? [
              {
                contentBlockStart: {
                  contentBlockIndex: 0,
                  start: { toolUse: { toolUseId: 't1', name: 'send_email' } },
                },
              },
              {
                contentBlockDelta: {
                  contentBlockIndex: 0,
                  delta: {
                    toolUse: {
                      input: JSON.stringify({
                        to: 'lead@example.com',
                        subject: 'services',
                        body: 'x',
                      }),
                    },
                  },
                },
              },
              { messageStop: { stopReason: 'tool_use' } },
            ]
          : [
              {
                contentBlockDelta: {
                  contentBlockIndex: 0,
                  delta: { text: 'Confirma con el botón.' },
                },
              },
              { messageStop: { stopReason: 'end_turn' } },
            ],
      ),
    }),
  }
  await runAgent(
    session,
    'Envía los servicios',
    (k, d) => events.push([k, d]),
    client,
    async () => {
      calls++
      return {}
    },
    store,
  )
  assert.equal(calls, 0)
  assert.ok(events.some(([k]) => k === 'action'))
})
test('partial Bedrock stream errors cannot appear as successfully completed responses', async () => {
  const events: any[] = [],
    store = storage(),
    client = {
      send: async () => ({
        stream: stream([{ modelStreamErrorException: { message: 'internal' } }]),
      }),
    }
  await assert.rejects(() =>
    runAgent(session, 'Hello', (k, d) => events.push([k, d]), client, undefined, store),
  )
  assert.ok(!events.some(([k]) => k === 'done'))
})
