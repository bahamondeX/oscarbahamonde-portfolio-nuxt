import { fileTypeFromBuffer } from 'file-type'
import { unzipSync } from 'fflate'
import { safeFilename, validateArchiveEntry } from '../../../shared/chat.mjs'
export async function validateFile(data:Buffer,name:string,claimedMime:string,kind:string) {
 const c=useRuntimeConfig(),max=Math.min(Number(c.chatMaxFileBytes),3_500_000)
 if(!data.length || data.length>max)throw createError({statusCode:413,message:'File too large'})
 if(data.includes(Buffer.from('EICAR-STANDARD-ANTIVIRUS-TEST-FILE')))throw createError({statusCode:400,message:'File rejected'})
 const detected=await fileTypeFromBuffer(data)
 if(!detected)throw createError({statusCode:415,message:'Unrecognized file type'})
 let mime=detected.mime.split(';')[0]!.trim()
 if(kind==='audio' && mime==='video/webm')mime='audio/webm'
 if(kind==='audio' && mime==='video/mp4')mime='audio/mp4'
 if(!String(c.chatAllowedMime).split(',').map(x=>x.trim()).includes(mime))throw createError({statusCode:415,message:'File type not allowed'})
 const claimed=claimedMime.split(';')[0]
 if(claimed && claimed!=='application/octet-stream' && claimed!==mime && !(mime==='application/zip'&&claimed==='application/x-zip-compressed'))throw createError({statusCode:415,message:'MIME mismatch'})
 if(kind==='audio' && !mime.startsWith('audio/'))throw createError({statusCode:415,message:'Audio required'})
 if(mime==='application/pdf' && /\/(JavaScript|JS|Launch|EmbeddedFile|RichMedia)\b/i.test(data.toString('latin1')))throw createError({statusCode:400,message:'Active PDF content rejected'})
 if(['application/zip','application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(mime)){
  const stats={count:0,total:0}
  try{unzipSync(data,{filter:entry=>{validateArchiveEntry(entry.name,entry.originalSize,stats);return false}})}catch{throw createError({statusCode:400,message:'Unsafe archive'})}
 }
 const clean=safeFilename(name)
 return {name:clean,mime}
}
export async function transcribe(data:Buffer,mime:string,name:string) {
 const c=useRuntimeConfig()
 if(!c.transcriptionApiKey)throw createError({statusCode:503,message:'Transcription unavailable'})
 const body=new FormData();body.set('file',new Blob([new Uint8Array(data)],{type:mime}),name);body.set('model',c.transcriptionModel)
 const response=await fetch(c.transcriptionBaseUrl.replace(/\/$/,'')+'/audio/transcriptions',{method:'POST',headers:{Authorization:`Bearer ${c.transcriptionApiKey}`},body,signal:AbortSignal.timeout(25000)})
 if(!response.ok)throw createError({statusCode:502,message:'Transcription unavailable'})
 const result=await response.json() as any
 if(typeof result.text!=='string'||!result.text.trim())throw createError({statusCode:422,message:'No speech detected'})
 return result.text.trim().slice(0,8000)
}
