const defaultLocale = { code: 'es', language: 'es-PE', name: 'Español', file: 'es.json' }
export const siteLocales = [
  defaultLocale,
  { code: 'en', language: 'en-US', name: 'English', file: 'en.json' }
]
export const resolveLocale = code => siteLocales.find(item => item.code === code) || defaultLocale
