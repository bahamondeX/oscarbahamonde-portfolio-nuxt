<script setup lang="ts">
const {t}=useI18n(),localePath=useLocalePath(),head=useLocaleHead()
useHead(()=>({link:head.value.link,meta:head.value.meta}))
useSeoMeta({title:()=>`${t('privacy.title')} — Oscar Bahamonde`,description:()=>t('privacy.body')})
</script>
<template><SiteHeader /><main id="content" class="shell section blog-detail"><h1>{{ t('privacy.title') }}</h1><p v-for="key in ['body','providers','retention','booking','cookies']" :key="key">{{ t(`privacy.${key}`) }}</p><NuxtLink :to="localePath('/')" class="text-link">{{ t('common.back') }} →</NuxtLink></main><SiteFooter /><MacDock /></template>
