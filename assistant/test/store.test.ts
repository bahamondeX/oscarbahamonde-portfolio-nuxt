import {test} from 'node:test'
import assert from 'node:assert/strict'
import {db,saveLead} from '../src/store.js'
test('updating a saved lead preserves its primary key and creation timestamp',async()=>{
 const original=db.send.bind(db),commands:any[]=[]
 ;(db as any).send=async(command:any)=>{
  commands.push(command)
  if(command.constructor.name==='GetCommand')return {Item:{id:'lead1',sessionId:'lead1',createdAt:'2026-01-01',status:'open'}}
  return {}
 }
 try{
  await saveLead({id:'lead1',consentAt:'2026-01-01',ttl:123456},{name:'Updated',status:'qualified'})
  const input=commands.find(c=>c.constructor.name==='UpdateCommand').input
  assert.deepEqual(input.Key,{id:'lead1'})
  assert.ok(!Object.values(input.ExpressionAttributeNames).includes('id'))
  assert.ok(Object.values(input.ExpressionAttributeValues).includes('2026-01-01'))
 }finally{(db as any).send=original}
})
