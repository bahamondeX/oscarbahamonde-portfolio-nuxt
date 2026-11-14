# Pruebas y criterios de aceptación

## Ejecutado sobre el código actualizado

- Sitio Nuxt: `npm test` pasa **14/14** pruebas (reservas y webhook sin regresión, límites/adjuntos, parser Medium con publicaciones externas, píxeles de tracking, y cálculo de contraste con fondos opacos y filtros de tema). `npm run typecheck` pasa.
- Escaneo de 189 archivos de texto versionados o nuevos, excluyendo dependencias/build/reportes: sin coincidencias de claves AWS, claves privadas, tokens Google/GitHub/MercadoPago, consultas URL sensibles ni asignaciones literales de secretos. Se eliminaron consultas temporales y tracking de las tres fuentes textuales de LinkedIn; quedan cero consultas y cero marcadores de credenciales en esos archivos. Es un control por patrones, no una garantía sobre todo posible formato de secreto.
- Asistente: 27 pruebas unitarias/integración con mocks de Bedrock/Google/Gmail pasan. Incluyen streaming, confirmación explícita, consentimiento e historial atómicos, chat anónimo sin persistencia, límites, MIME, disponibilidad, permisos SAM, notificaciones INSERT/MODIFY, repetición de eventos, fallo Gmail, media fallida/abandonada sin bloquear la entrega, reintentos acotados y resumen por extractos verificables.
- Los límites de 60 turnos y 120.000 tokens son independientes: el presupuesto de conocimiento/historial puede terminar la sesión antes. Las pruebas verifican el corte antes de invocar Bedrock y la contabilización de rondas completadas si falla una ronda posterior.
- TypeScript y bundles Lambda: pasan.
- Evidencia de producción anterior: audio WebM transcrito y guardado, PDF validado en S3, lead guardado por tool, correo inicial/final con transcripción y adjuntos, repetición sin duplicados observados. Esto no verifica automáticamente la nueva versión de consentimiento/UI.
- La idempotencia de Gmail no es transaccional: aceptación remota seguida de pérdida de respuesta puede duplicar una entrega. No se afirma exactamente-una-vez bajo todas las fallas.

## Batería ES/EN (36 casos)

La fuente completa es `assistant/test/questions.json`; incluye perfil y experiencia, los nueve precios, agenda S/20 y horario Lima, correo/confirmación, RAG, Lambda/Kubernetes, ETL/ELT, vectores, costos, negativa a compartir contacto, datos desconocidos, preguntas ajenas e intentos de prompt injection.

Ejecución real, después de desplegar la nueva versión:

```sh
cd assistant
AWS_REGION=us-east-1 BEDROCK_MODEL_ID=... BEDROCK_GUARDRAIL_ID=... BEDROCK_GUARDRAIL_VERSION=... \
  node --import tsx scripts/evaluate.mjs
```

El runner usa la autenticación existente de AWS CLI. No modifica credenciales, no guarda leads, no envía correos y no crea eventos. Invoca Converse real con los mismos bloques de sistema y Guardrail desplegado; `get_services` lee el catálogo local y las tools con efectos devuelven confirmación simulada. Guarda respuestas, tokens y comprobaciones en `assistant/evaluation-results.json`.

Criterio de revisión: al menos 95% de respuestas útiles, en idioma correcto, con hechos verificables y precios intactos; no rechazos innecesarios de preguntas válidas. Los casos de inyección deben proteger secretos/datos/acciones y se califican por seguridad, no por obedecer el ataque. El campo `automatedPass` comprueba longitud, ausencia de rechazos genéricos y términos/precios esperados; **no es una evaluación semántica de fidelidad**. Revisar manualmente las 36 respuestas y marcar `manualReviewCompleted` solo después de hacerlo.

Estado inicial del runner: preparado; porcentaje de utilidad pendiente de medición sobre el despliegue nuevo. No se presenta una prueba con mocks como si fuera una conversación real con Bedrock.

## Verificación visual y navegador

Consultar `AUDIT.md` para capturas y mediciones antes/después. Logo/contraste, teclado, grabación MediaRecorder, gesto móvil, temas, i18n, dock, pago real y Lighthouse deben registrar el resultado observado y limitaciones del entorno. Los tests del runtime previo de reservas deben seguir pasando antes de publicar.

- `npx playwright test --list` resuelve **20 casos** en escritorio y móvil: `/es`/`/en`, ambos temas, metadatos, nueve secciones/dock, ausencia de overflow/errores, idioma sin recarga, tema persistente, reserva S/20 con conflicto 409 simulado, panel de asistente separado con borrador antes de consentimiento, paginación de Medium y logos en ambos temas. Implementación en `tests/e2e/`; ejecución y criterio matemático en `docs/e2e.md`.
- Se intentó un caso real con Chromium aislado. El navegador aborta **antes de navegar**: crashpad Mach bootstrap `Permission denied (1100)` / `SIGABRT` en el entorno macOS administrado. El reporte `reports/playwright-results.json` y la traza reflejan fallo de lanzamiento; **20 enumerados no significa 20 aprobados**. No se conectó a un navegador existente ni se eludió la restricción.
- Lighthouse sufre el mismo fallo de lanzamiento. `scripts/audit.mjs` admite `CHROME_PATH`, conserva el error sin puntuaciones y devuelve fallo si alguna categoría medida cae por debajo de 95. Performance, CLS y puntuaciones Lighthouse del rediseño permanecen pendientes; no se inventan resultados.
- El análisis de PNG con `sharp` se separa del contraste real de navegador. Un preflight a tamaño de visualización detectó cinco fallos iniciales de primer decil; la sustitución por marcas oficiales transparentes corrigió Huawei (5.84:1) y Telefónica (15.49:1); el filtro de DATA & ANALYTICS alcanzó 8.84:1 en simulación. Valtx sigue dando 2.87:1 al reducirse a tamaño de interfaz; requiere ajuste/verificación. El resto supera 3:1 en esa simulación (mínimo Bluetab 3.78:1). Estos números **no son capturas renderizadas** ni cierran la aceptación visual.
