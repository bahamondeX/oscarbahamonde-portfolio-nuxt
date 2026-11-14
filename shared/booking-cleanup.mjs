// Only this application's unpaid, expired holds are eligible. Never infer ownership
// from the title: a visitor or a person can create an event with the same title.
export function reusableExpiredHold(event, now = Date.now()) {
  const p = event?.extendedProperties?.private
  return /^b[a-f0-9]{64}$/.test(event?.id || '') && typeof event?.etag === 'string' &&
    p?.app === 'oscar-booking' && ((event.status === 'tentative' && p.state === 'hold') || (event.status === 'cancelled' && p.state === 'expired')) &&
    /^[a-f0-9-]{36}$/.test(p.order || '') && /^\d+$/.test(p.expires || '') &&
    Number(p.expires) <= now && !p.payment && !event.attendees?.length &&
    !event.conferenceData && !event.hangoutLink
}

export function expiredOwnedHold(event, now = Date.now()) {
  return event?.status === 'tentative' && reusableExpiredHold(event, now)
}

export async function cleanupExpiredHolds(events, io, now = Date.now()) {
  const currentEvents = [...events]
  const counts = { cancelled: 0, raced: 0, failed: 0 }
  // Bound latency/quota on the public availability request. Subsequent requests
  // can process the remaining holds. There is no scheduled/background guarantee.
  const candidates = events.filter(e => expiredOwnedHold(e, now)).slice(0, 5)
  for (const candidate of candidates) {
    const index = currentEvents.findIndex(e => e.id === candidate.id)
    try {
      const current = await io.get(candidate.id)
      currentEvents[index] = current
      if (!expiredOwnedHold(current, now)) { counts.raced++; continue }
      currentEvents[index] = await io.cancel(current)
      counts.cancelled++
    } catch (error) {
      if ([404, 410].includes(error.statusCode)) {
        currentEvents[index] = { ...candidate, status: 'cancelled' }
      } else if (error.statusCode === 412) {
        // A payment or a fresh hold won the race. Use its fresh state for slots.
        currentEvents[index] = await io.get(candidate.id)
        counts.raced++
      } else {
        counts.failed++
      }
    }
  }
  return { events: currentEvents, counts }
}
