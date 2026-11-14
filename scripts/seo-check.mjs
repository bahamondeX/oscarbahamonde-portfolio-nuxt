#!/usr/bin/env node
// Reproduce the 54 HTTP/SSR checks in docs/audit/after/seo-validation.json.
// GET only, normal TLS verification. Each run creates a new report and raw-response directory.
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises'
import { resolve, dirname, basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createHash } from 'node:crypto'
import { XMLParser } from 'fast-xml-parser'
const exec = promisify(execFile)
const xml = new XMLParser({ignoreAttributes:false,attributeNamePrefix:'@_',parseTagValue:false})
const array = value => value == null ? [] : Array.isArray(value) ? value : [value]
const decode = value => String(value || '').replace(/&(?:#(x[0-9a-f]+|\d+)|amp|quot|apos|lt|gt);/gi,(match,n)=>n?String.fromCodePoint(n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n)):({'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>'}[match.toLowerCase()]||match))
function attrs(tag){return Object.fromEntries([...tag.matchAll(/([^\s=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)].slice(1).map(m=>[m[1].toLowerCase(),decode(m[2]??m[3]??m[4]??'')]))}
export function parseHtml(html){
 const meta=[],links=[],schemas=[],types={};let lang=null,cards=0,sections=0,jsonLdValid=true
 for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){
  if(attrs('<script '+match[1]+'>').type!=='application/ld+json')continue
  try{schemas.push(JSON.parse(match[2]))}catch{jsonLdValid=false}
 }
 const withoutScripts=html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,'')
 for(const match of withoutScripts.matchAll(/<(html|meta|link|article|section)\b[^>]*>/gi)){
  const tag=match[1].toLowerCase(),a=attrs(match[0])
  if(tag==='html')lang=a.lang||null
  if(tag==='meta')meta.push(a)
  if(tag==='link')links.push(a)
  if(tag==='article'&&(a.class||'').split(/\s+/).includes('blog-card'))cards++
  if(tag==='section'&&Object.hasOwn(a,'data-section'))sections++
 }
 function visit(value){if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object'){for(const type of array(value['@type']))types[type]=(types[type]||0)+1;Object.values(value).forEach(visit)}}
 visit(schemas)
 const metadata=name=>meta.find(x=>(x.name||x.property)===name)?.content||null
 return {htmlLang:lang,canonical:links.filter(x=>x.rel==='canonical').map(x=>x.href),hreflang:Object.fromEntries(links.filter(x=>x.hreflang).map(x=>[x.hreflang,x.href])),openGraph:Object.fromEntries(['og:title','og:description','og:type','og:url','og:image','og:locale'].map(k=>[k,metadata(k)])),twitter:Object.fromEntries(['twitter:card','twitter:title','twitter:description','twitter:image'].map(k=>[k,metadata(k)])),themeColors:meta.filter(x=>x.name==='theme-color').map(x=>({content:x.content,media:x.media})),schemaTypes:types,jsonLdValid:jsonLdValid&&schemas.length>0,ssrBlogCards:cards,sections}
}
function sitemapEntries(body){
 const parsed=xml.parse(body)
 return array(parsed.urlset?.url).map(row=>({loc:row.loc,lastmod:row.lastmod||null,alternates:Object.fromEntries(array(row['xhtml:link']).map(x=>[x['@_hreflang'],x['@_href']]))}))
}
export function validate(responses,target){
 const checks=[],warnings=[],pages={},check=(name,passed,detail)=>checks.push({name,passed:!!passed,...(detail===undefined?{}:{detail})})
 const get=name=>responses.find(x=>x.name===name)||{body:'',headers:'',url:'',httpStatus:'missing',curlExit:1}
 for(const name of ['es','en','robots','sitemap','llms','llms-full','blog1','blog2','sitemap-child-0','sitemap-child-1','article-es','article-en']){const row=get(name);check('HTTP '+name,row.httpStatus==='200'&&row.curlExit===0)}
 for(const key of ['es','en','article-es','article-en']){
  const row=get(key),p=parseHtml(row.body);pages[key]=p
  check(key+' canonical',p.canonical.length===1&&p.canonical[0]===row.url)
  check(key+' hreflang es/en',['es','en','x-default'].every(k=>p.hreflang[k]))
  check(key+' dual theme-color',p.themeColors.length===2&&['(prefers-color-scheme: light)','(prefers-color-scheme: dark)'].every(media=>p.themeColors.some(x=>x.media===media)))
  check(key+' Open Graph',['og:title','og:description','og:type','og:image'].every(k=>p.openGraph[k]))
  check(key+' Twitter card/image',p.twitter['twitter:card']&&p.twitter['twitter:image'])
  check(key+' JSON-LD',p.jsonLdValid)
  if(['es','en'].includes(key)){
   check(key+' Person and Service',p.schemaTypes.Person>=1&&p.schemaTypes.Service===9)
   check(key+' SSR6 blogcards +9 sections',p.ssrBlogCards===6&&p.sections===9)
  }else check(key+' BlogPosting and BreadcrumbList',p.schemaTypes.BlogPosting>=1&&p.schemaTypes.BreadcrumbList>=1)
 }
 const robots=get('robots').body
 check('robots allows crawling',/^Allow: \/$/m.test(robots))
 check('robots blocks APIs and private routes',['Disallow: /api/','Disallow: /pago','Disallow: /conectar'].every(x=>robots.includes(x)))
 check('robots points at sitemap',robots.includes('Sitemap: '+target+'/sitemap.xml'))
 const sitemaps=[]
 for(const key of ['sitemap-child-0','sitemap-child-1']){const row=get(key);try{sitemaps.push({url:row.url,entries:sitemapEntries(row.body)})}catch(error){sitemaps.push({url:row.url,entries:[],parseError:error.message})}}
 const entries=sitemaps.flatMap(x=>x.entries),posts=entries.filter(x=>x.loc?.includes('/blog/'))
 check('sitemap has20 local post routes',posts.length===20)
 check('sitemap post lastmod',posts.length>0&&posts.every(x=>x.lastmod))
 check('sitemap post language alternatives',posts.length>0&&posts.every(x=>x.alternates['es-PE']&&x.alternates['en-US']))
 check('sitemap single owned host',entries.length>0&&entries.every(x=>{try{return new URL(x.loc).hostname===new URL(target).hostname}catch{return false}}))
 let blog1={},blog2={};try{blog1=JSON.parse(get('blog1').body);blog2=JSON.parse(get('blog2').body)}catch(error){warnings.push({type:'blog-json-invalid',message:error.message})}
 const one=Array.isArray(blog1.items)?blog1.items:[],two=Array.isArray(blog2.items)?blog2.items:[],allposts=[...one,...two]
 check('blog pages6+4 all10 distinct',one.length===6&&two.length===4&&new Set(allposts.map(x=>x.id)).size===10&&blog1.total===10)
 check('blog metadata',allposts.length>0&&allposts.every(x=>['es','en'].includes(x.language)&&Array.isArray(x.tags)&&x.readingMinutes>0))
 check('blog excerpts free of author/media URLs',allposts.length>0&&!allposts.some(x=>/medium\.com\/media\/|\b(?:Por|By) Oscar/i.test(x.excerpt||'')))
 const noise=allposts.filter(x=>/Generated (?:by|via)|Art by/.test(x.excerpt||'')).map(x=>x.id)
 if(noise.length)warnings.push({type:'image-attribution-in-excerpt',postIds:noise})
 const llms={}
 const escaped=target.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
 for(const key of ['llms','llms-full']){
  const row=get(key),local=new Set(row.body.match(new RegExp(escaped+'/(?:es|en)/blog/[a-z0-9-]+','g'))||[]),medium=new Set(row.body.match(/https:\/\/medium\.com\/p\/[a-f0-9]{12}/g)||[])
  llms[key]={localPostUrls:local.size,canonicalMediumUrls:medium.size,allOriginalPublicationUrlsPresent:allposts.length>0&&allposts.every(p=>row.body.includes(p.url)),contentType:row.headers.split(/\r?\n/).filter(x=>/^content-type:/i.test(x)).at(-1)?.split(':').slice(1).join(':').trim()||null}
  check(key+' local20+Medium10+originals',local.size===20&&medium.size===10&&llms[key].allOriginalPublicationUrlsPresent)
 }
 return {pages,robots:robots.trim(),sitemaps,blog:{page1Count:one.length,page2Count:two.length,total:blog1.total??null,stale:blog1.stale??null,realCoverCount:allposts.filter(x=>x.image).length,languageCounts:allposts.reduce((a,p)=>(a[p.language]=(a[p.language]||0)+1,a),{})},llms,checks,warnings,summary:{passed:checks.filter(x=>x.passed).length,failed:checks.filter(x=>!x.passed).length},notMeasured:['Lighthouse scores','browser console','CLS','rendered contrast','interactive flows']}
}
export async function fixtureResponses(directory){
 const rows=JSON.parse(await readFile(join(directory,'fetches.json'),'utf8'))
 return Promise.all(rows.map(async row=>({...row,body:await readFile(join(directory,row.name+'.body'),'utf8'),headers:await readFile(join(directory,row.name+'.headers'),'utf8')})))
}
async function main(){
 const arg=(name,fallback)=>{const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1]}
 const target=arg('--url','https://oscarbahamonde.com').replace(/\/$/,'')
 if(new URL(target).protocol!=='https:')throw Error('HTTPS target required; TLS is never disabled')
 const stamp=new Date().toISOString().replace(/[:.]/g,'-'),fixture=arg('--fixtures',null)
 const output=resolve(arg('--output',`docs/audit/after/seo-${fixture?'fixture':'live'}-${stamp}.json`))
 const artifactDir=output.replace(/\.json$/,'')+'-responses'
 await mkdir(dirname(output),{recursive:true})
 try{await stat(output);throw Error('Refusing to overwrite report: '+output)}catch(error){if(error.code!=='ENOENT')throw error}
 let responses=[]
 if(fixture){responses=await fixtureResponses(resolve(fixture))}else{
  await mkdir(artifactDir,{recursive:false})
  async function get(name,url){
   if(new URL(url).origin!==target)throw Error('Refusing cross-origin crawl URL')
   const bodyPath=join(artifactDir,name+'.body'),headersPath=join(artifactDir,name+'.headers')
   let httpStatus='',curlExit=0,error=null
   try{const r=await exec('curl',['--disable','--silent','--show-error','--location','--proto','=https','--proto-redir','=https','--max-time','45','--max-filesize','2000000','--dump-header',headersPath,'--output',bodyPath,'--write-out','%{http_code}',url],{maxBuffer:100000});httpStatus=r.stdout.trim()}catch(e){curlExit=typeof e.code==='number'?e.code:1;error=String(e.stderr||e.message).slice(0,500);httpStatus=String(e.stdout||'').trim()}
   const body=await readFile(bodyPath,'utf8').catch(()=>''),headers=await readFile(headersPath,'utf8').catch(()=>'')
   return {name,url,httpStatus,curlExit,bytes:Buffer.byteLength(body),sha256:createHash('sha256').update(body).digest('hex'),error,body,headers}
  }
  responses=await Promise.all([['es','/es'],['en','/en'],['robots','/robots.txt'],['sitemap','/sitemap.xml'],['llms','/llms.txt'],['llms-full','/llms-full.txt'],['blog1','/api/blog?page=1'],['blog2','/api/blog?page=2']].map(([name,path])=>get(name,target+path)))
  const map=xml.parse(responses.find(x=>x.name==='sitemap').body)
  const children=array(map.sitemapindex?.sitemap).map(x=>x.loc)
  if(children.length!==2)throw Error('Expected two locale sitemap children; raw initial responses retained')
  const blog=JSON.parse(responses.find(x=>x.name==='blog1').body),slug=blog.items?.[0]?.slug
  if(typeof slug!=='string'||!/^[-a-z0-9]+$/.test(slug))throw Error('No valid first article slug; raw initial responses retained')
  responses.push(...await Promise.all([...children.map((url,i)=>get('sitemap-child-'+i,url)),get('article-es',target+'/es/blog/'+slug),get('article-en',target+'/en/blog/'+slug)]))
  await writeFile(join(artifactDir,'fetches.json'),JSON.stringify(responses.map(({body,headers,...metadata})=>metadata),null,2)+'\n',{flag:'wx'})
 }
 const result={checkedAtUtc:new Date().toISOString(),target,expectedDeploymentRevision:arg('--revision','unspecified')+' (provided by deployment owner; not independently exposed in HTTP)',method:fixture?'Offline parser validation of recorded fixtures; no live requests':'curl HTTPS GET with normal certificate verification; no state-changing requests',evidenceMode:fixture?'fixture-replay':'live-http',rawResponseDirectory:fixture?resolve(fixture):artifactDir,scriptSha256:createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex'),fetches:responses.map(({body,headers,...metadata})=>metadata),...validate(responses,target)}
 await writeFile(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'})
 console.log(JSON.stringify({output,evidenceMode:result.evidenceMode,summary:result.summary,failures:result.checks.filter(x=>!x.passed),warnings:result.warnings},null,2))
 if(result.summary.failed)process.exitCode=1
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1})
