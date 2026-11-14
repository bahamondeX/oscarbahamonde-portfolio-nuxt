import { randomUUID } from 'node:crypto'
import { resolveLocale } from '../../../shared/locales.mjs'
import { session, sameOrigin, rateLimit, limitedJSON } from '../../utils/chat/security'
import { db } from '../../utils/chat/db'
import { reply, extractLead } from '../../utils/chat/llm'
import { cleanText, completeLead } from '../../../shared/chat.mjs'
import { enqueueLead, dispatchOutbox } from '../../utils/chat/notifications'
export default defineEventHandler(async event=>{
 sameOrigin(event);await rateLimit(event,'message',12,60)
 const lead=await session(event,true),body=await limitedJSON(event)
 const content=cleanText(body.message)
 if(!content || typeof body.requestId!=='string' || !/^[0-9a-f-]{36}$/i.test(body.requestId))throw createError({statusCode:400,message:'Invalid message'})
 const sql=db()
 const [count]=await sql`SELECT count(*)::int AS n FROM chat_messages WHERE lead_id=${lead.id} AND role='user'`
 if(count!.n>=40)throw createError({statusCode:429,message:'Conversation limit reached'})
 if((await sql`SELECT id FROM chat_messages WHERE lead_id=${lead.id} AND request_id=${body.requestId}`).length)throw createError({statusCode:409,message:'Message already received'})
 const acquired=await sql`UPDATE leads SET leased_until=now()+interval '90 seconds',last_activity_at=now() WHERE id=${lead.id} AND status='open' AND (leased_until IS NULL OR leased_until<now()) RETURNING id`
 if(!acquired.length)throw createError({statusCode:409,message:'A reply is already in progress'})
 await sql`INSERT INTO chat_messages(id,lead_id,role,content,request_id) VALUES (${randomUUID()},${lead.id},'user',${content},${body.requestId})`
 const stream=createEventStream(event)
 let disconnected=false
 stream.onClosed(()=>{disconnected=true})
 const push=async (eventName:string,data:unknown)=>{if(!disconnected)await stream.push({event:eventName,data:JSON.stringify(data)})}
 const run=async()=>{
  try{
   const rows=await sql`SELECT role,content FROM chat_messages WHERE lead_id=${lead.id} ORDER BY created_at,id`
   const answer=await reply(rows as any,resolveLocale(body.locale || lead.locale).code,async text=>{await push('delta',{text})})
   await sql`INSERT INTO chat_messages(id,lead_id,role,content,request_id) VALUES (${randomUUID()},${lead.id},'assistant',${answer},${body.requestId})`
   let closed=false
   try{
    const extracted=await extractLead(rows as any)
    await sql`UPDATE leads SET fields=${sql.json(extracted.fields)},summary=${extracted.summary} WHERE id=${lead.id}`
    if(completeLead(extracted.fields)){await enqueueLead(lead.id,true);closed=true;await sql`UPDATE leads SET leased_until=null WHERE id=${lead.id}`;await dispatchOutbox(lead.id)}
   }catch{/* Explicit close and cron still deliver the full transcript. */}
   await push('done',{closed})
  }catch{await push('error',{code:'REPLY_FAILED'})}
  finally{await sql`UPDATE leads SET leased_until=null,last_activity_at=now() WHERE id=${lead.id}`;await stream.close()}
 }
 void run()
 return stream.send()
})
