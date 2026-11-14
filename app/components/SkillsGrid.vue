<script setup lang="ts">
import groups from '../../data/skills.json'
const { locale } = useI18n()
const lang = computed(() => locale.value === 'en' ? 'en' : 'es')
</script>
<template><div class="skill-categories"><section v-for="group in groups" :key="group.id" class="skill-category" data-reveal><h3>{{ group.title[lang] }}</h3><ul><li v-for="skill in group.skills" :key="skill.name" class="skill-badge"><span class="skill-icon"><img :src="skill.icon" alt="" width="30" height="30" loading="lazy"></span><span>{{ skill.name }}</span></li></ul></section></div></template>
<style scoped>
.skill-categories{display:grid;grid-template-columns:repeat(2,1fr);gap:1.2rem;margin-top:3rem}.skill-category{padding:1.8rem;border:1px solid var(--border,#dce2ec);border-radius:24px;background:var(--surface,#fff)}.skill-category h3{font-size:1rem;letter-spacing:-.02em;margin:0 0 1.4rem}.skill-category ul{padding:0;margin:0;list-style:none;display:flex;flex-wrap:wrap;gap:.7rem}.skill-badge{display:flex;align-items:center;gap:.6rem;border:1px solid var(--border,#dce2ec);background:var(--bg,#f8faff);padding:.5rem .85rem .5rem .5rem;border-radius:12px;font-size:.78rem;transition:transform .25s,box-shadow .25s}.skill-badge:hover{transform:translateY(-3px);box-shadow:0 8px 24px #128aab12}.skill-icon{display:grid;place-items:center;width:38px;height:38px;background:#fff;border-radius:8px}.skill-icon img{object-fit:contain}@media(max-width:600px){.skill-categories{grid-template-columns:1fr}.skill-category{padding:1.3rem}}@media(prefers-reduced-motion:reduce){.skill-badge{transition:none}.skill-badge:hover{transform:none}}
</style>
