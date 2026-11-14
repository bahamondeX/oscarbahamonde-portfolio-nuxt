# Asistente de Oscar — AWS

Lambda Function URL con `RESPONSE_STREAM` sirve SSE a Nuxt desde `ConverseStream`, con Guardrails en modo síncrono.
Evita gestionar WebSockets y permite validar cada fragmento antes de entregarlo; el navegador usa `fetch` con Bearer, no EventSource.

## Despliegue

Requisitos: Node 22+, AWS CLI v2 autenticada, permisos para CloudFormation/IAM/KMS/DynamoDB/S3/Lambda/Bedrock/Transcribe/SNS/SQS/Budgets. El frontend sigue en Vercel.

1. Crea los secretos en **Secrets Manager, us-east-1**, desde la consola (no copies sus valores al código ni a este documento):
   - Google: `{"client_id":"…","client_secret":"…","refresh_token":"…","calendar_id":"primary"}`.
   - Turnstile: `{"secret":"…"}`. Widget permitido en `oscarbahamonde.com`, acción `lead-chat`.
2. Exporta las variables de despliegue de `.env.example`: `AWS_REGION`, `BEDROCK_MODEL_ID`, `BEDROCK_MODEL_ARN`, `GOOGLE_SECRET_ARN`, `TURNSTILE_SECRET_ARN`, `TURNSTILE_SITE_KEY`, `OWNER_EMAIL`. Solo ARNs, ID de modelo, site key público y correo; los secretos quedan en AWS.
3. Desde `assistant/`: `npm ci && npm run deploy`. Después de instalar dependencias, `npm run deploy` es el único comando de despliegue. Genera bundles, empaqueta SAM con CloudFormation y despliega sin instalar SAM CLI. El bucket de artefactos queda privado y cifrado.
4. Confirma la suscripción SNS que llegará al propietario. Una alarma sin suscripción confirmada no envía correo.
5. Copia el output `AssistantUrl` a `NUXT_PUBLIC_ASSISTANT_URL` en Vercel y el site key a `NUXT_PUBLIC_TURNSTILE_SITE_KEY`. Retención y tamaño públicos deben reflejar los valores de Lambda. Redespliega Nuxt **después** del smoke test AWS. Sin URL, se conserva el chat anterior.

`BEDROCK_MODEL_ID` debe aceptar ConverseStream + tools y estar habilitado en la cuenta. Para un inference profile, `BEDROCK_MODEL_ARN` acepta una lista separada por comas: ARN del perfil y ARNs de los modelos subyacentes de las regiones de destino. La política no usa un comodín global de Bedrock. No basta con que un modelo aparezca en el catálogo: valida acceso real y formulario de uso de Anthropic.

`FREE_INTRO_CALL_ENABLED=false` por defecto. Cambiarlo requiere editar la configuración de la función y redesplegar. No altera el precio de la consultoría pagada.

## OAuth de Google

En Google Cloud, habilita Calendar API y Gmail API y crea un cliente OAuth Web. Configura consentimiento, usuarios de prueba si aplica y un redirect URI HTTPS bajo tu control. Usa Authorization Code, `state` aleatorio, `access_type=offline` y `prompt=consent`; intercambia el código del lado servidor. Scopes mínimos:

- `https://www.googleapis.com/auth/calendar.events`
- `https://www.googleapis.com/auth/calendar.freebusy`
- `https://www.googleapis.com/auth/gmail.send`

Guarda client ID, secret y refresh token en el secreto Google. No reutilices el token Calendar existente suponiendo que incluye Gmail: puede requerir nuevo consentimiento. Para uso externo estable, completa la verificación que Google exija y revisa la caducidad de refresh tokens de apps en Testing. El propietario y el calendario deben corresponder a la cuenta autorizada. No hay claves Google en el frontend.

## Flujo y controles

