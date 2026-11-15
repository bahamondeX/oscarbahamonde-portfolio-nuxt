import { test } from 'node:test'
import assert from 'node:assert/strict'
import { captchaFresh, createVerifiedSession } from '../shared/captcha-session.mjs'

test('tokens are refreshed before their provider deadline', () => {
  assert.equal(captchaFresh('token', 1000, 270999), true)
  assert.equal(captchaFresh('token', 1000, 271000), false)
  assert.equal(captchaFresh('', 1000, 2000), false)
  assert.equal(captchaFresh('token', 0, 2000), false)
})

for (const failure of ['captcha_failed', 'captcha_unavailable', 'network_timeout']) {
  test(`${failure}: consumes token before request and enables recovery without losing draft`, async () => {
    let token = 'first-token', draft = 'My project', failed = false
    const request = async (path, body) => {
      assert.equal(token, '')
      assert.equal(path, '/session')
      assert.equal(body.token, 'first-token')
      throw Error(failure)
    }
    const session = await createVerifiedSession({ token, locale: 'es', request, consume: () => { token = '' }, recover: () => { failed = true } })
    assert.equal(session, null)
    assert.equal(token, '')
    assert.equal(draft, 'My project')
    assert.equal(failed, true)
    token = 'fresh-token'
    const recovered = await createVerifiedSession({ token, locale: 'es', consume: () => { token = '' }, recover: () => assert.fail('fresh request failed'), request: async (_, body) => { assert.equal(body.token, 'fresh-token'); return { token: 'session' } } })
    assert.deepEqual(recovered, { token: 'session' })
  })
}
