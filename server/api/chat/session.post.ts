import { randomUUID } from 'node:crypto'
import { resolveLocale } from '../../../shared/locales.mjs'
import { db } from '../../utils/chat/db'
import { chatReady, notificationReady, consentVersion, sameOrigin, rateLimit, limitedJSON, verifyHuman, newSession } from '../../utils/chat/security'
export default defineEventHandler(async event=>{
 sameOrigin(event)
 if(!chatReady() || !notificationReady())throw createError({statusCode:503,message:'Chat unavailable'})
 await rateLimit(event,'start',8,3600)
 const body=await limitedJSON(event,4000)
 if(body.consent!==true || body.website)throw createError({statusCode:400,message:'Consent required'})
 await verifyHuman(body.token)
 const id=randomUUID(),sessionHash=newSession(event),locale=resolveLocale(body.locale).code
 await db()`INSERT INTO leads(id,session_hash,locale,consent_version,expires_at) VALUES (${id},${sessionHash},${locale},${consentVersion},${new Date(Date.now()+Number(useRuntimeConfig().chatRetentionDays)*86400000)})`
 return {id,locale,status:'open',messages:[],files:[]}
})
