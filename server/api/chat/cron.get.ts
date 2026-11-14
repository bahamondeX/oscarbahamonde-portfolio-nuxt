import { verifyCron } from '../../utils/chat/security'
import { db } from '../../utils/chat/db'
import { enqueueLead, dispatchOutbox } from '../../utils/chat/notifications'
import { deleteObject } from '../../utils/chat/storage'
export default defineEventHandler(async event=>{
 verifyCron(event)
 const sql=db(),cutoff=new Date(Date.now()-Number(useRuntimeConfig().chatIdleMinutes)*60000)
 const idle=await sql`SELECT id FROM leads WHERE status='open' AND last_activity_at<${cutoff} AND expires_at>now() AND (leased_until IS NULL OR leased_until<now()) AND EXISTS(SELECT 1 FROM chat_messages WHERE lead_id=leads.id AND role='user') LIMIT 20`
 for(const lead of idle)await enqueueLead(lead.id,false,cutoff)
 const result=await dispatchOutbox()
 const expired=await sql`SELECT id FROM leads WHERE expires_at<now() AND (leased_until IS NULL OR leased_until<now()) LIMIT 20`
 for(const lead of expired){const files=await sql`SELECT object_key FROM chat_uploads WHERE lead_id=${lead.id}`;for(const f of files)await deleteObject(f.object_key);await sql`DELETE FROM leads WHERE id=${lead.id}`}
 await sql`DELETE FROM chat_rate_limits WHERE expires_at<now()`
 return {queued:idle.length,...result,purged:expired.length}
})
