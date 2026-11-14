// Loaded explicitly by integration.mjs only; never imported by the application.
import { appendFile } from 'node:fs/promises'
if(process.env.PORTFOLIO_PROVIDER_MOCKS!=='test-only')throw new Error('Mocks require explicit test mode')
const original=globalThis.fetch
globalThis.fetch=async(input,init)=>{
 const url=typeof input==='string'?input:input instanceof URL?input.href:input.url
 const json=value=>Response.json(value)
 if(url.startsWith('https://challenges.cloudflare.com/turnstile/v0/siteverify')){
  const params=new URLSearchParams(init?.body)
  return json({success:params.get('response')==='test-human',action:'lead-chat',hostname:'127.0.0.1'})
 }
 if(url.startsWith('https://llm.test/v1/chat/completions')){
  const body=JSON.parse(init.body)
  if(!body.stream)return json({choices:[{message:{content:JSON.stringify({fields:{name:'Test Lead',email:'lead@example.test',service:'landing',scope:'One page'},summary:'Consulta sintética de prueba; ningún correo real.'})}}]})
  return new Response('data: '+JSON.stringify({choices:[{delta:{content:'What would you like your website to do?'}}]})+'\n\ndata: [DONE]\n\n',{headers:{'Content-Type':'text/event-stream'}})
 }
 if(url.startsWith('https://speech.test/v1/audio/transcriptions'))return json({text:'I would like a landing page.'})
 if(url.startsWith('https://oauth2.googleapis.com/token'))return json({access_token:'test-only-token'})
 if(url.startsWith('https://gmail.googleapis.com/gmail/v1/users/me/messages/send')){
  await appendFile(process.env.TEST_MAIL_CAPTURE,JSON.stringify(JSON.parse(init.body))+'\n')
  return json({id:'test-message'})
 }
 if(!url.startsWith('http://127.0.0.1:'))throw new Error('External network disabled in integration tests')
 return original(input,init)
}
