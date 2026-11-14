import { getMedium } from '../utils/medium'
import { servicePrompt } from '../../shared/services.mjs'
export default defineCachedEventHandler(async event=>{
 setHeader(event,'content-type','text/plain; charset=utf-8')
 const {posts}=await getMedium()
 const sections=['home','bio','experience','skills','projects','services','certifications','contact','blog']
 return ['# Oscar Bahamonde','> Software, data and AI engineer based in Peru. Applied AI, data platforms, backend systems and cloud reliability.','', '## Portfolio',...['es','en'].flatMap(lang=>sections.map(s=>`- [${s} (${lang})](https://oscarbahamonde.com/${lang}#${s})`)),'','## Services',servicePrompt,'','## Profiles','- https://github.com/bahamondex','- https://github.com/obahamonde','- https://linkedin.com/in/obahamondem/','- https://medium.com/@obahamonde','- mailto:oscar.bahamonde.dev@gmail.com','','## Articles (excerpts on this site, originals on Medium)',...posts.flatMap(p=>[`- [${p.title}](https://oscarbahamonde.com/es/blog/${p.slug})`,`  - Original: ${p.url}`,`  - English route: https://oscarbahamonde.com/en/blog/${p.slug}`]),'','## Privacy','- https://oscarbahamonde.com/es/privacy','- API routes, payment state and Calendar connection are private and should not be indexed.',''].join('\n')
},{maxAge:1800,swr:true})
