import type { DynamoDBStreamEvent } from 'aws-lambda'
import { unmarshall } from '@aws-sdk/util-dynamodb'
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime'
import { cfg, metric, ttlActive } from './config.js'
import { get, lease, update, history } from './store.js'
import { sendRaw } from './google.js'
import { escapeHtml, mimeMessage, sessionAttachments } from './mail.js'
import { mediaWaitState, fileDeliveryNotes } from './media-status.js'
import { groundedSummary, summarySystem } from './summary.js'
const bedrock = new BedrockRuntimeClient({})
export function milestone(record: any) {
  if (record.eventName === 'INSERT') return 'created'
  const old = record.dynamodb?.OldImage ? unmarshall(record.dynamodb.OldImage) : {}
  const next = record.dynamodb?.NewImage ? unmarshall(record.dynamodb.NewImage) : {}
  return record.eventName === 'MODIFY' &&
    ['qualified', 'closed'].includes(next.status) &&
    !['qualified', 'closed'].includes(old.status)
    ? 'completed'
    : null
}
export const defaults = {
  get,
  lease,
  update,
  history,
  attachments: sessionAttachments,
  send: sendRaw,
  mediaWait: () => new Promise<void>(resolve => setTimeout(resolve, 30000)),
  summarize: async (text: string) => {
    const r = await bedrock.send(
      new ConverseCommand({
        modelId: cfg.model,
        system: [
          {
            text: summarySystem,
          },
        ],
        messages: [{ role: 'user', content: [{ text: text.slice(0, 80000) }] }],
        inferenceConfig: { maxTokens: 600, temperature: 0 },
        guardrailConfig: {
          guardrailIdentifier: cfg.guardrail,
          guardrailVersion: cfg.guardrailVersion,
        },
      }),
    )
    if (r.stopReason === 'guardrail_intervened') return ''
    return groundedSummary(r.output?.message?.content?.map((x) => x.text || '').join('') || '', text)
  },
}
export async function processRecords(event: DynamoDBStreamEvent, deps = defaults) {
  const failures: { itemIdentifier: string }[] = []
  for (const r of event.Records) {
    const mark = milestone(r)
    if (!mark) continue
    const lead = unmarshall(r.dynamodb!.NewImage as any),
      id = `notify#${lead.id}#${mark}`
    let acquired = false
    try {
      if (!ttlActive(lead)) continue
      const session = await deps.get(cfg.table, lead.sessionId)
      if (!session || !ttlActive(session)) continue
      if (mark === 'completed') {
        const state = await deps.get(cfg.table, id)
        if (state?.done) continue
        const attempts = Number(state?.mediaWaitAttempts || 0)
        if (mediaWaitState(session.files || [], attempts).wait) {
          await deps.update(cfg.table, id, { mediaWaitAttempts: attempts + 1, ttl: session.ttl })
          // Give normal async transcription time to finish before consuming a stream retry.
          await deps.mediaWait()
          throw Error('media_still_processing')
        }
      }
      if (!(await deps.lease(id))) continue
      acquired = true
      const transcript = mark === 'completed' ? await deps.history(lead.sessionId) : []
      const text = transcript.map((m: any) => `${m.role}: ${m.content}`).join('\n\n')
      let summary = ''
      if (mark === 'completed') {
        try { summary = await deps.summarize(text) }
        catch { metric('SummaryErrors') }
      }
      const { attachments, links } =
        mark === 'completed'
          ? await deps.attachments(lead.sessionId)
          : { attachments: [], links: '' }
      // Transcript is an attachment as well as escaped HTML: no message is omitted from final delivery.
      if (mark === 'completed')
        attachments.push({ name: 'transcript.txt', type: 'text/plain', bytes: Buffer.from(text) })
      const fields = [
        'name',
        'email',
        'whatsapp',
        'company',
        'service',
        'scope',
        'budget',
        'deadline',
        'origin',
        'status',
      ]
      const mediaNotes = mark === 'completed' ? fileDeliveryNotes(session.files || []).map(f => `<p><strong>${escapeHtml(f.name)}</strong>: ${escapeHtml(f.reason)}</p>`).join('') : ''
      const html = `<h1>Lead · ${escapeHtml(lead.name || 'Visitante')}</h1><p>${escapeHtml(new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', dateStyle: 'full', timeStyle: 'short' }).format(new Date(lead.updatedAt)))}</p><table>${fields.map((k) => `<tr><th style="text-align:left;padding:6px">${k}</th><td>${escapeHtml(lead[k] || '—')}</td></tr>`).join('')}</table>${summary ? '<h2>Extractos relevantes · selección IA</h2><pre style="white-space:pre-wrap">' + escapeHtml(summary) + '</pre>' : ''}<p>${lead.email ? '<a href="mailto:' + escapeHtml(lead.email) + '">Responder</a> · ' : ''}<a href="${cfg.origin}/es#contact">Agendar</a></p>${links}${mediaNotes}<h2>Transcripción completa</h2><pre style="white-space:pre-wrap">${escapeHtml(text)}</pre><p>Enviado por el asistente de IA de Oscar.</p>`
      const subject =
        `[Lead] ${lead.name || 'Visitante'} · ${lead.service || 'Consulta'} · ${lead.budget || 'Por definir'}`
          .replace(/[\r\n]/g, ' ')
          .slice(0, 300)
      await deps.send(
        mimeMessage({
          to: cfg.owner,
          replyTo: lead.email,
          subject,
          html,
          attachments,
          messageId: id,
        }),
      )
      await deps.update(cfg.table, id, {
        done: true,
        [mark === 'created' ? 'notified_created' : 'notified_completed']: new Date().toISOString(),
      })
      metric('LeadEmails')
    } catch {
      // Clear lease on a definite failure so partial-batch retries can proceed.
      // Gmail may accept mail and time out: deterministic Message-ID helps diagnostics, not exactly-once transport.
      if (acquired)
        try {
          await deps.update(cfg.table, id, { leaseUntil: 0 })
        } catch {}
      metric('NotificationErrors')
      failures.push({ itemIdentifier: r.dynamodb!.SequenceNumber! })
    }
  }
  return { batchItemFailures: failures }
}
// Lambda passes its Context as the second argument; keep injected test dependencies private.
export const handler = (event: DynamoDBStreamEvent) => processRecords(event)
