import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const linear = (v) => (v/=255) <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4
const luminance = (r,g,b) => .2126*linear(r)+.7152*linear(g)+.0722*linear(b)
const ratio=(a,b)=>(Math.max(a,b)+.05)/(Math.min(a,b)+.05)
const report=[]
for(const filename of (await fs.readdir(path.join(root,'public/logos'))).filter(x=>x.endsWith('.png'))) {
 const {data,info}=await sharp(path.join(root,'public/logos',filename)).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 const values=[],chroma=[]
 for(let i=0;i<data.length;i+=4)if(data[i+3]>=230){values.push(luminance(data[i],data[i+1],data[i+2]));chroma.push(Math.max(data[i],data[i+1],data[i+2])-Math.min(data[i],data[i+1],data[i+2]))}
 const mean=values.reduce((a,b)=>a+b,0)/values.length
 const colored=chroma.filter(x=>x>45).length/values.length>.08
 const tone=colored?'color':mean>.65?'light':'dark'
 const corners=[0,(info.width-1)*4,((info.height-1)*info.width)*4,(info.width*info.height-1)*4].map(i=>[...data.subarray(i,i+4)])
 const flatBacking=corners.every(c=>c[3]>=230&&c.slice(0,3).every((v,i)=>Math.abs(v-corners[0][i])<=12))
 const backingLum=luminance(...corners[0])
 const background=flatBacking?(backingLum>.3?'#ffffff':'#111827'):(ratio(mean,1)>=ratio(mean,luminance(17,24,39))?'#ffffff':'#111827')
 const bgLum=background==='#ffffff'?1:luminance(17,24,39)
 const visible=values.map(v=>ratio(v,bgLum)).sort((a,b)=>a-b)
 report.push({path:'/logos/'+filename,width:info.width,height:info.height,logoTone:tone,logoBackground:background,opaqueMeanLuminance:+mean.toFixed(4),opaqueMeanContrast:+ratio(mean,bgLum).toFixed(2),foregroundMedianContrast:+visible[Math.floor(visible.length/2)].toFixed(2),foreground10thPercentileContrast:+visible[Math.floor(visible.length*.1)].toFixed(2),opaquePixels:values.length})
}
for(const file of ['data/experience.json','data/certifications.json']) {
 const records=JSON.parse(await fs.readFile(path.join(root,file),'utf8'))
 for(const record of records){const item=report.find(x=>x.path===record.logo);if(item){record.logoTone=item.logoTone;record.logoBackground=item.logoBackground}}
 await fs.writeFile(path.join(root,file),JSON.stringify(records,null,2)+'\n')
}
await fs.writeFile(path.join(root,'docs/logo-analysis.json'),JSON.stringify({method:'WCAG relative luminance of pixels with alpha >=230. Mean includes all opaque brand colors; chips choose the highest contrast of white or #111827. Raster edges excluded; rendered E2E test additionally evaluates recognizable opaque foreground.',logos:report},null,2)+'\n')
console.table(report.map(x=>({logo:x.path, tone:x.logoTone,background:x.logoBackground,contrast:x.opaqueMeanContrast,p10:x.foreground10thPercentileContrast})))
