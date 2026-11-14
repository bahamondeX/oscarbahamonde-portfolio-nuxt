<script setup lang="ts">
import { Bot, X, Minus, Sparkles } from 'lucide-vue-next'
const Chat = defineAsyncComponent(() => import('./BedrockChat.vue'))
const { locale } = useI18n(), es = computed(() => locale.value === 'es')
const { isOpen, close, open } = useAssistantPanel()
const panel = ref<HTMLElement>(), launcher = ref<HTMLButtonElement>(), chat = ref<{focus:()=>void;pauseRecording:()=>void}>()
const loaded = ref(false), greeting = ref(false)
let dismissTimer: ReturnType<typeof setTimeout> | undefined, startY = 0, previous: HTMLElement | null = null
onMounted(() => {
  greeting.value = localStorage.getItem('oscar-assistant-greeting') !== 'dismissed'
  dismissTimer = setTimeout(dismissGreeting, 9000)
})
function dismissGreeting() { greeting.value = false; localStorage.setItem('oscar-assistant-greeting', 'dismissed'); clearTimeout(dismissTimer) }
watch(isOpen, async open => {
  if (open) { previous = document.activeElement as HTMLElement; loaded.value = true; dismissGreeting(); await nextTick(); panel.value?.focus() }
  else { chat.value?.pauseRecording(); (previous?.isConnected ? previous : launcher.value)?.focus() }
})
function keys(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); close(); return }
  if (event.key !== 'Tab') return
  const focusable = Array.from(panel.value?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),audio[controls],[tabindex="0"]') || []).filter(el => el.offsetParent !== null)
  const first = focusable[0], last = focusable.at(-1)
  if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.value)) { event.preventDefault(); last?.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
}
function swipe(event: TouchEvent) { if (event.changedTouches[0] && event.changedTouches[0].clientY - startY > 85) close() }
onBeforeUnmount(() => clearTimeout(dismissTimer))
</script>
<template>
  <ClientOnly>
    <div class="assistant-layer">
      <div v-if="isOpen" class="assistant-backdrop" aria-hidden="true" @click="close"/>
      <Transition name="greeting"><aside v-if="greeting && !isOpen" class="assistant-greeting"><span>{{ es ? '¿Qué te gustaría crear?' : 'What would you like to build?' }}</span><button :aria-label="es ? 'Ocultar saludo' : 'Dismiss greeting'" @click="dismissGreeting"><X :size="14" /></button></aside></Transition>
      <button ref="launcher" class="assistant-launcher" :class="{active:isOpen}" :aria-label="es ? 'Hablar con el asistente de Oscar' : 'Talk to Oscar’s assistant'" :aria-expanded="isOpen" aria-controls="oscar-assistant-panel" @click="isOpen ? close() : open()"><span class="bot-halo"/><Bot :size="28" :stroke-width="1.6" class="bot-icon"/><span class="ai-pill">{{ es ? 'IA' : 'AI' }}</span></button>
      <Transition name="assistant-expand">
        <section v-show="isOpen" id="oscar-assistant-panel" ref="panel" role="dialog" aria-modal="true" :aria-label="es ? 'Asistente de Oscar' : 'Oscar’s assistant'" tabindex="-1" class="assistant-panel" @keydown="keys">
          <header class="assistant-panel-head" @touchstart.passive="startY=$event.touches[0]?.clientY || 0" @touchend.passive="swipe">
            <span class="mobile-handle" aria-hidden="true"/><div class="assistant-avatar"><Bot :size="25"/></div><div class="assistant-identity"><strong>{{ es ? 'Asistente de Oscar' : 'Oscar’s assistant' }} <small>{{ es ? 'IA' : 'AI' }}</small></strong><span><i/>{{ es ? 'Hablemos de tu próxima idea' : 'Let’s talk about your next idea' }}</span></div>
            <button :aria-label="es ? 'Minimizar asistente' : 'Minimize assistant'" @click="close"><Minus :size="19"/></button><button :aria-label="es ? 'Cerrar asistente' : 'Close assistant'" @click="close"><X :size="19"/></button>
          </header>
          <Suspense><Chat v-if="loaded" ref="chat"/><template #fallback><div class="assistant-loading"><Sparkles :size="24"/>{{ es ? 'Preparando la conversación…' : 'Getting ready…' }}</div></template></Suspense>
        </section>
      </Transition>
    </div>
  </ClientOnly>
