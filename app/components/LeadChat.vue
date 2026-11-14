<script setup lang="ts">
const config = useRuntimeConfig()
const chat = ref<{ focus: () => void }>()
defineExpose({ focus: () => chat.value?.focus() })
</script>
<template>
  <BedrockChat v-if="config.public.assistantUrl" ref="chat" /><LegacyLeadChat v-else ref="chat" />
</template>
