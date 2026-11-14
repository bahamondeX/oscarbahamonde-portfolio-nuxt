# Causa raíz del grounding — 14 noviembre 2026

Diagnóstico escrito antes de los cambios de esta fase. Fuente: `assistant/evaluation-results.json` (36 casos, 34 útiles), `evaluation-followup.json`, `src/agent.ts`, `knowledge.ts`, `pricing.ts`, `scripts/evaluate.mjs`.

## Fallos exactos

### es-rag

Pregunta: Explica RAG y cuándo conviene usarlo en una pyme.

Respuesta completa conservada en el JSON; fragmentos materiales:

- «RAG: Recuperación Aumentada por Generación»: expande el acrónimo al revés. Debe ser Retrieval-Augmented Generation, generación aumentada por recuperación.
- «el modelo cita fuentes reales de tu empresa, no alucina»: una fuente recuperada puede estar incompleta o ser interpretada incorrectamente; RAG reduce algunos errores, no garantiza eliminarlos.

Clasificación: alucinación/generalización de generación técnica. No hay tool calls que suministren esas afirmaciones y Guardrails no las valida.

### en-lambda

Pregunta: When should I choose Lambda over Kubernetes for a small API?

Respuesta completa conservada en el JSON; fragmentos materiales:

- «No cluster management, patching, monitoring infrastructure, or security hardening. Lambda handles that.»: mezcla gestión de servidores con obligaciones de IAM, configuración, código, dependencias, datos y monitorización del cliente.
- «Containers stay warm; no cold-start penalty.»: Kubernetes puede introducir demoras por scheduling, descarga de imágenes, inicialización y escalado.

Clasificación: alucinación/generalización de generación técnica. No hay tool calls que suministren esas afirmaciones y Guardrails no las valida.

## Arquitectura observada

No existe un recuperador vectorial ni chunking/top-k actualmente: `knowledgeContexts` inserta todo el conocimiento verificado del repositorio en el system prompt por idioma. No hubo un fallo de ranking o un documento fuera del top-k. La base tiene datos comerciales y biográficos, no documentación técnica actualizada de todos los proveedores. El modelo completa las explicaciones con su conocimiento paramétrico.

El prompt acumula reglas específicas, pero esas reglas no prueban la veracidad de la salida. `pricing.ts` solo filtra cantidades monetarias; no valida fechas, asociación cargo/empresa, certificaciones o aseveraciones técnicas. El streaming publica cada línea antes de comprobar una respuesta completa. El runner anterior llama Converse directo con herramientas simuladas; **no prueba el endpoint Lambda desplegado** y sus resultados no deben etiquetarse como producción.

`evaluation-followup.json` demuestra que el problema técnico persiste con el código nuevo: RAG ya explica que las alucinaciones no se eliminan, pero Lambda todavía cita facturación de 100 ms y ausencia de observabilidad por configurar. No es únicamente desfase de despliegue. La comparación de hashes/versión y reproducción HTTP real se registrará por separado; no se presupone que el código local sea el publicado.

## Corrección general propuesta

1. Recuperar registros indivisibles con ID/tipo/idioma/fuente y sinónimos ES/EN; no separar un precio de su servicio ni una fecha de su empleo. Mantener el catálogo completo en contexto para evitar omisiones comerciales.
2. Validar antes de emitir: referencias de fuente, fechas y cifras asociadas, empresas/certificaciones presentes y estado vigente. Reintento limitado con problemas concretos y fuentes; si no se puede sostener una afirmación, omitirla y ofrecer la fuente verificada. Registrar categorías/IDs de correcciones, nunca texto del visitante ni PII en CloudWatch.
3. Evaluar calidad del modelo configurable para explicación técnica general; una lista creciente de excepciones por pregunta no resuelve este problema. No usar respuestas fijas de los casos fallidos.
4. Mantener todos los intentos, separar la batería de ajuste de held-out y no convertir comprobaciones léxicas en aprobación semántica.

## Implementación local y evidencia

La corrección implementada usa registros de fuente seleccionables y renderizado determinista, seguido de comprobaciones de prosa sobre asociaciones de empleo, certificaciones, hitos, cotizaciones y afirmaciones de acciones externas. Se corrige desde la fuente; no se confía en otra generación para corregir el mismo hecho. El contrato no pretende certificar cualquier explicación técnica posible. Los casos ambiguos y falsos positivos detectados durante revisión independiente se conservan en `docs/audit/after/grounding-review/attempt-0*.json`.

Estado local final: 57 pruebas del backend aprobadas, TypeScript y bundles aprobados; evidencia en `docs/audit/after/grounding/`. La revisión independiente final de los ocho casos concretos detectados pasó; no equivale a una evaluación real del modelo ni del endpoint. La versión usa SSE después de validar una ronda completa, con mayor latencia inicial. La precisión semántica y las baterías reales todavía necesitan AWS autenticado y deben registrarse por separado.
