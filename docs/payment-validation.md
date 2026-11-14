# Validación de reservas y pagos · 14 noviembre 2026

## Estado y evidencia

| Comprobación | Evidencia | Estado |
|---|---|---|
| Reglas Lima, S/20 y pago aprobado consultado por API | `tests/booking.test.mjs`, `tests/booking-runtime.test.mjs` | Mocks locales; no pago real |
| Webhook repetido, pendiente/rechazado, importe/divisa/modo incorrectos | Módulo real `finalize` con adaptadores falsos; `payments/local-tests.log` | Aprobado localmente; no integración del proveedor |
| Liberación de hold, carrera con pago/renovación, conflicto ETag | `tests/booking-cleanup.test.mjs`, `tests/booking-runtime.test.mjs` | Aprobado localmente |
| HMAC de webhook y replay | `tests/payment-webhook.test.mjs` | Aprobado localmente; falta configurar secreto y comprobar firma del proveedor |
| Sandbox MercadoPago + Calendar aislado | Inventario de nombres de variables Vercel revisado por agente principal: no credenciales de prueba ni Calendar de prueba identificados | Pendiente: no se generó checkout de prueba ni evento |
| Pago real, Meet e invitación | Requiere aprobación específica y la ejecución del comprador | Pendiente: no se realizó cobro ni evento |
| Limpieza en Calendar real | Solo después de publicar y observar holds propios expirados | Pendiente de despliegue/verificación; los fixtures no son evidencia productiva |

Los resultados de mocks no se presentan como una compra sandbox ni como producción. El estado inicial de producción rechaza `live_mode=false`: conectar credenciales de prueba al despliegue productivo no produce una prueba válida.

## Cambio de limpieza de holds

Al consultar `/api/availability?date=YYYY-MM-DD`, se revisan hasta cinco holds expirados del día consultado. No es un cron: otros días y acumulaciones mayores se limpian en consultas posteriores. La disponibilidad ya ignoraba los holds expirados; ahora además se ocultan en Calendar al marcarlos `cancelled` y `transparent`.

La selección exige ID de reserva con formato propio, `app=oscar-booking`, `state=hold`, `status=tentative`, orden y expiración válidas, ETag, ausencia de pago, asistentes y Meet. Se vuelve a leer el evento y se aplica `If-Match` a la versión actual. Si un pago o una renovación gana la carrera, se conserva su versión; no se reintenta cancelar. No se borran reuniones confirmadas ni eventos ajenos. No se envían correos (`sendUpdates=none`).

Se conserva el ID determinista del horario para impedir dos reservas simultáneas. Un hold cancelado con `state=expired` puede reutilizarse mediante PATCH condicional y una orden nueva. Los pagos tardíos se marcan para revisión: no reviven el hold ni acreditan una nueva orden. Los logs de limpieza contienen únicamente contadores, sin nombres, correos, IDs ni enlaces.

## Justificación de hashes

`docs/audit/after/payments/runtime-hash-changes.json` conserva el hash anterior y nuevo de cada handler modificado:

- `availability.get.ts`: invoca limpieza antes de calcular slots.
- `booking.ts`: cancelación condicional y reutilización de hold expirado; `finalize` conserva las invariantes de pago.
- `payment-webhook.post.ts`: si existe `NUXT_MERCADO_PAGO_WEBHOOK_SECRET`, valida HMAC y coherencia de ID antes de consultar el pago.

Se añade cobertura por hash de `shared/booking.mjs`, `shared/booking-cleanup.mjs` y `shared/payment-webhook.mjs` para que las invariantes delegadas no queden fuera del control. Checkout, retorno del navegador, OAuth y adaptador Calendar conservan sus hashes. El baseline ya no afirma identidad absoluta con el código anterior: identifica la revisión aprobada y sus cambios deliberados.

## Firma y acreditación

Con `NUXT_MERCADO_PAGO_WEBHOOK_SECRET` configurado, el servidor valida HMAC-SHA256, ID de query, request ID y tolerancia temporal de cinco minutos (timestamp en segundos o milisegundos). Firma inválida devuelve 401. La firma no acredita el pago: `GET /v1/payments/{id}` autenticado sigue siendo obligatorio, además de `approved`, PEN, S/20 exactos, `live_mode=true`, fecha de aprobación, referencia/orden y hold vigentes.

