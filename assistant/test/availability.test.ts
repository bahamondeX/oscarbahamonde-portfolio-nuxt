import { test } from 'node:test'
import assert from 'node:assert/strict'
import { availability } from '../src/tools.js'
test('Google freebusy applies buffers and never treats provider error as free', async () => {
  const args = {
      date_range: { start: '2030-11-18T14:00:00Z', end: '2030-11-18T16:00:00Z' },
      duration: 30,
    },
    now = Date.parse('2030-11-17T00:00:00Z')
  const google = async () => ({
    calendars: {
      primary: { busy: [{ start: '2030-11-18T14:30:00Z', end: '2030-11-18T15:00:00Z' }] },
    },
  })
  const r = await availability(args, google, now, 'primary')
  assert.deepEqual(r.slots, ['2030-11-18T15:30:00.000Z'])
  await assert.rejects(() =>
    availability(
      args,
      async () => ({ calendars: { primary: { errors: [{ reason: 'forbidden' }] } } }),
      now,
      'primary',
    ),
  )
  await assert.rejects(() =>
    availability(
      { ...args, date_range: { start: args.date_range.start, end: '2031-11-18T16:00:00Z' } },
      google,
      now,
      'primary',
    ),
  )
})
