import type { Locale } from './knowledge.js'

// This is an output accuracy check, not a topic filter. Keep technical prose and code;
// suppress monetary claims that have no source in the published catalog or visitor budget.
const amount = String.raw`\d+(?:[.,]\d+)*`
const currency = String.raw`(?:S\/\.?|PEN|US\$|USD|\$|EUR|€|GBP|£)`
const range = String.raw`(?:\s*(?:[–—-]|to\b|a\b)\s*(?:${currency}\s*)?${amount})?`
const moneyPattern = new RegExp(String.raw`${currency}\s*${amount}${range}|${amount}${range}\s*(?:PEN|USD|EUR|GBP|soles|d[oó]lares|dollars|euros)\b`, 'gi')
const categories: [number, RegExp][] = [
  [500, /landing(?:\s+page)?/gi],
  [1500, /CMS|contenido(?:\s+(?:con\s+panel|bajo\s+tu\s+control))?|content\s+(?:you\s+control|management|panel)|panel\s+de\s+administraci[oó]n|website\s+with\s+(?:an?\s+)?(?:admin\s+panel|content\s+panel|CMS)/gi],
  [3500, /e[ -]?commerce|comercio\s+electr[oó]nico/gi],
  [4500, /plataforma|platform|SaaS|PaaS/gi],
  [1500, /asistentes?\s+(?:de\s+)?IA|AI\s+assistants?|chatbots?/gi],
  [3500, /integraci[oó]n\s+de\s+sistemas|systems?\s+integration|sistemas\s+que\s+conversan|systems\s+that\s+talk/gi],
  [5000, /modernizaci[oó]n\s+(?:cloud|de\s+nube)|cloud\s+modernization/gi],
  [1800, /auditor[ií]a\s+de\s+datos|data\s+(?:platform\s+)?audit/gi],
  [1200, /infraestructura|infrastructure/gi],
  [20, /consulta|consultation|reuni[oó]n|\bcitas?\b|meeting|agendar|booking|30\s*(?:min|minute)/gi],
]
function value(raw: string) {
  const digits = raw.match(/\d+(?:[.,]\d+)*/)?.[0] || ''
  return Number(digits.replace(/[.,](?=\d{3}(?:\D|$))/g, '').replace(',', '.'))
}
function unit(raw: string) { return /S\/|PEN|soles/i.test(raw) ? 'PEN' : /EUR|€|euros/i.test(raw) ? 'EUR' : /GBP|£/i.test(raw) ? 'GBP' : 'USD' }
function isRange(raw: string) { return /\d\s*(?:[–—-]|to\b|a\b)/i.test(raw) }
function budgetBefore(prefix: string, visitor: boolean) {
  const pattern = visitor ? /(?:budget|presupuesto)([^.!?;\n]{0,80})$/i
    : /(?:(?:your|visitor.s|tu|su|del\s+visitante)\s+(?:stated\s+|provided\s+|indicado\s+)?(?:budget|presupuesto)|presupuesto\s+(?:que\s+indicaste|del\s+visitante))([^.!?;\n]{0,80})$/i
  const tail = prefix.match(pattern)?.[1]
  return tail !== undefined && !/\d/.test(tail) && categoryAt(tail, tail.length) === undefined
}
function categoryAt(text: string, position: number) {
  const matches = categories.flatMap(([price, pattern]) => [...text.matchAll(pattern)].map(m => ({
    price, length: m[0].length,
    distance: position < m.index! ? m.index! - position : Math.max(0, position - m.index! - m[0].length),
  })))
  return matches.sort((a, b) => a.distance - b.distance || b.length - a.length)[0]?.price
}

export function createPricingFilter(locale: Locale, visitorText: string) {
  const replacement = locale === 'en' ? 'pricing to verify' : 'tarifa por verificar'
  const visitorBudgets = [...visitorText.matchAll(moneyPattern)]
    .filter(m => !isRange(m[0]) && budgetBefore(visitorText.slice(0, m.index), true))
    .map(m => `${unit(m[0])}:${value(m[0])}`)
  let pending = '', context = visitorText, inFence = false
  let filteredAmounts = 0
  function line(raw: string) {
    // Code is data, not a price quotation. In particular preserve shell $1/$HOME.
    if (/^\s*(```|~~~)/.test(raw)) { inFence = !inFence; return raw }
    if (inFence) return raw
    const codeSpans = [...raw.matchAll(/`+[^`]*`+/g)].map(m => [m.index!, m.index! + m[0].length])
    const cleaned = raw.replace(moneyPattern, (claim: string, offset: number) => {
      if (codeSpans.some(([start, end]) => offset >= start && offset < end)) return claim
      const budgetContext = budgetBefore(raw.slice(0, offset), false)
      const knownBudget = budgetContext && visitorBudgets.includes(`${unit(claim)}:${value(claim)}`)
      const recurring = /(?:\/\s*(?:mo(?:nth)?|mes|hr?|hour|token|query)\b|per\s+(?:month|hour|token|query)|al\s+mes|mensual|por\s+(?:mes|hora|token))/i.test(raw)
      const category = categoryAt(raw, offset) ?? categoryAt(context, context.length)
      if (!isRange(claim) && (knownBudget || (unit(claim) === 'PEN' && !recurring && category === value(claim)))) return claim
      filteredAmounts++
      return replacement
    })
    // Carry headings/introductory lines across a Markdown price on the next line.
    // Never learn a price category from rejected monetary claims.
    if (raw.trim() && categoryAt(raw, raw.length) !== undefined && !moneyPattern.test(raw)) context = raw
    moneyPattern.lastIndex = 0
    return cleaned
  }
  return {
    push(chunk: string) {
      pending += chunk
      let output = '', end: number
      // Buffer complete lines: a currency symbol/amount split across provider deltas
      // must never reach the client before its context is validated.
      while ((end = pending.indexOf('\n')) !== -1) {
        output += line(pending.slice(0, end + 1)); pending = pending.slice(end + 1)
      }
      return output
    },
    finish() { const output = pending ? line(pending) : ''; pending = ''; return output },
    get filteredAmounts() { return filteredAmounts },
  }
}

export function sanitizePricing(text: string, locale: Locale, visitorText: string) {
  const filter = createPricingFilter(locale, visitorText)
  const answer = filter.push(text) + filter.finish()
  return { answer, filteredAmounts: filter.filteredAmounts }
}
