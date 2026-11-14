// node --import tsx scripts/evaluate.mjs. EVAL_MODE=local|endpoint, EVAL_SUITE=current|heldout.
// Local runs exact production runAgent with real Bedrock and simulated storage/external tools.
// Endpoint uses genuine captcha-issued visitor tokens in a private file; no authentication bypass.
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, writeFile, mkdir, appendFile, open } from 'node:fs/promises'
import { createHash, randomUUID } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime'
import { runAgent } from '../src/agent.ts'
import { cfg } from '../src/config.ts'
import services from '../../knowledge/services.json' with {type:'json'}
import { readSse, checkAnswer } from './evaluation-transport.mjs'
const exec = promisify(execFile), root = fileURLToPath(new URL('..', import.meta.url))
const mode = process.env.EVAL_MODE || 'local', suite = process.env.EVAL_SUITE || 'current'
if (!['local','endpoint'].includes(mode) || !['current','heldout'].includes(suite)) throw Error('Invalid EVAL_MODE/EVAL_SUITE')
const source = await readFile(resolve(root,'test',suite==='heldout'?'questions-heldout.json':'questions.json'),'utf8')
const caseSha256 = createHash('sha256').update(source).digest('hex'), allCases = JSON.parse(source)
if(suite==='current'){
 const criteria=JSON.parse(await readFile(resolve(root,'test/criteria-current.json'),'utf8'))
 for(const test of allCases)test.criteria=criteria[test.id]
}
const selected = (process.env.EVAL_CASE_IDS || '').split(',').filter(Boolean)
if (suite==='heldout' && selected.length) throw Error('Held-out must run in full exactly once per phase')
if (selected.some(id=>!allCases.some(test=>test.id===id))) throw Error('Unknown selected case')
const cases = selected.length ? allCases.filter(test=>selected.includes(test.id)) : allCases
const stamp = new Date().toISOString().replace(/[:.]/g,'-')
const output = resolve(process.env.EVAL_OUTPUT || resolve(root,'evaluations',`${stamp}-${mode}-${suite}.json`))
if(output.endsWith('/evaluation-final.json'))throw Error('evaluation-final.json is a consolidated report; use a unique raw-attempt output path')
await mkdir(dirname(output),{recursive:true})
try { await readFile(output); throw Error('Refusing to overwrite an evaluation report') } catch(e) { if(e.code!=='ENOENT')throw e }
let tokenPool=[],client
if(mode==='local'){
  if(!cfg.model || !cfg.guardrail || !process.env.BEDROCK_GUARDRAIL_VERSION)throw Error('Set model and deployed Guardrail environment variables')
  let credentials
  // Credentials remain only in memory and never enter logs/reports.
  if(process.env.EVAL_CREDENTIALS==='aws-cli'){
    const {stdout}=await exec('aws',['configure','export-credentials','--format','process'],{maxBuffer:100000,timeout:30000})
    const c=JSON.parse(stdout)
    credentials={accessKeyId:c.AccessKeyId,secretAccessKey:c.SecretAccessKey,sessionToken:c.SessionToken,expiration:c.Expiration?new Date(c.Expiration):undefined}
  }
  client=new BedrockRuntimeClient({region:process.env.AWS_REGION||'us-east-1',credentials,maxAttempts:1})
}else{
  if(!process.env.EVAL_ENDPOINT || !process.env.EVAL_TOKEN_FILE)throw Error('Set EVAL_ENDPOINT and private EVAL_TOKEN_FILE')
  if(new URL(process.env.EVAL_ENDPOINT).protocol!=='https:')throw Error('HTTPS required')
  const pool=JSON.parse(await readFile(process.env.EVAL_TOKEN_FILE,'utf8'))
  if(!Array.isArray(pool)||!pool.length||pool.some(x=>typeof x!=='string'||x.length<16))throw Error('Token file must be an array of genuine session bearer tokens')
  tokenPool=pool.map(token=>({token,checked:false,requests:0}))
}
if(suite==='heldout'){
  const manifest=JSON.parse(await readFile(resolve(root,'evaluations/heldout-manifest.json'),'utf8'))
  if(manifest.sha256!==caseSha256)throw Error('Held-out seal mismatch')
  const handle=await open(resolve(root,'evaluations',`heldout-${mode}.claimed.json`),'wx')
  await handle.writeFile(JSON.stringify({claimedAt:new Date().toISOString(),caseSha256,output,mode,rule:'No reruns to improve outcome; failures stay in denominator.'},null,2));await handle.close()
}
const report={startedAt:new Date().toISOString(),completedAt:null,mode,suite,caseSha256,
 model:mode==='local'?cfg.model:(process.env.EVAL_DEPLOYED_MODEL||null),deployment:process.env.EVAL_DEPLOYMENT_ID||null,
 guardrailVersion:mode==='local'?cfg.guardrailVersion:(process.env.EVAL_DEPLOYED_GUARDRAIL_VERSION||null),sourceRevision:process.env.EVAL_SOURCE_REVISION||null,
 target:mode==='endpoint'?new URL(process.env.EVAL_ENDPOINT).origin:'Bedrock ConverseStream via production runAgent',
 total:cases.length,attempted:0,automatedPasses:0,manualReviewCompleted:false,
 limitations:mode==='local'?['Real model/Guardrail and exact local agent pipeline. Store and external tools simulated. Does not test Lambda URL/captcha/Google/Gmail/persistence/deployed code.']:['Only messages and read-only session inspection. No consent/profile/upload/close/confirmed-action requests. Genuine captcha-issued anonymous sessions required.'],results:[]}
