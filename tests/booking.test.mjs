import {test} from 'node:test'
import assert from 'node:assert/strict'
import {allowedSlot,blocks,overlaps,approvedPayment} from '../shared/booking.mjs'
const now=Date.parse('2026-11-16T00:00:00-05:00')
test('30 minute Lima schedule rejects lunch, nights, weekends and non-grid times',()=>{
 for(const hour of ['09:00','12:30','14:00','16:30'])assert.ok(allowedSlot(`2026-11-16T${hour}:00-05:00`,now))
 for(const hour of ['08:30','13:00','13:30','17:00','09:15'])assert.equal(allowedSlot(`2026-11-16T${hour}:00-05:00`,now),false)
 assert.equal(allowedSlot('2026-11-21T10:00:00-05:00',now),false)
 assert.equal(allowedSlot('2026-11-16T03:30:00-05:00',now),false)
 assert.equal(allowedSlot('2027-03-16T09:00:00-05:00',now),false)
})
test('Calendar conflicts include all-day and recurring instances, allow adjacent slots',()=>{
 const start=Date.parse('2026-11-16T10:00:00-05:00'),end=start+1800000
 assert.ok(overlaps({start:{date:'2026-11-16'},end:{date:'2026-11-17'}},start,end))
 assert.ok(overlaps({start:{dateTime:'2026-11-16T10:15:00-05:00'},end:{dateTime:'2026-11-16T11:00:00-05:00'}},start,end))
 assert.equal(overlaps({start:{dateTime:'2026-11-16T10:30:00-05:00'},end:{dateTime:'2026-11-16T11:00:00-05:00'}},start,end),false)
})
test('only expired application holds are ignored; ordinary tentative events still block',()=>{
 assert.equal(blocks({status:'tentative'}),true)
 const hold={extendedProperties:{private:{app:'oscar-booking',state:'hold',expires:String(now+1000)}}}
 assert.equal(blocks(hold,now),true);assert.equal(blocks(hold,now+1001),false)
 assert.equal(blocks({extendedProperties:{private:{...hold.extendedProperties.private,state:'confirmed'}}},now+1001),true)
 assert.equal(blocks({status:'cancelled'}),false)
 assert.equal(blocks({transparency:'transparent'}),false)
 assert.equal(blocks({attendees:[{self:true,responseStatus:'declined'}]}),false)
})
test('return URL or pending/sandbox/wrong-amount/wrong-order payments cannot confirm',()=>{
 const p={status:'approved',external_reference:'order',currency_id:'PEN',transaction_amount:20,live_mode:true,date_approved:'2026-11-16'}
 assert.ok(approvedPayment(p,'order'))
 for(const patch of [{status:'pending'},{currency_id:'USD'},{transaction_amount:19},{live_mode:false},{date_approved:null},{external_reference:'other'}])assert.equal(approvedPayment({...p,...patch},'order'),false)
})
