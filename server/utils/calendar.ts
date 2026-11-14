import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { createError } from 'h3'
export const SITE = 'https://oscarbahamonde.com'
export function sign(value: string) { return createHmac('sha256', useRuntimeConfig().bookingSecret).update(value).digest('hex') }
export function validSignature(value: string, signature: string | undefined) { const expected = sign(value); return signature?.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) }
export function nonce() { return randomBytes(32).toString('hex') }
export async function googleAccess(): Promise<string> {
 const c = useRuntimeConfig()
 if (!c.googleRefreshToken) throw createError({ statusCode: 503, message: 'La agenda todavía no está conectada.' })
 try { const token = await $fetch<any>('https://oauth2.googleapis.com/token', { method:'POST', body:new URLSearchParams({client_id:c.googleClientId,client_secret:c.googleClientSecret,refresh_token:c.googleRefreshToken,grant_type:'refresh_token'}), retry:0 }); return token.access_token }
 catch { throw createError({statusCode:503,message:'No se pudo consultar Google Calendar. Intenta más tarde.'}) }
}
export async function calendar(path = '', options: any = {}): Promise<any> {
 const token = await googleAccess()
 return $fetch<any>(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(useRuntimeConfig().googleCalendarId)}/events${path}`, {...options,headers:{...options.headers,Authorization:`Bearer ${token}`},retry:0,timeout:15000})
}
export async function eventsBetween(start: string, end: string) {
 const events: any[] = []; let pageToken: string | undefined
 do { const page = await calendar('',{query:{timeMin:start,timeMax:end,singleEvents:true,maxResults:2500,pageToken}}); events.push(...(page.items || [])); pageToken=page.nextPageToken } while(pageToken)
 return events
}
