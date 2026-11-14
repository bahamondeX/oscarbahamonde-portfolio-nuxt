<script setup lang="ts">
const localeTag = useLocaleTag()
const { t, locale } = useI18n(), route = useRoute(), localePath = useLocalePath(), head = useLocaleHead()
const { data: post, error } = await useFetch(`/api/blog/${route.params.slug}`)
if (error.value || !post.value) throw createError({ statusCode: 404, statusMessage: 'Article not found' })
const pageUrl = computed(() => `https://oscarbahamonde.com/${locale.value}/blog/${post.value!.slug}`)
const cover = computed(() => post.value!.image || 'https://oscarbahamonde.com/images/og.png')
useHead(() => ({ htmlAttrs: head.value.htmlAttrs, link: head.value.link, meta: head.value.meta, script: [{ type: 'application/ld+json', innerHTML: JSON.stringify({
  '@context': 'https://schema.org', '@graph': [
    { '@type': 'BlogPosting', headline: post.value!.title, datePublished: post.value!.date, dateModified: post.value!.date,
      description: post.value!.excerpt, image: cover.value, inLanguage: post.value!.language,
      author: { '@type': 'Person', name: 'Oscar Bahamonde', url: 'https://oscarbahamonde.com' },
      isBasedOn: post.value!.url, url: pageUrl.value, mainEntityOfPage: pageUrl.value },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: t('nav.home'), item: `https://oscarbahamonde.com/${locale.value}` },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `https://oscarbahamonde.com/${locale.value}#blog` },
      { '@type': 'ListItem', position: 3, name: post.value!.title, item: pageUrl.value },
    ] },
  ],
}).replace(/</g, '\\u003c') }] }))
useSeoMeta({ title: () => `${post.value!.title} — Oscar Bahamonde`, description: () => post.value!.excerpt,
  ogTitle: () => post.value!.title, ogDescription: () => post.value!.excerpt, ogImage: () => cover.value,
  ogType: 'article', twitterImage: () => cover.value, twitterCard: 'summary_large_image' })
</script>
<template>
  <SiteHeader />
  <main v-if="post" id="content" class="shell section blog-detail">
    <NuxtLink :to="`${localePath('/')}#blog`" class="text-link">← {{ t('nav.blog') }}</NuxtLink>
    <p class="eyebrow">{{ t('blog.excerpt') }} · Medium · {{ post.language.toUpperCase() }}</p>
    <h1 :lang="post.language">{{ post.title }}</h1>
    <div class="article-meta"><time :datetime="post.date">{{ new Intl.DateTimeFormat(localeTag, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(post.date)) }}</time><span v-if="post.readingMinutes">{{ post.readingMinutes }} min</span></div>
    <NuxtImg v-if="post.image" :src="post.image" :alt="post.title" width="960" height="540" sizes="100vw lg:960px" format="webp" />
    <p :lang="post.language">{{ post.excerpt }}</p>
    <div class="article-tags"><span v-for="tag in post.tags" :key="tag">{{ tag }}</span></div>
    <a :href="post.url" class="button primary">{{ t('common.original') }} ↗</a>
  </main>
  <SiteFooter /><MacDock />
</template>
<style scoped>
.article-meta{display:flex;gap:20px;align-items:center;color:var(--muted);margin:20px 0}.article-tags{display:flex;flex-wrap:wrap;gap:8px;margin:24px 0}.article-tags span{padding:5px 10px;border:1px solid var(--line);border-radius:100px;font-size:.8rem}
</style>
