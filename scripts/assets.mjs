import sharp from 'sharp'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
const root = new URL('../public/', import.meta.url)
const source = await readFile(new URL('../public/images/logo-source.png', import.meta.url))
await mkdir(new URL('images/', root), { recursive: true })
await sharp(source).resize(88, 88, { fit: 'contain', background: '#ffffff' }).webp({ quality: 85 }).toFile(new URL('images/logo.webp', root).pathname)
for (const [name, size] of [['favicon-16x16',16],['favicon-32x32',32],['apple-touch-icon',180],['pwa-192',192],['pwa-512',512]]) {
  await sharp(source).resize(Math.round(size*.82),Math.round(size*.82),{fit:'contain',background:'#ffffff'}).extend({top:Math.floor(size*.09),bottom:size-Math.round(size*.82)-Math.floor(size*.09),left:Math.floor(size*.09),right:size-Math.round(size*.82)-Math.floor(size*.09),background:'#ffffff'}).png().toFile(new URL(`${name}.png`,root).pathname)
}
const buffers = await Promise.all([16,32].map(n=>readFile(new URL(`favicon-${n}x${n}.png`,root))))
const header = Buffer.alloc(6+16*buffers.length);header.writeUInt16LE(1,2);header.writeUInt16LE(buffers.length,4)
let offset=header.length
buffers.forEach((b,i)=>{const p=6+i*16;header[p]=[16,32][i];header[p+1]=[16,32][i];header.writeUInt16LE(1,p+4);header.writeUInt16LE(32,p+6);header.writeUInt32LE(b.length,p+8);header.writeUInt32LE(offset,p+12);offset+=b.length})
await writeFile(new URL('favicon.ico',root),Buffer.concat([header,...buffers]))
const png=await sharp(source).resize(256,256,{fit:'contain',background:'#ffffff'}).png().toBuffer()
await writeFile(new URL('favicon.svg',root),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><image width="256" height="256" href="data:image/png;base64,${png.toString('base64')}"/></svg>`)
const og=Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><rect width="1200" height="630" fill="#f5f6f8"/><circle cx="1040" cy="80" r="300" fill="#e0f8f3"/><text x="92" y="315" font-family="Helvetica,Arial" font-size="72" font-weight="600" fill="#171b24">Oscar Bahamonde</text><text x="96" y="390" font-family="Helvetica,Arial" font-size="30" fill="#285abb">Software. Data. Artificial intelligence.</text><text x="96" y="540" font-family="Helvetica,Arial" font-size="22" fill="#5b6371">oscarbahamonde.com</text></svg>`)
const logo=await sharp(source).resize(120,120,{fit:'contain',background:'#f5f6f8'}).png().toBuffer()
await sharp(og).composite([{input:logo,top:90,left:90}]).png().toFile(new URL('images/og.png',root).pathname)
await writeFile(new URL('site.webmanifest',root),JSON.stringify({name:'Oscar Bahamonde',short_name:'Oscar',start_url:'/es',display:'standalone',background_color:'#ffffff',theme_color:'#285abb',icons:[{src:'/pwa-192.png',sizes:'192x192',type:'image/png'},{src:'/pwa-512.png',sizes:'512x512',type:'image/png'}]}))
console.log('Logo, ICO, PNGs, SVG and social card generated from the original asset.')
