import lighthouse from 'lighthouse'
import { launch } from 'chrome-launcher'
import { mkdir, writeFile } from 'node:fs/promises'
const target=process.argv[2]||'http://127.0.0.1:3187/es'
await mkdir('reports',{recursive:true})
const chrome=await launch({chromeFlags:['--headless','--disable-gpu','--no-first-run'],logLevel:'silent'})
try {
 for(const device of ['mobile','desktop']){
  const result=await lighthouse(target,{port:chrome.port,output:['json','html'],logLevel:'error',onlyCategories:['performance','accessibility','best-practices','seo'],...(device==='desktop'?{formFactor:'desktop',screenEmulation:{mobile:false,width:1350,height:940,deviceScaleFactor:1,disabled:false},throttling:{rttMs:40,throughputKbps:10240,cpuSlowdownMultiplier:1,requestLatencyMs:0,downloadThroughputKbps:0,uploadThroughputKbps:0}}:{})})
  if(!result)throw new Error('No Lighthouse result')
  await writeFile(`reports/lighthouse-${device}.json`,result.report[0]);await writeFile(`reports/lighthouse-${device}.html`,result.report[1])
  const {lhr}=result
  console.log(JSON.stringify({device,url:lhr.finalDisplayedUrl,date:lhr.fetchTime,version:lhr.lighthouseVersion,scores:Object.fromEntries(Object.entries(lhr.categories).map(([k,v])=>[k,Math.round(v.score*100)])),metrics:{LCP:lhr.audits['largest-contentful-paint'].numericValue,CLS:lhr.audits['cumulative-layout-shift'].numericValue,TBT:lhr.audits['total-blocking-time'].numericValue},failures:Object.entries(lhr.audits).filter(([,a])=>a.score!==null&&a.score<1&&['binary','numeric'].includes(a.scoreDisplayMode)).map(([id,a])=>({id,title:a.title,score:a.score}))}))
 }
}finally{await chrome.kill()}
