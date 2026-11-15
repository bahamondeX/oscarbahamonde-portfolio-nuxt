import { DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { createHash, randomUUID } from 'node:crypto'
import { S3Client, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'
import { cfg, metric } from './config.js'
import { secret } from './google.js'
import { verifyTurnstile, captchaStatus } from './turnstile.js'
import {
  message,
  db,
  authenticate,
  sessionCreate,
  consentSession,
  rate,
  lock,
  update,
  history,
  reserveTurn,
  saveLead,
  get,
} from './store.js'
import { requestSchema, uploadSchema, email, consentSchema } from './validation.js'
import { runAgent, invokeTool } from './agent.js'
import { validateObject } from './media.js'
const s3 = new S3Client({}),
  lambda = new LambdaClient({})
declare const awslambda: any
export async function route(event: any, emit: (type: string, data: any) => void) {
  const path = event.rawPath,
    method = event.requestContext?.http?.method || 'POST',
    origin = event.headers?.origin
  if (origin !== cfg.origin) throw Error('forbidden_origin')
  const ip = event.requestContext?.http?.sourceIp || 'unknown'
  const readOnly = method === 'GET' && path === '/session'
  await rate((readOnly ? 'ip-read#' : 'ip#') + createHash('sha256').update(ip).digest('hex'), readOnly ? 90 : 30)
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString()
    : event.body || '{}'
  const bodyLimit = ['/messages', '/consent'].includes(path) ? 128000 : 16000
  if (Buffer.byteLength(raw) > bodyLimit) throw Error('payload_too_large')
  const b = JSON.parse(raw)
  if (path === '/session' && method === 'POST') {
    if (
      !['es', 'en'].includes(b.locale) ||
      typeof b.token !== 'string' ||
      !b.token.trim() ||
      b.token.length > 2048
    )
      throw Error('captcha_required')
    const c = await secret(cfg.captchaSecret)
    await verifyTurnstile({ token: b.token, secret: c.secret, origin: cfg.origin, ip })
    return sessionCreate(b.locale)
  }
  const s = await authenticate(event.headers?.authorization || '')
  await rate((readOnly ? 'session-read#' : 'session#') + s!.id, readOnly ? 60 : 12)
  await update(cfg.table, s!.id, { lastActivity: Date.now() })
  if (path === '/session' && method === 'GET')
    return {
      status: s!.status,
      consent: !!s!.consentAt,
      verifiedEmail: s!.verifiedEmail,
      pending: s!.pending?.expires > Date.now() ? s!.pending : null,
      messages: s!.consentAt ? await history(s!.id) : [],
      files: (s!.files || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        processed: f.processed,
        status: f.status,
        error: f.status === 'failed' ? 'File processing failed; valid original retained when available.' : undefined,
        transcription: f.transcription,
      })),
    }
  if (path === '/consent' && method === 'POST') {
    if (s!.status !== 'open') throw Error('session_closed')
    const input = consentSchema.parse(b)
    await lock(s!.id)
    try {
      const fresh = await get(cfg.table, s!.id)
      if (!fresh?.consentAt) {
        await consentSession(s, input.history)
      }
      return { consent: true }
    } finally { await update(cfg.table, s!.id, { lockUntil: 0 }) }
  }
  if (['/profile', '/upload', '/upload/complete', '/close'].includes(path) && !s!.consentAt)
    throw Error('consent_required')
  if (path === '/profile' && method === 'POST') {
    if (b.confirmed !== true) throw Error('explicit_confirmation_required')
    const verifiedEmail = email.parse(b.email)
    await update(cfg.table, s!.id, { verifiedEmail })
    await saveLead(s, { email: verifiedEmail })
    return { verifiedEmail }
  }
  if (path === '/close' && method === 'POST') {
    if (!(await get(cfg.leads, s!.id))) await saveLead(s, { status: 'open' })
    await saveLead(s, { status: 'closed' })
    await update(cfg.table, s!.id, { status: 'closed' })
    return { closed: true, queued: true }
  }
  if (path === '/session' && method === 'DELETE') {
    // Revoke access first; remove the encrypted source records and objects as requested.
    await update(cfg.table, s!.id, { deleted: true, secretHash: '', status: 'closed' })
    await db.send(new DeleteCommand({ TableName: cfg.leads, Key: { id: s!.id } }))
    for (const m of await history(s!.id))
      await db.send(
        new DeleteCommand({ TableName: cfg.messages, Key: { sessionId: s!.id, sort: m.sort } }),
      )
    for (const f of s!.files || [])
      for (const key of [f.key, f.transcriptKey].filter(Boolean))
        await s3.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }))
    return { deleted: true }
  }
  if (s!.status !== 'open') throw Error('session_closed')
  if (path === '/upload' && method === 'POST') {
    const input = uploadSchema.parse(b)
    if (
      input.size > cfg.maxBytes ||
      (s!.files || []).length >= cfg.maxFiles ||
      (input.kind === 'audio') !== input.mime.startsWith('audio/')
    )
      throw Error('file_limit')
    await lock(s!.id)
    try {
      const fresh = await get(cfg.table, s!.id)
      if ((fresh?.files || []).length >= cfg.maxFiles) throw Error('file_limit')
      const id = randomUUID(),
        key = s!.id + '/' + id,
        file = { ...input, id, key, createdAt: Date.now(), status: 'awaiting_upload', validated: false, processed: false }
      const post = await createPresignedPost(s3, {
        Bucket: cfg.bucket,
        Key: key,
        Expires: 120,
        Fields: {
          'Content-Type': input.mime,
          'x-amz-server-side-encryption': 'aws:kms',
          'x-amz-server-side-encryption-aws-kms-key-id': cfg.key,
        },
        Conditions: [
          ['content-length-range', 1, Math.min(input.size, cfg.maxBytes)],
          ['eq', '$Content-Type', input.mime],
          ['eq', '$x-amz-server-side-encryption', 'aws:kms'],
          ['eq', '$x-amz-server-side-encryption-aws-kms-key-id', cfg.key],
        ],
      })
      await update(cfg.table, s!.id, { files: [...(fresh?.files || []), file] })
      return { id, post }
    } finally {
      await update(cfg.table, s!.id, { lockUntil: 0 })
    }
  }
  if (path === '/upload/complete' && method === 'POST') {
    const file = (s!.files || []).find((x: any) => x.id === b.id)
    if (!file) throw Error('file_not_found')
    try { await validateObject({ ...file, sessionId: s!.id }) }
    catch (error: any) {
      if (['ownership','invalid_file_size_or_type','mime_mismatch'].includes(error.message)) {
        await update(cfg.table, s!.id, { files: s!.files.map((f: any) => f.id === file.id ? { ...f, status: 'failed', processed: true, validated: false } : f) })
      }
      throw error
    }
    await update(cfg.table, s!.id, { files: s!.files.map((f: any) => f.id === file.id ? { ...f, status: 'processing', validated: true } : f) })
    await lambda.send(
      new InvokeCommand({
        FunctionName: process.env.MEDIA_FUNCTION!,
        InvocationType: 'Event',
        Payload: Buffer.from(JSON.stringify({ sessionId: s!.id, fileId: file.id })),
      }),
    )
    return { accepted: true }
  }
  if (path === '/download' && method === 'POST') {
    const f = (s!.files || []).find((x: any) => x.id === b.id && x.validated)
    if (!f) throw Error('file_not_found')
    return {
      url: await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: cfg.bucket,
          Key: f.key,
          ResponseContentDisposition: "attachment; filename*=UTF-8''" + encodeURIComponent(f.name),
        }),
        { expiresIn: 120 },
      ),
    }
  }
  if (path === '/messages' && method === 'POST') {
    const input = requestSchema.parse(b)
    await lock(s!.id)
    try {
      const requestKey = 'request#' + s!.id + '#' + input.requestId
      if (await get(cfg.table, requestKey)) throw Error('request_already_processed')
      await reserveTurn(s)
      await update(cfg.table, requestKey, { done: true, ttl: s!.ttl })
      await update(cfg.table, s!.id, { locale: input.locale })
      if (input.action) {
        const p = s!.pending
        if (!p || p.id !== input.action.id || p.expires < Date.now())
          throw Error('confirmation_expired')
        if (!input.action.approved) {
          await update(cfg.table, s!.id, { pending: null })
          emit('delta', { text: input.locale === 'es' ? 'Acción cancelada.' : 'Action cancelled.' })
          emit('done', { closed: false })
          return
        }
        await message(s!.id, 'user', 'Explicit confirmation: ' + p.name)
        await update(cfg.table, s!.id, { pending: { ...p, approved: true } })
        const result = await invokeTool(p.name, p.args, s, input.action.id)
        await message(s!.id, 'assistant', JSON.stringify(result))
        await update(cfg.table, s!.id, { pending: null })
        emit('result', result)
        emit('done', { closed: false })
        return
      }
      await runAgent({ ...s, locale: input.locale, clientHistory: input.history || [] }, input.message!, emit)
    } finally {
      await update(cfg.table, s!.id, { lockUntil: 0 })
    }
    return
  }
  throw Error('not_found')
}
export const handler =
  typeof awslambda === 'undefined'
    ? undefined
    : awslambda.streamifyResponse(async (event: any, response: any) => {
        const streaming = event.rawPath === '/messages',
          headers = {
            'Content-Type': streaming
              ? 'text/event-stream; charset=utf-8'
              : 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
          }
        let stream: any
        const begin = (statusCode = 200) =>
          stream || (stream = awslambda.HttpResponseStream.from(response, { statusCode, headers }))
        const emit = (type: string, data: any) => {
          begin().write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`)
        }
        try {
          const result = await route(event, emit)
          if (!streaming) begin().write(JSON.stringify(result ?? {}))
        } catch (e: any) {
          metric('HttpErrors')
          const captchaError = ['captcha_required', 'captcha_failed', 'captcha_unavailable'].includes(e.message)
          const status = captchaError ? captchaStatus(e.message) :
            e.message === 'unauthorized'
              ? 401
              : ['forbidden_origin', 'consent_required'].includes(e.message)
                ? 403
                : e.message === 'rate_limit'
                  ? 429
                  : e.message === 'not_found'
                    ? 404
                    : e.name === 'ZodError'
                      ? 400
                      : 503
          const error =
            e.message === 'rate_limit'
              ? 'Too many requests. Try later.'
              : 'Request failed. Use the website calendar or email Oscar.'
          begin(status)
          if (streaming) emit('error', { message: error })
          else stream.write(JSON.stringify({ error, ...(captchaError ? { code: e.message } : {}) }))
        } finally {
          begin().end()
        }
      })

