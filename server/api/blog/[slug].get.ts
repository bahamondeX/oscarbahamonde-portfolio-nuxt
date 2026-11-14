import { getMedium } from '../../utils/medium'
export default defineCachedEventHandler(async event=>{
 const slug=getRouterParam(event,'slug'),result=await getMedium(),post=result.posts.find(p=>p.slug===slug)
 if(!post)throw createError({statusCode:404,message:'Article not found'})
 return post
},{maxAge:1800,swr:true})
