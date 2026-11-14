import { XMLParser } from 'fast-xml-parser'
const mediaHosts = new Set(['cdn-images-1.medium.com', 'miro.medium.com'])
// Medium publications in this author's verified RSS. Do not accept arbitrary external links.
const publicationHosts = new Set(['medium.com', 'www.medium.com', 'python.plainenglish.io', 'ai.plainenglish.io', 'blog.gopenai.com'])
const plain = text => String(text || '')
  .replace(/<(script|style|iframe)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim()
const cleanExcerpt = (html, title) => {
  let text = plain(html).replace(/^(?:Por|By)\s+Oscar(?: Martin)? Bahamonde(?: Muñoz)?\s*/i, '')
  if (text.toLowerCase().startsWith(title.toLowerCase())) text = text.slice(title.length).trim()
  text = text.replace(/^(?:Generated (?:by|via)|Art by)\s+[^.!?]{1,60}(?:[.!?]|(?=\sIntroduction))/i, '').trim()
  const words = text.split(/\s+/)
  return words.slice(0, 55).join(' ') + (words.length > 55 ? '…' : '')
}
const languageOf = text => {
  const es = (text.match(/\b(el|la|los|las|una|un|para|con|del|que|por|datos|pero|cómo|nuestro)\b/gi) || []).length
  const en = (text.match(/\b(the|and|with|for|this|that|from|your|our|will|have|are|which)\b/gi) || []).length
  return es > en ? 'es' : 'en'
}
// Existing persisted rows predate tags/language/reading metadata. Never invent a
// full-article reading time from their short excerpt when the RSS is unavailable.
export function completeMediumMetadata(post) {
  return { ...post,
    mediumUrl: post.mediumUrl || `https://medium.com/p/${post.id}`,
    tags: Array.isArray(post.tags) ? post.tags : [],
    language: ['es', 'en'].includes(post.language) ? post.language : languageOf(`${post.title} ${post.excerpt}`),
    readingMinutes: Number.isFinite(post.readingMinutes) && post.readingMinutes > 0 ? post.readingMinutes : null,
  }
}
export function parseMedium(xml) {
  if (xml.length > 2_000_000 || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('Invalid feed')
  const parsed = new XMLParser({ ignoreAttributes: false, processEntities: false }).parse(xml)
  let items = parsed?.rss?.channel?.item || []
  if (!Array.isArray(items)) items = [items]
  return items.flatMap(item => {
    try {
      const url = new URL(String(item.link))
      if (url.protocol !== 'https:' || !publicationHosts.has(url.hostname) || url.username || url.password) return []
      url.search = ''; url.hash = ''
      const guid = String(item.guid?.['#text'] || item.guid || '')
      const id = (guid || url.pathname).match(/[a-f0-9]{12}$/)?.[0]
      if (!id || !url.pathname.endsWith(id)) return []
      if (!['medium.com', 'www.medium.com'].includes(url.hostname) && !/^https:\/\/medium\.com\/p\/[a-f0-9]{12}$/.test(guid)) return []
      const title = plain(item.title).slice(0, 250), date = new Date(item.pubDate)
      if (!title || !Number.isFinite(date.getTime())) return []
      const html = String(item['content:encoded'] || item.description || '')
      let image = ''
      for (const match of html.matchAll(/<img\b([^>]+)>/gi)) {
        const attrs = match[1]
        if (/\b(?:width|height)=["']?1(?:["'\s]|$)/i.test(attrs)) continue
        const source = attrs.match(/\bsrc=["']([^"']+)/i)?.[1]
        if (!source) continue
        try { const u = new URL(source.replace(/&amp;/g, '&')); if (u.protocol === 'https:' && mediaHosts.has(u.hostname)) { image = u.href; break } } catch {}
      }
      const slug = title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) + '-' + id
      const categories = Array.isArray(item.category) ? item.category : item.category ? [item.category] : []
      return [{ id, slug, title, date: date.toISOString(), excerpt: cleanExcerpt(html, title), url: url.href,
        mediumUrl: `https://medium.com/p/${id}`, image,
        tags: categories.map(x => plain(x).slice(0, 60)).filter(Boolean).slice(0, 5),
        language: languageOf(title + ' ' + plain(html).slice(0, 1500)),
        readingMinutes: Math.max(1, Math.ceil(plain(html).split(/\s+/).filter(Boolean).length / 220)) }]
    } catch { return [] }
  }).sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
}
