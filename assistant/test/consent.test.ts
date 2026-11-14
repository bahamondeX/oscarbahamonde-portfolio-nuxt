import { test } from 'node:test'
import assert from 'node:assert/strict'
import { consentSession } from '../src/store.js'

test('consent and the complete authorized history commit atomically or fail together', async () => {
  const commands: any[] = []
  const client: any = { send: async (command: any) => { commands.push(command); throw Error('transaction cancelled') } }
  const history = [{ role: 'user', content: 'Earlier question' }, { role: 'assistant', content: 'Earlier answer' }]
  await assert.rejects(consentSession({ id: 'session1' }, history, client), /transaction cancelled/)
  assert.equal(commands.length, 1)
  assert.equal(commands[0].constructor.name, 'TransactWriteCommand')
  const items = commands[0].input.TransactItems
  assert.equal(items.length, 3)
  assert.match(items[0].Update.ConditionExpression, /consentAt=:none/)
  assert.deepEqual(items.slice(1).map((x: any) => ({ role: x.Put.Item.role, content: x.Put.Item.content })), history)
  assert.equal(new Set(items.slice(1).map((x: any) => x.Put.Item.sort)).size, history.length)
})
