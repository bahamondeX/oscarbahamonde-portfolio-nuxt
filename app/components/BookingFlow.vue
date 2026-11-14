<script setup lang="ts">
const localeTag = useLocaleTag()
const { t, locale } = useI18n()
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const date = ref(today), selected = ref(''), name = ref(''), email = ref(''), submitting = ref(false), message = ref('')
const { data, status, error, refresh } = await useFetch('/api/availability', { query: { date }, server: false, immediate: false, retry: 0 })
let observer: IntersectionObserver | undefined
onMounted(() => {
  observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) { refresh(); observer?.disconnect() }
  }, { rootMargin: '300px' })
  const element = document.querySelector('.booking-flow')
  if (element) observer.observe(element)
})
onBeforeUnmount(() => observer?.disconnect())
watch(date, () => { selected.value = ''; message.value = '' })
const time = (value: string) => new Intl.DateTimeFormat(localeTag.value, { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
async function checkout() {
  message.value = ''; submitting.value = true
  try { const result = await $fetch('/api/checkout', { method: 'POST', body: { start: selected.value, name: name.value, email: email.value } }); await navigateTo(result.url, { external: true }) }
  catch (e: any) { message.value = e.data?.message || t('booking.failed'); selected.value = ''; await refresh() }
  finally { submitting.value = false }
}
</script>
<template><div class="booking-flow"><p class="eyebrow">{{ t('booking.step1') }}</p><label for="meeting-date">{{ t('booking.date') }}</label><input id="meeting-date" v-model="date" type="date" :min="today" :disabled="submitting"><p v-if="status === 'pending'" role="status">{{ t('booking.checking') }}</p><div v-else-if="error" role="alert"><p>{{ t('booking.error') }}</p><button class="button" @click="refresh()">{{ t('common.retry') }}</button></div><p v-else-if="!data?.slots.length" role="status">{{ t('booking.empty') }}</p><fieldset v-else class="slot-list"><legend class="fineprint">{{ t('booking.slots') }}</legend><button v-for="slot in data.slots" :key="slot" type="button" class="slot" :class="{ selected: selected === slot }" :aria-pressed="selected === slot" :disabled="submitting" @click="selected = slot">{{ time(slot) }}</button></fieldset><form v-if="selected" @submit.prevent="checkout"><p class="eyebrow">{{ t('booking.step2') }}</p><p>{{ date }} · {{ time(selected) }} · 30 min</p><label for="meeting-name">{{ t('booking.name') }}</label><input id="meeting-name" v-model="name" required minlength="2" maxlength="100" autocomplete="name" :disabled="submitting"><label for="meeting-email">{{ t('booking.email') }}</label><input id="meeting-email" v-model="email" required type="email" maxlength="254" autocomplete="email" :disabled="submitting"><button class="button primary full" :disabled="submitting" type="submit">{{ submitting ? t('booking.processing') : t('booking.pay') }}</button></form><p v-if="message" role="alert">{{ message }}</p><p class="fineprint booking-note">{{ t('booking.note') }}</p></div></template>
