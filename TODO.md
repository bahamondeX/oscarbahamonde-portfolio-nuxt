# Pendientes verificables · cierre del 14 noviembre 2026

Este documento distingue implementación, pruebas con mocks y comprobaciones en producción. El historial de intentos está en TESTS.md y docs/audit/after/.

## Bloqueos de aceptación

- [ ] **AWS y evaluación real:** sesión CLI caducada. Es necesario renovar el acceso a la cuenta414135856271 con `aws login`; el intento remoto anterior se canceló sin completarse. Falta comparar artefactos desplegados, conservar versión/alias de reversión, evaluar el código ajustado localmente con Bedrock, desplegar y ejecutar36+44 casos contra Lambda. El34/36 anterior no es una evaluación HTTP de producción ni alcanza95%.
- [ ] **Micrófono físico:** no hay iOS Safari/Android Chrome controlables ni sesión BrowserStack configurada. Selección MP4/M4A/WebM y fallback de archivo implementados; ningún micrófono físico, Transcribe o correo nuevo se afirma probado. Evidencia y procedimiento: docs/audit/after/mic-mobile/.
- [ ] **MercadoPago sandbox:** faltan credenciales/usuarios de prueba y Calendar aislado. Los25 tests locales usan mocks; producción rechaza live_mode=false. No introducir credenciales de prueba en producción.
- [ ] **Pago real S/20:** requiere aprobación explícita de la transacción concreta, después de sandbox. Checklist, reembolso y destinatarios/evento en docs/payment-validation.md. Ningún cobro/evento real creado en esta fase.
- [ ] **Firma de webhook:** HMAC disponible, pendiente configurar secreto en Vercel/MercadoPago y probar notificación del proveedor. La consulta API del pago aprobado sigue siendo obligatoria, nunca el retorno del navegador.
- [ ] **CI GitHub:** el job reproducible está añadido, pero la cuenta bloquea runners por facturación. El fallback Linux sí pasó 24/24 y 112/112 contrastes; reactivar GitHub requiere resolver ese bloqueo de cuenta.

- [ ] **Turnstile, fallo forzado:** sesión nueva y chat ES/EN verificados en producción; falta provocar controladamente un fallo del proveedor y comprobar el reintento. Hay mensajes/reintento implementados. Logs internos de Cloudflare conservados, sin warnings de aplicación.

## Datos y contenidos que no se inventan

- [ ] Rayke: no se encontró logo oficial verificable; se mantiene monograma neutro con nombre. NETCOR sí tiene asset verificable de LinkedIn; su contraste pertenece a la suite visual.
- [ ] Descripción de la etapa freelance y ubicación/modalidad de Indra: no publicadas en la evidencia disponible; consultar a Oscar. Las16 fechas coinciden con la captura de LinkedIn (docs/experience-verification.json); no se afirma corroboración independiente por empleadores ni empleo actual no publicado.
- [ ] Enlaces públicos permanentes AZ-900/AWS Solutions Architect y logos de emisores con transparencia/resolución suficiente: docs/content-pending.md.
- [ ] Helm, Prometheus y Grafana no aparecen en la evidencia capturada; no añadir experiencia sin fuente.
- [ ] Primer puesto PUCP2007, hackathon2023 y AWS Speaker: conservar hechos proporcionados por Oscar; falta evidencia pública adicional, no fabricar certificados.
- [ ] Histórico de Medium: RSS ofrece10 entradas. Propuesta de exportación o índice manual versionado en docs/medium-history-proposal.md; no implementada sin OK.

## Límites operativos

- Gmail y DynamoDB no comparten transacción: lease/hitos/Message-ID reducen duplicados, pero aceptación remota seguida de timeout ambiguo impide prometer exactamente una vez.
- TTL90d es eventual; correos ya entregados tienen retención propia. S3 usa ciclo de vida.
- PDF/DOCX/ZIP se validan, almacenan y adjuntan; no se interpreta automáticamente su contenido. Audio sí usa transcripción en servidor.
- Medium externo aparece en llms y enlaces de posts; no como loc de sitemap del dominio propio.
- El post-validador protege el ámbito de hechos del portfolio; no es un verificador universal de explicaciones técnicas. La salida se valida completa antes de emitir bloques SSE: aumenta latencia hasta primer contenido.
- Revisar vigencia de OAuth Google y publicación de apps en Testing. Secretos permanecen fuera del repo.
