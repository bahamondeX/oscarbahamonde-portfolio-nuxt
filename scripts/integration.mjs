import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import { zipSync, strToU8 } from 'fflate'
const pg=await PGlite.create()
await pg.exec(await readFile('migrations/001_leads.sql','utf8'))
const pgServer=new PGLiteSocketServer({db:pg,host:'127.0.0.1',port:54579,maxConnections:5})
await pgServer.start()
const objects=new Map()
const storage=createServer(async(req,res)=>{
 const key=new URL(req.url,'http://127.0.0.1').pathname
 if(req.method==='PUT'){const chunks=[];for await(const chunk of req)chunks.push(chunk);objects.set(key,Buffer.concat(chunks));res.setHeader('ETag','"test"');res.end()}
 else if(req.method==='DELETE'){objects.delete(key);res.writeHead(204);res.end()}
 else if(objects.has(key)){res.end(objects.get(key))}
 else {res.writeHead(404);res.end()}
})
await new Promise(resolve=>storage.listen(3189,'127.0.0.1',resolve))
await mkdir('reports',{recursive:true})
const mailPath=new URL('../reports/test-mails.jsonl',import.meta.url).pathname
await writeFile(mailPath,'')
const origin='http://127.0.0.1:3188'
const env={...process.env,PORT:'3188',HOST:'127.0.0.1',PORTFOLIO_PROVIDER_MOCKS:'test-only',TEST_MAIL_CAPTURE:mailPath,
 NUXT_PUBLIC_SITE_URL:origin,NUXT_DATABASE_URL:'postgres://postgres:postgres@127.0.0.1:54579/postgres',NUXT_DATABASE_SSL:'disable',NUXT_CHAT_SESSION_SECRET:'integration-only-session-secret-000000000',
 NUXT_TURNSTILE_SITE_KEY:'test',NUXT_TURNSTILE_SECRET_KEY:'test',NUXT_TURNSTILE_HOSTNAME:'127.0.0.1',NUXT_LLM_BASE_URL:'https://llm.test/v1',NUXT_LLM_API_KEY:'test',NUXT_LLM_MODEL:'test',
 NUXT_TRANSCRIPTION_BASE_URL:'https://speech.test/v1',NUXT_TRANSCRIPTION_API_KEY:'test',NUXT_STORAGE_ENDPOINT:'http://127.0.0.1:3189',NUXT_STORAGE_REGION:'us-east-1',NUXT_STORAGE_BUCKET:'test',NUXT_STORAGE_ACCESS_KEY_ID:'test',NUXT_STORAGE_SECRET_ACCESS_KEY:'test',
 NUXT_GMAIL_CLIENT_ID:'test',NUXT_GMAIL_CLIENT_SECRET:'test',NUXT_GMAIL_REFRESH_TOKEN:'test',NUXT_LEAD_NOTIFICATION_TO:'owner@example.test',NUXT_CRON_SECRET:'integration-only-cron-secret-00000000000',NUXT_CHAT_IDLE_MINUTES:'1',
 NUXT_MERCADO_PAGO_ACCESS_TOKEN:'',NUXT_GOOGLE_REFRESH_TOKEN:''}
