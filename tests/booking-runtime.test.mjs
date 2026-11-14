import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { join, resolve } from 'node:path'
import ts from 'typescript'
// Execute the actual booking module with only external Google/MP adapters replaced.
const dir = await mkdtemp(resolve('node_modules/.cache/booking-test-'))
const adapter = join(dir, 'calendar.mjs')
await writeFile(adapter, 'let io; export const setIO=x=>io=x; export const calendar=(...x)=>io.calendar(...x); export const eventsBetween=(...x)=>io.eventsBetween(...x);')
let source = await readFile(new URL('../server/utils/booking.ts', import.meta.url), 'utf8')
source = source.replace("'./calendar'", JSON.stringify(pathToFileURL(adapter).href)).replace("'../../shared/booking.mjs'", JSON.stringify(new URL('../shared/booking.mjs', import.meta.url).href)).replace("'../../shared/booking-cleanup.mjs'", JSON.stringify(new URL('../shared/booking-cleanup.mjs', import.meta.url).href))
await writeFile(join(dir, 'booking.mjs'), ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText)
const { finalize, hold, slotID, cleanExpiredHolds } = await import(pathToFileURL(join(dir, 'booking.mjs')).href)
const { setIO } = await import(pathToFileURL(adapter).href)
after(async () => { delete globalThis.$fetch; delete globalThis.useRuntimeConfig; await rm(dir, { recursive: true, force: true }) })
const now = Date.parse('2026-11-16T00:00:00-05:00'), start = '2026-11-16T09:00:00-05:00', order = '12345678-1234-1234-1234-123456789abc'
const record = () => ({ id: slotID(new Date(start).toISOString()), etag: 'v1', status: 'tentative', start: { dateTime: start }, extendedProperties: { private: { app: 'oscar-booking', state: 'hold', order, expires: String(now + 900000), name: 'QA', email: 'qa@example.test' } } })
const payment = r => ({ id: '123', status: 'approved', external_reference: r.id + ':' + order, currency_id: 'PEN', transaction_amount: 20, live_mode: true, date_approved: '2026-11-16' })
function setup(r, pay) {
  const writes = []
  globalThis.useRuntimeConfig = () => ({ mercadoPagoAccessToken: 'synthetic-no-network' })
  globalThis.$fetch = async url => { assert.match(url, /^https:\/\/api.mercadopago.com\/v1\/payments\/123$/); return pay }
  setIO({ eventsBetween: async () => [], calendar: async (_path, options) => {
    if (!options) return r
    assert.equal(options.headers['If-Match'], r.etag)
    writes.push(options)
    Object.assign(r, options.body); r.etag = 'v' + (writes.length + 1)
    if (options.body.conferenceData) r.hangoutLink = 'https://meet.google.com/synthetic'
    return r
  } })
  return writes
}
async function atFixedTime(fn) { const original = Date.now; Date.now = () => now; try { await fn() } finally { Date.now = original } }

test('actual finalizer requires approved API payment; pending/rejected/test/wrong amount never writes Calendar', async () => atFixedTime(async () => {
  for (const patch of [{ status: 'pending' }, { status: 'rejected' }, { live_mode: false }, { transaction_amount: 19 }, { currency_id: 'USD' }, { external_reference: 'forged' }]) {
    const r = record(), writes = setup(r, { ...payment(r), ...patch })
    assert.equal((await finalize('123')).confirmed, false); assert.equal(writes.length, 0)
  }
}))

test('approved payment confirms Meet once and duplicate webhook is idempotent', async () => atFixedTime(async () => {
  const r = record(), writes = setup(r, payment(r))
  const first = await finalize('123'), second = await finalize('123')
  assert.equal(first.confirmed, true); assert.deepEqual(second, first); assert.equal(writes.length, 1)
  assert.equal(writes[0].query.sendUpdates, 'all'); assert.equal(writes[0].body.conferenceData.createRequest.requestId, order)
  assert.equal(writes[0].body.attendees[0].email, 'qa@example.test')
}))

test('late approved payment and order mismatch require review, never revive an expired/cancelled hold', async () => atFixedTime(async () => {
  for (const expired of [true, false]) {
    const r = record(), pay = payment(r)
    if (expired) { r.extendedProperties.private.expires = String(now - 1); r.extendedProperties.private.state = 'expired'; r.status = 'cancelled' }
    else r.extendedProperties.private.order = '87654321-1234-1234-1234-123456789abc'
    const writes = setup(r, pay), result = await finalize('123')
    assert.equal(result.review, true); assert.equal(result.confirmed, false); assert.equal(writes.length, 0)
  }
}))

test('cleanup uses conditional silent cancellation and the same slot can be held again', async () => atFixedTime(async () => {
  const r = record(); r.extendedProperties.private.expires = String(now - 1)
  const writes = setup(r, payment(r))
  await cleanExpiredHolds([r])
  assert.equal(r.status, 'cancelled'); assert.equal(writes[0].query.sendUpdates, 'none')
  const reused = await hold(new Date(start).toISOString(), 'New QA', 'new@example.test')
  assert.equal(reused.status, 'tentative'); assert.equal(reused.extendedProperties.private.state, 'hold')
  assert.notEqual(reused.extendedProperties.private.order, order)
  assert.equal(writes.length, 2)
}))
