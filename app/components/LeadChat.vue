<script setup lang="ts">
const panel = useAssistantPanel()
const { locale } = useI18n()
defineExpose({ focus: () => panel.open() })
</script>
<template><button class="button primary" @click="panel.open()">{{ locale === 'es' ? 'Hablar con el asistente' : 'Talk to the assistant' }}</button></template>