const app=spawn(process.execPath,['--import','./tests/provider-mocks.mjs','.output/server/index.mjs'],{env,stdio:['ignore','pipe','pipe']})
let output='';app.stdout.on('data',x=>{output+=x});app.stderr.on('data',x=>{output+=x})
const request=(path,options={},cookie='')=>fetch(origin+path,{...options,headers:{Origin:origin,...(cookie?{Cookie:cookie}:{}),...options.headers},signal:AbortSignal.timeout(20000)})
const body=value=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)})
const checks=[]
const checked=(name)=>{checks.push(name);console.log('PASS',name)}
async function start(){const res=await request('/api/chat/session',body({consent:true,token:'test-human',locale:'en'}));assert.equal(res.status,200,await res.clone().text());return {cookie:res.headers.getSetCookie()[0].split(';')[0],lead:await res.json()}}
async function send(cookie,text='I am Test Lead. My email is lead@example.test. I need a landing page.'){const id=randomUUID();const res=await request('/api/chat/messages',body({message:text,requestId:id,locale:'en'}),cookie);assert.equal(res.status,200,await res.clone().text());const stream=await res.text();assert.match(stream,/event: delta/);assert.match(stream,/event: done/);return id}
async function upload(cookie,data,name,mime,kind='file'){const form=new FormData();form.set('file',new Blob([data],{type:mime}),name);form.set('kind',kind);return request('/api/chat/upload',{method:'POST',body:form},cookie)}
try{
 let ready=false;for(let i=0;i<60;i++){try{if((await request('/api/chat/config')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}assert.ok(ready,output)
 assert.equal((await (await request('/api/chat/config')).json()).ready,true)
 assert.equal((await request('/api/chat/session',{...body({consent:true}),headers:{Origin:'https://foreign.test','Content-Type':'application/json'}})).status,403)
 assert.equal((await request('/api/chat/session',body({consent:false,token:'test-human'}))).status,400)
 assert.equal((await request('/api/chat/session',body({consent:true,token:'invalid'}))).status,403)
 assert.equal((await pg.query('SELECT count(*)::int AS n FROM leads')).rows[0].n,0)
 checked('Origin, consent and human verification fail before lead storage')
 const first=await start();const id=await send(first.cookie)
 assert.equal((await request('/api/chat/messages',body({message:'duplicate',requestId:id}),first.cookie)).status,409)
 let state=await (await request('/api/chat/session',{},first.cookie)).json();assert.equal(state.messages.length,2);assert.equal(state.messages[1].role,'assistant')
 checked('SSE response, transcript persistence and duplicate request protection')
 assert.equal((await upload(first.cookie,Buffer.from('MZ fake executable'),'fake.pdf','application/pdf')).status,415)
 const zip=zipSync({'../evil.txt':strToU8('test')});assert.equal((await upload(first.cookie,zip,'bad.zip','application/zip')).status,400)
 assert.equal((await upload(first.cookie,Buffer.from('%PDF-1.7\n/JavaScript test'),'active.pdf','application/pdf')).status,400)
 const pdf=await upload(first.cookie,Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF'),'brief.pdf','application/pdf');assert.equal(pdf.status,200,await pdf.clone().text());const uploaded=await pdf.json()
 checked('MIME spoofing, active PDFs and ZIP traversal rejected; safe attachment persisted privately')
 const ogg=Buffer.alloc(80);ogg.write('OggS');ogg.write('OpusHead',28)
 const audio=await upload(first.cookie,ogg,'voice.ogg','audio/ogg','audio');assert.equal(audio.status,200,await audio.clone().text());assert.equal((await audio.json()).transcription,'I would like a landing page.')
 checked('Audio storage and transcription persisted with conversation')
 assert.equal((await request('/api/chat/download?id='+uploaded.id,{},'')).status,401)
 const second=await start();assert.equal((await request('/api/chat/download?id='+uploaded.id,{},second.cookie)).status,404)
 const signed=await request('/api/chat/download?id='+uploaded.id,{redirect:'manual'},first.cookie);assert.equal(signed.status,302);assert.match(signed.headers.get('location'),/X-Amz-Expires=900/)
 checked('File ownership enforced and expiring signed downloads issued')
 const close=await request('/api/chat/close',{method:'POST'},first.cookie);assert.equal(close.status,200,await close.clone().text());assert.equal((await close.json()).delivered,true)
 await request('/api/chat/close',{method:'POST'},first.cookie)
 let mails=(await readFile(mailPath,'utf8')).trim().split('\n');assert.equal(mails.length,1)
 const mime=Buffer.from(JSON.parse(mails[0]).raw,'base64url').toString();assert.match(mime,/brief.pdf/);assert.match(mime,/voice.ogg/);assert.match(mime,/TRANSCRIPCI/)
 checked('Full transcript and both attachments sent once through mocked Gmail')
 await send(second.cookie)
 await pg.query("UPDATE leads SET last_activity_at=now()-interval '2 minutes' WHERE id=$1",[second.lead.id])
 assert.equal((await request('/api/chat/cron')).status,401)
 const cron=await request('/api/chat/cron',{headers:{Authorization:'Bearer '+env.NUXT_CRON_SECRET}});assert.equal(cron.status,200,await cron.clone().text());assert.equal((await cron.json()).sent,1)
 checked('Authenticated inactivity job closes and notifies pending lead')
 assert.equal((await request('/api/chat/session',{method:'DELETE'},first.cookie)).status,200)
 assert.equal((await pg.query('SELECT count(*)::int AS n FROM chat_uploads WHERE lead_id=$1',[first.lead.id])).rows[0].n,0);assert.equal(objects.size,0)
 checked('Deletion removes conversation, attachment metadata and private objects')
 await writeFile('reports/integration.json',JSON.stringify({date:new Date().toISOString(),checks,providers:'Mock LLM, Turnstile, transcription, S3 and Gmail; PGlite SQL with real API handlers. No external messages or charges.'},null,2))
}catch(e){console.error(output.slice(-6000));throw e}
finally{app.kill('SIGTERM');await new Promise(r=>app.once('exit',r));storage.close();await pgServer.stop();await pg.close()}
