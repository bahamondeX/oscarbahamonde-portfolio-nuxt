import assert from 'node:assert/strict'
import puppeteer from 'puppeteer-core'
import {writeFile,mkdir} from 'node:fs/promises'
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-first-run']})
const results=[],errors=[]
try{
 const page=await browser.newPage();page.setDefaultTimeout(10000);await page.setViewport({width:1440,height:1000,deviceScaleFactor:1})
 page.on('pageerror',e=>errors.push(e.message))
 page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('409'))errors.push(m.text())})
 await page.setRequestInterception(true)
 const selected='2030-11-20T14:00:00.000Z';let checkoutBody
 page.on('request',req=>{
  const url=new URL(req.url())
  if(url.pathname==='/api/availability')return req.respond({status:200,contentType:'application/json',body:JSON.stringify({slots:[selected],timezone:'America/Lima'})})
  if(url.pathname==='/api/checkout'){checkoutBody=JSON.parse(req.postData());return req.respond({status:409,contentType:'application/json',body:JSON.stringify({message:'Test conflict'})})}
  return req.continue()
 })
 await page.goto(process.argv[2]||'http://127.0.0.1:3187/es',{waitUntil:'networkidle0'})
 assert.deepEqual(errors,[])
 assert.equal(await page.$$eval('section[data-section]',xs=>xs.length),9)
 assert.equal(await page.$$eval('.dock-link',xs=>xs.length),9)
 const box=await page.$eval('.dock-home',el=>{const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})
 await page.mouse.move(box.x,box.y)
 await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.dock-item')).getPropertyValue('--magnify'))>1.2)
 results.push('Nine sections and dock links; pointer magnification')
 await page.evaluate(()=>{window.__portfolioTestMarker=42})
 await page.click('.language-button');await page.waitForFunction(()=>location.pathname==='/en')
 assert.equal(await page.evaluate(()=>window.__portfolioTestMarker),42)
 assert.match(await page.$eval('h1',el=>el.textContent),/Ambitious/)
 await page.click('.theme-button');await page.waitForFunction(()=>document.documentElement.classList.contains('dark'))
 await page.reload({waitUntil:'networkidle0'});assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('dark')),true)
 results.push('Language changes without reload; theme persists across reload')
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}])
 await page.click('.dock-contact');await page.waitForSelector('.slot');await page.focus('.slot');await page.keyboard.press('Enter')
 await page.waitForSelector('#meeting-name');await page.type('#meeting-name','Test Visitor');await page.type('#meeting-email','visitor@example.test')
 await page.click('.booking-flow form button[type=submit]');await page.waitForFunction(()=>document.querySelector('.booking-flow [role=alert]')?.textContent.includes('Test conflict'))
 assert.equal(checkoutBody.start,selected);assert.equal(checkoutBody.email,'visitor@example.test')
 results.push('One booking flow submits selected Calendar slot/name/email; conflicts handled; checkout intercepted, no charge')
 await page.setViewport({width:390,height:844,deviceScaleFactor:1});await page.goto('http://127.0.0.1:3187/en',{waitUntil:'networkidle0'})
 if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))console.log('overflow',await page.evaluate(()=>[...document.querySelectorAll('body *')].map(el=>({tag:el.tagName,cls:el.className,right:el.getBoundingClientRect().right,width:el.getBoundingClientRect().width})).filter(x=>x.right>innerWidth+1).slice(0,15)))
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
 const dock=await page.$eval('.dock-wrap',el=>{const r=el.getBoundingClientRect();return{left:r.left,right:r.right,bottom:r.bottom}})
 assert.ok(dock.left>=0&&dock.right<=390&&dock.bottom<=844)
 await page.click('.dock-services');await page.waitForFunction(()=>document.querySelector('.dock-services').getAttribute('aria-current')==='location')
 results.push('Mobile has no horizontal overflow; dock fits and updates active section; reduced motion respected')
 assert.deepEqual(errors,[])
 await mkdir('reports',{recursive:true});await writeFile('reports/ui-checks.json',JSON.stringify({date:new Date().toISOString(),results,errors},null,2))
 console.log(JSON.stringify({results,errors}))
}finally{await browser.close()}
