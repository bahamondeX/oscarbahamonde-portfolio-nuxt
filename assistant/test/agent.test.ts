import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runAgent, systemBlocks, commercialPolicy } from '../src/agent.js'
import { cfg } from '../src/config.js'
const session = { id: 'session-test', locale: 'es', tokens: 0, consentAt: '2026-11-14T00:00:00Z' }
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
      expires: Date.now() + 600000,
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

test('anonymous chat answers without persisting messages or personal tool arguments', async () => {
  let calls = 0, round = 0
  const events: any[] = [], store = storage()
  const client = { send: async () => ({ stream: stream(++round === 1 ? [
    { contentBlockStart: { contentBlockIndex: 0, start: { toolUse: { toolUseId: 'lead', name: 'save_lead' } } } },
    { contentBlockDelta: { contentBlockIndex: 0, delta: { toolUse: { input: JSON.stringify({ lead_data: { name: 'Visitor' } }) } } } },
    { messageStop: { stopReason: 'tool_use' } },
  ] : [
    { contentBlockDelta: { contentBlockIndex: 0, delta: { text: 'You can continue chatting or optionally consent to save your details.' } } },
    { messageStop: { stopReason: 'end_turn' } },
  ]) }) }
  await runAgent({ ...session, consentAt: null, clientHistory: [{ role: 'user', content: 'Earlier question' }] }, 'My name is Visitor', (k,d)=>events.push([k,d]), client, async()=>{calls++;return {}}, store)
  assert.equal(store.rows.length, 0)
  assert.equal(calls, 0)
  assert.ok(events.some(([k])=>k==='consent'))
  assert.ok(events.some(([k])=>k==='done'))
})

test('current Lima time is outside the reusable knowledge prefix', () => {
  const blocks = systemBlocks('en', false)
  assert.match(blocks.at(-1).text, /Current time: \d{4}-\d{2}-\d{2}T/)
  assert.match(blocks.at(-1).text, /America\/Lima/)
  assert.match(blocks.at(-1).text, /Privacy consent recorded: no/)
  assert.doesNotMatch(blocks[0].text, /Current time:/)
})
test('every model request includes exact catalog pricing policy without restricting technical explanations', async () => {
  let checked = false
  const client = { send: async (command: any) => {
    const instruction = command.input.system[0].text
    assert.ok(instruction.includes(commercialPolicy))
    assert.match(instruction, /Never invent price ranges, combined package totals, budget tiers/)
    assert.match(instruction, /recurring\/monthly costs, third-party\/cloud price figures/)
    assert.match(instruction, /never offer or imply custom systems integration below S\/3500/)
    assert.match(instruction, /AI assistants start at S\/1500 with scope assessed separately, not an implementation price range/)
    assert.match(instruction, /Give useful technical explanations, examples, tradeoffs and code when asked/)
    checked = true
    return { stream: stream([{contentBlockDelta:{contentBlockIndex:0,delta:{text:'RAG retrieves relevant documents before generating a grounded answer.'}}},{messageStop:{stopReason:'end_turn'}}]) }
  } }
  await runAgent(session, 'Explain RAG and a project budget', () => {}, client, undefined, storage())
  assert.equal(checked, true)
})
test('aggregate token budget can stop before the independent 60-turn cap without invoking Bedrock', async () => {
  let calls = 0
  const client = { send: async () => { calls++; return { stream: stream([]) } } }
  await assert.rejects(runAgent({ ...session, tokens: cfg.maxSessionTokens - 1000, turns: 2 }, 'Question', () => {}, client, undefined, storage()), /session_token_budget/)
  assert.equal(calls, 0)
})
test('usage from a completed round is retained when the following model call fails', async () => {
  const store = storage(), updates: any[] = []
  store.update = async (...args: any[]) => { updates.push(args) }
  let calls = 0
  const client = { send: async () => {
    if (++calls > 1) throw Error('temporary bedrock outage')
    return { stream: stream([
      { contentBlockStart: { contentBlockIndex: 0, start: { toolUse: { toolUseId: 'svc', name: 'get_services' } } } },
      { contentBlockDelta: { contentBlockIndex: 0, delta: { toolUse: { input: '{}' } } } },
      { messageStop: { stopReason: 'tool_use' } },
      { metadata: { usage: { totalTokens: 321 } } },
    ]) }
  } }
  await assert.rejects(runAgent(session, 'Services', () => {}, client, async () => ({ services: [] }), store), /temporary bedrock outage/)
  assert.equal(updates.at(-1)[2].tokens, 321)
})