Sin el secreto, se conserva el comportamiento anterior de consulta autenticada al proveedor para evitar cortar notificaciones existentes. **Esto no equivale a verificar el origen criptográfico**. El secreto no fue encontrado en el inventario de configuración; habilitación y prueba de una firma real siguen pendientes. El retorno del navegador solo consulta un pago ligado a su cookie firmada y tampoco acredita por sí mismo.

## Sandbox: requisitos y secuencia pendiente

1. Disponer de vendedor/comprador y credenciales de prueba MercadoPago, webhook de pruebas y calendario aislado con OAuth válido. No utilizar tarjetas ni credenciales reales en esta fase.
2. Preparar un despliegue aislado que acepte exclusivamente pagos `live_mode=false`, use dicho calendario y URLs de retorno/notificación propias. La producción continuará aceptando exclusivamente `live_mode=true`. Esta separación todavía no está configurada; no introducir un bypass en producción.
3. Elegir un slot válido y comprobar hold de 15 minutos; crear checkout con importe PEN20, completar los escenarios aprobados/rechazados/pendientes del proveedor y registrar IDs solo en evidencia privada.
4. Comprobar consulta autenticada al proveedor, firma válida/incorrecta, webhook duplicado, una sola transición a confirmado, Meet e invitación. Reenviar la notificación mediante el panel del proveedor, sin falsificar un pago aprobado.
5. Expirar un hold de prueba, consultar el día, comprobar cancelación y disponibilidad; probar conflicto con renovación/pago concurrente.
6. Publicar evidencia redactada: UTC y Lima, estados, importe, hash del identificador, contador de eventos/correos y resultado. No subir tokens, nombres, correos, firmas completas ni URLs de Meet.

## Una compra real de S/20: checklist para Oscar

**Antes de pagar:** confirmar que sandbox terminó; elegir el horario de prueba en Lima y el correo comprador que recibirá la invitación. La web retendrá ese horario durante 15 minutos. Si se aprueba el pago, se convertirá en un evento «Consultoría 1:1 · {nombre}» de 30 minutos en el Calendar de Oscar, con Google Meet y una invitación al correo ingresado. MercadoPago puede emitir su comprobante al comprador. El cobro es único por S/20; no hay suscripción.

1. Oscar abre https://oscarbahamonde.com/es#contact, elige horario y completa nombre/correo autorizado.
2. Verifica S/20 y la identidad del vendedor en MercadoPago. Oscar realiza la compra; el asistente solo puede ejecutarla después de una confirmación explícita para esa transacción.
3. Registrar hora y estado sin exponer datos bancarios. Esperar el webhook, no tomar la página de retorno como prueba.
4. Verificar por API `approved`, PEN20, `live_mode=true`, referencia de la orden y una sola confirmación en Calendar con Meet. Comprobar invitación recibida y que el horario queda ocupado.
5. Volver a notificar el mismo pago y confirmar que no se crea otra reunión/invitación.
6. Si se trató únicamente de una prueba, confirmar por separado el reembolso y cancelación del evento. No se ejecutan automáticamente.

**Reembolso preparado, no ejecutado:** desde la operación en MercadoPago puede solicitarse la devolución; vía API, la integración usa Payments/Preferences, por lo que corresponde `POST /v1/payments/{payment_id}/refunds`, autenticado con el vendedor, una clave de idempotencia estable y `{}` para devolución total. Antes de ejecutar, consultar el pago y sus reembolsos para evitar duplicados; después verificar la respuesta y el estado devuelto. La devolución llega al medio original o al saldo según el medio usado; no se promete plazo ni recuperación de comisiones. Reembolsar no cancela automáticamente Calendar: esa cancelación y su aviso requieren una acción separada autorizada.

Fuentes oficiales consultadas el 14 noviembre 2026:

- [Reembolso de pagos](https://www.mercadopago.com.pe/developers/es/reference/online-payments/checkout-api-payments/create-refund/post).
- [Reembolsos y cancelaciones Checkout Pro](https://www.mercadopago.com.pe/developers/es/docs/checkout-pro-preferences/additional-settings/refunds-and-cancellations).
- [Verificación oficial de webhooks](https://github.com/mercadopago/sdk-nodejs/blob/master/docs/webhooks.md).
- [Manifest HMAC](https://www.mercadopago.cl/developers/es/docs/checkout-api-orders/optional-notifications).
- [Calendar: modificaciones condicionales con ETag](https://developers.google.com/workspace/calendar/api/guides/version-resources).
