import puppeteer from 'puppeteer-core'
import {mkdir} from 'node:fs/promises'
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-first-run','--disable-gpu']})
try {
 const page=await browser.newPage();await page.setViewport({width:1440,height:1000,deviceScaleFactor:1})
 page.on('console',msg=>{if(['error','warn'].includes(msg.type()))console.log(msg.type(),msg.text())})
 page.on('pageerror',error=>console.log('pageerror',error.message))
 await page.goto(process.argv[2]||'http://127.0.0.1:3187/es',{waitUntil:'networkidle0'})
 console.log(JSON.stringify(await page.evaluate(()=>({dock:document.querySelector('.dock-wrap')?.outerHTML.slice(0,200),sections:document.querySelectorAll('section[data-section]').length,heading:document.querySelector('h1')?.textContent,htmlWidth:document.documentElement.scrollWidth,viewport:innerWidth,body:document.body.innerText.slice(-700)}))))
 await mkdir('reports',{recursive:true});await page.screenshot({path:'reports/desktop.png',fullPage:true})
 await page.setViewport({width:390,height:844,deviceScaleFactor:1});await page.screenshot({path:'reports/mobile.png',fullPage:true})
}finally{await browser.close()}
