<script setup lang="ts">
import { Sparkles, Send, Paperclip, Mic, Square, X, LoaderCircle } from 'lucide-vue-next'
const { t, locale } = useI18n(),
  localePath = useLocalePath(),
  runtime = useRuntimeConfig()
const base = String(runtime.public.assistantUrl).replace(/\/$/, '')
const started = ref(false),
  closed = ref(false),
  busy = ref(false),
  consent = ref(false),
  captcha = ref(''),
  error = ref(''),
  draft = ref(''),
  dragging = ref(false)
const messages = ref<{ role: string; content: string }[]>([]),
  files = ref<{ id: string; name: string; processed?: boolean; transcription?: string }[]>([])
const pending = ref<any>(null),
  emailDraft = ref(''),
  confirmedEmail = ref(''),
  audioUrl = ref(''),
  audioBlob = shallowRef<Blob | null>(null),
  recording = ref(false)
const input = ref<HTMLTextAreaElement>(),
  log = ref<HTMLElement>(),
  fileInput = ref<HTMLInputElement>(),
  captchaEl = ref<HTMLElement>()
const uid = useId(),
  es = computed(() => locale.value === 'es')
let bearer = '',
  widget: any,
  recorder: MediaRecorder | undefined,
  media: MediaStream | undefined,
  timer: ReturnType<typeof setTimeout> | undefined
const mime =
  'application/pdf,image/png,image/jpeg,image/webp,application/zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document,audio/webm,audio/ogg,audio/mp4'
