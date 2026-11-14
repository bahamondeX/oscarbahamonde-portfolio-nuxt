import {readBody,getQuery,getHeader,createError} from 'h3'
import {finalize} from '../utils/booking'
import {validPaymentWebhook} from '../../shared/payment-webhook.mjs'
export default defineEventHandler(async event=>{
 const body=await readBody(event);const query=getQuery(event)
 if(body?.type!=='payment'&&query.type!=='payment')return {received:true}
 const id=String(body?.data?.id||query['data.id']||'')
 if(!/^\d{1,30}$/.test(id))throw createError({statusCode:400,message:'Notificación inválida'})
 const secret=useRuntimeConfig().mercadoPagoWebhookSecret
 if(secret&&!validPaymentWebhook({secret,signature:getHeader(event,'x-signature'),requestId:getHeader(event,'x-request-id'),dataId:query['data.id']}))throw createError({statusCode:401,message:'Firma de notificación inválida'})
 if(secret&&String(query['data.id'])!==id)throw createError({statusCode:400,message:'Identificador de notificación inconsistente'})
 // No trust in the notification: retrieve the payment with the merchant token,
 // validate amount, currency, live mode, order UUID and current Calendar hold.
 await finalize(id)
 return {received:true}
})
