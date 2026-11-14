<script setup lang="ts">
import { Github, Linkedin, Mail, Sun, Moon, Languages, BookOpen } from 'lucide-vue-next'
const { t, locale, locales, setLocale } = useI18n()
const localePath = useLocalePath()
const colorMode = useColorMode()
async function changeLanguage() {
  const next = locales.value[(locales.value.findIndex(l => l.code === locale.value) + 1) % locales.value.length]
  if (next) await setLocale(next.code)
}
</script>
<template>
  <a class="skip" href="#content">{{ t('nav.skip') }}</a>
  <header class="topbar"><nav class="shell topbar-inner" :aria-label="t('nav.label')">
    <NuxtLink :to="localePath('/')" class="brand"><img src="/images/logo.webp" width="44" height="44" alt="ob Dev"><span>Oscar Bahamonde<span class="brand-sub">Software · Data · AI</span></span></NuxtLink>
    <div class="header-actions">
      <a class="icon-button secondary-social" href="https://github.com/bahamondex" aria-label="GitHub bahamondex"><Github :size="18" /></a>
      <a class="icon-button secondary-social" href="https://github.com/obahamonde" aria-label="ob · GitHub obahamonde"><span class="mono social-ob">ob</span></a>
      <a class="icon-button secondary-social" href="https://linkedin.com/in/obahamondem/" aria-label="LinkedIn"><Linkedin :size="18" /></a>
      <a class="icon-button secondary-social" href="mailto:oscar.bahamonde.dev@gmail.com" aria-label="Email"><Mail :size="18" /></a>
      <a class="icon-button secondary-social" href="https://medium.com/@obahamonde" aria-label="Medium"><BookOpen :size="18" /></a>
      <span class="header-divider" aria-hidden="true" />
      <button class="icon-button language-button" :aria-label="`${t('nav.language')} · ${locale.toUpperCase()}`" @click="changeLanguage"><Languages :size="16" /><span>{{ locale.toUpperCase() }}</span></button>
      <button class="icon-button theme-button" :aria-label="t('nav.theme')" @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'"><Sun class="sun-icon" :size="18" /><Moon class="moon-icon" :size="18" /></button>
    </div>
  </nav></header>
</template>
