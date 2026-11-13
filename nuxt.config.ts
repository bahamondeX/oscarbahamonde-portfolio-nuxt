export default defineNuxtConfig({
  compatibilityDate: '2026-11-13',
  css: ['~/assets/main.css'],
  devtools: { enabled: false },
  app: { head: {
    htmlAttrs: { lang: 'es' },
    title: 'Oscar Bahamonde — AI, Data & Cloud Engineer',
    meta: [
      { name: 'description', content: 'Ingeniería de IA, plataformas de datos y arquitectura cloud. Portafolio de Oscar Bahamonde y consultoría técnica desde Perú.' },
      { name: 'theme-color', content: '#08090d' },
      { property: 'og:title', content: 'Oscar Bahamonde — Engineering the intelligent future' },
      { property: 'og:description', content: 'IA aplicada, datos y sistemas cloud. Conversemos sobre tu próximo proyecto.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://oscarbahamonde.com' },
      { name: 'twitter:card', content: 'summary' }
    ],
    link: [{ rel: 'canonical', href: 'https://oscarbahamonde.com/' }, { rel: 'icon', href: 'https://avatars.githubusercontent.com/u/202902192?v=4&s=64', type: 'image/png' }]
  } },
  routeRules: { '/': { prerender: true } }
})
