<script setup lang="ts">
import { House, UserRound, BriefcaseBusiness, Blocks, FolderCode, Sparkles, Award, MessageCircle, BookOpen } from 'lucide-vue-next'
const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const items = [
  { id: 'home', icon: House }, { id: 'bio', icon: UserRound }, { id: 'experience', icon: BriefcaseBusiness },
  { id: 'skills', icon: Blocks }, { id: 'projects', icon: FolderCode }, { id: 'services', icon: Sparkles },
  { id: 'certifications', icon: Award }, { id: 'contact', icon: MessageCircle }, { id: 'blog', icon: BookOpen }
]
const active = useState('active-section', () => 'home')
const scales = ref(items.map(() => 1)), bounced = ref('')
const links = ref<HTMLElement[]>([])
let timeout: ReturnType<typeof setTimeout> | undefined
function magnify(event: PointerEvent) {
  if (event.pointerType !== 'mouse' || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  scales.value = links.value.map(el => {
    const rect = el.getBoundingClientRect()
    const distance = Math.abs(event.clientX - (rect.left + rect.width / 2))
    return 1 + 0.45 * Math.max(0, Math.cos(Math.min(distance / 120, 1) * Math.PI / 2)) ** 2
  })
}
function bounce(id: string) { bounced.value = id; clearTimeout(timeout); timeout = setTimeout(() => { bounced.value = '' }, 450) }
onBeforeUnmount(() => clearTimeout(timeout))
</script>
<template>
  <nav class="dock-wrap" :aria-label="t('nav.label')"><ul class="dock" @pointermove="magnify" @pointerleave="scales = items.map(() => 1)">
    <li v-for="(item, i) in items" :key="item.id" :ref="el => { if (el) links[i] = el as HTMLElement }" class="dock-item" :style="{ '--magnify': scales[i] }">
      <NuxtLink :to="`${localePath('/')}#${item.id}`" :aria-label="t(`nav.${item.id}`)" :aria-current="active === item.id && !route.params.slug ? 'location' : undefined" :class="['dock-link', `dock-${item.id}`, { bounce: bounced === item.id }]" @click="bounce(item.id)">
        <component :is="item.icon" :size="25" :stroke-width="1.7" aria-hidden="true" /><span class="dock-tooltip">{{ t(`nav.${item.id}`) }}</span>
      </NuxtLink><span class="dock-dot" :class="{ active: active === item.id }" aria-hidden="true" />
    </li>
  </ul></nav>
</template>
