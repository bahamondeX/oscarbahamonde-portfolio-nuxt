import { z } from 'zod'
const text = (n = 200) =>
  z
    .string()
    .trim()
    .min(1)
    .max(n)
    .refine((s) => !/[\r\n\x00]/.test(s), 'No control characters')
export const email = z
  .email()
  .max(254)
  .transform((s) => s.toLowerCase())
export const leadSchema = z
  .object({
    name: text(100).optional(),
    email: email.optional(),
    whatsapp: text(40).optional(),
    company: text().optional(),
    service: text().optional(),
    scope: z.string().max(2000).optional(),
    budget: text().optional(),
    deadline: text().optional(),
    status: z.enum(['open', 'qualified', 'closed']).optional(),
  })
  .strict()
export const schemas = {
  get_services: z.object({ category: z.enum(['web', 'automation', 'audit']).optional() }).strict(),
  check_availability: z
    .object({
      date_range: z
        .object({ start: z.iso.datetime({ offset: true }), end: z.iso.datetime({ offset: true }) })
        .strict(),
      duration: z.literal(30),
    })
    .strict(),
  schedule_meeting: z
    .object({
      name: text(100),
      email,
      start: z.iso.datetime({ offset: true }),
      duration: z.literal(30),
      topic: text(200),
    })
    .strict(),
  send_email: z
    .object({
      to: email,
      subject: z.enum(['services', 'meeting']),
      body: z.string().max(2000),
      attachments: z.array(z.uuid()).max(5).optional(),
    })
    .strict(),
  save_lead: z.object({ lead_data: leadSchema }).strict(),
}
export type ToolName = keyof typeof schemas
export const toolNames = Object.keys(schemas) as ToolName[]
export const actionSchema = z.object({ id: z.uuid(), approved: z.boolean() }).strict()
export const historySchema = z.array(z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4000),
}).strict()).max(24).refine((items) => items.reduce((n, m) => n + m.content.length, 0) <= 24000, 'history_too_large')
export const consentSchema = z.object({ consent: z.literal(true), history: historySchema.default([]) }).strict()
export const requestSchema = z
  .object({
    message: z.string().trim().min(1).max(4000).optional(),
    locale: z.enum(['es', 'en']).default('es'),
    history: historySchema.optional(),
    action: actionSchema.optional(),
    requestId: z.uuid(),
  })
  .strict()
  .refine((x) => !!x.message !== !!x.action)
export const mimeTypes = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
]
export const uploadSchema = z
  .object({
    name: text(180),
    size: z.number().int().positive(),
    mime: z.enum(mimeTypes as [string, ...string[]]),
    kind: z.enum(['file', 'audio']),
  })
  .strict()
export function slotAllowed(start: string, now = Date.now()) {
  const n = Date.parse(start),
    d = new Date(n - 5 * 3600000),
    h = d.getUTCHours(),
    m = d.getUTCMinutes(),
    day = d.getUTCDay()
  return (
    Number.isFinite(n) &&
    n >= now + 4 * 3600000 &&
    n <= now + 60 * 86400000 &&
    day > 0 &&
    day < 6 &&
    [0, 30].includes(m) &&
    !d.getUTCSeconds() &&
    !d.getUTCMilliseconds() &&
    ((h >= 9 && h < 13) || (h >= 14 && h < 17))
  )
}
export function allowedRecipient(to: string, s: any, owner: string) {
  return to === owner || to === s.verifiedEmail
}
export function auditParams(value: any) {
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [
      k,
      ['category', 'duration', 'status'].includes(k)
        ? v
        : { redacted: true, type: typeof v, length: typeof v === 'string' ? v.length : undefined },
    ]),
  )
}
