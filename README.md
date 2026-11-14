# Oscar Bahamonde · Nuxt portfolio

Nuxt 4 + Vue + TypeScript, `/es` y `/en`, desplegado en https://oscarbahamonde.com mediante Vercel. Se conserva el repositorio y el flujo de reservas existente.

## Desarrollo y validación

Node 24; usar `.env.example` como referencia, nunca guardar secretos en Git.

```sh
npm ci
npm run dev
npm test
npm run typecheck
npm run build
npm --prefix assistant ci
npm --prefix assistant test
npm --prefix assistant run typecheck
```

Playwright (`npx playwright install chromium`, `npm run test:e2e`) y Lighthouse (`npm run audit -- https://oscarbahamonde.com/es`) se describen en `TESTS.md`; resultados comprobados y límites en `AUDIT.md` y `TODO.md`.

## Despliegue

1. **AWS:** configurar región, modelo, ARNs de Secrets Manager y valores públicos indicados en `.env.example`; ejecutar `npm --prefix assistant run deploy`. Este comando compila y despliega SAM/CloudFormation. Guía de OAuth, IAM, retención, operación y DLQ: [assistant/README.md](assistant/README.md).
2. **Vercel:** proyecto `oscarbahamonde-premium-nuxt`, Node 24, `npm ci`, `npm run build`. Conservar las variables existentes de Calendar y MercadoPago. `NUXT_PUBLIC_ASSISTANT_URL` recibe el output AWS y `NUXT_PUBLIC_TURNSTILE_SITE_KEY` el site key público. Compilar en Vercel, sin subir binarios macOS.
3. Verificar `/es`, `/en`, `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/llms-full.txt` y un chat real después del despliegue. No cambiar DNS, correo ni otros subdominios.

## Estructura

- `app/`: nueve secciones, dock, tema/idioma persistentes, panel de IA flotante y reserva. El chat se carga al abrirlo; Contacto solo muestra el acceso al asistente y el agendamiento.
- `data/experience.json`, `knowledge/`: experiencia, certificaciones, skills, proyectos y conocimiento bilingüe versionado. Fuentes públicas consultadas en `docs/`; fechas y estados de certificaciones conservados según LinkedIn.
- `public/logos/`: PNG oficiales, tono medido con Sharp y preflight de contraste; el contraste renderizado está pendiente en `TODO.md`. Las fuentes sin logo verificable se presentan con nombre.
- `assistant/`: Lambda URL con SSE/Bedrock ConverseStream, cinco tools Lambda, DynamoDB, S3/KMS, Secrets Manager, Transcribe y notificaciones vía Gmail. Conversación anónima sin persistencia servidor hasta consentimiento; confirmaciones de efectos externos y límites en servidor.
- `server/api/blog`: feed de Medium cacheado y copia versionada de respaldo. Se muestran todos los artículos disponibles en el RSS; el feed no garantiza todo el histórico. Solo extractos y enlaces al original.
- SEO: sitemap con rutas locales bilingües, canonical/hreflang, robots y llms dinámicos. Los originales de Medium se enlazan desde llms y páginas: un `<loc>` de otro host no pertenece al sitemap del dominio.

## Reservas preservadas

`GET /api/availability`, `POST /api/checkout`, `GET /api/payment`, `POST /api/payment-webhook` y OAuth Calendar conservan su comportamiento. Sesiones de 30 min a S/20, lunes–viernes 09–13 y 14–17 America/Lima, anticipación 4 h, horizonte 60 d y retención 15 min. Solo un pago aprobado verificado por API de MercadoPago confirma Calendar/Meet; el retorno del navegador no acredita pagos.

Los tests fijan hashes del JavaScript ejecutable de los handlers críticos. No se ejecuta un cobro real en la batería automática. Los holds vencidos pueden seguir visibles en Calendar hasta reutilizar el horario, limitación previa documentada.

Los endpoints históricos `server/api/chat`/Postgres permanecen en código por compatibilidad; el panel de producción usa únicamente la URL AWS. Su configuración antigua no es necesaria para el asistente actual.


## Validación y estado de cierre

Frontend publicado en Vercel: `ba8ff885`, despliegue `dpl_CVRFf4bD2sx2jaM28fFkQbfGHzZq`. Pruebas y límites actuales: [TESTS.md](TESTS.md), [AUDIT.md](AUDIT.md), [TODO.md](TODO.md).

```sh
npm test && npm run typecheck && npm run build
npm --prefix assistant test && npm --prefix assistant run typecheck
node scripts/seo-check.mjs --revision COMMIT_PUBLICADO
npx playwright install chromium
npm run test:e2e
```

AWS requiere renovar autenticación y pasar la evaluación real antes de `npm --prefix assistant run deploy`. El informe `assistant/evaluation-final.json` registra el bloqueo, no una aprobación. Preparación de respaldo/reversión: [docs/assistant-rollback.md](docs/assistant-rollback.md). Los artefactos completos de Playwright se extraen con `tar -xf docs/audit/after/playwright-artifacts.tar.xz` desde la raíz del repositorio.
