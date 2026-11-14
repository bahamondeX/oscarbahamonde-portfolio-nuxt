import { session, sameOrigin, rateLimit } from '../../utils/chat/security'
import { db } from '../../utils/chat/db'
import { deleteObject } from '../../utils/chat/storage'
export default defineEventHandler(async event=>{
 sameOrigin(event);await rateLimit(event,'delete',6,3600)
 const lead=await session(event)
 const acquired=await db()`UPDATE leads SET leased_until=now()+interval '3 minutes' WHERE id=${lead.id} AND (leased_until IS NULL OR leased_until<now()) RETURNING id`
 if(!acquired.length)throw createError({statusCode:409,message:'Conversation busy'})
 const files=await db()`SELECT object_key FROM chat_uploads WHERE lead_id=${lead.id}`
 for(const file of files)await deleteObject(file.object_key)
 await db()`DELETE FROM leads WHERE id=${lead.id}`
 deleteCookie(event,'lead_session',{path:'/api/chat'})
 return {deleted:true}
})
