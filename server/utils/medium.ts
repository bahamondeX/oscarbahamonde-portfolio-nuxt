import { parseMedium } from '../../shared/medium.mjs'
import seed from '../data/medium-seed.json'
import { db } from './chat/db'
export interface MediumPost { id:string;slug:string;title:string;date:string;excerpt:string;url:string;image:string }
let lastGood:MediumPost[]=seed
export const getMedium = defineCachedFunction(async()=>{
 let posts:MediumPost[]=[],stale=false
 try{
  const xml=await $fetch<string>('https://medium.com/feed/@obahamonde',{responseType:'text',timeout:8000,retry:0,headers:{'User-Agent':'OscarPortfolio/1.0 (+https://oscarbahamonde.com)'}})
  posts=parseMedium(xml)
  if(!posts.length)throw new Error('Empty feed')
  lastGood=Array.from(new Map([...lastGood,...posts].map(p=>[p.id,p])).values())
  if(useRuntimeConfig().databaseUrl){const sql=db();for(const p of posts)await sql`INSERT INTO medium_posts(id,data,published_at) VALUES (${p.id},${sql.json({...p})},${p.date}) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data,updated_at=now()`}
 }catch{stale=true}
 if(useRuntimeConfig().databaseUrl)try{const rows=await db()`SELECT data FROM medium_posts ORDER BY published_at DESC`;posts=rows.map(r=>r.data as MediumPost)}catch{stale=true}
 const all=Array.from(new Map([...lastGood,...posts].map(p=>[p.id,p])).values()).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date))
 return {posts:all,stale,updatedAt:new Date().toISOString()}
},{maxAge:1800,swr:true,name:'medium-feed-v1'})
