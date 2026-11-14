import { defineSitemapEventHandler } from '#sitemap/server'
import { getMedium } from '../../utils/medium'
export default defineSitemapEventHandler(async()=>{
 const {posts}=await getMedium()
 return posts.map(p=>({loc:`/blog/${p.slug}`,lastmod:p.date,_i18nTransform:true}))
})
