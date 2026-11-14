# Validación · 2026-11-14

- Nuxt 4.6.4: compilación de producción y comprobación TypeScript satisfactorias.
- 8 pruebas automatizadas: agenda, conflictos Calendar, pagos, datos de leads, ZIP, RSS y hashes del runtime de reserva. Todas pasan.
- 8 grupos de integración HTTP pasan con Postgres WASM aislado y proveedores simulados: consentimiento/CSRF/Turnstile; streaming/persistencia/idempotencia; MIME/PDF/ZIP; audio/transcripción; aislamiento/URLs firmadas; Gmail con transcripción y adjuntos; cron/inactividad; eliminación.
- Las pruebas de integración no utilizan credenciales reales, no envían mensajes externos y no realizan cargos. No prueban concurrencia distribuida de una instalación PostgreSQL real.
- La auditoría local más reciente, Lighthouse 13.6.0, 2026-11-14 07:24 UTC, URL http://127.0.0.1:3187/es: móvil rendimiento94/accesibilidad100/buenas prácticas100/SEO100, LCP2962ms/CLS0/TBT108ms; escritorio100/100/100/100, LCP669ms/CLS0/TBT0.
- Pendiente añadir medición del dominio desplegado. No se presenta 94 como cumplimiento de rendimiento móvil≥95.
- Pendiente activación de proveedores del chatbot en Vercel y prueba real de correo/audio/archivos; ver TODO.md. Credenciales Calendar/MercadoPago existentes se conservan.
- La consulta de disponibilidad se inicia al acercarse a Contact para evitar llamadas de agenda innecesarias. El flujo de selección→datos→MercadoPago mantiene los mismos endpoints.

Prueba de navegador final: nueve secciones/dock, magnificación, cambio de idioma sin recarga, tema persistente, reserva por teclado y manejo de conflicto, móvil sin desbordamiento, sección activa y movimiento reducido. Cero errores de consola no esperados. Checkout interceptado para evitar cargos.
