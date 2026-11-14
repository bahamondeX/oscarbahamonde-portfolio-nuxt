import {getQuery,getCookie,setHeader,createError} from 'h3'
import {validSignature} from '../utils/calendar'
import {finalize} from '../utils/booking'
export default defineEventHandler(async event=>{
 setHeader(event,'Cache-Control','private, no-store')
 const cookie=getCookie(event,'consulting_order')||'';const split=cookie.lastIndexOf('.');const reference=cookie.slice(0,split),signature=cookie.slice(split+1)
 const id=String(getQuery(event).id||'')
 if(!/^\d{1,30}$/.test(id)||!validSignature(reference,signature))return {approved:false,confirmed:false}
 // First bind payment to this browser's signed order before returning meeting details.
 const p=await $fetch<any>(`https://api.mercadopago.com/v1/payments/${id}`,{headers:{Authorization:`Bearer ${useRuntimeConfig().mercadoPagoAccessToken}`},retry:0})
 if(p.external_reference!==reference)throw createError({statusCode:403,message:'Este pago no pertenece a esta reserva'})
 return finalize(id)
})
