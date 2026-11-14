import {readBody,getQuery,createError} from 'h3'
import {finalize} from '../utils/booking'
export default defineEventHandler(async event=>{
 const body=await readBody(event);const query=getQuery(event)
 if(body?.type!=='payment'&&query.type!=='payment')return {received:true}
 const id=String(body?.data?.id||query['data.id']||'')
 if(!/^\d{1,30}$/.test(id))throw createError({statusCode:400,message:'Notificación inválida'})
 // No trust in the notification: retrieve the payment with the merchant token,
 // validate amount, currency, live mode, order UUID and current Calendar hold.
 await finalize(id)
 return {received:true}
})
