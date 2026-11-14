import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'
import { db } from './db'
export const consentVersion = '2026-11-14'
export function chatReady() { const c = useRuntimeConfig(); return !!(c.databaseUrl && c.chatSessionSecret.length >= 32 && c.llmApiKey && c.llmModel && c.turnstileSecretKey && c.turnstileSiteKey) }
export function storageReady() { const c = useRuntimeConfig(); return !!(c.storageBucket && c.storageAccessKeyId && c.storageSecretAccessKey) }
export function notificationReady() { const c = useRuntimeConfig(); return !!((c.smtpUser && c.smtpPassword) || (c.gmailClientId && c.gmailClientSecret && c.gmailRefreshToken)) }
export function sameOrigin(event: H3Event) {
  const origin = getHeader(event, 'origin')
  const expected = new URL(useRuntimeConfig().public.siteUrl).origin
  if (origin !== expected && !(import.meta.dev && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || ''))) throw createError({ statusCode: 403, message: 'Invalid origin' })
}
export function hash(value: string) { const secret = useRuntimeConfig().chatSessionSecret; if (secret.length < 32) throw createError({statusCode:503,message:'Chat unavailable'}); return createHmac('sha256',secret).update(value).digest('hex') }
export function newSession(event: H3Event) {
  const token = randomBytes(32).toString('base64url')
  setCookie(event,'lead_session',token,{httpOnly:true,secure:!import.meta.dev,sameSite:'strict',path:'/api/chat',maxAge:86400*30})
  return hash(token)
}
export async function session(event: H3Event, open = false) {
  const token = getCookie(event,'lead_session')
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw createError({statusCode:401,message:'Session required'})
  const [lead] = await db()`SELECT * FROM leads WHERE session_hash=${hash(token)} AND expires_at>now()`
  if (!lead) throw createError({statusCode:401,message:'Session expired'})
  if (open && lead.status !== 'open') throw createError({statusCode:409,message:'Conversation closed'})
  return lead
}
export async function rateLimit(event: H3Event, scope: string, limit: number, windowSeconds: number) {
  // x-vercel-forwarded-for is supplied by Vercel. Other hosts use the socket address.
  const ip = getHeader(event,'x-vercel-forwarded-for')?.split(',')[0]?.trim() || event.node.req.socket.remoteAddress || 'unknown'
  const bucket = Math.floor(Date.now() / (windowSeconds*1000))
  const key = hash(`${scope}:${ip}:${bucket}`)
  const [row] = await db()`INSERT INTO chat_rate_limits(key,count,expires_at) VALUES (${key},1,${new Date((bucket+2)*windowSeconds*1000)}) ON CONFLICT(key) DO UPDATE SET count=chat_rate_limits.count+1 RETURNING count`
  if (row!.count > limit) { setHeader(event,'retry-after',windowSeconds); throw createError({statusCode:429,message:'Too many requests'}) }
}
export async function verifyHuman(token: unknown) {
  const c = useRuntimeConfig()
  if (typeof token !== 'string' || token.length > 2048) throw createError({statusCode:400,message:'Verification required'})
  const result = await $fetch<any>('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:c.turnstileSecretKey,response:token}),timeout:10000,retry:0})
  if (!result.success || result.action !== 'lead-chat' || result.hostname !== c.turnstileHostname) throw createError({statusCode:403,message:'Verification failed'})
}
export async function limitedJSON(event: H3Event, max = 12000) {
  if (Number(getHeader(event,'content-length') || 0) > max) throw createError({statusCode:413,message:'Request too large'})
  const text = await readRawBody(event)
  if (!text || Buffer.byteLength(text) > max) throw createError({statusCode:413,message:'Request too large'})
  try { return JSON.parse(text) } catch { throw createError({statusCode:400,message:'Invalid JSON'}) }
}
export function verifyCron(event: H3Event) {
  const secret=useRuntimeConfig().cronSecret, actual=getHeader(event,'authorization') || ''
  const expected=`Bearer ${secret}`
  if(secret.length<32 || Buffer.byteLength(actual)!==Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(actual),Buffer.from(expected))) throw createError({statusCode:401,message:'Unauthorized'})
}
