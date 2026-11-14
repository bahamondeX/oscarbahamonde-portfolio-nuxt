import {createHash,randomUUID} from 'node:crypto'
import {createError} from 'h3'
import {calendar,eventsBetween} from './calendar'
import {allowedSlot,blocks,overlaps,DURATION,HOLD_MS,approvedPayment} from '../../shared/booking.mjs'
export const props=(e:any)=>e.extendedProperties?.private||{}
export const slotID=(start:string)=>'b'+createHash('sha256').update(start).digest('hex')
export async function free(start:string,ignore='') {
 const end=new Date(Date.parse(start)+DURATION).toISOString()
 return !(await eventsBetween(start,end)).some(e=>e.id!==ignore&&blocks(e)&&overlaps(e,Date.parse(start),Date.parse(end)))
}
export async function hold(start:string,name:string,email:string) {
 if(!allowedSlot(start))throw createError({statusCode:400,message:'Horario fuera de disponibilidad'})
 const id=slotID(start),order=randomUUID()
 let existing:any
 try{existing=await calendar('/'+id)}catch(e:any){if(e.statusCode!==404)throw e}
 if(existing&&(props(existing).app!=='oscar-booking'||props(existing).state!=='hold'||Number(props(existing).expires)>Date.now()))throw createError({statusCode:409,message:'Este horario ya fue reservado. Elige otro.'})
 if(!await free(start,id))throw createError({statusCode:409,message:'Este horario está ocupado en Calendar.'})
 const record={summary:'Reserva temporal · consultoría 1:1',start:{dateTime:start,timeZone:'America/Lima'},end:{dateTime:new Date(Date.parse(start)+DURATION).toISOString(),timeZone:'America/Lima'},status:'tentative',transparency:'opaque',visibility:'private',extendedProperties:{private:{app:'oscar-booking',state:'hold',expires:String(Date.now()+HOLD_MS),order,name,email}}}
 let saved:any
 try{saved=existing?await calendar('/'+id,{method:'PATCH',headers:{'If-Match':existing.etag},body:record}):await calendar('',{method:'POST',body:{id,...record}})}catch(e:any){if([409,412].includes(e.statusCode))throw createError({statusCode:409,message:'Alguien acaba de elegir este horario. Elige otro.'});throw e}
 if(!await free(start,id)) {await calendar('/'+id,{method:'PATCH',headers:{'If-Match':saved.etag},body:{transparency:'transparent',extendedProperties:{private:{...props(saved),expires:'0'}}}});throw createError({statusCode:409,message:'Tu agenda cambió. Elige otro horario.'})}
 return saved
}
export async function finalize(paymentID:string) {
 const token=useRuntimeConfig().mercadoPagoAccessToken
 const payment=await $fetch<any>(`https://api.mercadopago.com/v1/payments/${paymentID}`,{headers:{Authorization:`Bearer ${token}`},retry:0,timeout:15000})
 const reference=payment.external_reference||''
 const match=/^(b[a-f0-9]{64}):([a-f0-9-]{36})$/.exec(reference)
 if(!match||!approvedPayment(payment,reference))return {approved:false,confirmed:false}
 const record=await calendar('/'+match[1]); const p=props(record)
 if(p.app!=='oscar-booking'||p.order!==match[2])return {approved:true,confirmed:false,review:true}
 if(p.state==='confirmed')return {approved:true,confirmed:true,start:record.start.dateTime,meet:record.hangoutLink}
 if(Number(p.expires)<Date.now()||!await free(record.start.dateTime,record.id))return {approved:true,confirmed:false,review:true}
 try {
 const saved=await calendar('/'+record.id,{method:'PATCH',headers:{'If-Match':record.etag},query:{sendUpdates:'all',conferenceDataVersion:1},body:{summary:'Consultoría 1:1 · '+p.name,status:'confirmed',transparency:'opaque',attendees:[{email:p.email,displayName:p.name}],conferenceData:{createRequest:{requestId:p.order,conferenceSolutionKey:{type:'hangoutsMeet'}}},extendedProperties:{private:{...p,state:'confirmed',payment:String(payment.id)}}}})
 return {approved:true,confirmed:true,start:saved.start.dateTime,meet:saved.hangoutLink}
 }catch(e:any){if(e.statusCode===412){const latest=await calendar('/'+record.id);if(props(latest).order===p.order&&props(latest).state==='confirmed')return {approved:true,confirmed:true,start:latest.start.dateTime,meet:latest.hangoutLink}}throw e}
}
