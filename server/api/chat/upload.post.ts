import { randomUUID } from 'node:crypto'
import { session, sameOrigin, rateLimit, storageReady } from '../../utils/chat/security'
import { db } from '../../utils/chat/db'
import { validateFile, transcribe } from '../../utils/chat/files'
import { putObject, deleteObject } from '../../utils/chat/storage'
export default defineEventHandler(async event=>{
 sameOrigin(event);await rateLimit(event,'upload',10,3600)
 if(!storageReady())throw createError({statusCode:503,message:'Uploads unavailable'})
 const lead=await session(event,true),c=useRuntimeConfig(),sql=db()
 const length=Number(getHeader(event,'content-length')||0)
 if(length>Math.min(Number(c.chatMaxFileBytes),3500000)+20000)throw createError({statusCode:413,message:'File too large'})
 const parts=await readMultipartFormData(event)
 const file=parts?.find(p=>p.name==='file'),kind=parts?.find(p=>p.name==='kind')?.data.toString()==='audio'?'audio':'file'
 if(!file?.filename || parts!.filter(p=>p.filename).length!==1)throw createError({statusCode:400,message:'One file required'})
 const acquired=await sql`UPDATE leads SET leased_until=now()+interval '90 seconds',last_activity_at=now() WHERE id=${lead.id} AND status='open' AND (leased_until IS NULL OR leased_until<now()) RETURNING id`
 if(!acquired.length)throw createError({statusCode:409,message:'Conversation busy'})
 let key='',stored=false
 try{
  const [count]=await sql`SELECT count(*)::int AS n FROM chat_uploads WHERE lead_id=${lead.id}`
  if(count!.n>=Number(c.chatMaxFiles))throw createError({statusCode:413,message:'Attachment limit reached'})
  const checked=await validateFile(file.data,file.filename,file.type||'',kind)
  const transcript=kind==='audio'?await transcribe(file.data,checked.mime,checked.name):null
  const id=randomUUID();key=`leads/${lead.id}/${id}`
  await putObject(key,file.data,checked.mime);stored=true
  await sql.begin(async tx=>{
   await tx`INSERT INTO chat_uploads(id,lead_id,object_key,name,mime,size_bytes,kind,transcription) VALUES (${id},${lead.id},${key},${checked.name},${checked.mime},${file.data.length},${kind},${transcript})`
   await tx`INSERT INTO chat_messages(id,lead_id,role,content) VALUES (${randomUUID()},${lead.id},'user',${transcript?`[Audio: ${checked.name}]\n${transcript}`:`[Attachment: ${checked.name}; ${checked.mime}; ${file.data.length} bytes]`})`
  })
  return {id,name:checked.name,mime:checked.mime,kind,transcription:transcript,size_bytes:file.data.length}
 }catch(e){if(stored)await deleteObject(key).catch(()=>{});throw e}
 finally{await sql`UPDATE leads SET leased_until=null,last_activity_at=now() WHERE id=${lead.id}`}
})
