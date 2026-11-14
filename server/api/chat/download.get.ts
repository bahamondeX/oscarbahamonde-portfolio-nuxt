import { session } from '../../utils/chat/security'
import { db } from '../../utils/chat/db'
import { signedDownload } from '../../utils/chat/storage'
export default defineEventHandler(async event=>{
 const lead=await session(event),id=String(getQuery(event).id||'')
 if(!/^[0-9a-f-]{36}$/i.test(id))throw createError({statusCode:400,message:'Invalid file'})
 const [file]=await db()`SELECT object_key,name FROM chat_uploads WHERE id=${id} AND lead_id=${lead.id}`
 if(!file)throw createError({statusCode:404,message:'File not found'})
 return sendRedirect(event,await signedDownload(file.object_key,file.name),302)
})
