import { siteLocales } from './shared/locales.mjs'
export default defineNuxtConfig({
  compatibilityDate: '2026-11-13',
  modules: ['@nuxt/image', '@nuxtjs/color-mode', '@nuxtjs/i18n', '@nuxtjs/sitemap', '@nuxtjs/robots'],
  css: ['~/assets/main.css'], devtools: { enabled: false },
  nitro: { compressPublicAssets: true, vercel: { functions: { maxDuration: 60 } } },
  runtimeConfig: {
    mercadoPagoAccessToken: '', googleClientId: '', googleClientSecret: '', googleRefreshToken: '', googleCalendarId: 'primary', bookingSecret: '',
    databaseUrl: '', databaseSsl: 'require', chatSessionSecret: '',
    llmBaseUrl: 'https://api.openai.com/v1', llmApiKey: '', llmModel: '',
    transcriptionBaseUrl: 'https://api.openai.com/v1', transcriptionApiKey: '', transcriptionModel: 'whisper-1',
    turnstileSecretKey: '', turnstileSiteKey: '', turnstileHostname: 'oscarbahamonde.com',
    storageEndpoint: '', storageRegion: 'auto', storageBucket: '', storageAccessKeyId: '', storageSecretAccessKey: '',
    chatMaxFileBytes: 3000000, chatMaxFiles: 5, chatAllowedMime: 'application/pdf,image/png,image/jpeg,image/webp,application/zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document,audio/webm,audio/ogg,audio/mp4',
    chatIdleMinutes: 15, chatRetentionDays: 90, cronSecret: '',
    gmailClientId: '', gmailClientSecret: '', gmailRefreshToken: '',
    smtpHost: 'smtp.gmail.com', smtpPort: 465, smtpUser: '', smtpPassword: '', leadNotificationTo: 'oscar.bahamonde.dev@gmail.com',
    public: { siteUrl: 'https://oscarbahamonde.com', assistantUrl: '', turnstileSiteKey: '', assistantMaxBytes: 5000000, assistantRetentionDays: 90 }
  },
  site: { url: 'https://oscarbahamonde.com', name: 'Oscar Bahamonde', defaultLocale: 'es' },
  i18n: {
    strategy: 'prefix', defaultLocale: 'es', baseUrl: 'https://oscarbahamonde.com',
    locales: siteLocales,
    langDir: 'locales', detectBrowserLanguage: { useCookie: true, cookieKey: 'portfolio_language', redirectOn: 'root', fallbackLocale: 'es' },
    customRoutes: 'config', pages: { pago: false, conectar: false }
  },
  colorMode: { preference: 'system', fallback: 'light', classSuffix: '', storageKey: 'portfolio-theme' },
  image: { format: ['avif', 'webp'], quality: 85, domains: ['cdn-images-1.medium.com', 'miro.medium.com'] },
  sitemap: { sources: ['/api/__sitemap__/urls'], exclude: ['/pago', '/conectar', '/api/**'] },
  robots: { groups: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/pago', '/conectar'] }], sitemap: ['https://oscarbahamonde.com/sitemap.xml'] },
  app: { head: {
    title: 'Oscar Bahamonde — AI, Data & Cloud',
    meta: [{ name: 'theme-color', content: '#f5f6f8' }, { name: 'twitter:card', content: 'summary_large_image' }],
    link: [
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }, { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' }, { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
      { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' }, { rel: 'manifest', href: '/site.webmanifest' }
    ]
  } },
  routeRules: {
    '/es': { isr: 3600 }, '/en': { isr: 3600 },
    '/es/blog/**': { isr: 3600 }, '/en/blog/**': { isr: 3600 },
    '/api/chat/**': { headers: { 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff' } },
    '/pago': { headers: { 'x-robots-tag': 'noindex, nofollow' } }, '/conectar': { headers: { 'x-robots-tag': 'noindex, nofollow' } },
    '/images/**': { headers: { 'cache-control': 'public, max-age=86400' } }
  }
})
