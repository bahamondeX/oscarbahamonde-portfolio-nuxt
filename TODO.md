# Pendientes verificables

## Activar chatbot

- [ ] Postgres persistente: URL/TLS y ejecutar npm run db:migrate. No se creó infraestructura de pago.
- [ ] Secreto de sesión, proveedor/modelo LLM, transcripción, Turnstile y bucket privado S3/R2; ver .env.example.
- [ ] Gmail API requiere consentimiento gmail.send separado de Calendar, o SMTP con app password. No se reutiliza token Calendar.
- [ ] NUXT_CRON_SECRET y scheduler cada 5min con Bearer a /api/chat/cron: inactividad, reintentos y retención. No se compró suscripción ni cron de pago.
- [ ] Probar texto/streaming, audio, archivos, persistencia y Gmail con credenciales reales. Mientras falte configuración chat/correo, la UI muestra preparación sin simular respuestas.
- [ ] Revisar privacidad, proveedores contratados y condiciones comerciales finales con el propietario.

## Contenido

- [ ] Fechas laborales de Dynata, Globant y Pronti AI, ausentes del sitio original.
- [ ] Cargos/fechas/descripciones de Huawei y Telefónica antes de ampliar timeline.
- [ ] Certificaciones: nombre, año, logo del emisor y enlace de verificación. No se inventaron credenciales.
- [ ] Evidencias públicas de PUCP/hackathon/AWS Speaker: datos proporcionados por el propietario.
- [ ] Histórico de Medium: RSS devolvió 5 artículos y no garantiza todo el archivo. Nuevas publicaciones se acumulan en Postgres cuando esté configurado.
- [x] Logos de Dynata, Globant y Pronti recuperados de fuentes oficiales; ver docs/company-logo-sources.md.

## Reserva y SEO

- [ ] Pago real aprobado/recepción de Meet requiere prueba de transacción autorizada; no se cobró durante el rediseño.
- [ ] Limitación previa conservada: holds vencidos dejan evento temporal visible hasta reutilizar horario; API los ignora para disponibilidad.
- [ ] No incluir URLs externas Medium como loc del sitemap: protocolo exige mismo host. Páginas locales /es/blog/* y /en/blog/*; originales en llms.txt y enlaces visibles.
- [ ] Consultar mediciones reales Lighthouse en docs/VALIDATION.md. Toda categoría inferior a95 sigue pendiente hasta corregir y medir nuevamente.
