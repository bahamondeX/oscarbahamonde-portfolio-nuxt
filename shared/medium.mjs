import { XMLParser } from 'fast-xml-parser'
const plain = text => String(text||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim()
export function parseMedium(xml) {
 if(xml.length>2_000_000 || /<!DOCTYPE|<!ENTITY/i.test(xml))throw new Error('Invalid feed')
 const parsed=new XMLParser({ignoreAttributes:false,processEntities:false}).parse(xml)
 let items=parsed?.rss?.channel?.item||[];if(!Array.isArray(items))items=[items]
 return items.flatMap(item=>{
  try{
   const url=new URL(String(item.link));if(url.protocol!=='https:'||!['medium.com','www.medium.com'].includes(url.hostname))return []
   url.search='';url.hash=''
   const id=String(item.guid?.['#text']||item.guid||url.pathname).match(/[a-f0-9]{12}$/)?.[0];if(!id)return []
   const title=plain(item.title).slice(0,250),date=new Date(item.pubDate);if(!title||!Number.isFinite(date.getTime()))return []
   const html=String(item['content:encoded']||item.description||'')
   // Keep excerpts only. An original article remains on Medium.
   const excerpt=plain(html).split(/\s+/).slice(0,55).join(' ')+(plain(html).split(/\s+/).length>55?'…':'')
   const imageCandidate=html.match(/<img[^>]+src=["']([^"']+)/i)?.[1]
   let image='';if(imageCandidate){const u=new URL(imageCandidate);if(u.protocol==='https:'&&['cdn-images-1.medium.com','miro.medium.com'].includes(u.hostname))image=u.href}
   const slug=title.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80)+'-'+id
   return [{id,slug,title,date:date.toISOString(),excerpt,url:url.href,image}]
  }catch{return []}
 }).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date))
}
