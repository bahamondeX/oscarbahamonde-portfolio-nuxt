import { test } from 'node:test'
import assert from 'node:assert/strict'
import { expiredOwnedHold, cleanupExpiredHolds } from '../shared/booking-cleanup.mjs'
import { blocks } from '../shared/booking.mjs'
const now = Date.parse('2026-11-16T12:00:00Z')
const fixture = () => ({ id: 'b' + 'a'.repeat(64), etag: 'version-1', status: 'tentative', extendedProperties: { private: { app: 'oscar-booking', state: 'hold', expires: String(now - 1), order: '12345678-1234-1234-1234-123456789abc' } } })

test('cleanup only selects expired unpaid application holds without guests or Meet', () => {
  assert.equal(expiredOwnedHold(fixture(), now), true)
  for (const patch of [{ id: 'foreign' }, { etag: undefined }, { status: 'confirmed' }, { status: 'cancelled' }, { attendees: [{ email: 'guest@example.test' }] }, { conferenceData: {} }, { hangoutLink: 'https://meet.google.com/test' }])
    assert.equal(expiredOwnedHold({ ...fixture(), ...patch }, now), false)
  for (const patch of [{ app: 'another-app' }, { state: 'confirmed' }, { payment: '123' }, { expires: 'NaN' }, { expires: '' }, { expires: String(now + 1) }]) {
    const event = fixture(); Object.assign(event.extendedProperties.private, patch)
    assert.equal(expiredOwnedHold(event, now), false)
  }
})

test('cleanup is bounded, cancels expired holds and cancellation frees availability', async () => {
  const events = Array.from({ length: 6 }, (_, i) => ({ ...fixture(), id: 'b' + i.toString(16).padStart(64, '0') }))
  let calls = 0
  const result = await cleanupExpiredHolds(events, { get: async id => events.find(e => e.id === id), cancel: async event => { calls++; return { ...event, status: 'cancelled' } } }, now)
  assert.equal(calls, 5); assert.equal(result.counts.cancelled, 5)
  assert.equal(result.events[5].status, 'tentative')
  assert.equal(blocks(result.events[0], now), false)
  assert.equal(events[0].status, 'tentative')
})

test('fresh payment or renewed hold before cleanup is never cancelled', async () => {
  for (const change of [{ state: 'confirmed', payment: '987' }, { expires: String(now + 900000) }]) {
    const current = fixture(); Object.assign(current.extendedProperties.private, change)
    const result = await cleanupExpiredHolds([fixture()], { get: async () => current, cancel: async () => { throw Error('must not cancel') } }, now)
    assert.equal(result.counts.raced, 1)
    assert.equal(result.events[0], current)
    assert.equal(blocks(current, now), true)
  }
})

test('ETag conflict preserves the winning confirmed event and never retries cancellation', async () => {
  const initial = fixture(), paid = fixture(); paid.status = 'confirmed'; paid.extendedProperties.private.state = 'confirmed'; paid.extendedProperties.private.payment = '987'
  let reads = 0, writes = 0
  const result = await cleanupExpiredHolds([initial], { get: async () => ++reads === 1 ? initial : paid, cancel: async () => { writes++; throw { statusCode: 412 } } }, now)
  assert.equal(writes, 1); assert.equal(reads, 2); assert.equal(result.events[0], paid)
  assert.equal(blocks(result.events[0], now), true)
})

test('an already removed hold is tolerated; transient errors are counted without deleting anything', async () => {
  const gone = await cleanupExpiredHolds([fixture()], { get: async () => { throw { statusCode: 410 } }, cancel: async () => { throw Error('never') } }, now)
  assert.equal(gone.events[0].status, 'cancelled')
  const failed = await cleanupExpiredHolds([fixture()], { get: async () => { throw { statusCode: 503 } }, cancel: async () => { throw Error('never') } }, now)
  assert.equal(failed.counts.failed, 1)
})
