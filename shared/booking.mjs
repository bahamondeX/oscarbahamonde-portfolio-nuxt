export const DURATION = 30 * 60000
export const HOLD_MS = 15 * 60000
export function allowedSlot(value, now = Date.now()) {
 const n=Date.parse(value); if(!Number.isFinite(n)||n<now+4*3600000||n>now+60*86400000) return false
 const lima=new Date(n-5*3600000); const h=lima.getUTCHours(),m=lima.getUTCMinutes(),day=lima.getUTCDay()
 return day>0&&day<6&&[0,30].includes(m)&&lima.getUTCSeconds()===0&&lima.getUTCMilliseconds()===0&&((h>=9&&h<13)||(h>=14&&h<17))
}
export function blocks(event,now=Date.now()) {
 if(event.status==='cancelled'||event.transparency==='transparent'||event.attendees?.some(a=>a.self&&a.responseStatus==='declined'))return false
 const p=event.extendedProperties?.private
 return !(p?.app==='oscar-booking'&&p.state==='hold'&&Number(p.expires)<=now)
}
export function overlaps(event,start,end) {
 // Calendar date-only boundaries use the owner's Lima timezone.
 const time=x=>Date.parse(x.dateTime||`${x.date}T00:00:00-05:00`)
 return event.start&&event.end&&time(event.start)<end&&time(event.end)>start
}
export function approvedPayment(p,reference) {
 return p.status==='approved'&&p.external_reference===reference&&p.currency_id==='PEN'&&Number(p.transaction_amount)===20&&p.live_mode===true&&!!p.date_approved
}
