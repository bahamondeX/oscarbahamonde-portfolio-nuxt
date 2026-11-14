import { getMedium } from '../utils/medium'
import { servicePrompt } from '../../shared/services.mjs'
import es from '../../i18n/locales/es.json'
import en from '../../i18n/locales/en.json'
export default defineCachedEventHandler(async event => {
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  const { posts } = await getMedium()
  return [
    '# Oscar Bahamonde — complete site guide',
    '> Public professional information. Prices are starting estimates in Peruvian soles.', '',
    '## Perfil / Profile', es.bio.body, es.bio.body2, en.bio.body, en.bio.body2,
    '## Logros / Achievements', es.bio.achievement1 + ' · ' + es.bio.detail1,
    es.bio.achievement2 + ' · ' + es.bio.detail2, es.bio.speaker, '',
    '## Services', servicePrompt, '',
    '## Booking', 'S/20 · 30 minutes · Google Meet. Monday–Friday 09:00–13:00 and 14:00–17:00, America/Lima. A slot is held for 15 minutes; only verified MercadoPago payment confirms the appointment.',
    '- https://oscarbahamonde.com/es#contact', '- https://oscarbahamonde.com/en#contact', '',
    '## Sections', ...['es', 'en'].flatMap(lang => ['home', 'bio', 'experience', 'skills', 'projects', 'services', 'certifications', 'contact', 'blog'].map(section => `- https://oscarbahamonde.com/${lang}#${section}`)), '',
    '## Profiles', '- https://github.com/bahamondex', '- https://github.com/obahamonde', '- https://linkedin.com/in/obahamondem/', '- https://medium.com/@obahamonde', '- mailto:oscar.bahamonde.dev@gmail.com', '',
    '## Article excerpts', ...posts.flatMap(p => [
      `### ${p.title}`, `${p.date.slice(0, 10)} · ${p.language.toUpperCase()}${p.readingMinutes ? ` · ${p.readingMinutes} min` : ''}`,
      p.excerpt, `- https://oscarbahamonde.com/es/blog/${p.slug}`, `- https://oscarbahamonde.com/en/blog/${p.slug}`, `- Medium: ${p.mediumUrl}`, `- Original publication: ${p.url}`, '',
    ]),
    '## Privacy', '- https://oscarbahamonde.com/es/privacy', '- https://oscarbahamonde.com/en/privacy',
    'Private API routes, payment state and Calendar connections must not be indexed.', '',
  ].join('\n')
}, { maxAge: 1800, swr: true })
