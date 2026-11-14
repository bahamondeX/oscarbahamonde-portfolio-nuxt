# Reconocimiento · 2026-11-14

Fuentes: HTML de https://oscarbahamonde.com recuperado mediante Vercel y código de bahamondeX/oscarbahamonde-portfolio-nuxt, árbol base `871d504c0d491903b1fa54a3e0c2d105f8f4f0ef`.

Nuxt 4.6.4, Vue, Nitro, TypeScript. No había módulos adicionales ni base de datos. Estructura: app/pages, app/components, app/assets, server/api, server/utils, shared y tests.

Foto: public/images/oscar-portrait.jpg, conservada. Titular original: «Engineering the intelligent future». Bio de ingeniería de software, datos e IA. Experiencia: Dynata/SRE, Globant/Senior Data Engineer, Pronti AI/Backend Engineer, sin fechas. Huawei y Telefónica se mencionan sin cargos ni fechas. Proyectos: VOZ (en desarrollo), Quipubase y aiofauna; se conservan descripciones y enlaces. Skills: Python/FastAPI, Agentic AI/RAG, AWS, Kubernetes, Terraform, PostgreSQL, observabilidad y datos. Firebase, RabbitMQ y Milvus aparecen en experiencia.

No hay certificaciones verificables en el sitio. LinkedIn no pudo recuperarse durante el reconocimiento. PUCP 2007, hackathon AWS User Group Perú 2023 (50+ equipos) y AWS Speaker son datos suministrados explícitamente por el propietario, no una verificación independiente.

Logo: adjunto original favicon.png, preservado como public/images/logo-source.png. El favicon SVG contiene el raster original; no se presenta como vector trazado.

## Integraciones preservadas

GET /api/availability, POST /api/checkout, GET /api/payment, POST /api/payment-webhook, POST /api/calendar/connect, GET /api/calendar/callback; páginas /pago y /conectar. Endpoints de reserva preservados. Se añadieron anotaciones de TypeScript en utilidades; su JavaScript ejecutable se verifica idéntico al original mediante hashes en las pruebas.

Variables existentes: NUXT_MERCADO_PAGO_ACCESS_TOKEN, NUXT_GOOGLE_CLIENT_ID, NUXT_GOOGLE_CLIENT_SECRET, NUXT_GOOGLE_REFRESH_TOKEN y NUXT_BOOKING_SECRET. Se inspeccionaron nombres, no valores. No existían DB/LLM/storage/Gmail/Turnstile.

Reservas: 30min, PEN20, lunes a viernes 09–13 y 14–17 America/Lima; bloquea eventos Calendar incluso marcados como libres; anticipación mínima 4h, horizonte 60 días; retención 15min; confirma solo tras verificar pago. Se conserva webhook idempotente y cookie firmada. No se efectuaron cobros durante el rediseño.