await writeFile(output,JSON.stringify(report,null,2))
console.log(JSON.stringify({output,mode,suite,cases:cases.length,caseSha256}))
function safeError(e){return String(e?.message||e).replace(/Bearer\s+\S+/gi,'Bearer [redacted]').slice(0,800)}
for(const test of cases){
 const result={...test,startedAt:new Date().toISOString(),answer:'',rawModelRounds:[],events:[],toolCalls:[],usage:0,blocked:false,completed:false}
 await appendFile(output+'.attempts.jsonl',JSON.stringify({id:test.id,startedAt:result.startedAt})+'\n')
 try{
  if(mode==='local'){
   const wrapped={send:async command=>{
    const r=await client.send(command),observed={text:'',stopReason:null,usage:null,tools:[]};result.rawModelRounds.push(observed)
    return {...r,stream:(async function*(){for await(const event of r.stream||[]){
     if(event.contentBlockDelta?.delta?.text)observed.text+=event.contentBlockDelta.delta.text
     if(event.contentBlockStart?.start?.toolUse)observed.tools.push(event.contentBlockStart.start.toolUse)
     if(event.messageStop){observed.stopReason=event.messageStop.stopReason;if(observed.stopReason==='guardrail_intervened')result.blocked=true}
     if(event.metadata?.usage){observed.usage=event.metadata.usage;result.usage+=event.metadata.usage.totalTokens||0}
     yield event
    }})()}
   }}
   const store={history:async()=>[],message:async()=>{},update:async()=>{},pendingAction:async()=>({confirmationRequired:true,evaluationSimulation:true})}
   const call=async(name,args)=>{
    result.toolCalls.push({name,input:args,simulated:true})
    if(name==='get_services')return args.category?{...services,services:services.services.filter(x=>x.category===args.category)}:services
    return {evaluationSimulation:true,confirmationRequired:true,note:'Evaluation does not execute external tools. Availability is unverified; use the website calendar. No action completed.'}
   }
   await runAgent({id:'evaluation-'+randomUUID(),locale:test.language,tokens:0,clientHistory:[]},test.question,(event,data)=>{
    result.events.push({event,data});if(event==='delta')result.answer+=data.text||'';if(event==='done')result.completed=true;if(event==='error')result.error=data.message||'Agent error'
   },wrapped,call,store)
  }else{
   const session=tokenPool.find(x=>x.requests<Number(process.env.EVAL_MAX_REQUESTS_PER_TOKEN||8))
   if(!session)throw Error('No authenticated session capacity; obtain another real captcha-issued session without bypassing limits')
   const headers={'Content-Type':'application/json',Origin:process.env.EVAL_ORIGIN||'https://oscarbahamonde.com',Authorization:'Bearer '+session.token}
   if(!session.checked){
    const check=await fetch(new URL('/session',process.env.EVAL_ENDPOINT),{headers,signal:AbortSignal.timeout(30000)})
    if(!check.ok)throw Error('Session validation HTTP '+check.status)
    const state=await check.json();if(state.consent||state.status!=='open')throw Error('Requires open anonymous session without consent');session.checked=true
   }
   session.requests++;result.sessionFingerprint=createHash('sha256').update(session.token).digest('hex').slice(0,12)
   result.requestId=randomUUID()
   const response=await fetch(new URL('/messages',process.env.EVAL_ENDPOINT),{method:'POST',headers,body:JSON.stringify({requestId:result.requestId,locale:test.language,message:test.question,history:[]}),signal:AbortSignal.timeout(180000)})
   result.httpStatus=response.status;result.contentType=response.headers.get('content-type')
   if(!response.ok)throw Error('Endpoint HTTP '+response.status)
   if(!result.contentType?.includes('text/event-stream'))throw Error('Expected SSE response')
   await readSse(response.body,(event,data)=>{result.events.push({event,data});if(event==='delta')result.answer+=data.text||'';if(event==='done')result.completed=true;if(event==='error')result.error=data.message||'Endpoint error'})
  }
 }catch(error){result.error=safeError(error)}
 result.finishedAt=new Date().toISOString();Object.assign(result,checkAnswer(test,result));report.results.push(result);report.attempted++;report.automatedPasses=report.results.filter(x=>x.automatedPass).length
 await appendFile(output+'.attempts.jsonl',JSON.stringify({id:test.id,finishedAt:result.finishedAt,automatedPass:result.automatedPass,error:result.error||null})+'\n')
 await writeFile(output,JSON.stringify(report,null,2));console.log(test.id,result.automatedPass?'AUTOMATED_PASS':'REVIEW',`${report.attempted}/${cases.length}`)
 if(mode==='endpoint'&&report.attempted<cases.length)await new Promise(resolve=>setTimeout(resolve,Math.max(6000,Number(process.env.EVAL_DELAY_MS||6000))))
}
report.completedAt=new Date().toISOString();await writeFile(output,JSON.stringify(report,null,2));console.log(JSON.stringify({output,total:report.total,automatedPasses:report.automatedPasses,manualReviewRequired:true}))
