import {getQuery,setHeader,createError} from 'h3'
import {eventsBetween} from '../utils/calendar'
import {cleanExpiredHolds} from '../utils/booking'
import {allowedSlot,blocks,overlaps,DURATION} from '../../shared/booking.mjs'
export default defineEventHandler(async event=>{
 setHeader(event,'Cache-Control','no-store')
 const date=String(getQuery(event).date||'')
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Math.abs(Date.parse(date)-Date.now())>61*86400000)throw createError({statusCode:400,message:'Fecha inválida'})
 try{const events=await cleanExpiredHolds(await eventsBetween(date+'T00:00:00-05:00',date+'T23:59:59-05:00'))
 const slots=[]
 for(let hour=9;hour<17;hour++)for(const minute of [0,30]) {const start=new Date(`${date}T${String(hour).padStart(2,'0')}:${minute?'30':'00'}:00-05:00`).toISOString(); if(allowedSlot(start)&&!events.some(e=>blocks(e)&&overlaps(e,Date.parse(start),Date.parse(start)+DURATION)))slots.push(start)}
 return {slots,timeZone:'America/Lima'}
 }catch(e:any){if(e.statusCode===400)throw e;throw createError({statusCode:503,message:'No se pudo consultar la agenda. Intenta más tarde.'})}
})
