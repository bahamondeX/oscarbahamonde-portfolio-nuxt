import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { validPaymentWebhook } from '../shared/payment-webhook.mjs'
const now = Date.parse('2026-11-16T12:00:00Z'), secret = 'synthetic-test-only-key', requestId = 'request-123', dataId = '123456'
const signed = ts => ({ secret, requestId, dataId, signature: `ts=${ts},v1=${createHmac('sha256', secret).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest('hex')}` })
test('signed MercadoPago notification validates seconds and milliseconds timestamps', () => {
  assert.equal(validPaymentWebhook(signed(String(now)), now), true)
  assert.equal(validPaymentWebhook(signed(String(now / 1000)), now), true)
})
test('signature rejects tampering, stale replay, duplicate/array fields and missing secret', () => {
  const base = signed(String(now))
  for (const patch of [{ dataId: '999' }, { requestId: 'other' }, { secret: '' }, { dataId: ['123456'] }, { requestId: 'bad;id:123' }, { signature: undefined }, { signature: base.signature + ',v1=' + 'a'.repeat(64) }])
    assert.equal(validPaymentWebhook({ ...base, ...patch }, now), false)
  assert.equal(validPaymentWebhook(signed(String(now - 300001)), now), false)
  assert.equal(validPaymentWebhook(signed(String(now + 300001)), now), false)
})
