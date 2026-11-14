import {readBody,getHeader,createError,setCookie} from 'h3'
import {SITE,sign} from '../utils/calendar'
import {hold,props} from '../utils/booking'
export default defineEventHandler(async event=>{
 if(getHeader(event,'origin')!==SITE)throw createError({statusCode:403,message:'Origen inválido'})
 const body=await readBody(event)
 if(typeof body.start!=='string'||typeof body.name!=='string'||body.name.trim().length<2||body.name.length>100||typeof body.email!=='string'||body.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))throw createError({statusCode:400,message:'Revisa tu nombre, email y horario'})
 const token=useRuntimeConfig().mercadoPagoAccessToken
 if(!token)throw createError({statusCode:503,message:'Checkout no disponible'})
 try {
 const record=await hold(new Date(body.start).toISOString(),body.name.trim(),body.email.toLowerCase().trim());const p=props(record);const reference=record.id+':'+p.order
 const preference=await $fetch<any>('https://api.mercadopago.com/checkout/preferences',{method:'POST',headers:{Authorization:`Bearer ${token}`,'X-Idempotency-Key':p.order},retry:0,timeout:15000,body:{items:[{id:'consultoria-30min',title:'Consultoría 1:1 con Oscar — 30 minutos',quantity:1,currency_id:'PEN',unit_price:20}],external_reference:reference,notification_url:SITE+'/api/payment-webhook',back_urls:{success:SITE+'/pago',pending:SITE+'/pago',failure:SITE+'/pago'},auto_return:'approved',expires:true,expiration_date_from:new Date().toISOString(),expiration_date_to:new Date(Number(p.expires)).toISOString()}})
 const url=new URL(preference.init_point)
 if(url.protocol!=='https:'||!['www.mercadopago.com.pe','www.mercadopago.com'].includes(url.hostname))throw new Error('checkout')
 setCookie(event,'consulting_order',reference+'.'+sign(reference),{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:86400})
 return {url:url.toString(),expires:p.expires}
 }catch(e:any){if([400,409,503].includes(e.statusCode))throw e;throw createError({statusCode:502,message:'No se pudo iniciar el pago. El horario retenido se liberará en 15 minutos.'})}
})
