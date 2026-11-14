import { getQuery,getCookie,deleteCookie,setHeader,createError } from 'h3'
import { SITE,validSignature } from '../../utils/calendar'
export default defineEventHandler(async event => {
 setHeader(event,'Cache-Control','private, no-store'); setHeader(event,'Referrer-Policy','no-referrer'); setHeader(event,'Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'")
 const query=getQuery(event); const cookie=getCookie(event,'calendar_setup')||''; const [state,signature]=cookie.split('.')
 deleteCookie(event,'calendar_setup',{path:'/api/calendar'})
 if(!state || query.state!==state || !validSignature(state,signature) || typeof query.code!=='string') throw createError({statusCode:403,message:'Conexión no autorizada o vencida'})
 const c=useRuntimeConfig()
 let tokens:any
 try { tokens=await $fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({code:query.code,client_id:c.googleClientId,client_secret:c.googleClientSecret,redirect_uri:SITE+'/api/calendar/callback',grant_type:'authorization_code'}),retry:0})
 const user=await $fetch<any>('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:`Bearer ${tokens.access_token}`}})
 if(user.email!=='oscar.bahamonde.dev@gmail.com' || !user.email_verified) throw new Error('owner')
 } catch { throw createError({statusCode:403,message:'No se pudo conectar el calendario del propietario'}) }
 if(!tokens.scope?.split(' ').includes('https://www.googleapis.com/auth/calendar.events')) throw createError({statusCode:403,message:'No se concedió acceso a Calendar'})
 if(!tokens.refresh_token || !/^[A-Za-z0-9_\-/.]+$/.test(tokens.refresh_token)) throw createError({statusCode:400,message:'Google no entregó acceso persistente. Repite la conexión.'})
 setHeader(event,'Content-Type','text/html; charset=utf-8')
 return `<!doctype html><html lang="es"><meta name="robots" content="noindex"><title>Calendar conectado</title><body><h1>Cuenta verificada</h1><p>Guarda este valor como NUXT_GOOGLE_REFRESH_TOKEN en Vercel. No lo compartas.</p><label>Refresh token <input type="password" readonly value="${tokens.refresh_token}"></label><p>Cierra esta página después de guardarlo.</p></body></html>`
})
