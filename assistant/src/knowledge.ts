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
export const servicePriceMapping = Object.fromEntries((['es', 'en'] as const).map(locale => [
  locale, services.services.map(s => `${s[locale].title}: S/${s.from}`).join('; ') + (locale === 'es' ? '. Todos son precios desde.' : '. All are starting prices.') + ' ' + faqs[0]![locale].answer,
])) as Record<Locale, string>
