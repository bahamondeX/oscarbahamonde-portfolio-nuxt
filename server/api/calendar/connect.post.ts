import { readBody, setCookie, sendRedirect, createError, getHeader } from 'h3'
import { SITE, nonce, sign } from '../../utils/calendar'
export default defineEventHandler(async event => {
 const c=useRuntimeConfig(); const body=await readBody(event)
 if(getHeader(event,'origin')!==SITE || !c.bookingSecret || body.key!==c.bookingSecret) throw createError({statusCode:403,message:'Acceso denegado'})
 const state=nonce()
 setCookie(event,'calendar_setup',`${state}.${sign(state)}`,{httpOnly:true,secure:true,sameSite:'lax',maxAge:600,path:'/api/calendar'})
 const url=new URL('https://accounts.google.com/o/oauth2/v2/auth')
 for(const [key,value] of Object.entries({client_id:c.googleClientId,redirect_uri:SITE+'/api/calendar/callback',response_type:'code',scope:'https://www.googleapis.com/auth/calendar.events openid email',access_type:'offline',prompt:'consent',state,login_hint:'oscar.bahamonde.dev@gmail.com'})) url.searchParams.set(key,value)
 return sendRedirect(event,url.toString(),303)
})
