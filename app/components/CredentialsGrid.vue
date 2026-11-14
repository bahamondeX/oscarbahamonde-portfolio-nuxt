<script setup lang="ts">
import credentials from '../../data/certifications.json'
const { locale } = useI18n()
const lang = computed(() => locale.value === 'en' ? 'en' : 'es')
const expanded = ref(false)
const visible = computed(() => expanded.value ? credentials : credentials.slice(0, 6))
const formatDate = (value: string) => new Intl.DateTimeFormat(lang.value, { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value + '-01T12:00:00Z'))
</script>
<template>
  <div>
    <div id="credentials-grid" class="credentials-grid">
      <article v-for="credential in visible" :key="credential.id" class="credential-card" data-reveal>
        <div class="credential-issuer"><div v-if="credential.logo" class="issuer-logo-chip" :data-logo-tone="credential.logoTone" :style="{background:credential.logoBackground}"><img :src="credential.logo" :alt="credential.issuer" width="72" height="56" loading="lazy" decoding="async"></div><span>{{ credential.issuer }}</span></div>
        <h3>{{ credential.name }}</h3>
        <p class="credential-date"><time :datetime="credential.date">{{ formatDate(credential.date) }}</time><span v-if="credential.expires"> · {{ lang === 'es' ? 'Venció' : 'Expired' }} <time :datetime="credential.expires">{{ formatDate(credential.expires) }}</time></span></p>
        <a :href="credential.verificationUrl || credential.source" target="_blank" rel="noopener noreferrer">{{ credential.verificationUrl ? (lang === 'es' ? 'Ver credencial' : 'View credential') : (lang === 'es' ? 'Ver en LinkedIn' : 'View on LinkedIn') }} <span aria-hidden="true">↗</span><span class="sr-only"> — {{ credential.name }}</span></a>
      </article>
    </div>
    <div class="credential-actions"><button type="button" :aria-expanded="expanded" aria-controls="credentials-grid" @click="expanded = !expanded">{{ expanded ? (lang === 'es' ? 'Mostrar menos' : 'Show fewer') : (lang === 'es' ? `Ver las ${credentials.length} credenciales` : `View all ${credentials.length} credentials`) }} <span aria-hidden="true">{{ expanded ? '−' : '+' }}</span></button><a href="https://linkedin.com/in/obahamondem/details/certifications/" target="_blank" rel="noopener noreferrer">LinkedIn ↗</a></div>
  </div>
</template>
<style scoped>
.credentials-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem}.credential-card{padding:1.5rem;border:1px solid var(--border,#dce2ec);border-radius:22px;background:var(--surface,#fff);display:flex;flex-direction:column;transition:transform .25s,box-shadow .25s}.credential-card:hover{transform:translateY(-4px);box-shadow:0 14px 40px #052e5912}.credential-issuer{display:flex;gap:.75rem;align-items:center;font-size:.74rem;color:var(--muted,#5c6677)}.issuer-logo-chip{flex-shrink:0;width:84px;height:68px;border:1px solid #dce2ec;border-radius:12px;padding:8px;display:grid;place-items:center}.issuer-logo-chip img{width:auto;height:auto;max-width:68px;max-height:52px;object-fit:contain}.credential-card h3{font-size:1rem;line-height:1.5;letter-spacing:-.02em;margin:1.15rem 0 .65rem}.credential-date{font-size:.73rem;line-height:1.7;color:var(--muted,#5c6677);margin:0 0 1.2rem}.credential-card>a{font-size:.76rem;font-weight:600;margin-top:auto;align-self:flex-start;color:var(--accent,#3b61bd)}.credential-actions{display:flex;gap:1.5rem;align-items:center;justify-content:center;margin-top:1.75rem}.credential-actions button{font:inherit;font-size:.85rem;border:1px solid var(--border,#dce2ec);border-radius:99px;background:var(--surface,#fff);color:var(--text,#152133);padding:.85rem 1.25rem;cursor:pointer}.credential-actions>a{font-size:.8rem;color:var(--muted,#5c6677)}button:focus-visible,a:focus-visible{outline:3px solid #26c7c1;outline-offset:4px}.sr-only{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0,0,0,0)}
@media(max-width:850px){.credentials-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:540px){.credentials-grid{grid-template-columns:1fr}.credential-card{padding:1.2rem}}@media(prefers-reduced-motion:reduce){.credential-card{transition:none}.credential-card:hover{transform:none}}
</style>
