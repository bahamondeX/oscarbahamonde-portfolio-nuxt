import { randomUUID } from 'node:crypto'
import nodemailer from 'nodemailer'
import { db } from './db'
import { getObject, signedDownload } from './storage'
import { extractLead } from './llm'
import { notificationReady } from './security'
export async function enqueueLead(id:string,finishActive=false,inactiveBefore:Date|null=null) {
 return db().begin(async sql=>{
  const rows=await sql`UPDATE leads SET status='closed',notification_requested_at=coalesce(notification_requested_at,now()) WHERE id=${id} AND (${finishActive} OR leased_until IS NULL OR leased_until<now()) AND (${inactiveBefore}::timestamptz IS NULL OR last_activity_at<${inactiveBefore}) RETURNING id`
  if(!rows.length)return false
  await sql`INSERT INTO lead_outbox(id,lead_id) VALUES (${randomUUID()},${id}) ON CONFLICT(lead_id) DO NOTHING`
  return true
 })
}
export async function dispatchOutbox(onlyLead?:string) {
 if(!notificationReady())return {sent:0,pending:true}
 const sql=db()
 type Job = { id:string; lead_id:string; attempts:number }
 const jobs=await sql.begin<Job[]>(async tx=>{
  const selected=await tx`SELECT o.id,o.lead_id FROM lead_outbox o JOIN leads l ON l.id=o.lead_id WHERE ((o.state='pending' AND o.next_attempt_at<=now()) OR (o.state='processing' AND o.leased_until<now())) AND o.attempts<5 AND (l.leased_until IS NULL OR l.leased_until<now()) AND (${onlyLead || ''}='' OR o.lead_id::text=${onlyLead || ''}) ORDER BY o.created_at FOR UPDATE OF o,l SKIP LOCKED LIMIT 1`
  if(!selected.length)return []
  await tx`UPDATE leads SET leased_until=now()+interval '3 minutes' WHERE id=${selected[0]!.lead_id}`
  return tx<Job[]>`UPDATE lead_outbox SET state='processing',leased_until=now()+interval '3 minutes',attempts=attempts+1 WHERE id=${selected[0]!.id} RETURNING *`
 })
 let sent=0
 for(const job of jobs){
  try{
   const [lead]=await sql`SELECT * FROM leads WHERE id=${job.lead_id}`
   if(!lead)continue
   const messages=await sql`SELECT role,content,created_at FROM chat_messages WHERE lead_id=${lead.id} ORDER BY created_at,id`
   const files=await sql`SELECT * FROM chat_uploads WHERE lead_id=${lead.id} ORDER BY created_at`
   try{const extraction=await extractLead(messages as any);lead.fields=extraction.fields;lead.summary=extraction.summary;await sql`UPDATE leads SET fields=${sql.json(extraction.fields)},summary=${extraction.summary} WHERE id=${lead.id}`}catch{/* Delivery still includes the complete transcript if summarization fails. */}
   const fieldText=Object.entries(lead.fields || {}).map(([k,v])=>`${k}: ${String(v)}`).join('\n')
   const transcript=messages.map(m=>`[${new Date(m.created_at).toISOString()}] ${m.role}\n${m.content}`).join('\n\n')
   let text=`Nueva consulta del portafolio\nID: ${lead.id}\nConsentimiento: ${lead.consent_version} / ${new Date(lead.consent_at).toISOString()}\n\nDATOS CAPTADOS\n${fieldText || '(Ver conversación)'}\n\nRESUMEN GENERADO POR IA — revisar contra la transcripción\n${lead.summary || '(No disponible)'}\n\nTRANSCRIPCIÓN COMPLETA\n${transcript}\n\nARCHIVOS Y AUDIOS\n`
   const total=files.reduce((n,f)=>n+Number(f.size_bytes),0)+Buffer.byteLength(text)
   const attachments: {filename:string;content:Buffer;contentType:string}[]=[]
   for(const f of files){
    if(total<18_000_000){attachments.push({filename:f.name,content:await getObject(f.object_key),contentType:f.mime});text+=`${f.name} — adjunto\n`}
    else text+=`${f.name}: ${await signedDownload(f.object_key,f.name,604800)} (expira en 7 días)\n`
    if(f.transcription)text+=`Transcripción de ${f.name}:\n${f.transcription}\n`
   }
   const c=useRuntimeConfig()
   const message={from:c.smtpUser||c.leadNotificationTo,to:c.leadNotificationTo,subject:`Consulta de portafolio · ${lead.fields?.name || lead.id}`.replace(/[\r\n]/g,' ').slice(0,150),text,attachments,messageId:`<lead-${lead.id}@oscarbahamonde.com>`}
   if(c.gmailRefreshToken && c.gmailClientId && c.gmailClientSecret){
    const token=await $fetch<any>('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:c.gmailClientId,client_secret:c.gmailClientSecret,refresh_token:c.gmailRefreshToken,grant_type:'refresh_token'}),timeout:10000,retry:0})
    const compiled=await nodemailer.createTransport({streamTransport:true,buffer:true,newline:'unix'}).sendMail(message)
    await $fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{Authorization:`Bearer ${token.access_token}`},body:{raw:Buffer.from(compiled.message as Buffer).toString('base64url')},timeout:15000,retry:0})
   }else{
    const transport=nodemailer.createTransport({host:c.smtpHost,port:Number(c.smtpPort),secure:Number(c.smtpPort)===465,requireTLS:Number(c.smtpPort)!==465,auth:{user:c.smtpUser,pass:c.smtpPassword},connectionTimeout:10000,socketTimeout:15000})
    try{await transport.sendMail(message)}finally{transport.close()}
   }
   await sql`UPDATE lead_outbox SET state='sent',sent_at=now(),leased_until=null,error_code=null WHERE id=${job.id}`;sent++
  }catch{
   // Avoid logging provider errors: they may contain PII or credentials.
   await sql`UPDATE lead_outbox SET state=${job.attempts>=5?'failed':'pending'},next_attempt_at=${new Date(Date.now()+60000*2**job.attempts)},leased_until=null,error_code='DELIVERY_FAILED' WHERE id=${job.id}`
   console.warn('Lead notification failed',{outboxId:job.id,attempt:job.attempts})
  }finally{await sql`UPDATE leads SET leased_until=null WHERE id=${job.lead_id}`}
 }
 return {sent,pending:jobs.length>sent}
}
