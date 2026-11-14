import { createHmac, timingSafeEqual } from 'node:crypto'

// Checkout Pro payment IDs are numeric. Keep signed fields as raw strings;
// arrays, duplicate signatures and manifest delimiters are rejected.
export function validPaymentWebhook({ signature, requestId, dataId, secret }, now = Date.now()) {
  if (typeof secret !== 'string' || !secret || typeof signature !== 'string' ||
      typeof requestId !== 'string' || !/^[A-Za-z0-9-]{1,200}$/.test(requestId) ||
      typeof dataId !== 'string' || !/^\d{1,30}$/.test(dataId)) return false
  const parts = signature.split(',').map(part => part.trim().split('='))
  if (parts.length !== 2 || parts.some(p => p.length !== 2)) return false
  const fields = Object.fromEntries(parts)
  if (Object.keys(fields).length !== 2 || !/^\d{10}(?:\d{3})?$/.test(fields.ts || '') ||
      !/^[a-fA-F0-9]{64}$/.test(fields.v1 || '')) return false
  const sent = Number(fields.ts) * (fields.ts.length === 10 ? 1000 : 1)
  if (Math.abs(now - sent) > 300000) return false
  const manifest = `id:${dataId};request-id:${requestId};ts:${fields.ts};`
  const expected = createHmac('sha256', secret).update(manifest).digest()
  return timingSafeEqual(expected, Buffer.from(fields.v1, 'hex'))
}
