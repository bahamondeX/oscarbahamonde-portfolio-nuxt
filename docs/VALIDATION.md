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

## AWS assistant — 2026-11-14

- 15 assistant tests passed (Bedrock stream/tool mocks, confirmation gates, Google freebusy mock, Stream INSERT/MODIFY/duplicate/Gmail failure, MIME/header validation, SAM storage/event configuration).
- 8 existing tests passed, including unchanged executable hashes for MercadoPago and Calendar booking handlers.
- TypeScript checks passed for Nuxt and assistant. Production Nuxt build and Lambda bundles passed.
- AWS CloudFormation ValidateTemplate accepted the SAM template; cfn-lint completed with no findings. SAM stack was subsequently deployed successfully in us-east-1.
- AWS Login authenticated through a private temporary copy of its cache; no credentials were printed or committed. Google OAuth and Turnstile were subsequently configured in Secrets Manager without committing credentials.
- Local robots.txt and llms.txt responded; sitemap.xml redirects to sitemap_index.xml. Medium originals remain in llms.txt and blog links; sitemap contains local bilingual post pages, as required by same-host sitemap rules.
- Headless Chrome failed to launch in the managed environment. No new Lighthouse score, CLS measurement, or visual/accessibility browser pass is claimed.
- Real Google freebusy and OAuth refresh/scopes passed. Gmail delivery, audio/file end-to-end flows, event creation and paid checkout remain pending verification. Existing runtime hash checks are regression protection, not a live payment test.

## Production activation

- PR #1 squash-merged with owner authorization; Vercel production deployment dpl_kRH7pH7SswFCZrKSrT85bQbbPNSs reached READY and serves oscarbahamonde.com.
- Public Lambda URL and Turnstile site key configured in Vercel; private Turnstile/Google values remain in Secrets Manager. Temporary OAuth setup endpoint disabled and returned 404.
- Browser: real managed Turnstile passed, consent/start-session succeeded, Spanish Bedrock response returned the verified service catalog and prices. No test lead, email, Calendar event or payment was intentionally created.
- An English service question exposed a false positive in the original negatively worded denied-topic definition. Isolated candidate tests passed for service/tool output, English input, blocked medical/political requests and prompt injection; HIGH filters retained.
- All 15 assistant tests and cfn-lint passed again after the topic correction. CloudFormation update completed successfully with guardrail version 2. The production browser returned the English AI assistant scope and verified starting price S/1,500 after correction; Spanish had already passed. Prompt injection input strength remains HIGH.

## Live acceptance tests — 2026-11-14
- Synthetic authenticated backend fixture; production CAPTCHA configuration was not changed. Browser file selection was blocked by extension access; microphone capture/MediaRecorder preview remain unverified.
- PDF and WebM: production HTTP upload endpoint, signed S3 POST, server MIME/size validation and async media processing passed. Stored WebM transcription matched the generated speech. WAV was rejected as an unsupported upload format (expected).
- Lead tool failed with AccessDenied for dynamodb:Query on Messages. A narrowly scoped SAM fix and regression test are prepared locally but publication/deployment were blocked by automatic approval review pending explicit owner authorization. Production role is unchanged.
- Found and fixed notifier entry point: AWS Context was being interpreted as injected test dependencies. Published correction and updated only the notifier Lambda code; no IAM changes applied.
- Replayed the known synthetic INSERT/MODIFY records: no batch failures. Gmail confirmed two delivered messages (initial/final), final HTML, Reply-To, transcript.txt, test.pdf and test.webm. Replaying again left exactly two matching messages.
- The AI summary of the synthetic meta-test transcript was blocked by Guardrails and the rejection text appeared under Resumen IA. This is not a passing useful-summary test; retain HIGH and improve safe handling/verify a normal business conversation.
- Existing 8 booking/payment regression tests passed; production payment webhook rejected malformed payment ID with HTTP400. No real charge or Meet creation performed.
- Local proposed tree: 17 assistant tests passed (includes pending IAM regression); deployed main has the notifier regression fix. cfn-lint validation repeated on the proposed SAM template.
- Lighthouse could not start local Chrome (dynamic debugging port timeout). Public PageSpeed API returned HTTP429/quota zero. No new production score or ≥95 claim.

## Authorized IAM correction and live recheck
- Owner explicitly authorized LeadToolRole dynamodb:Query on Messages. SAM change committed and deployed successfully; no wildcard resources or extra actions added.
- 17 assistant tests, TypeScript and cfn-lint passed. Regression test verifies exactly one scoped Query statement for LeadTool.
- Actual LeadTool Lambda invocation succeeded and saved a synthetic lead with name, service, scope and budget. HTTP close succeeded. DynamoDB Streams automatically delivered both created and completed notifications to OWNER_EMAIL; Gmail confirmed both arrived, completed mail included transcript.txt.
- Bedrock summary generated for the ordinary scoping sample (HIGH unchanged), but added marketing claims and misinterpreted the synthetic name. Summary factual precision remains a follow-up; this test does not certify strict grounding.
- Previous blocked IAM status is resolved. Browser microphone/file-picker and Lighthouse environment limitations plus real payment/Meet test remain pending as documented.