- Consentimiento + Turnstile → sesión aleatoria con Bearer de 256 bits. Se guarda el hash del token; TTL se verifica también al leer. Token de navegador solo en sessionStorage, no en URLs.
- CORS y validación Origin exactos; IP de `requestContext`, nunca una cabecera del visitante. Contadores atómicos por IP/sesión, bloqueo de turno, máximo de turnos y presupuesto de tokens acumulado. Lambda tiene concurrencia reservada; el presupuesto AWS **avisa**, no corta gasto automáticamente.
- Cinco tools son Lambdas sin URL, invocables mediante el rol del orquestador. Esquemas JSON y validación Zod en ambas capas. Los argumentos no sustituyen sesión, destinatario ni consentimiento.
- El perfil de correo se confirma explícitamente por el visitante en la UI. Es confirmación de dirección proporcionada, **no prueba OTP de propiedad del buzón**. Solo ese correo o `OWNER_EMAIL`, sin CC/BCC. Las plantillas ignoran texto libre generado por el modelo. Máximo tres intentos de envío por sesión.
- Las llamadas intro gratuitas y los correos requieren un botón de confirmación cuyo ID y parámetros están guardados en servidor; texto como “ignore previous instructions” no lo autoriza.
- Las citas de S/20 devuelven el enlace al formulario de reservas existente. `checkout`, hold de Calendar, pago verificado con MercadoPago y webhook siguen en Nuxt. No se confirma una cita pagada desde Bedrock.
- `check_availability` usa freebusy real, lunes–viernes 09–13 y 14–17 Lima, 30 min, anticipación de 4 h, horizonte 60 días y buffer configurable. Las intro gratuitas usan ID de evento determinista por sesión.
- Uploads POST firmados y limitados por tamaño/MIME/KMS. Verificación binaria servidor antes de aceptarlos, claves acotadas a sesión, enlaces de descarga cortos. PDF, imágenes, DOCX y ZIP se almacenan como adjuntos; **no se extraen ni se interpretan automáticamente**. Audio: máximo 60 s en UI, Amazon Transcribe en servidor, audio + JSON de transcripción cifrados. Las transcripciones entran como datos no confiables.
- Borrar revoca la sesión y elimina mensajes, lead y objetos conocidos. Copias enviadas por correo y backups requieren gestión de retención propia. DynamoDB TTL es eventual; la app bloquea acceso al vencer el plazo. Los correos del propietario no se borran automáticamente.
- Logs estructurados con ID de sesión/acción y parámetros redactados. Nunca cuerpos, direcciones, tokens o archivos en CloudWatch. Métricas EMF, alarmas de errores, notificaciones y DLQ, presupuesto mensual.

## Leads, correo y reintentos

DynamoDB Streams `NEW_AND_OLD_IMAGES` → `notify-lead`. INSERT avisa inmediatamente. Primera transición a `qualified`/`closed` entrega resumen Bedrock, transcripción completa y adjuntos. El cierre no depende del navegador: EventBridge cierra leads inactivos tras 15 minutos, con barrido cada 5 minutos.

La clave `leadId + created/completed` tiene lease condicional y sello `notified_created`/`notified_completed`. Registros ya enviados no se reenvían en los tests de duplicados. Gmail 429/5xx usa backoff, después el stream reintenta con batch parcial, bisect y DLQ SQS con alarma SNS. Archivos hasta un total de ~17 MB binarios se adjuntan, dejando margen al base64; el resto usa enlaces S3 de 24 h. No se omiten audios del grupo validado.

**Límite de transporte:** Gmail `messages.send` no ofrece una clave de idempotencia transaccional con DynamoDB. Si Gmail acepta y la respuesta se pierde o Lambda muere antes del sello, un reintento puede duplicar el correo. Message-ID determinista facilita detectar el caso, pero no garantiza exactamente una entrega. No se afirma lo contrario. Reconciliar manualmente casos ambiguos antes de redrive si es indispensable evitar todo duplicado.

La DLQ de event source mappings contiene metadata de lote: recupera los registros desde Streams antes de su expiración de 24 h y revisa CloudWatch. No trates el mensaje SQS como un evento completo listo para reenviar. Para recuperación después de 24 h, reconstruye INSERT/MODIFY con `Leads`, `Messages` y los hitos de notificación conservados; valida antes de invocar. Las fallas async de Media también van a DLQ, con payload de invocación.

## Verificación

`npm test` y `npm run typecheck` dentro de `assistant/`; desde la raíz, `npm test`, `npm run typecheck`, `npm run build`.
Tests de Bedrock simulado (stream, tools y confirmación), validadores, freebusy simulado y Stream INSERT/MODIFY/duplicados/fallo Gmail. Los tests originales fijan los hashes del runtime de reservas.

Prueba real pendiente hasta configurar secretos: captcha → chat es/en → tools → upload/audio → cierre de pestaña → correo inicial/final → Gmail fallando/DLQ → replay. Una compra real S/20 requiere una transacción de prueba explícitamente acordada con el propietario. No se envían correos ni invitaciones durante tests con mocks.

Fuentes: [Lambda streaming](https://docs.aws.amazon.com/lambda/latest/dg/config-rs-invoke-furls.html), [ConverseStream](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_ConverseStream.html), [Guardrails y tools](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-use-converse-api.html), [DynamoDB event source](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-property-function-dynamodb.html).
