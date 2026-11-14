<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
</script>
<template><footer class="footer shell"><div><span class="footer-name">Oscar Bahamonde<span class="accent-dot">.</span></span><p>{{ t('footer.line') }}</p></div><div class="footer-bottom"><small>© {{ new Date().getFullYear() }} {{ t('footer.rights') }}</small><NuxtLink :to="localePath('/privacy')">{{ t('footer.privacy') }}</NuxtLink><a href="https://medium.com/@obahamonde">Medium ↗</a><a href="mailto:oscar.bahamonde.dev@gmail.com">Email ↗</a></div></footer></template>
