<script setup lang="ts">
import { ArrowUpRight, ArrowRight, ArrowDown, Check, Mic2, Trophy, GraduationCap, CalendarDays, Bot, Sparkles } from 'lucide-vue-next'
import { services } from '#shared/services.mjs'
const { t, locale } = useI18n()
const localeTag = useLocaleTag()
const head = useLocaleHead()
const assistant = useAssistantPanel()
useHead(() => ({ htmlAttrs: head.value.htmlAttrs, link: head.value.link, meta: head.value.meta }))
useSeoMeta({ title: () => t('seo.title'), description: () => t('seo.description'), ogTitle: () => t('seo.title'), ogDescription: () => t('seo.description'), ogType: 'website', ogImage: 'https://oscarbahamonde.com/images/og.png', twitterImage: 'https://oscarbahamonde.com/images/og.png', twitterCard: 'summary_large_image' })
useHead({ script: [{ type: 'application/ld+json', innerHTML: JSON.stringify({ '@context': 'https://schema.org', '@graph': [
  { '@type': 'Person', '@id': 'https://oscarbahamonde.com/#oscar', name: 'Oscar Bahamonde', jobTitle: 'Software Engineer', url: 'https://oscarbahamonde.com', image: 'https://oscarbahamonde.com/images/oscar-portrait.jpg', sameAs: ['https://github.com/bahamondex', 'https://github.com/obahamonde', 'https://linkedin.com/in/obahamondem/', 'https://medium.com/@obahamonde'] },
  ...services.map(s => ({ '@type': 'Service', name: s.id, provider: { '@id': 'https://oscarbahamonde.com/#oscar' }, offers: { '@type': 'Offer', priceCurrency: 'PEN', price: s.price, description: 'Starting estimate. Final scope quoted separately.' } }))
] }) }] })
useSectionMotion()
const price = (n: number) => `S/${new Intl.NumberFormat(localeTag.value).format(n)}`
function openChat(service?: string) { assistant.open(service) }
</script>
<template>
  <SiteHeader />
  <main id="content">
    <div class="hero-stage">
      <div class="hero-atmosphere" aria-hidden="true"><i class="aurora aurora-one" /><i class="aurora aurora-two" /><div class="hero-grid" /></div>
      <section id="home" data-section class="hero shell">
        <div class="hero-copy">
          <p class="eyebrow"><span class="status-dot" />{{ t('hero.eyebrow') }}</p>
          <h1>{{ t('hero.line1') }}<br><span>{{ t('hero.line2') }}</span></h1>
          <p class="hero-intro">{{ t('hero.intro') }}</p>
          <div class="actions"><a class="button primary magnetic" href="#contact">{{ t('hero.cta') }}<ArrowUpRight :size="18" /></a><a class="text-link" href="#projects">{{ t('hero.work') }}<ArrowRight :size="18" /></a></div>
          <p class="hero-note">{{ t('hero.note') }}</p>
        </div>
        <div class="hero-visual">
          <div class="portrait-halo" aria-hidden="true" /><div class="portrait-ring" aria-hidden="true" />
          <figure class="hero-portrait"><NuxtPicture src="/images/oscar-portrait.jpg" :alt="t('hero.photo')" width="620" height="760" sizes="88vw md:44vw lg:520px" format="avif,webp" :quality="60" fit="cover" :preload="{ fetchPriority: 'high' }" loading="eager" :img-attrs="{ fetchpriority: 'high', decoding: 'async' }" /><figcaption><span class="mono">{{ t('hero.pill') }}</span><span>{{ t('hero.caption') }}</span></figcaption></figure>
          <div class="hero-signal" aria-hidden="true"><Sparkles :size="17" /><span>SOFTWARE<br><strong>WITH PURPOSE.</strong></span></div>
          <span class="hero-coordinate mono" aria-hidden="true">LIMA, PE ↗ WORLDWIDE</span>
        </div>
        <a class="hero-scroll" href="#bio"><span><ArrowDown :size="16" /></span>{{ t('hero.scroll') }}</a>
        <div class="hero-index mono" aria-hidden="true">01 — 09</div>
      </section>
    </div>
    <div class="trust-strip"><div class="shell"><span>{{ t('experience.trust') }}</span><strong>Globant</strong><strong>Dynata</strong><strong>Pronti AI</strong><strong>Huawei</strong><strong>Telefónica</strong></div></div>
    <section id="bio" data-section class="section shell bio-section">
      <div data-reveal class="numbered-heading" data-number="01"><p class="eyebrow">{{ t('bio.eyebrow') }}</p><h2>{{ t('bio.title') }}<br><span>{{ t('bio.accent') }}</span></h2><p class="body-copy">{{ t('bio.body') }}</p><p class="body-copy muted">{{ t('bio.body2') }}</p><a class="text-link" href="https://linkedin.com/in/obahamondem/">{{ t('bio.profile') }}<ArrowUpRight :size="17" /></a></div>
      <div class="bio-aside spotlight-card" data-reveal><div class="bio-profile-row"><div class="bio-photo"><NuxtImg src="/images/oscar-portrait.jpg" :alt="t('hero.photo')" width="128" height="128" format="webp" loading="lazy" /></div><span class="bio-monogram" aria-hidden="true">ob<span>↗</span></span></div><article class="achievement"><GraduationCap :size="24" /><div><h3>{{ t('bio.achievement1') }}</h3><p>{{ t('bio.detail1') }}</p></div></article><article class="achievement"><Trophy :size="24" /><div><h3>{{ t('bio.achievement2') }}</h3><p>{{ t('bio.detail2') }}</p></div></article><div class="achievement-metric" aria-hidden="true"><strong><span data-counter="50">50</span>+</strong><span>{{ locale === 'es' ? 'equipos · hackathon 2023' : 'teams · hackathon 2023' }}</span></div><div class="speaker"><Mic2 :size="18" />{{ t('bio.speaker') }}</div></div>
    </section>
    <section id="experience" data-section class="section section-tint"><div class="shell"><div class="section-heading numbered-heading" data-number="02" data-reveal><div><p class="eyebrow">{{ t('experience.eyebrow') }}</p><h2>{{ t('experience.title') }}<br><span>{{ t('experience.accent') }}</span></h2></div><p>{{ t('experience.intro') }}</p></div><ExperienceTimeline /><a class="text-link" href="https://linkedin.com/in/obahamondem/">{{ t('experience.more') }}<ArrowUpRight :size="17" /></a></div></section>
    <section id="skills" data-section class="section shell"><div class="section-heading numbered-heading" data-number="03" data-reveal><div><p class="eyebrow">{{ t('skills.eyebrow') }}</p><h2>{{ t('skills.title') }}<br><span>{{ t('skills.accent') }}</span></h2></div><p>{{ t('skills.intro') }}</p></div><SkillsGrid /></section>
    <section id="projects" data-section class="section section-projects"><div class="shell"><div class="section-heading numbered-heading" data-number="04" data-reveal><div><p class="eyebrow">{{ t('projects.eyebrow') }}</p><h2>{{ t('projects.title') }}<br><span>{{ t('projects.accent') }}</span></h2></div><span class="section-kicker mono">IDEA → SYSTEM → IMPACT</span></div><ProjectShowcase /></div></section>
    <section id="services" data-section class="section section-tint"><div class="shell"><div class="section-heading numbered-heading" data-number="05" data-reveal><div><p class="eyebrow">{{ t('services.eyebrow') }}</p><h2>{{ t('services.title') }}<br><span>{{ t('services.accent') }}</span></h2></div><p>{{ t('services.intro') }}</p></div><div v-for="group in ['web', 'automation', 'audit']" :key="group" class="service-group"><h3 class="group-title">{{ t(`services.${group}`) }}</h3><div class="service-grid"><article v-for="s in services.filter(x => x.group === group)" :key="s.id" class="service-card spotlight-card" data-reveal><h4>{{ t(`services.${s.id}.title`) }}</h4><p>{{ t(`services.${s.id}.scope`) }}</p><p class="delivery"><Check :size="16" />{{ t(`services.${s.id}.delivery`) }}</p><div class="service-price"><small>{{ t('common.from') }}</small>{{ price(s.price) }}</div><button type="button" class="service-cta" @click="openChat(t(`services.${s.id}.title`))">{{ t('services.cta') }}<ArrowUpRight :size="17" /></button></article></div></div><p class="fineprint service-note">{{ t('services.note') }}</p></div></section>
    <section id="certifications" data-section class="section shell credential-section"><div class="section-heading numbered-heading" data-number="06" data-reveal><div><p class="eyebrow">{{ t('certifications.eyebrow') }}</p><h2>{{ t('certifications.title') }}<br><span>{{ t('certifications.accent') }}</span></h2></div><p>{{ t('certifications.body') }}</p></div><CredentialsGrid /><a class="text-link" href="https://linkedin.com/in/obahamondem/details/certifications/">{{ t('certifications.cta') }}<ArrowUpRight :size="17" /></a></section>
    <section id="blog" data-section class="section shell"><div class="section-heading numbered-heading" data-number="07" data-reveal><div><p class="eyebrow">{{ t('blog.eyebrow') }}</p><h2>{{ t('blog.title') }}<br><span>{{ t('blog.accent') }}</span></h2></div><p>{{ t('blog.intro') }}</p></div><BlogFeed /></section>
    <section id="contact" data-section class="section section-tint contact-section"><div class="shell"><div class="section-heading numbered-heading" data-number="08" data-reveal><div><p class="eyebrow">{{ t('contact.eyebrow') }}</p><h2>{{ t('contact.title') }}<br><span>{{ t('contact.accent') }}</span></h2></div><p>{{ t('contact.intro') }}</p></div><div class="contact-grid"><div class="assistant-invitation spotlight-card"><div class="invitation-orbit" aria-hidden="true"><Bot :size="58" :stroke-width="1.3" /><span>AI</span></div><p class="eyebrow">{{ locale === 'es' ? 'UNA IDEA ES UN BUEN COMIENZO' : 'AN IDEA IS A GOOD START' }}</p><h3>{{ locale === 'es' ? 'Conversemos sobre lo que viene.' : 'Let’s talk about what’s next.' }}</h3><p>{{ locale === 'es' ? 'Explora servicios, tecnologías y posibilidades con mi asistente de IA. A tu ritmo, en tu idioma.' : 'Explore services, technologies and possibilities with my AI assistant. At your pace, in your language.' }}</p><button class="button primary magnetic" type="button" @click="openChat()">{{ locale === 'es' ? 'Hablar con el asistente' : 'Talk to the assistant' }}<ArrowUpRight :size="18" /></button><span class="fineprint">{{ locale === 'es' ? 'O reserva una conversación conmigo.' : 'Or book a conversation with me.' }}</span></div><article class="booking-card"><div class="booking-heading"><CalendarDays :size="24" /><span class="mono">1:1 / CONSULTING</span></div><h3>{{ t('contact.meeting') }}</h3><div class="booking-price">S/20<span>{{ t('contact.duration') }}</span></div><p class="fineprint">{{ t('contact.schedule') }}</p><BookingFlow /></article></div><div class="contact-social"><span>{{ t('contact.email') }}</span><a href="mailto:oscar.bahamonde.dev@gmail.com">oscar.bahamonde.dev@gmail.com <ArrowUpRight :size="16" /></a><a href="https://github.com/bahamondex">GitHub bahamondex</a><a href="https://github.com/obahamonde">GitHub obahamonde</a><a href="https://linkedin.com/in/obahamondem/">LinkedIn</a><a href="https://medium.com/@obahamonde">Medium</a></div></div></section>
  </main>
  <SiteFooter /><MacDock />
</template>
