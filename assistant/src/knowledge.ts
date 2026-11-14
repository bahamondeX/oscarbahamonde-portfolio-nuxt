import services from '../../knowledge/services.json' with { type: 'json' }
import profile from '../../knowledge/profile.json' with { type: 'json' }
import experience from '../../knowledge/experience.json' with { type: 'json' }
import skills from '../../knowledge/skills.json' with { type: 'json' }
import projects from '../../knowledge/projects.json' with { type: 'json' }
import certifications from '../../knowledge/certifications.json' with { type: 'json' }
import posts from '../../knowledge/posts.json' with { type: 'json' }
import process from '../../knowledge/process.json' with { type: 'json' }
import faqs from '../../knowledge/faqs.json' with { type: 'json' }
export type Locale = 'es' | 'en'
// Keep the versioned source intact. Project only conversational facts in the visitor's language.
export function projectKnowledge(locale: Locale) {
  return {
    profile: {
      name: profile.name, location: profile.location, roles: profile.roles, bio: profile.bio[locale],
      achievements: profile.achievements.map(a => a[locale]), profiles: profile.profiles, unknown: profile.unknown,
      currentEmployer: experience.entries.find(e => e.current && !e.end)?.company || null,
    },
    experience: experience.entries.map(e => ({
      company: e.company, role: e.role[locale], start: e.start, end: e.end,
      employmentStatus: e.end ? 'ended' : e.current ? 'current' : 'unverified',
      location: e.location, description: e.description[locale], stack: e.stack,
    })),
    experienceSource: 'https://linkedin.com/in/obahamondem/details/experience/',
    skills: skills.groups.map(g => ({ category: g.title[locale], skills: g.skills.map(s => s.name) })),
    certifications: certifications.entries.map(c => ({
      name: c.name, issuer: c.issuer, issued: c.date, expires: c.expires, verificationUrl: c.verificationUrl,
    })),
    projects: projects.map(p => ({
      name: p.name, description: p.description[locale], impact: p.impact[locale], stack: p.stack, demo: p.demo, repo: p.repo,
    })),
    services: services.services.map(s => ({ id: s.id, title: s[locale].title, startingPricePEN: s.from, scope: s[locale].scope, delivery: s[locale].delivery })),
    pricingConditions: services.conditions[locale],
    posts: posts.map(p => ({ title: p.title, url: p.url, language: p.language })),
    workProcess: process.steps[locale],
    faqs,
  }
}
// Two stable prefixes per cold start; no duplicate bilingual descriptions, UI metadata or RSS excerpts.
export const knowledgeContexts: Record<Locale, string> = {
  es: JSON.stringify(projectKnowledge('es')),
  en: JSON.stringify(projectKnowledge('en')),
}
export const servicePriceMapping: Record<Locale, string> = {
  es: 'Landing S/500; Contenido con panel S/1500; E-commerce S/3500; Plataforma/MVP SaaS S/4500; Asistentes de IA S/1500; Integración de sistemas S/3500; Modernización cloud S/5000; Auditoría de datos S/1800; Infraestructura S/1200. Todos son precios desde. Consulta de 30 min S/20.',
  en: 'Landing page S/500; Website with CMS S/1500; E-commerce S/3500; Platform/SaaS MVP S/4500; AI assistant S/1500; Systems integration S/3500; Cloud modernization S/5000; Data audit S/1800; Infrastructure review S/1200. All are starting prices. 30-minute consultation S/20.',
}