</template>
<style scoped>
.assistant-backdrop{position:fixed;inset:0;z-index:-1;background:#081d2a08}.assistant-layer{position:fixed;z-index:90;bottom:calc(28px + env(safe-area-inset-bottom));right:28px;color:var(--ink,#17202a)}.assistant-launcher{width:62px;height:62px;display:grid;place-items:center;border:1px solid #ffffff80;border-radius:23px;position:relative;color:white;background:linear-gradient(145deg,#267db7,#3454b2 65%,#249ca6);box-shadow:0 12px 35px #17568b45,inset 0 1px 1px #ffffff70;cursor:pointer;transition:transform .25s,box-shadow .25s}.assistant-launcher:hover{transform:translateY(-4px);box-shadow:0 15px 45px #147eaf66}.bot-halo{position:absolute;inset:-6px;border:1px solid #43c2cd70;border-radius:29px;animation:halo 4s ease-in-out infinite;pointer-events:none}.bot-icon{animation:bot-float 5s ease-in-out infinite}.ai-pill{position:absolute;right:-5px;top:-7px;border:1px solid #ffffffbb;border-radius:20px;background:#defbff;color:#154c7a;font:700 10px/1.3 system-ui;padding:3px 6px}.assistant-greeting{position:absolute;right:0;bottom:80px;width:max-content;max-width:270px;padding:14px 12px 14px 17px;background:var(--surface,#fff);border:1px solid var(--line,#dce2e8);box-shadow:0 10px 32px #19253616;border-radius:19px 19px 5px 19px;display:flex;align-items:center;gap:14px;font-size:13px}.assistant-greeting button,.assistant-panel-head button{border:0;background:transparent;color:inherit;display:grid;place-items:center;cursor:pointer;border-radius:9px;min-width:30px;min-height:32px}.assistant-panel{position:absolute;right:0;bottom:82px;width:400px;height:min(620px,calc(100dvh - 134px));display:flex;flex-direction:column;border:1px solid var(--line,#dce2e8);background:var(--surface,#fff);border-radius:26px;box-shadow:0 28px 90px #0e244e35,0 3px 18px #07162615;overflow:hidden;transform-origin:calc(100% - 31px) calc(100% + 50px)}.assistant-panel-head{display:flex;gap:10px;align-items:center;padding:19px 15px 17px;border-bottom:1px solid var(--line,#e5e8ec);background:linear-gradient(120deg,#37b4c112,transparent 75%);flex:none}.assistant-avatar{display:grid;place-items:center;flex:none;width:41px;height:41px;border-radius:14px;background:linear-gradient(145deg,#30a5b51a,#445cc51a);color:var(--accent,#3455af)}.assistant-identity{flex:1;min-width:0}.assistant-identity strong{font-size:13px;display:block;white-space:nowrap;letter-spacing:-.2px}.assistant-identity small{font-size:8px;border:1px solid #2b9aaf40;color:var(--accent,#3455af);padding:2px 4px;border-radius:4px;margin-left:3px}.assistant-identity>span{display:block;font-size:10px;line-height:1.4;margin-top:5px;color:var(--muted,#667085)}.assistant-identity i{display:inline-block;width:5px;height:5px;background:#2c9c82;border-radius:50%;margin-right:5px}.assistant-panel-head button:hover{background:#748ca315}.assistant-loading{display:grid;gap:15px;place-content:center;flex:1;font-size:13px}.mobile-handle{display:none}.assistant-expand-enter-active,.assistant-expand-leave-active{transition:transform .35s cubic-bezier(.22,.8,.22,1),opacity .24s}.assistant-expand-enter-from,.assistant-expand-leave-to{transform:translateY(20px) scale(.8);opacity:0}.greeting-enter-active,.greeting-leave-active{transition:opacity .2s,transform .2s}.greeting-enter-from,.greeting-leave-to{opacity:0;transform:translateY(6px)}button:focus-visible{outline:3px solid #2db3bc;outline-offset:4px}@keyframes halo{50%{transform:scale(1.08);opacity:.3}}@keyframes bot-float{50%{transform:translateY(-2px)}}
@media(max-width:700px){.assistant-layer{right:16px;bottom:calc(98px + env(safe-area-inset-bottom))}.assistant-launcher{width:54px;height:54px;border-radius:20px}.assistant-panel{position:fixed;inset:12px 10px calc(12px + env(safe-area-inset-bottom));width:auto;height:auto;border-radius:24px;transform-origin:calc(100% - 35px) calc(100% - 70px)}.assistant-panel-head{padding-top:25px;position:relative}.mobile-handle{display:block;position:absolute;top:8px;left:calc(50% - 18px);width:36px;height:4px;background:var(--muted,#77818c);opacity:.35;border-radius:5px}.assistant-greeting{bottom:70px}.assistant-identity strong{font-size:14px}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
</style>
