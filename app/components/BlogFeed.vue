<script setup lang="ts">
import { ArrowUpRight, ArrowDown } from 'lucide-vue-next'
const { locale } = useI18n(), localePath = useLocalePath(), localeTag = useLocaleTag(), page = ref(1)
const { data, status, error, refresh } = await useFetch('/api/blog', { query: { page } })
type Post = NonNullable<typeof data.value>['items'][number]
const posts = ref<Post[]>([])
watch(data, value => { if (value) posts.value = [...new Map([...posts.value, ...value.items].map(p => [p.id, p])).values()] }, { immediate: true })
const es = computed(() => locale.value === 'es')
const date = (value: string) => new Intl.DateTimeFormat(localeTag.value, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value))
</script>
<template>
  <div>
    <div v-if="posts.length" class="blog-grid">
      <article v-for="post in posts" :key="post.id" class="blog-card" :lang="post.language">
        <NuxtLink :to="localePath(`/blog/${post.slug}`)" tabindex="-1" aria-hidden="true">
          <NuxtImg v-if="post.image" :src="post.image" alt="" width="640" height="390" sizes="100vw md:50vw lg:33vw" format="webp" loading="lazy" class="blog-image" />
          <div v-else class="editorial-cover" aria-hidden="true"><span>{{ post.tags?.[0] || 'Engineering' }}</span><strong>{{ post.title }}</strong><small>Oscar Bahamonde · Medium</small></div>
        </NuxtLink>
        <div class="post-meta"><time :datetime="post.date">{{ date(post.date) }}</time><span>{{ post.language?.toUpperCase() }}</span><span v-if="post.readingMinutes">{{ post.readingMinutes }} min</span></div>
        <h3><NuxtLink :to="localePath(`/blog/${post.slug}`)">{{ post.title }}</NuxtLink></h3>
        <p>{{ post.excerpt }}</p>
        <div class="post-tags"><span v-for="tag in post.tags?.slice(0,3)" :key="tag">{{ tag }}</span></div>
        <a class="text-link" :href="post.url">{{ es ? 'Leer en Medium' : 'Read on Medium' }}<ArrowUpRight :size="16" /></a>
      </article>
    </div>
    <p v-else-if="status==='pending'" role="status">{{ es ? 'Cargando artículos…' : 'Loading articles…' }}</p>
    <div v-else class="empty-state"><p>{{ es ? 'Los artículos no están disponibles por ahora.' : 'Articles are unavailable right now.' }}</p><a class="button" href="https://medium.com/@obahamonde">Medium ↗</a></div>
    <div class="feed-footer">
      <p v-if="data?.stale" class="fineprint">{{ es ? 'Última copia disponible del feed.' : 'Last available feed snapshot.' }}</p>
      <p v-if="error" role="alert">{{ es ? 'No se pudo cargar esta página.' : 'This page could not be loaded.' }} <button class="text-link" @click="refresh()">{{ es ? 'Reintentar' : 'Retry' }}</button></p>
      <button v-if="data && page < data.pages" class="button" :disabled="status==='pending'" @click="page++">{{ es ? 'Cargar más artículos' : 'Load more articles' }}<ArrowDown :size="16" /></button>
      <p v-if="data" class="fineprint">{{ posts.length }} / {{ data.total }} · {{ es ? 'Artículos disponibles en el RSS' : 'Articles available in the RSS' }}</p>
    </div>
  </div>
</template>
<style scoped>
.post-meta{display:flex;align-items:center;gap:12px;margin:20px 0 12px;font-size:.72rem;color:var(--muted);letter-spacing:.03em}.post-meta span:first-of-type{border:1px solid var(--line);border-radius:5px;padding:2px 5px}.post-tags{display:flex;flex-wrap:wrap;gap:6px;margin:16px 0}.post-tags span{font-size:.65rem;border:1px solid var(--line);padding:4px 7px;border-radius:100px}.feed-footer{display:grid;justify-items:center;gap:14px;margin-top:36px}.editorial-cover{aspect-ratio:640/390;padding:28px;display:flex;flex-direction:column;justify-content:space-between;background:radial-gradient(ellipse at top right,#1b8498,transparent 70%),#102b3d;color:#fff;border-radius:16px;overflow:hidden}.editorial-cover>span{font-size:.7rem;text-transform:uppercase;letter-spacing:.12em;opacity:.8}.editorial-cover>strong{font-size:clamp(1.15rem,2vw,1.6rem);line-height:1.25;max-width:95%;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}.editorial-cover>small{font-size:.7rem;color:#bce3ed}.blog-card .post-meta time{margin:0}.blog-card .post-meta{color:var(--muted)}
</style>
