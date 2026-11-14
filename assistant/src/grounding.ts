import { allFactRecords, retrieveFacts, type FactRecord } from './retrieval.js'
import { sanitizePricing } from './pricing.js'
import type { Locale } from './knowledge.js'

const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const date = (value: unknown, locale: Locale) => value ? new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}-01T12:00:00Z`)) : (locale === 'es' ? 'no verificado' : 'unverified')
export type GroundingCorrection = { reason: string; sourceIds: string[] }
export function renderFact(record: FactRecord, locale: Locale): string {
  const c: any = record.content, es = locale === 'es'
  if (record.type === 'service') return `**${c.title} — ${es ? 'desde' : 'from'} S/${Number(c.startingPricePEN).toLocaleString('en-US')}**\n${c.scope}\n${c.delivery}\n${es ? 'Referencia inicial; el alcance y la propuesta final se acuerdan con Oscar.' : 'Starting reference; scope and the final proposal are agreed with Oscar.'}`
  if (record.type === 'employment') return `**${c.company} · ${c.role}**\n${date(c.start, locale)} – ${c.end ? date(c.end, locale) : c.employmentStatus === 'current' ? (es ? 'presente' : 'present') : date(null, locale)}\n${c.description || (es ? 'Descripción no verificada.' : 'Description unverified.')}`
  if (record.type === 'certification') {
    const expiry = c.expires ? new Date(`${c.expires}-01T00:00:00Z`) : null
    if (expiry) expiry.setUTCMonth(expiry.getUTCMonth() + 1)
    const expired = expiry && expiry <= new Date()
    return `**${c.name} · ${c.issuer}**\n${es ? 'Emisión' : 'Issued'}: ${date(c.issued, locale)}${c.expires ? `; ${es ? 'vencimiento' : 'expires'}: ${date(c.expires, locale)}${expired ? (es ? ' (vencida)' : ' (expired)') : ''}` : ''}${c.verificationUrl ? `\n[${es ? 'Ver credencial' : 'Verify credential'}](${c.verificationUrl})` : ''}`
  }
  if (record.type === 'profile') return [c.name, c.bio, ...(c.achievements || []).map((a: any) => typeof a === 'string' ? a : a.text)].filter(Boolean).join('\n\n')
  if (record.type === 'faq') return c.answer || ''
  if (record.type === 'skills') return `**${c.category || c.title}**: ${(c.skills || []).join(', ')}`
  if (record.type === 'process') return (c.steps || []).map((step: any, i: number) => `${i + 1}. ${typeof step === 'string' ? step : JSON.stringify(step)}`).join('\n')
  if (record.type === 'project') return `**${c.name}**\n${c.description}\n${c.impact || ''}`
  return ''
}
const hardClaim = /(?:\bOscar\b|\bhe\b|\bhis\b|\bworked\b|\bworks\b|trabaj[oóa]|experienc|trayectoria|cargo|puesto|certific|credential|emitid|issued|venci|expir|actualmente|currently|\b20\d{2}\b|\b19\d{2}\b)/i
const claimOfUnknown = /(?:Oscar|he)\s+(?:is\s+|was\s+|has\s+|holds\s+|worked\s+|works\s+|tiene\s+|es\s+|fue\s+|trabaj[oó]\s+).{0,80}(?:certif|credential|at\s+[A-Z]|en\s+[A-Z])|(?:trabaj[oó]|worked|employed)\s+(?:en|at|by)\s+[A-Z]|(?:certificad[oa]|certified)\s+(?:en|in|as)\s+/i
const unknownOrNegated = /(?:no (?:tengo|hay|dispongo|puedo|esta)|no consta|not (?:verified|available|listed|confirmed)|cannot (?:confirm|verify)|do not (?:have|know)|don't (?:have|know)|unverified|sin verificar|no verificado)/i

/**
 * Source-bound facts are rendered from versioned records, never from model paraphrases.
 * This validates the factual scope of the portfolio; it is not a universal technical truth checker.
 * Model responses are buffered until this function finishes, before any delta is published.
 */
export function groundAnswer(raw: string, locale: Locale, visitorText: string) {
  const records = allFactRecords(locale), byId = new Map(records.map(r => [r.id, r]))
  const corrections: GroundingCorrection[] = [], emitted = new Set<string>()
  const rendered: string[] = []
  const unknown = locale === 'es'
    ? 'No tengo ese dato verificado sobre Oscar. Puedes consultar su LinkedIn o agendar una conversación desde la web.'
    : 'I do not have that fact verified about Oscar. You can check his LinkedIn or book a conversation through the website.'
  const put = (record: FactRecord) => {
    if (emitted.has(record.id)) return ''
    emitted.add(record.id); return renderFact(record, locale)
  }
  const biographyQuery = /(?:about|sobre|quien es|quién es|tell me about)\s+Oscar|(?:your|his|tu|tus|su)\s+(?:career|experience|employment|employer|certific|credentials|experiencia|trayectoria|certificaciones|credenciales)|(?:career|trayectoria|certificaciones|credenciales)\s+(?:of|de)\s+Oscar|Oscar.{0,40}(?:career|employment|certific|experiencia|trayectoria)/i.test(visitorText)
  let inCode = false
  for (const paragraph of raw.split(/\n\s*\n/)) {
    // Keep executable examples intact. Code is never used as evidence of a career/price claim.
    let factCode = false
    const fences = paragraph.match(/^\s*```/gm)?.length || 0
    if (inCode || fences) {
      const biographicalCode = biographyQuery && /(?:employer|company|role|certification|credential|employment|certificacion|Oscar)/i.test(paragraph)
      if (fences % 2) inCode = !inCode
      if (!biographicalCode) { rendered.push(paragraph); continue }
      factCode = true
    }
    const refs = [...paragraph.matchAll(/\[\[fact:([a-z0-9:_-]+)\]\]/gi)]
    if (refs.length) {
      const selected = refs.map(m => byId.get(m[1]!)).filter((x): x is FactRecord => !!x)
      const unknownRefs = refs.some(m => !byId.has(m[1]!))
      // A referenced paragraph is a source record slot, not permission to append invented prose.
      rendered.push(...selected.map(put).filter(Boolean))
      corrections.push({ reason: unknownRefs ? 'unknown_source_reference' : 'source_record_rendered', sourceIds: selected.map(x => x.id) })
      if (unknownRefs) rendered.push(unknown)
      continue
    }
    if (!records.some(r => r.type === 'employment' && r.content.employmentStatus === 'current') && /(?:current (?:job|role|employer|position)|(?:empleo|puesto|cargo|empleador) actual|actualmente trabaja|currently works)/i.test(paragraph) && !records.some(r => r.type === 'employment' && normalize(paragraph).includes(normalize(String(r.content.company))))) {
      rendered.push(unknown); corrections.push({ reason: 'unverified_current_employer_removed', sourceIds: [] }); continue
    }
    const text = normalize(paragraph)
    const companies = records.filter(r => r.type === 'employment' && text.includes(normalize(String(r.content.company))))
    const certifications = records.filter(r => r.type === 'certification' && text.includes(normalize(String(r.content.name))))
    const biographicalAssertion = /(?:\bOscar\b|\bhe\b).{0,80}(?:work|career|certif|holds|has|trabaj|experien|obtuvo|gan[oó]|ingres[oó])|(?:tiene|posee|obtuvo|holds|earned).{0,40}(?:certific|credential)|(?:su|his)\s+(?:empleador|cargo|puesto|employer|role)/i.test(paragraph)
    const selected = (factCode || biographicalAssertion || (biographyQuery && hardClaim.test(paragraph))) ? [...companies, ...certifications] : []
    if (selected.length) {
      rendered.push(...selected.map(put).filter(Boolean))
      corrections.push({ reason: 'unbound_biographical_claim_replaced', sourceIds: selected.map(x => x.id) })
      continue
    }
    if (factCode && !selected.length && !refs.length) { rendered.push(unknown); corrections.push({ reason: 'unverified_biographical_code_removed', sourceIds: [] }); continue }
    if (paragraph.split(/(?<=[.!?;])\s+|\n|\b(?:but|however|pero|sin embargo)\b/i).some(part => claimOfUnknown.test(part) && !unknownOrNegated.test(part))) {
      rendered.push(unknown)
      corrections.push({ reason: 'unverified_biographical_claim_removed', sourceIds: [] })
      continue
    }
    // A year belongs to a particular achievement, not a corpus-wide whitelist. Render
    // named profile achievements from their source even when the wrong year appears elsewhere.
    if ((biographyQuery || biographicalAssertion) && /(?:PUCP|hackathon|AWS.{0,12}Speaker|Speaker.{0,12}AWS)/i.test(paragraph) && !unknownOrNegated.test(paragraph)) {
      const profile = records.find(r => r.type === 'profile')!
      rendered.push(put(profile)); corrections.push({ reason: 'profile_achievement_bound_to_source', sourceIds: [profile.id] }); continue
    }
    if (/(?:tiene|cuenta con|posee|obtuvo|holds|has|earned|is certified|esta certificado).{0,60}(?:certific|credential)|(?:certificaci[oó]n|credential).{0,100}(?:emitida|issued|earned)/i.test(paragraph) && !unknownOrNegated.test(paragraph)) {
      rendered.push(unknown); corrections.push({ reason: 'unverified_credential_removed', sourceIds: [] }); continue
    }
    // Meeting confirmation is produced by the payment/Calendar handlers and their action
    // cards, never by the language model. A request or pending tool result is not authority.
    const bookingClaims = paragraph.split(/(?<=[.!?;])\s+|\n/).filter(part => !/\b(?:not|no|nunca|never|pending|pendiente)\b|solo (?:tras|despu[eé]s)|only after/i.test(part))
    const inventedConfirmation = bookingClaims.some(part => /(?:cita|reuni[oó]n|meeting|appointment|booking).{0,50}(?:confirmad|agendad|reservad|confirmed|booked|scheduled)|(?:confirmed|booked|scheduled).{0,30}(?:meeting|appointment|slot|reservation)|(?:confirm[eé]|reserv[eé]|agend[eé]).{0,30}(?:cita|reuni[oó]n|horario|reserva)/i.test(part))
    const waivedPayment = /(?:no (?:necesitas|hace falta|requiere) pagar|(?:no|without) payment (?:needed|required)|you (?:do not|don't) need to pay|guaranteed (?:availability|slot)|disponibilidad garantizada)/i.test(paragraph)
    if (inventedConfirmation || waivedPayment) {
      const policy = byId.get('faq:0')!
      rendered.push(put(policy)); corrections.push({ reason: 'unauthorized_booking_claim_replaced', sourceIds: [policy.id] }); continue
    }
    if (/(?:entrega|entregado|delivery|deliver|terminad|ready).{0,35}(?:garantiz|guarantee|\d+\s*(?:d[ií]as|days|semanas|weeks))|(?:guarantee|garantiz).{0,35}(?:delivery|entrega|deadline|plazo)/i.test(paragraph)) {
      const policy = byId.get('faq:2')!
      const safeClauses = paragraph.split(/,\s+(?=[A-Za-z])|;|(?<=[.!?])\s+/).filter(part => !/(?:entrega|entregado|delivery|deliver|terminad|ready|guarantee|garantiz)/i.test(part))
      const quote = safeClauses.join('; ')
      if (quote) {
        const nested = groundAnswer(quote, locale, visitorText); rendered.push(nested.answer); corrections.push(...nested.corrections)
      }
      rendered.push(put(policy)); corrections.push({ reason: 'unverified_delivery_commitment_removed', sourceIds: [policy.id] }); continue
    }
    if (/(?:ya (?:envi[eé]|enviamos)|(?:email|correo).{0,25}(?:sent|enviado)|(?:I|we) (?:have )?sent)/i.test(paragraph) && !unknownOrNegated.test(paragraph)) {
      rendered.push(locale === 'es' ? 'El envío requiere tu confirmación mediante el control de correo. No tengo un comprobante de envío para afirmar que se haya enviado.' : 'Sending requires your confirmation in the email control. I do not have a delivery receipt to claim it was sent.')
      corrections.push({ reason: 'unverified_email_receipt_removed', sourceIds: [] }); continue
    }
    // Monetary paragraphs about published services are canonicalized as whole records,
    // preserving both the exact starting price and its scope, not just an allowed number.
    if (/(?:S\/\.?|PEN)\s*\d|\d\s*soles/i.test(paragraph) && !/(?:tu|your|visitor|visitante)\s+(?:presupuesto|budget)/i.test(paragraph)) {
      let changed = false
      const lines = paragraph.split(/\n|,\s+(?=[A-Za-z])|;\s*|\s+(?:and|y)\s+(?=[A-Za-z])/).map(line => {
        if (!/(?:S\/\.?|PEN)\s*\d|\d\s*soles/i.test(line)) return line
        const direct = retrieveFacts(line, locale, 1)[0] || retrieveFacts(visitorText, locale, 1)[0]
        if (direct?.type !== 'service') return line
        changed = true
        corrections.push({ reason: 'service_quote_replaced_from_catalog', sourceIds: [direct.id] })
        return put(direct)
      })
      if (changed) { rendered.push(lines.join('\n')); continue }
    }
    rendered.push(paragraph)
  }
  const checked = sanitizePricing(rendered.filter(Boolean).join('\n\n'), locale, visitorText)
  if (checked.filteredAmounts) corrections.push({ reason: 'unverified_currency_removed', sourceIds: [] })
  return { answer: checked.answer, corrections }
}
