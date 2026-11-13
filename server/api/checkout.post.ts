import { randomUUID } from 'node:crypto'
import { createError, getHeader, sendRedirect, setCookie } from 'h3'

export default defineEventHandler(async event => {
  const config = useRuntimeConfig(event)
  if (!config.mercadoPagoAccessToken) {
    // Existing seller-created payment link remains available without API credentials.
    return sendRedirect(event, 'https://mpago.la/1PGrFn1', 303)
  }
  const site = 'https://oscarbahamonde.com'
  if (getHeader(event, 'origin') !== site) throw createError({ statusCode: 403, statusMessage: 'Origen no permitido' })
  const order = randomUUID()
  try {
    const preference = await $fetch<{ init_point: string }>('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST', timeout: 15000, retry: 0,
      headers: { Authorization: `Bearer ${config.mercadoPagoAccessToken}`, 'X-Idempotency-Key': order },
      body: {
        items: [{ id: 'consultoria-20min', title: 'Consultoría 1:1 con Oscar — 20 minutos', quantity: 1, currency_id: 'PEN', unit_price: 20 }],
        external_reference: order,
        back_urls: { success: `${site}/pago`, pending: `${site}/pago`, failure: `${site}/pago` },
        auto_return: 'approved',
        expires: true,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      }
    })
    const url = new URL(preference.init_point)
    if (url.protocol !== 'https:' || !['www.mercadopago.com.pe', 'www.mercadopago.com'].includes(url.hostname)) throw new Error('Invalid checkout URL')
    setCookie(event, 'consulting_order', order, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 86400 })
    return sendRedirect(event, url.toString(), 303)
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'No se pudo iniciar el pago. Inténtalo nuevamente.' })
  }
})
