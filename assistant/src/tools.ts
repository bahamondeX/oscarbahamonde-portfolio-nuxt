import { z } from 'zod'
import kb from '../knowledge/services.json' with { type: 'json' }
import { schemas, slotAllowed, allowedRecipient, type ToolName } from './validation.js'
import { cfg } from './config.js'
import { google, sendRaw, secret } from './google.js'
import { get, update, saveLead, lease, db, history } from './store.js'
import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'node:crypto'
import { mimeMessage } from './mail.js'
export const toolSpecs = Object.entries(schemas).map(([name, schema]) => ({
  toolSpec: {
    name,
    description: (
      {
        get_services: 'Read verified services, scopes and starting prices in PEN.',
        check_availability:
          'Read actual freebusy. Thirty minute sessions, Lima office hours, four hour notice, buffers.',
        schedule_meeting:
          'Request a meeting. Paid consultations must use existing site checkout, never claim booked. Free intro requires enabled flag and explicit action confirmation.',
        send_email:
          'Request a predefined email to the confirmed visitor email or owner. Requires explicit confirmation in UI.',
        save_lead:
          'Save only personal fields explicitly provided by visitor after consent. Ask one optional question at a time; skip declined fields.',
      } as Record<string, string>
    )[name],
    inputSchema: { json: z.toJSONSchema(schema, { target: 'draft-7', io: 'input' }) as any },
  },
}))
export async function availability(
  input: any,
  fetchGoogle = google,
  now = Date.now(),
  calendarId?: string,
) {
  const { date_range, duration } = schemas.check_availability.parse(input),
    start = Date.parse(date_range.start),
    end = Date.parse(date_range.end)
  if (
    end <= start ||
    end - start > 14 * 86400000 ||
    start < now - 86400000 ||
    end > now + 60 * 86400000
  )
    throw Error('invalid_date_range')
  const id = calendarId || (await secret(cfg.googleSecret)).calendar_id || 'primary',
    buffer = cfg.buffer * 60000
  const r = await fetchGoogle('calendar/v3/freeBusy', {
    method: 'POST',
    body: JSON.stringify({
      timeMin: new Date(start - buffer).toISOString(),
      timeMax: new Date(end + buffer).toISOString(),
      timeZone: 'America/Lima',
      items: [{ id }],
    }),
  })
  const cal = r.calendars?.[id]
  if (!cal || cal.errors?.length) throw Error('calendar_unavailable')
  const slots: string[] = []
  for (let n = Math.ceil(start / 1800000) * 1800000; n + duration * 60000 <= end; n += 1800000) {
    const iso = new Date(n).toISOString()
    if (
      slotAllowed(iso, now) &&
      !cal.busy.some(
        (b: any) =>
          Date.parse(b.start) < n + duration * 60000 + buffer && Date.parse(b.end) > n - buffer,
      )
    )
      slots.push(iso)
  }
  return { slots, timeZone: 'America/Lima', duration, bufferMinutes: cfg.buffer }
}
export async function executeTool(name: ToolName, input: any, s: any, operationId?: string) {
  const args = schemas[name].parse(input) as any
  switch (name) {
    case 'get_services':
      return {
        ...kb,
        services: kb.services.filter((x) => !args.category || x.category === args.category),
      }
    case 'check_availability':
      return availability(args)
    case 'save_lead': {
      if (!s.consentAt) throw Error('consent_required')
      if (args.lead_data.email && args.lead_data.email !== s.verifiedEmail)
        throw Error('confirm_email_in_profile_first')
      const visitorText = (await history(s.id))
        .filter((m) => m.role === 'user')
        .map((m) => m.content)
        .join(' ')
        .toLowerCase()
      for (const [field, value] of Object.entries(args.lead_data))
        if (
          !['email', 'status'].includes(field) &&
          !visitorText.includes(String(value).toLowerCase())
        )
          throw Error('lead_field_not_provided_by_visitor')
      return saveLead(s, args.lead_data)
    }
    case 'schedule_meeting': {
      if (args.email !== s.verifiedEmail) throw Error('email_confirmation_required')
      if (!slotAllowed(args.start)) throw Error('invalid_slot')
      if (!cfg.freeIntro)
        return {
          status: 'payment_required',
          price: 20,
          currency: 'PEN',
          duration: 30,
          url: cfg.origin + '/es#contact',
          start: args.start,
          note: 'Use the existing booking form to select this slot and pay MercadoPago. Only its approved-payment webhook confirms Google Meet.',
        }
      if (!operationId) throw Error('explicit_confirmation_required')
      const id = 'intro#' + s.id
      const previous = await get(cfg.table, id)
      if (previous?.result) return previous.result
      if (!(await lease(id))) return (await get(cfg.table, id))?.result
      // Calendar IDs are deterministic per session, so retries cannot create two invitations.
      const available = await availability({
        date_range: {
          start: args.start,
          end: new Date(Date.parse(args.start) + 1800000).toISOString(),
        },
        duration: 30,
      })
      if (!available.slots.includes(args.start)) throw Error('slot_unavailable')
      const c = await secret(cfg.googleSecret),
        calendar = encodeURIComponent(c.calendar_id || 'primary'),
        eventId = s.id.replace(/-/g, '')
      let event: any
      try {
        event = await google(
          `calendar/v3/calendars/${calendar}/events?conferenceDataVersion=1&sendUpdates=all`,
          {
            method: 'POST',
            body: JSON.stringify({
              id: eventId,
              summary: 'Intro · ' + args.topic,
              start: { dateTime: args.start, timeZone: 'America/Lima' },
              end: {
                dateTime: new Date(Date.parse(args.start) + 1800000).toISOString(),
                timeZone: 'America/Lima',
              },
              attendees: [{ email: args.email, displayName: args.name }],
              conferenceData: {
                createRequest: {
                  requestId: eventId,
                  conferenceSolutionKey: { type: 'hangoutsMeet' },
                },
              },
            }),
          },
        )
      } catch (e: any) {
        if (e.status !== 409) throw e
        event = await google(`calendar/v3/calendars/${calendar}/events/${eventId}`)
      }
      const result = {
        status: 'confirmed',
        start: args.start,
        meet: event.hangoutLink,
        eventId: event.id,
      }
      await update(cfg.table, id, { done: true, result })
      return result
    }
    case 'send_email': {
      if (!operationId) throw Error('explicit_confirmation_required')
      if (!allowedRecipient(args.to, s, cfg.owner)) throw Error('recipient_forbidden')
      if (args.subject === 'meeting')
        throw Error('meeting_confirmation_is_sent_by_payment_webhook_calendar')
      const id = 'email#' + s.id + '#' + operationId,
        previous = await get(cfg.table, id)
      if (previous?.done) return { sent: true }
      if (!(await lease(id))) return { sent: true }
      // Charge quota before sending. Retries of an ambiguous send never bypass the cap.
      await db.send(
        new UpdateCommand({
          TableName: cfg.table,
          Key: { id: s.id },
          UpdateExpression: 'ADD emails :one',
          ConditionExpression: 'attribute_not_exists(emails) OR emails<:max',
          ExpressionAttributeValues: { ':one': 1, ':max': 3 },
        }),
      )
      // The model cannot inject arbitrary body text into outbound email.
      const html =
        '<h1>Servicios de Oscar / Oscar’s services</h1>' +
        kb.services.map((x) => `<p>${x.es.title} / ${x.en.title}: desde S/${x.from}</p>`).join('') +
        `<p><a href="${cfg.origin}/es#contact">Agendar / Book</a></p><p>Enviado por el asistente de IA de Oscar / Sent by Oscar’s AI assistant.</p>`
      const { attachments, links } = await import('./mail.js').then((m) =>
        m.sessionAttachments(s.id, args.attachments || []),
      )
      await sendRaw(
        mimeMessage({
          to: args.to,
          subject: 'Servicios de Oscar · Services',
          html: html + links,
          attachments,
          messageId: id,
        }),
      )
      await update(cfg.table, id, { done: true })
      return { sent: true }
    }
  }
}
export async function pendingAction(s: any, name: ToolName, args: any) {
  const id = randomUUID()
  await update(cfg.table, s.id, { pending: { id, name, args, expires: Date.now() + 600000 } })
  return { confirmationRequired: true, id, name, args }
}
