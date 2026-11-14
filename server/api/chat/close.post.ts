import { session, sameOrigin, rateLimit } from '../../utils/chat/security'
import { db } from '../../utils/chat/db'
import { enqueueLead, dispatchOutbox } from '../../utils/chat/notifications'
export default defineEventHandler(async event=>{
 sameOrigin(event);await rateLimit(event,'close',6,3600)
 const lead=await session(event)
 if(lead.leased_until && new Date(lead.leased_until)>new Date())throw createError({statusCode:409,message:'Conversation busy'})
 const [count]=await db()`SELECT count(*)::int AS n FROM chat_messages WHERE lead_id=${lead.id} AND role='user'`
 if(!count!.n)return {closed:false}
 if(!await enqueueLead(lead.id))throw createError({statusCode:409,message:'Conversation busy'})
 const result=await dispatchOutbox(lead.id)
 return {closed:true,delivered:result.sent>0}
})
