import { test } from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore: evaluator helper is plain JavaScript
import { readSse, checkAnswer } from '../scripts/evaluation-transport.mjs'
test('SSE evaluation preserves UTF-8 and events at every byte boundary',async()=>{
 const bytes=new TextEncoder().encode('event: delta\r\ndata: {"text":"Sí, Perú"}\r\n\r\nevent: done\r\ndata: {"closed":false}\r\n\r\n')
 for(let split=0;split<=bytes.length;split++){
  const events:any[]=[]
  await readSse(new ReadableStream({start(c){c.enqueue(bytes.slice(0,split));c.enqueue(bytes.slice(split));c.close()}}),(event:any,data:any)=>events.push({event,data}))
  assert.deepEqual(events,[{event:'delta',data:{text:'Sí, Perú'}},{event:'done',data:{closed:false}}])
 }
})
test('incomplete SSE or transport errors cannot count as evaluation pass',async()=>{
 await assert.rejects(()=>readSse(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('event: delta\ndata: {"text":"x"}'));c.close()}}),()=>{}),/Incomplete/)
 const check=checkAnswer({expected:[],category:'profile'},{answer:'Oscar tiene una trayectoria ampliamente documentada.',completed:true,error:'session_token_budget'})
 assert.equal(check.automatedPass,false);assert.equal(check.manualPass,null);assert.equal(check.manualReviewRequired,true)
})
