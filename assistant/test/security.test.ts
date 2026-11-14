import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  schemas,
  allowedRecipient,
  slotAllowed,
  requestSchema,
  auditParams,
} from '../src/validation.js'
import { mimeMessage, escapeHtml } from '../src/mail.js'
import kb from '../knowledge/services.json' with { type: 'json' }
import { readFileSync } from 'node:fs'
test('strict tools reject injected fields, arbitrary recipients, overlong emails and unbounded durations', () => {
  assert.throws(() =>
    schemas.send_email.parse({
      to: 'victim@example.com',
      subject: 'services',
      body: 'x',
      bcc: 'other@example.com',
    }),
  )
  assert.throws(() =>
    schemas.send_email.parse({
      to: 'a@example.com\r\nBcc: victim@example.com',
      subject: 'services',
      body: 'x',
    }),
  )
  assert.throws(() =>
    schemas.schedule_meeting.parse({
      name: 'Test',
      email: 'a@example.com',
      start: '2030-01-01T14:00:00Z',
      duration: 60,
      topic: 'x',
    }),
  )
  assert.equal(
    allowedRecipient(
      'other@example.com',
      { verifiedEmail: 'lead@example.com' },
      'owner@example.com',
    ),
    false,
  )
  assert.equal(
    allowedRecipient(
      'lead@example.com',
      { verifiedEmail: 'lead@example.com' },
      'owner@example.com',
    ),
    true,
  )
  assert.equal(allowedRecipient('owner@example.com', {}, 'owner@example.com'), true)
})
test('Lima windows enforce lunch, four hour notice, weekends and boundaries', () => {
  const now = Date.parse('2030-11-18T00:00:00Z')
  assert.equal(slotAllowed('2030-11-18T14:00:00Z', now), true)
  assert.equal(slotAllowed('2030-11-18T18:00:00Z', now), false)
  assert.equal(slotAllowed('2030-11-23T14:00:00Z', now), false)
  assert.equal(slotAllowed('2030-11-18T14:15:00Z', now), false)
  assert.equal(slotAllowed('2030-11-18T14:00:00Z', Date.parse('2030-11-18T12:00:00Z')), false)
})
test('confirmation cannot be forged by adding arbitrary tool fields or sending two payload types', () => {
  assert.throws(() =>
    requestSchema.parse({
      requestId: crypto.randomUUID(),
      action: { id: crypto.randomUUID(), approved: true, args: { to: 'victim@example.com' } },
    }),
  )
  assert.throws(() =>
    requestSchema.parse({
      requestId: crypto.randomUUID(),
      message: 'hello',
      action: { id: crypto.randomUUID(), approved: true },
    }),
  )
})
test('MIME rejects header injection and escapes HTML; audit never logs PII values', () => {
  assert.throws(() =>
    mimeMessage({
      to: 'a@example.com',
      subject: 'x\r\nBcc: b@example.com',
      html: 'x',
      messageId: '1',
    }),
  )
  assert.equal(escapeHtml('<script>'), '&lt;script&gt;')
  const audit = JSON.stringify(
    auditParams({ email: 'lead@example.com', name: 'Private Name', duration: 30 }),
  )
  assert.ok(!audit.includes('lead@example.com') && !audit.includes('Private Name'))
})
test('versioned catalog uses existing prices, no invented services', () => {
  const source = readFileSync(new URL('../../shared/services.mjs', import.meta.url), 'utf8')
  for (const service of kb.services)
    assert.ok(
      source.includes(`id: '${service.id}', group: '${service.category}', price: ${service.from}`),
    )
})
