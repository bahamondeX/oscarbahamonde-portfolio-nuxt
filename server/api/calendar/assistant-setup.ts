import { createHash, timingSafeEqual } from 'node:crypto'
import { readBody, getMethod, getHeader, setHeader, setCookie, sendRedirect, createError } from 'h3'
import { SITE, nonce, sign } from '../../utils/calendar'

// Optional, owner-only setup entry point. Does not modify the paid booking callback.
export default defineEventHandler(async event => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  setHeader(event, 'Referrer-Policy', 'same-origin')
  setHeader(event, 'X-Robots-Tag', 'noindex, nofollow')
  setHeader(event, 'Content-Security-Policy', "default-src 'none'; form-action 'self' https://accounts.google.com; frame-ancestors 'none'")
  const gate = process.env.NUXT_ASSISTANT_SETUP_KEY_HASH || ''
  const match = /^v1:([0-9]{13}):([a-f0-9]{64})$/.exec(gate)
  if (!match || Date.now() >= Number(match[1]) || Number(match[1]) > Date.now() + 30 * 60000) {
    throw createError({ statusCode: 404 })
  }
  const expected = match[2]!
  if (getMethod(event) === 'GET') {
    setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
    return '<!doctype html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Conectar asistente de Oscar</title><h1>Conectar Calendar y Gmail</h1><p>Configuración privada del propietario. No envía correos ni crea eventos durante la conexión.</p><form method="post"><label>Clave de configuración <input name="key" type="password" autocomplete="off" required maxlength="128"></label><button type="submit">Conectar con Google</button></form></html>'
  }
  if (getMethod(event) !== 'POST' || getHeader(event, 'origin') !== SITE) throw createError({ statusCode: 403 })
  const body = await readBody(event)
  if (typeof body?.key !== 'string' || body.key.length > 128) throw createError({ statusCode: 403 })
  const actual = createHash('sha256').update(body.key).digest()
  if (!timingSafeEqual(actual, Buffer.from(expected, 'hex'))) throw createError({ statusCode: 403 })
  const c = useRuntimeConfig()
  if (!c.googleClientId || !c.googleClientSecret || !c.bookingSecret) throw createError({ statusCode: 503 })
  const state = nonce()
  // Exact cookie name, signature and path expected by the existing callback.
  setCookie(event, 'calendar_setup', `${state}.${sign(state)}`, {
    httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/api/calendar'
  })
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  const scope = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.freebusy',
    'https://www.googleapis.com/auth/gmail.send',
    'openid', 'email'
  ].join(' ')
  for (const [key, value] of Object.entries({
    client_id: c.googleClientId, redirect_uri: SITE + '/api/calendar/callback',
    response_type: 'code', scope, access_type: 'offline', prompt: 'consent', state,
    login_hint: 'oscar.bahamonde.dev@gmail.com'
  })) url.searchParams.set(key, value)
  return sendRedirect(event, url.toString(), 303)
})
