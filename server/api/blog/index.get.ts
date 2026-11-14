import { getMedium } from '../../utils/medium'
export default defineCachedEventHandler(async event=>{
 const query=getQuery(event),page=Math.max(1,Math.min(1000,Number(query.page)||1)),limit=6
 const result=await getMedium()
 return {items:result.posts.slice((page-1)*limit,page*limit),page,pages:Math.max(1,Math.ceil(result.posts.length/limit)),total:result.posts.length,stale:result.stale}
},{maxAge:300,swr:true,getKey:event=>String(getQuery(event).page||1)})
