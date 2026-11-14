import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { cfg } from './config.js'
import { get } from './store.js'
import { randomUUID, createHash } from 'node:crypto'
const s3 = new S3Client({})
export const escapeHtml = (s: any) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  )
type Attachment = { name: string; type: string; bytes: Buffer }
export async function sessionAttachments(sessionId: string, ids?: string[]) {
  const s = await get(cfg.table, sessionId),
    files = (s?.files || []).filter((f: any) => f.validated && (!ids || ids.includes(f.id)))
  if (ids && files.length !== new Set(ids).size) throw Error('unknown_or_unvalidated_attachment')
  const attachments: Attachment[] = []
  let links = '',
    total = 0
  for (const f of files) {
    const cmd = new GetObjectCommand({ Bucket: cfg.bucket, Key: f.key })
    if (total + f.size < 17000000) {
      let obj
      try { obj = await s3.send(cmd) }
      catch (e: any) {
        if (['NoSuchKey', 'NotFound'].includes(e.name)) { links += `<p>${escapeHtml(f.name)}: el archivo ya no está disponible; no se adjuntó.</p>`; continue }
        throw e
      }
      const bytes = Buffer.from(await obj.Body!.transformToByteArray())
      total += bytes.length
      attachments.push({ name: f.name, type: f.mime, bytes })
    } else
      links += `<p><a href="${escapeHtml(await getSignedUrl(s3, cmd, { expiresIn: 86400 }))}">${escapeHtml(f.name)}</a> (24h)</p>`
  }
  return { attachments, links }
}
export function mimeMessage({
  to,
  subject,
  html,
  attachments = [],
  replyTo,
  messageId,
}: {
  to: string
  subject: string
  html: string
  attachments?: Attachment[]
  replyTo?: string
  messageId: string
}) {
  for (const v of [to, subject, replyTo || ''])
    if (/[\r\n]/.test(v)) throw Error('header_injection')
  const boundary = 'oscar_' + randomUUID(),
    wrap = (b: Buffer) =>
      b
        .toString('base64')
        .match(/.{1,76}/g)
        ?.join('\r\n') || ''
  let raw = `To: ${to}\r\nSubject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=\r\nMessage-ID: <${createHash('sha256').update(messageId).digest('hex')}@oscarbahamonde.com>\r\n${replyTo ? 'Reply-To: ' + replyTo + '\r\n' : ''}MIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n--${boundary}\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${wrap(Buffer.from(html))}\r\n`
  for (const a of attachments) {
    const name = encodeURIComponent(a.name)
    raw += `--${boundary}\r\nContent-Type: ${a.type}\r\nContent-Disposition: attachment; filename*=UTF-8''${name}\r\nContent-Transfer-Encoding: base64\r\n\r\n${wrap(a.bytes)}\r\n`
  }
  return Buffer.from(raw + `--${boundary}--\r\n`)
}
