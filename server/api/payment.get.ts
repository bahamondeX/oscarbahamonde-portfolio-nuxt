import { createError, getCookie, getQuery, setHeader } from 'h3'

export default defineEventHandler(async event => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const token = useRuntimeConfig(event).mercadoPagoAccessToken
  const order = getCookie(event, 'consulting_order')
  const id = getQuery(event).id
  if (!token || !order || typeof id !== 'string' || !/^\d{1,30}$/.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'No se puede verificar esta operación en este navegador.' })
  }
  try {
    const payment = await $fetch<{ status: string; external_reference: string; transaction_amount: number; currency_id: string; live_mode: boolean; date_approved: string | null }>(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: { Authorization: `Bearer ${token}` }, timeout: 15000, retry: 0
    })
    // Return no payer, card, email or payment details to the browser.
    const approved = payment.status === 'approved' && payment.external_reference === order && payment.currency_id === 'PEN' && Number(payment.transaction_amount) === 20 && payment.live_mode === true && !!payment.date_approved
    return { approved }
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'Mercado Pago no pudo confirmar el pago. Reintenta más tarde.' })
  }
})
