import services from '../../knowledge/services.json' with { type: 'json' }
import profile from '../../knowledge/profile.json' with { type: 'json' }
import experience from '../../knowledge/experience.json' with { type: 'json' }
import certifications from '../../knowledge/certifications.json' with { type: 'json' }
import skills from '../../knowledge/skills.json' with { type: 'json' }
import process from '../../knowledge/process.json' with { type: 'json' }
import faqs from '../../knowledge/faqs.json' with { type: 'json' }
import projects from '../../knowledge/projects.json' with { type: 'json' }
import type { Locale } from './knowledge.js'

export type FactRecord = { id: string; type: 'service' | 'employment' | 'certification' | 'profile' | 'skills' | 'process' | 'faq' | 'project'; source: string; locale: Locale; content: Record<string, unknown> }
// Each source unit is indivisible: a price retains its scope and a date its employer/credential.
export function allFactRecords(locale: Locale): FactRecord[] {
  return [
    ...services.services.map(s => ({ id: `service:${s.id}`, type: 'service' as const, source: `knowledge/services.json#${s.id}`, locale,
      content: { title: s[locale].title, startingPricePEN: s.from, currency: services.currency, scope: s[locale].scope, delivery: s[locale].delivery, conditions: services.conditions[locale] } })),
    ...experience.entries.map(e => ({ id: `employment:${e.id}`, type: 'employment' as const, source: e.sources[0] || 'knowledge/experience.json', locale,
      content: { company: e.company, role: e.role[locale], start: e.start, end: e.end, employmentStatus: e.end ? 'ended' : e.current ? 'current' : 'unverified', current: e.current, location: e.location, description: e.description[locale], stack: e.stack, verification: e.verification } })),
    ...certifications.entries.map(c => ({ id: `certification:${c.id}`, type: 'certification' as const, source: c.verificationUrl || c.source, locale,
      content: { name: c.name, issuer: c.issuer, issued: c.date, expires: c.expires, verificationUrl: c.verificationUrl } })),
    { id: 'profile:overview', type: 'profile' as const, source: 'knowledge/profile.json', locale,
      content: { name: profile.name, location: profile.location, roles: profile.roles, bio: profile.bio[locale], achievements: profile.achievements.map(a => ({ text: a[locale], source: a.source })), profiles: profile.profiles, unknown: profile.unknown } },
    ...skills.groups.map(g => ({ id: `skills:${g.id}`, type: 'skills' as const, source: `knowledge/skills.json#${g.id}`, locale,
      content: { category: g.title[locale], skills: g.skills.map(s => s.name) } })),
    { id: 'process:workflow', type: 'process' as const, source: 'knowledge/process.json', locale,
      content: { status: process.status, steps: process.steps[locale], rules: process.rules } },
    ...faqs.map((f, i) => ({ id: `faq:${i}`, type: 'faq' as const, source: `knowledge/faqs.json#${i}`, locale, content: { question: f.question, answer: f[locale].answer } })),
    ...projects.map(p => ({ id: `project:${p.id}`, type: 'project' as const, source: p.source, locale,
      content: { name: p.name, description: p.description[locale], impact: p.impact[locale], stack: p.stack, demo: p.demo, repo: p.repo } })),
  ]
}
const aliases: Record<string, string[]> = {
  'service:landing': ['landing', 'landing page', 'pagina de aterrizaje', 'pagina promocional', 'one page', 'micrositio', 'microsite'],
  'service:content': ['cms', 'content management', 'editorial', 'contenido con panel', 'panel de administracion', 'admin panel', 'editar contenido', 'editar textos', 'administrar contenido', 'content website'],
  'service:commerce': ['ecommerce', 'e commerce', 'tienda online', 'tienda virtual', 'online store', 'online shop', 'carrito', 'shopping cart', 'checkout', 'catalogo'],
  'service:custom': ['plataforma', 'platform', 'saas', 'paas', 'mvp', 'producto digital', 'digital product', 'aplicacion web', 'web application'],
  'service:ai': ['asistente ia', 'asistente virtual', 'ai assistant', 'chatbot', 'chat bot', 'asistente inteligencia artificial', 'agente conversacional', 'conversational agent'],
  'service:integration': ['integracion de sistemas', 'systems integration', 'system integration', 'conectar sistemas', 'conectar apis', 'connect systems', 'connect apis', 'api integration', 'sistemas aislados', 'sistemas que conversan'],
  'service:cloud': ['modernizacion cloud', 'cloud modernization', 'migracion cloud', 'migracion nube', 'cloud migration', 'modernizar legacy', 'migrar legacy', 'modernize legacy', 'migrate legacy', 'on premise'],
  'service:data': ['auditoria de datos', 'data audit', 'data platform audit', 'auditar datos', 'revisar pipelines', 'pipeline review', 'calidad de datos', 'data quality'],
  'service:infra': ['infraestructura', 'infrastructure', 'optimizar infraestructura', 'infrastructure optimization', 'reducir costo cloud', 'cloud cost review', 'revision cloud', 'cloud review', 'reliability review'],
  'profile:overview': ['biografia', 'biography', 'quien es oscar', 'who is oscar', 'perfil', 'profile', 'logros', 'achievements', 'pucp', 'hackathon'],
  'process:workflow': ['proceso de trabajo', 'work process', 'working process', 'como trabaja', 'how does he work', 'alcance', 'discovery', 'entrega', 'delivery process'],
  'faq:0': ['agendar', 'reservar', 'cita', 'reunion', 'meet', 'booking', 'schedule', 'availability', 'disponibilidad', 'horario', 'pago', 'payment', 'mercadopago'],
  'faq:1': ['consentimiento', 'consent', 'privacidad', 'privacy', 'datos personales', 'personal information'],
  'faq:2': ['descuento', 'discount', 'cotizacion', 'quote', 'precio final', 'final price', 'plazo', 'deadline', 'garantia', 'guarantee'],
}
const stop = new Set('a al algo an and are as at by can con cual cuando cuanto cuesta de del does el en es for from he how i in is it la las lo los me mi much of on or para por que se su the to tu un una what when which with y you your oscar'.split(' '))
const norm = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const tokens = (value: string) => [...new Set(norm(value).split(/\s+/).filter(t => t.length > 1 && !stop.has(t)))]
function near(a: string, b: string): boolean {
  if (a === b) return true
  if (Math.min(a.length, b.length) < 4 || Math.abs(a.length - b.length) > 1) return false
  if (a.length === b.length) {
    const differing = [...a].map((c, i) => c === b[i] ? -1 : i).filter(i => i >= 0)
    return differing.length === 1 || (differing.length === 2 && differing[1] === differing[0]! + 1 && a[differing[0]!] === b[differing[1]!] && a[differing[1]!] === b[differing[0]!])
  }
  const [short, long] = a.length < b.length ? [a, b] : [b, a]
  let skipped = false, i = 0, j = 0
  while (i < short.length && j < long.length) {
    if (short[i] === long[j]) { i++; j++ }
    else if (skipped) return false
    else { skipped = true; j++ }
  }
  return true
}
const indexes = Object.fromEntries((['es', 'en'] as const).map(locale => [locale, allFactRecords(locale).map(record => {
  const c = record.content
  const label = [c.title, c.company, c.name, c.issuer, c.category].filter(Boolean).join(' ')
  return { record, label: norm(label), labelTokens: tokens(label), bodyTokens: tokens(JSON.stringify(c)), aliases: (aliases[record.id] || []).map(norm) }
})])) as Record<Locale, { record: FactRecord; label: string; labelTokens: string[]; bodyTokens: string[]; aliases: string[] }[]>

