import { session } from '../../utils/chat/security'
import { db } from '../../utils/chat/db'
export default defineEventHandler(async event=>{
 const lead=await session(event)
 const messages=await db()`SELECT id,role,content,created_at FROM chat_messages WHERE lead_id=${lead.id} ORDER BY created_at,id`
 const files=await db()`SELECT id,name,mime,kind,transcription,size_bytes FROM chat_uploads WHERE lead_id=${lead.id} ORDER BY created_at`
 return {id:lead.id,locale:lead.locale,status:lead.status,messages,files}
})