async function request(path: string, body?: any, method = body ? 'POST' : 'GET') {
  const r = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(bearer ? { Authorization: 'Bearer ' + bearer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await r.json()
  if (!r.ok || data.error) throw Error('request_failed')
  return data
}
async function scroll() {
  await nextTick()
  if (log.value) log.value.scrollTop = log.value.scrollHeight
}
async function restore() {
  const r = await request('/session')
  messages.value = r.messages
  files.value = r.files
  confirmedEmail.value = r.verifiedEmail || ''
  pending.value = r.pending || null
  closed.value = r.status === 'closed'
  started.value = true
  await scroll()
}
async function initCaptcha() {
  if (!consent.value || started.value) return
  await nextTick()
  try {
    if (!(window as any).turnstile)
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
        script.async = true
        script.onload = () => resolve()
        script.onerror = reject
        document.head.appendChild(script)
      })
    const api = (window as any).turnstile
    if (widget !== undefined) api.remove(widget)
    widget = api.render(captchaEl.value, {
      sitekey: runtime.public.turnstileSiteKey,
      action: 'lead-chat',
      language: locale.value,
      theme: 'auto',
      callback: (v: string) => {
        captcha.value = v
      },
      'expired-callback': () => {
        captcha.value = ''
      },
    })
  } catch {
    error.value = t('chat.error')
  }
}
watch(consent, initCaptcha)
onMounted(async () => {
  bearer = sessionStorage.getItem('oscar-aws-chat') || ''
  if (bearer)
    try {
      await restore()
    } catch {
      sessionStorage.removeItem('oscar-aws-chat')
      bearer = ''
    }
})
async function start() {
  if (!consent.value || !captcha.value) return
  busy.value = true
  error.value = ''
  try {
    const r = await request('/session', {
      consent: true,
      token: captcha.value,
      locale: locale.value,
    })
    bearer = r.token
    sessionStorage.setItem('oscar-aws-chat', bearer)
    started.value = true
    await nextTick()
    input.value?.focus()
  } catch {
    error.value = t('chat.error')
    captcha.value = ''
    ;(window as any).turnstile?.reset(widget)
  } finally {
    busy.value = false
  }
}
async function send(action?: { id: string; approved: boolean }) {
  if (busy.value || closed.value || (!action && !draft.value.trim())) return
  busy.value = true
  error.value = ''
  const text = draft.value
  draft.value = ''
  if (!action) messages.value.push({ role: 'user', content: text })
  messages.value.push({ role: 'assistant', content: '' })
  const index = messages.value.length - 1
  try {
    const r = await fetch(base + '/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + bearer },
      body: JSON.stringify({
        ...(action ? { action } : { message: text }),
        locale: locale.value,
        requestId: crypto.randomUUID(),
      }),
    })
    if (!r.ok || !r.body) throw Error('stream')
    const reader = r.body.getReader(),
      decoder = new TextDecoder()
    let buffer = '',
      done = false
    while (true) {
      const part = await reader.read()
      if (part.done) break
      buffer += decoder.decode(part.value, { stream: true }).replace(/\r\n/g, '\n')
      const blocks = buffer.split('\n\n')
      buffer = blocks.pop() || ''
      for (const block of blocks) {
        const type = block
            .split('\n')
            .find((l) => l.startsWith('event:'))
            ?.slice(6)
            .trim(),
          data = block
            .split('\n')
            .filter((l) => l.startsWith('data:'))
            .map((l) => l.slice(5).trim())
            .join('\n')
        if (!data) continue
        const v = JSON.parse(data)
        if (type === 'delta') {
          messages.value[index]!.content += v.text
          await scroll()
        }
        if (type === 'action') pending.value = v
        if (type === 'result') {
          messages.value[index]!.content = JSON.stringify(v)
          pending.value = null
        }
        if (type === 'error') throw Error('server')
        if (type === 'done') done = true
      }
    }
    if (!done) throw Error('interrupted')
  } catch {
    error.value = t('chat.error')
  } finally {
    busy.value = false
    await scroll()
  }
}
async function confirmEmail() {
  busy.value = true
  error.value = ''
  try {
    const r = await request('/profile', { email: emailDraft.value, confirmed: true })
    confirmedEmail.value = r.verifiedEmail
  } catch {
    error.value = t('chat.error')
  } finally {
    busy.value = false
  }
}
async function upload(file: File, kind = 'file') {
  if (file.size > Number(runtime.public.assistantMaxBytes) || files.value.length >= 5) {
    error.value = t('chat.limits', {
      mb: Number(runtime.public.assistantMaxBytes) / 1000000,
      count: 5,
    })
    return false
  }
  busy.value = true
  error.value = ''
  try {
    const type = file.type.split(';')[0]!,
      mimeType = type === 'video/webm' ? 'audio/webm' : type
    const r = await request('/upload', { name: file.name, mime: mimeType, size: file.size, kind })
    const form = new FormData()
    for (const [k, v] of Object.entries(r.post.fields)) form.append(k, String(v))
    form.append('file', file)
    const result = await fetch(r.post.url, { method: 'POST', body: form })
    if (!result.ok) throw Error('upload')
    await request('/upload/complete', { id: r.id })
    files.value.push({ id: r.id, name: file.name })
    for (let i = 0; i < 50; i++) {
      await new Promise((r) => setTimeout(r, 2000))
      await restore()
      if (files.value.find((f) => f.id === r.id)?.processed) return true
    }
    throw Error('processing_timeout')
  } catch {
    error.value = t('chat.error')
    return false
  } finally {
    busy.value = false
  }
}
async function onFile(event: Event) {
  const el = event.target as HTMLInputElement
  if (el.files?.[0]) await upload(el.files[0])
  el.value = ''
}
async function onDrop(event: DragEvent) {
  dragging.value = false
  if (started.value && !busy.value && !closed.value && event.dataTransfer?.files[0])
    await upload(event.dataTransfer.files[0])
}
async function download(id: string) {
  try {
    const r = await request('/download', { id })
    window.location.assign(r.url)
  } catch {
    error.value = t('chat.error')
  }
}
function clearAudio() {
  if (audioUrl.value) URL.revokeObjectURL(audioUrl.value)
  audioUrl.value = ''
  audioBlob.value = null
}
function stop() {
  if (recorder?.state === 'recording') recorder.stop()
  media?.getTracks().forEach((t) => t.stop())
  recording.value = false
  clearTimeout(timer)
}
async function record() {
  if (recording.value) {
    stop()
    return
  }
  clearAudio()
  try {
    media = await navigator.mediaDevices.getUserMedia({ audio: true })
    const type = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find((x) =>
      MediaRecorder.isTypeSupported(x),
    )
    recorder = new MediaRecorder(media, type ? { mimeType: type } : undefined)
    const chunks: BlobPart[] = []
    let bytes = 0
    recorder.ondataavailable = (e) => {
      chunks.push(e.data)
      bytes += e.data.size
      if (bytes > Number(runtime.public.assistantMaxBytes)) stop()
    }
    recorder.onstop = () => {
      audioBlob.value = new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' })
      audioUrl.value = URL.createObjectURL(audioBlob.value)
      media?.getTracks().forEach((t) => t.stop())
    }
    recorder.start(1000)
    recording.value = true
    timer = setTimeout(stop, 60000)
  } catch {
    media?.getTracks().forEach((t) => t.stop())
    error.value = t('chat.audioError')
  }
}
async function sendAudio() {
  if (!audioBlob.value) return
  const blob = audioBlob.value,
    ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm'
  if (await upload(new File([blob], 'audio.' + ext, { type: blob.type }), 'audio')) {
    clearAudio()
    draft.value = t('chat.audioFollowup')
    await send()
  }
}
async function close() {
  busy.value = true
  try {
    await request('/close', {})
    closed.value = true
  } catch {
    error.value = t('chat.error')
  } finally {
    busy.value = false
  }
}
async function remove() {
  busy.value = true
  try {
    await request('/session', undefined, 'DELETE')
    sessionStorage.removeItem('oscar-aws-chat')
    bearer = ''
    started.value = false
    messages.value = []
    files.value = []
    consent.value = false
    pending.value = null
  } catch {
    error.value = t('chat.error')
  } finally {
    busy.value = false
  }
}
defineExpose({
  focus: () => {
    nextTick(() => input.value?.focus())
  },
})
onBeforeUnmount(() => {
  stop()
  clearAudio()
  if (widget !== undefined) (window as any).turnstile?.remove(widget)
})
</script>
<template>
  <div>
    <div class="chat-header">
      <span class="chat-avatar"><Sparkles :size="23" /></span>
      <div>
        <h3>{{ t('chat.title') }}</h3>
        <span>{{ t('chat.assistant') }}</span>
      </div>
    </div>
    <p class="chat-intro">
      {{ es ? 'Soy el asistente de IA de Oscar. ' : 'I’m Oscar’s AI assistant. '
      }}{{ t('chat.intro') }}
    </p>
    <div v-if="!started" class="consent-box">
      <p>
        {{ t('chat.privacy', { days: runtime.public.assistantRetentionDays }) }}
        <NuxtLink :to="localePath('/privacy')">{{ t('chat.privacyLink') }}</NuxtLink>
      </p>
      <label class="consent-label"
        ><input v-model="consent" type="checkbox" />{{ t('chat.consent') }}</label
      >
      <div ref="captchaEl" />
      <button class="button primary full" :disabled="busy || !consent || !captcha" @click="start">
        {{ t('chat.start') }}
      </button>
    </div>
    <template v-else>
      <div ref="log" class="chat-log" role="log" :aria-label="t('chat.title')" aria-live="polite">
        <div v-for="(m, i) in messages" :key="i" :class="['message', m.role]">
          <small>{{ t(m.role === 'user' ? 'chat.you' : 'chat.assistant') }}</small
          >{{ m.content || t('chat.thinking') }}
        </div>
      </div>
      <div class="file-list">
        <button
          v-for="file in files"
          :key="file.id"
          :disabled="!file.processed || busy"
          @click="download(file.id)"
        >
          {{ file.name }} {{ file.processed ? '↗' : '…' }}
        </button>
      </div>
      <form
        v-if="!confirmedEmail && !closed"
        class="assistant-email"
        @submit.prevent="confirmEmail"
      >
        <label :for="uid + 'email'">{{
          es ? 'Correo de contacto (opcional)' : 'Contact email (optional)'
        }}</label
        ><input
          :id="uid + 'email'"
          v-model="emailDraft"
          type="email"
          autocomplete="email"
          maxlength="254"
          required
        /><button class="button" :disabled="busy">
          {{ es ? 'Confirmo este correo' : 'I confirm this email' }}
        </button>
      </form>
      <div
        v-if="pending"
        class="consent-box"
        role="region"
        :aria-label="es ? 'Confirmar acción' : 'Confirm action'"
      >
        <p>
          {{
            es
              ? '¿Autorizas esta acción con estos datos?'
              : 'Do you authorize this action with these details?'
          }}
        </p>
        <strong>{{
          pending.name === 'send_email'
            ? es
              ? 'Enviar correo'
              : 'Send email'
            : es
              ? 'Crear reunión'
              : 'Create meeting'
        }}</strong>
        <dl>
          <template v-for="(value, key) in pending.args" :key="key"
            ><dt>{{ key }}</dt>
            <dd>{{ value }}</dd></template
          >
        </dl>
        <button
          class="button primary"
          :disabled="busy"
          @click="send({ id: pending.id, approved: true })"
        >
          {{ es ? 'Sí, confirmo' : 'Yes, confirm' }}</button
        ><button class="button" :disabled="busy" @click="send({ id: pending.id, approved: false })">
          {{ es ? 'Cancelar' : 'Cancel' }}
        </button>
      </div>
      <p v-if="closed" role="status">{{ t('chat.closed') }}</p>
      <form
        v-else
        class="chat-compose"
        :class="{ dragging }"
        @submit.prevent="send()"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="onDrop"
      >
        <label :for="uid + 'message'" class="sr-only">{{ t('chat.placeholder') }}</label
        ><textarea
          :id="uid + 'message'"
          ref="input"
          v-model="draft"
          maxlength="4000"
          :placeholder="t('chat.placeholder')"
          :disabled="busy || recording"
          @keydown.enter.exact.prevent="send()"
        />
        <div class="chat-tools">
          <div>
            <button
              class="icon-button"
              type="button"
              :aria-label="t('chat.attach')"
              :disabled="busy || recording"
              @click="fileInput?.click()"
            >
              <Paperclip :size="18" /></button
            ><input
              ref="fileInput"
              type="file"
              class="sr-only"
              tabindex="-1"
              :accept="mime"
              @change="onFile"
            /><button
              type="button"
              class="icon-button"
              :aria-label="t(recording ? 'chat.stop' : 'chat.record')"
              :disabled="busy"
              @click="record"
            >
              <Square v-if="recording" :size="16" /><Mic v-else :size="18" />
            </button>
          </div>
          <button
            type="submit"
            class="send-button"
            :aria-label="t('common.send')"
            :disabled="busy || recording || !draft.trim()"
          >
            <LoaderCircle v-if="busy" :size="17" /><Send v-else :size="17" />
          </button>
        </div>
      </form>
      <div v-if="audioUrl" class="audio-preview">
        <audio :src="audioUrl" controls /><button
          class="button"
          :disabled="busy"
          @click="sendAudio"
        >
          {{ t('chat.sendAudio') }}</button
        ><button class="icon-button" :aria-label="t('chat.clearAudio')" @click="clearAudio">
          <X :size="17" />
        </button>
      </div>
      <div class="chat-actions">
        <button v-if="!closed" :disabled="busy || recording" @click="close">
          {{ t('chat.end') }}</button
        ><button :disabled="busy || recording" @click="remove">{{ t('chat.delete') }}</button>
      </div>
    </template>
    <p v-if="error" class="chat-error" role="alert">
      {{ error }} <a href="#contact">{{ es ? 'Agenda web' : 'Website calendar' }}</a> ·
      <a href="mailto:oscar.bahamonde.dev@gmail.com">Email</a>
    </p>
  </div>
</template>
<style scoped>
.assistant-email {
  display: grid;
  gap: 8px;
  margin-block: 16px;
}
.assistant-email input {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--line, #888);
  border-radius: 12px;
  background: transparent;
  color: inherit;
}
.file-list button {
  font: inherit;
  color: inherit;
  background: none;
  border: 0;
  text-decoration: underline;
  cursor: pointer;
}
dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px;
  font-size: 0.85rem;
}
dd {
  margin: 0;
  overflow-wrap: anywhere;
}
button:focus-visible,
input:focus-visible {
  outline: 2px solid var(--accent, #0071e3);
  outline-offset: 3px;
}
</style>