// Reproducible lexical retrieval for a small versioned corpus, not live technical documentation.
export function retrieveFacts(query: string, locale: Locale, limit = 8): FactRecord[] {
  const normalized = norm(query.slice(0, 12000)), queryTokens = tokens(normalized)
  const wantsCredentials = /certific|credential|credencial/.test(normalized)
  const wantsWork = /experien|trabaj|career|employ|puesto|cargo|trayector/.test(normalized)
  const wantsSkills = /skills|habilidad|tecnologia|technology|technologies|stack|herramienta/.test(normalized)
  const wantsServices = /servicio|service|precio|price|cost|cuesta|presupuesto|budget/.test(normalized)
  return indexes[locale].map(({ record, label, labelTokens, bodyTokens, aliases: terms }) => {
    let score = queryTokens.reduce((n, t) => n + (labelTokens.includes(t) ? 12 : labelTokens.some(w => near(t, w)) ? 8 : bodyTokens.includes(t) ? 1 : 0), 0)
    if (label.length > 2 && normalized.includes(label)) score += 40
    for (const term of terms) {
      if (` ${normalized} `.includes(` ${term} `)) score += 30 + term.split(' ').length * 4
      else {
        const terms = tokens(term)
        if (terms.length && terms.every(t => queryTokens.some(q => near(t, q)))) score += 20 + terms.length * 3
      }
    }
    if (record.type === 'certification' && wantsCredentials) score += 20
    if (record.type === 'employment' && wantsWork) score += 15
    if (record.type === 'skills' && wantsSkills) score += 15
    if (record.type === 'service' && wantsServices) score += 100
    return { record, score }
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score || a.record.id.localeCompare(b.record.id))
    .slice(0, Math.max(0, Math.min(100, Math.floor(limit)))).map(x => x.record)
}
