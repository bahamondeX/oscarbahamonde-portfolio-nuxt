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

## Asistente AWS Bedrock (2026-11-14)

- [x] Código TypeScript, SAM, cinco tools Lambda, SSE, DynamoDB/KMS/S3 y notificaciones Stream con DLQ/alarma.
- [x] Catálogo versionado con precios y alcances existentes; sin inventar credenciales ni certificaciones.
- [x] Widget bilingüe reutiliza la estética actual; implementación previa disponible hasta configurar la URL AWS.
- [x] Tests mock de Bedrock/Google/Gmail y eventos Stream; tests originales de agendamiento sin regresiones.
- [x] Google OAuth guardado en AWS Secrets Manager tras consentimiento del propietario: refresh validado, scopes calendar.events/calendar.freebusy/gmail.send comprobados y consulta real freebusy correcta. No se enviaron correos de prueba.
- [ ] Crear secreto y site key de Turnstile. Las credenciales Google están listas; los valores permanecen fuera del repositorio.
- [ ] Desplegar CloudFormation/SAM y habilitar URL Lambda + Turnstile público en Vercel; confirmar SNS y acceso real al modelo.
- [ ] Ejecutar pruebas reales AWS/Google/Transcribe y prueba de pago autorizada; no se simuló un despliegue completado.
- [ ] Gmail no ofrece exactamente-una-vez con DynamoDB. Revisar el límite de entrega ambigua en assistant/README.md antes de exigir cero duplicados bajo cualquier caída.
- [ ] Lighthouse ≥95 y navegación de teclado en navegador: intento local bloqueado al arrancar Chrome. No se afirma un puntaje medido nuevo.
- [ ] Certificaciones verificadas con logos: faltan nombres, emisores y URLs de evidencia.
- [ ] PDF/DOCX/ZIP se aceptan y remiten como adjuntos; análisis automático del contenido no implementado. Audio sí se transcribe en servidor.
