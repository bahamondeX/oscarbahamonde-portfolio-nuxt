<script setup lang="ts">
const props = defineProps<{ text: string }>()
// Escape every source character before adding our own allowlisted markup. Never render raw HTML.
function escape(text: string) { return text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!)) }
function inline(text: string) {
  return escape(text).replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]\n]+)\]\((https:\/\/[^\s)]+)\)/g, (_all, label, href) => {
      try { const url = new URL(href.replace(/&amp;/g, '&')); return `<a href="${escape(url.href)}" target="_blank" rel="noopener noreferrer">${label}</a>` } catch { return label }
    })
}
const html = computed(() => {
  let inCode = false, code: string[] = [], out: string[] = [], list = false
  const closeList = () => { if (list) { out.push('</ul>'); list = false } }
  for (const line of props.text.split('\n')) {
    if (/^```/.test(line)) { closeList(); if (inCode) { out.push('<pre><code>' + escape(code.join('\n')) + '</code></pre>'); code = [] }; inCode = !inCode; continue }
    if (inCode) { code.push(line); continue }
    if (/^\s*[-*]\s+/.test(line)) { if (!list) { out.push('<ul>'); list = true }; out.push('<li>' + inline(line.replace(/^\s*[-*]\s+/, '')) + '</li>'); continue }
    closeList()
    const heading = line.match(/^#{1,6}\s+(.+)/)
    if (heading) out.push('<p class="md-heading"><strong>' + inline(heading[1]!) + '</strong></p>')
    else if (line.trim()) out.push('<p>' + inline(line) + '</p>')
  }
  closeList(); if (inCode) out.push('<pre><code>' + escape(code.join('\n')) + '</code></pre>')
  return out.join('')
})
</script>
<template><div class="assistant-markdown" v-html="html" /></template>
<style scoped>
.assistant-markdown{overflow-wrap:anywhere;line-height:1.58}.assistant-markdown :deep(p){margin:.15em 0 .65em}.assistant-markdown :deep(p:last-child){margin-bottom:0}.assistant-markdown :deep(ul){margin:.5em 0;padding-left:1.3em}.assistant-markdown :deep(li){margin:.35em 0}.assistant-markdown :deep(a){color:var(--accent);text-decoration:underline}.assistant-markdown :deep(code){font: .85em ui-monospace,monospace;background:color-mix(in srgb,currentColor 8%,transparent);padding:.1em .3em;border-radius:4px}.assistant-markdown :deep(pre){max-width:100%;overflow:auto;padding:12px;background:color-mix(in srgb,currentColor 6%,transparent);border-radius:10px;white-space:pre-wrap}.assistant-markdown :deep(pre code){background:none;padding:0}.assistant-markdown :deep(.md-heading){margin-top:.8em}
</style>
