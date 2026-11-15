import { test } from 'node:test'
import assert from 'node:assert/strict'
import { verifyTurnstile, captchaStatus } from '../src/turnstile.js'
const input = { token: 'private-token', secret: 'private-secret', origin: 'https://oscarbahamonde.com', ip: '192.0.2.10' }
const valid = { success: true, hostname: 'oscarbahamonde.com', action: 'lead-chat' }

test('valid hostname and action pass; empty token never contacts provider', async () => {
  const fetcher = (async () => new Response(JSON.stringify(valid))) as typeof fetch
  await verifyTurnstile(input, { fetch: fetcher, report: () => assert.fail('valid token logged') })
  await assert.rejects(verifyTurnstile({ ...input, token: '' }, { fetch: (() => assert.fail('provider called')) as typeof fetch, report: () => {} }), /captcha_required/)
})

for (const [response, reason] of [
  [{ success: false, 'error-codes': ['timeout-or-duplicate', 'private-token'] }, 'provider_rejected'],
  [{ ...valid, hostname: 'other.example' }, 'hostname_mismatch'],
  [{ ...valid, action: 'other' }, 'action_mismatch'],
] as const) {
  test(`${reason} rejects with safe diagnostics`, async () => {
    const logs: unknown[] = []
    await assert.rejects(verifyTurnstile(input, { fetch: (async () => new Response(JSON.stringify(response))) as typeof fetch, report: d => logs.push(d) }), /captcha_failed/)
    const text = JSON.stringify(logs)
    assert.ok(text.includes(reason))
    for (const sensitive of [input.token, input.secret, input.ip, 'other.example']) assert.ok(!text.includes(sensitive))
  })
}

test('provider outage, malformed response and invalid secret remain service errors', async () => {
  for (const fetcher of [
    async () => { throw Error('private-secret') },
    async () => new Response('not json'),
    async () => new Response(JSON.stringify({ success: false, 'error-codes': ['invalid-input-secret'] })),
    async () => new Response('{}', { status: 503 }),
  ]) await assert.rejects(verifyTurnstile(input, { fetch: fetcher as typeof fetch, report: () => {} }), /captcha_unavailable/)
  assert.equal(captchaStatus('captcha_required'), 400)
  assert.equal(captchaStatus('captcha_failed'), 403)
  assert.equal(captchaStatus('captcha_unavailable'), 503)
})
