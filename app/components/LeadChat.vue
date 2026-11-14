<script setup lang="ts">
import { Sparkles, Send, Paperclip, Mic, Square, X, LoaderCircle } from 'lucide-vue-next'
const { t, locale } = useI18n()
const localePath = useLocalePath()
const { data: config } = await useFetch('/api/chat/config')
const consent=ref(false),honeypot=ref(''),token=ref(''),started=ref(false),closed=ref(false),busy=ref(false),error=ref(''),draft=ref(''),dragging=ref(false)
const messages=ref<{role:string;content:string}[]>([]),files=ref<{id:string;name:string}[]>([])
const turnstileEl=ref<HTMLElement>(),input=ref<HTMLTextAreaElement>(),fileInput=ref<HTMLInputElement>(),log=ref<HTMLElement>()
const recording=ref(false),audioUrl=ref(''),audioBlob=shallowRef<Blob|null>(null),seconds=ref(0)
let recorder:MediaRecorder|undefined,media:MediaStream|undefined,timer:ReturnType<typeof setInterval>|undefined,widget:string|undefined
let turnstile: any
let sessionRequestId=''
const accept=computed(()=>config.value?.allowedMime||'')
async function scrollLog(){await nextTick();if(log.value)log.value.scrollTop=log.value.scrollHeight}
async function initCaptcha(){
 if(!config.value?.ready || !consent.value || started.value)return
 await nextTick()
 try{
  if(!(window as any).turnstile)await new Promise<void>((resolve,reject)=>{
   const existing=document.querySelector<HTMLScriptElement>('script[data-turnstile]')
   if(existing){existing.addEventListener('load',()=>resolve(),{once:true});existing.addEventListener('error',reject,{once:true});return}
   const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.dataset.turnstile='true';script.onload=()=>resolve();script.onerror=reject;document.head.appendChild(script)
  })
  turnstile=(window as any).turnstile
  if(widget!==undefined)turnstile.remove(widget)
  widget=turnstile.render(turnstileEl.value,{sitekey:config.value.siteKey,action:'lead-chat',theme:'auto',language:locale.value,callback:(value:string)=>{token.value=value},'expired-callback':()=>{token.value=''},'error-callback':()=>{token.value=''}})
 }catch{error.value=t('chat.error')}
}
watch(consent,initCaptcha)
async function restore(){
 const result=await $fetch<any>('/api/chat/session');started.value=true;closed.value=result.status==='closed';messages.value=result.messages;files.value=result.files;await scrollLog()
}
onMounted(async()=>{if(localStorage.getItem('portfolio-chat-started'))try{await restore()}catch{localStorage.removeItem('portfolio-chat-started')}})
async function start(){
 if(!consent.value||!token.value)return
 busy.value=true;error.value=''
 try{await $fetch('/api/chat/session',{method:'POST',body:{consent:true,token:token.value,locale:locale.value,website:honeypot.value}});started.value=true;localStorage.setItem('portfolio-chat-started','1');await nextTick();input.value?.focus()}
 catch{error.value=t('chat.error');token.value='';if(widget!==undefined)turnstile?.reset(widget)}finally{busy.value=false}
}
async function sendText(text=draft.value){
 if(!text.trim()||busy.value||closed.value)return
 busy.value=true;error.value='';draft.value='';sessionRequestId=crypto.randomUUID()
 messages.value.push({role:'user',content:text});const assistant={role:'assistant',content:''};messages.value.push(assistant);const index=messages.value.length-1
 try{
  const response=await fetch('/api/chat/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,locale:locale.value,requestId:sessionRequestId})})
  if(!response.ok||!response.body)throw new Error('send')
  const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',doneReceived=false
  while(true){const result=await reader.read();if(result.done)break;buffer+=decoder.decode(result.value,{stream:true}).replace(/\r\n/g,'\n');const events=buffer.split('\n\n');buffer=events.pop()||''
   for(const block of events){const type=block.split('\n').find(x=>x.startsWith('event:'))?.slice(6).trim();const data=block.split('\n').filter(x=>x.startsWith('data:')).map(x=>x.slice(5).trim()).join('\n');if(!data)continue;const value=JSON.parse(data)
    if(type==='delta'){messages.value[index]!.content+=value.text;await scrollLog()}
    if(type==='error')throw new Error('reply')
    if(type==='done'){closed.value=value.closed;doneReceived=true}
   }
  }
  if(!doneReceived)throw new Error('interrupted')
 }catch{error.value=t('chat.error');try{await restore()}catch{/* Keep visible draft if reconnection fails. */}}
 finally{busy.value=false;await scrollLog()}
}
async function upload(file:File,kind='file'){
 if(!config.value||file.size>config.value.maxBytes||files.value.length>=config.value.maxFiles){error.value=t('chat.limits',{mb:(config.value?.maxBytes||0)/1000000,count:config.value?.maxFiles});return false}
 busy.value=true;error.value=''
 try{const body=new FormData();body.set('file',file);body.set('kind',kind);const result=await $fetch<any>('/api/chat/upload',{method:'POST',body});files.value.push(result);await restore();return true}
 catch{error.value=t('chat.error');return false}finally{busy.value=false}
}
async function onFile(event:Event){const target=event.target as HTMLInputElement;const file=target.files?.[0];if(file)await upload(file);target.value=''}
async function onDrop(event:DragEvent){dragging.value=false;if(!started.value||busy.value||closed.value||!config.value?.uploads)return;const file=event.dataTransfer?.files[0];if(file)await upload(file)}
function clearAudio(){if(audioUrl.value)URL.revokeObjectURL(audioUrl.value);audioUrl.value='';audioBlob.value=null}
function stopRecording(){if(recorder?.state==='recording')recorder.stop();media?.getTracks().forEach(track=>track.stop());recording.value=false;clearInterval(timer)}
async function record(){
 if(recording.value){stopRecording();return}
 error.value='';clearAudio()
 try{
  media=await navigator.mediaDevices.getUserMedia({audio:true})
  const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(type=>MediaRecorder.isTypeSupported(type))
  recorder=new MediaRecorder(media,mime?{mimeType:mime}:undefined);const chunks:BlobPart[]=[];let bytes=0
  recorder.ondataavailable=e=>{if(e.data.size){chunks.push(e.data);bytes+=e.data.size;if(bytes>(config.value?.maxBytes||3000000))stopRecording()}}
  recorder.onstop=()=>{const blob=new Blob(chunks,{type:recorder?.mimeType||'audio/webm'});audioBlob.value=blob;audioUrl.value=URL.createObjectURL(blob);media?.getTracks().forEach(track=>track.stop())}
  recorder.start(1000);recording.value=true;seconds.value=0;timer=setInterval(()=>{seconds.value++;if(seconds.value>=60)stopRecording()},1000)
 }catch{media?.getTracks().forEach(track=>track.stop());error.value=t('chat.audioError')}
}
async function sendAudio(){if(!audioBlob.value)return;const blob=audioBlob.value;const ext=blob.type.includes('mp4')?'m4a':blob.type.includes('ogg')?'ogg':'webm';if(await upload(new File([blob],`message.${ext}`,{type:blob.type}),'audio')){clearAudio();await sendText(t('chat.audioFollowup'))}}
async function close(){busy.value=true;error.value='';try{const result=await $fetch('/api/chat/close',{method:'POST'});closed.value=result.closed}catch{error.value=t('chat.error')}finally{busy.value=false}}
async function remove(){busy.value=true;error.value='';try{await $fetch('/api/chat/session',{method:'DELETE'});messages.value=[];files.value=[];started.value=false;closed.value=false;consent.value=false;localStorage.removeItem('portfolio-chat-started');error.value=t('chat.deleted')}catch{error.value=t('chat.error')}finally{busy.value=false}}
defineExpose({focus:()=>{nextTick(()=>input.value?.focus())}})
onBeforeUnmount(()=>{stopRecording();clearAudio();if(widget!==undefined)turnstile?.remove(widget)})
</script>
<template><div><div class="chat-header"><span class="chat-avatar"><Sparkles :size="23" /></span><div><h3>{{ t('chat.title') }}</h3><span>{{ t('chat.assistant') }}</span></div></div><p class="chat-intro">{{ t('chat.intro') }}</p>
 <div v-if="!config?.ready" class="consent-box"><p>{{ t('chat.unavailable') }}</p><a class="text-link" href="mailto:oscar.bahamonde.dev@gmail.com">Email ↗</a></div>
 <div v-else-if="!started" class="consent-box"><p>{{ t('chat.privacy',{days:config.retentionDays}) }} <NuxtLink :to="localePath('/privacy')" class="text-link">{{ t('chat.privacyLink') }}</NuxtLink></p><label class="consent-label"><input v-model="consent" type="checkbox">{{ t('chat.consent') }}</label><div class="sr-only" aria-hidden="true"><label>Website<input v-model="honeypot" tabindex="-1" autocomplete="off"></label></div><div ref="turnstileEl" /><p v-if="consent&&!token" class="fineprint">{{ t('chat.verify') }}</p><button class="button primary full" :disabled="!consent||!token||busy" @click="start">{{ t('chat.start') }}</button></div>
 <template v-else><div ref="log" class="chat-log" role="log" :aria-label="t('chat.title')" aria-live="polite" aria-relevant="additions"><div v-for="(message,i) in messages" :key="i" :class="['message',message.role]"><small>{{ t(message.role==='user'?'chat.you':'chat.assistant') }}</small>{{ message.content }}<span v-if="!message.content&&busy">{{ t('chat.thinking') }}</span></div></div><div v-if="files.length" class="file-list"><a v-for="file in files" :key="file.id" :href="`/api/chat/download?id=${file.id}`">{{ file.name }} ↗</a></div>
 <p v-if="closed" class="chat-status" role="status">{{ t('chat.closed') }}</p>
 <template v-else><form class="chat-compose" :class="{dragging}" @submit.prevent="sendText()" @dragover.prevent="dragging=true" @dragleave.prevent="dragging=false" @drop.prevent="onDrop"><label for="chat-message" class="sr-only">{{ t('chat.placeholder') }}</label><textarea id="chat-message" ref="input" v-model="draft" maxlength="4000" :placeholder="dragging?t('chat.drop'):t('chat.placeholder')" :disabled="busy||recording" @keydown.enter.exact.prevent="sendText()" /><div class="chat-tools"><div><button v-if="config.uploads" type="button" class="icon-button" :aria-label="t('chat.attach')" :disabled="busy||recording" @click="fileInput?.click()"><Paperclip :size="18" /></button><input ref="fileInput" type="file" class="sr-only" tabindex="-1" :accept="accept" @change="onFile"><button v-if="config.audio" type="button" class="icon-button" :aria-label="t(recording?'chat.stop':'chat.record')" :disabled="busy" @click="record"><Square v-if="recording" :size="16" /><Mic v-else :size="18" /></button><span v-if="recording" class="record-indicator">{{ t('chat.recording') }} {{ seconds }}s</span></div><button type="submit" class="send-button" :aria-label="t('common.send')" :disabled="busy||recording||!draft.trim()"><LoaderCircle v-if="busy" :size="17" /><Send v-else :size="17" /></button></div></form><p v-if="config.uploads" class="fineprint" style="margin-top:10px">{{ t('chat.limits',{mb:config.maxBytes/1000000,count:config.maxFiles}) }}</p><div v-if="audioUrl" class="audio-preview"><p class="fineprint">{{ t('chat.preview') }}</p><audio :src="audioUrl" controls /><button class="button" :disabled="busy" @click="sendAudio">{{ t('chat.sendAudio') }}</button><button class="icon-button" :disabled="busy" :aria-label="t('chat.clearAudio')" @click="clearAudio"><X :size="17" /></button></div></template>
 <div class="chat-actions"><button v-if="!closed&&messages.length" :disabled="busy||recording" @click="close">{{ t('chat.end') }}</button><button :disabled="busy||recording" @click="remove">{{ t('chat.delete') }}</button></div></template><p v-if="error" class="chat-error" role="alert">{{ error }}</p></div></template>
