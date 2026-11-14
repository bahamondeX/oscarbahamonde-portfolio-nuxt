<script setup lang="ts">
import entries from '../../data/experience.json'
const { locale } = useI18n()
const lang = computed(() => locale.value === 'en' ? 'en' : 'es')
const date = (value: string | null) => value ? new Intl.DateTimeFormat(lang.value, { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value + '-01T12:00:00Z')) : ''
</script>
<template>
  <ol class="career-timeline">
    <li v-for="(item,i) in entries" :key="item.id" class="career-stop" data-reveal>
      <span class="career-node" aria-hidden="true">{{ String(i+1).padStart(2,'0') }}</span>
      <article class="career-card">
        <div class="career-brand"><div v-if="item.logo" class="company-logo-chip" :data-logo-tone="item.logoTone" :style="{background:item.logoBackground}"><img :src="item.logo" :alt="item.company" width="160" height="64" loading="lazy" decoding="async" :style="item.id === 'data-analytics' ? { filter: 'grayscale(1) brightness(.65) contrast(3)' } : item.id === 'valtx' ? { filter: 'contrast(1.25)' } : undefined"></div><strong>{{ item.company }}</strong></div>
        <div class="career-content">
          <p v-if="item.start" class="career-date"><time :datetime="item.start">{{ date(item.start) }}</time> — <time v-if="item.end" :datetime="item.end">{{ date(item.end) }}</time><span v-else>{{ lang === 'es' ? 'Presente' : 'Present' }}</span><span v-if="item.location"> · {{ item.location }}</span></p>
          <h3 v-if="item.role[lang]">{{ item.role[lang] }}</h3>
          <p v-if="item.description[lang]" class="career-description">{{ item.description[lang] }}</p>
          <p v-else class="career-description">{{ lang === 'es' ? 'Parte de mi trayectoria profesional. Más detalles en LinkedIn.' : 'Part of my professional journey. More details on LinkedIn.' }}</p>
          <ul v-if="item.stack.length" class="career-stack" :aria-label="lang === 'es' ? 'Tecnologías' : 'Technologies'"><li v-for="tech in item.stack" :key="tech">{{ tech }}</li></ul>
        </div>
      </article>
    </li>
  </ol>
</template>
<style scoped>
.career-timeline{position:relative;list-style:none;padding:0;margin:3.5rem 0;display:grid;gap:2rem}.career-timeline::before{content:"";position:absolute;left:50%;top:12px;bottom:12px;width:2px;background:linear-gradient(180deg,var(--accent,#3b61bd),#26c7c1 60%,transparent);transform:translateX(-50%);transform-origin:top;animation:line-grow linear both;animation-timeline:view();animation-range:entry 0% exit 100%}.career-stop{position:relative;width:calc(50% - 2rem)}.career-stop:nth-child(even){margin-left:calc(50% + 2rem)}.career-node{position:absolute;right:-3rem;top:1.6rem;width:2rem;height:2rem;display:grid;place-items:center;background:var(--surface,#fff);border:2px solid var(--accent,#3b61bd);border-radius:50%;font:600 .65rem ui-monospace,monospace;color:var(--text,#1c2433);z-index:1}.career-stop:nth-child(even) .career-node{right:auto;left:-3rem}.career-card{border:1px solid var(--border,#d8dfeb);padding:1.6rem;border-radius:24px;background:var(--surface,#fff);box-shadow:0 14px 40px #0c254908;transition:transform .3s,box-shadow .3s}.career-card:hover{transform:translateY(-4px);box-shadow:0 20px 50px #0c254915}.career-brand{display:flex;flex-direction:column;align-items:flex-start;gap:.7rem;margin-bottom:1.3rem}.career-brand strong{font-size:.86rem;letter-spacing:.02em}.company-logo-chip{display:flex;align-items:center;justify-content:center;background:#fff;border:1px solid #e0e5eb;border-radius:12px;width:188px;height:86px;padding:12px;transition:background .3s}.company-logo-chip img{max-width:160px;max-height:64px;width:auto;height:auto;object-fit:contain}.company-logo-chip[data-logo-tone="light"]{background:#141b2b}.career-date{font-size:.73rem;line-height:1.6;color:var(--muted,#606c80);margin:0 0 .65rem}.career-content h3{font-size:1.2rem;line-height:1.3;letter-spacing:-.035em;margin:.2rem 0 .85rem}.career-description{white-space:pre-line;font-size:.88rem;line-height:1.8;color:var(--muted,#5a6575)}.career-stack{display:flex;flex-wrap:wrap;gap:.4rem;padding:0;list-style:none;margin:1.2rem 0 0}.career-stack li{font-size:.65rem;padding:.35rem .6rem;border-radius:50px;background:color-mix(in srgb,var(--accent,#3b61bd) 9%,transparent);border:1px solid color-mix(in srgb,var(--accent,#3b61bd) 15%,transparent)}
@supports(animation-timeline:view()){@keyframes line-grow{from{scale:1 0}to{scale:1 1}}}
@media(max-width:760px){.career-timeline::before{left:15px}.career-stop,.career-stop:nth-child(even){width:calc(100% - 43px);margin-left:43px}.career-node,.career-stop:nth-child(even) .career-node{left:-43px;right:auto}.career-card{padding:1.3rem}.career-timeline{gap:1.2rem}.career-content h3{font-size:1.1rem}}
@media(prefers-reduced-motion:reduce){.career-timeline::before{animation:none}.career-card{transition:none}.career-card:hover{transform:none}}
</style>
