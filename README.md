# Oscar Bahamonde · Nuxt portfolio

Nuxt 4.6.4 + Vue + TypeScript. Fuente de https://oscarbahamonde.com, en el repositorio independiente `bahamondeX/oscarbahamonde-portfolio-nuxt`. No usa el repositorio antiguo de React.

## Ejecutar

Node 24, npm y `.env.example` como referencia (no guardar secretos en Git).

```sh
npm ci
npm run dev
npm test
npm run typecheck
npm run build
npm run preview
```

El sitio público funciona sin credenciales del chatbot. Las reservas requieren las variables existentes de Calendar/MercadoPago. El chat muestra un estado de preparación hasta configurar su DB, LLM, Turnstile y correo. Los archivos y audio se habilitan cuando sus proveedores están configurados.

## Arquitectura

- `app/`: nueve secciones, dock, tema persistente, reserva y chat. `i18n/locales/{es,en}.json`: textos. Añadir idioma y metadatos en `shared/locales.mjs` sin cambiar componentes.
- `server/api/blog`: RSS Medium, caché Nitro, paginación y copia de respaldo con extractos verificados. Postgres acumula artículos si está configurado. El feed no garantiza todo el histórico.
- `server/api/chat`: sesión con consentimiento, streaming, archivos, audio, cierre, descarga privada y eliminación.
- `migrations/001_leads.sql`: leads, mensajes, archivos, cola de notificación, límites de uso y archivo de Medium.
- Sitemap multilingüe dinámico, robots y llms.txt. Medium externo se enlaza desde llms y páginas de extractos: un sitemap no puede declarar URLs ajenas como loc.
- Logo original y tamaños derivados en public; scripts/assets.mjs permite regenerarlos. Foto actual conservada. Fuentes y pendientes en docs y TODO.md.

## Reservas: integración existente preservada

`GET /api/availability`, `POST /api/checkout`, `GET /api/payment`, `POST /api/payment-webhook`, `POST /api/calendar/connect`, `GET /api/calendar/callback`, `/pago`, `/conectar`.

Calendar es el registro persistente de reservas. Sesiones de 30min a S/20, lunes a viernes 09–13 y 14–17 America/Lima, con 4h de anticipación y horizonte de 60 días. Eventos personales, recurrentes, de día completo e incluso marcados como libres bloquean disponibilidad; cancelados y declinados por el propietario no. Sin acceso a Calendar, no ofrece horarios.

El backend retiene un horario por 15min con ID determinista y control ETag. MercadoPago recibe PEN20 y la referencia del hold. La vuelta del navegador y el webhook consultan el pago real, verifican estado/importe/moneda/referencia y confirman Calendar con Meet. No se confía en parámetros del retorno. Conflictos o pagos tardíos requieren revisión manual; no se reemplazan eventos personales. Los holds vencidos pueden seguir visibles hasta reutilizar el horario. Esta limitación previa se conserva.

Se añadieron únicamente anotaciones de tipos en dos utilidades antiguas: la prueba de hash compara el JavaScript compilado de ocho archivos críticos con la versión anterior y verifica que su comportamiento ejecutable no cambió.

## Activar leads

1. Configurar Postgres persistente con URL de conexión agrupada/TLS y ejecutar `npm run db:migrate`.
2. Completar LLM compatible con OpenAI (streaming y respuesta JSON), transcripción, secreto de sesión y Turnstile (`lead-chat`, hostname real).
3. Crear/configurar bucket privado S3/R2; claves con acceso limitado a `leads/*`. Nunca usar archivos públicos para consultas.
4. Gmail API con OAuth `gmail.send` **separado de Calendar**, o SMTP Gmail con app password. Destinatario fijo por entorno.
5. Un scheduler cada 5min llama `GET /api/chat/cron` con `Authorization: Bearer <NUXT_CRON_SECRET>`. La demora de inactividad es N minutos más hasta un intervalo del scheduler. No se incluye cron de pago automáticamente.

El correo contiene campos captados, resumen marcado como generado por IA, conversación íntegra, archivos y audios. Por debajo de 18MB de contenido se adjuntan; por encima se usan enlaces firmados de 7 días (margen para base64 frente al límite de Gmail). Descargas del visitante: sesión propietaria y enlaces de 15min. Reintentos con backoff, hasta 5 intentos; revisar `lead_outbox` con state=failed y error_code. Se procesa una notificación por ejecución para mantener el límite de 60s. Ante un fallo ambiguo después de enviar, un reintento puede repetir correo: se mantiene Message-ID estable, sin prometer entrega exactamente una vez.

Límites por IP persistidos, sesión HttpOnly/Secure/SameSite, consentimiento antes de guardar, Turnstile, límite de mensajes y de adjuntos. Se valida MIME por firma, PDF activo, rutas/ejecutables dentro de ZIP y tamaños descomprimidos. Este escaneo básico no sustituye un antivirus completo. Máximo de archivo predeterminado 3MB (techo 3.5MB por el límite de cuerpo de Vercel); grabación de hasta 60s. Retención 90 días configurable y borrado por cron. Un correo ya entregado no puede retirarse mediante borrar conversación.

## Pruebas

`npm test`: reglas de agenda/pago, invariancia del runtime, extracción limitada, ZIP/MIME y RSS. `npm run typecheck` y `npm run build`.

`node scripts/integration.mjs`: API real compilada, Postgres WASM efímero y mocks de LLM/Turnstile/S3/transcripción/Gmail; verifica persistencia, consentimiento, streaming, aislamiento de archivos, adjuntos, inactividad e idempotencia. No envía correos ni cobra. Usa puertos locales 3188, 3189 y 54579 y los cierra al terminar. No es una prueba de credenciales reales.

`npm run audit -- https://oscarbahamonde.com/es`: Lighthouse móvil/escritorio con Chrome instalado, resultados en reports/. `node scripts/inspect-ui.mjs` inspecciona un navegador de prueba aislado. Resultados finales y límites en docs/VALIDATION.md.

## Vercel

Proyecto `oscarbahamonde-premium-nuxt`, framework Nuxt, Node 24, `npm ci`, `npm run build`. Mantener las variables existentes; añadir nuevas solo en servidor. No cambiar DNS/nameservers, correo ni otros subdominios. Nunca copiar tokens de Calendar a Gmail. Se conserva el dominio raíz y redirección www. Si Vercel no tiene una conexión Git autorizada, desplegar la misma revisión de Git mediante archivos fuente; no publicar una compilación macOS en Linux (Sharp debe compilarse en Vercel).
