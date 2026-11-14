# Pendientes verificables · 14 noviembre 2026

## Aceptación que requiere evidencia adicional

- [ ] Lighthouse ≥95 en las cuatro categorías, móvil y desktop: Chromium aislado no puede arrancar en este entorno macOS (crashpad/Mach Permission denied1100). No se declara un puntaje nuevo. Ejecutar `npm run audit -- https://oscarbahamonde.com/es` en un entorno compatible.
- [ ] Suite Playwright completa: los tests están implementados; el mismo bloqueo de Chromium impide ejecutar el navegador. Las comprobaciones manuales y capturas se registran en `AUDIT.md` y no se presentan como una ejecución automatizada.
- [ ] Transacción real S/20 → webhook → invitación Meet. Se preservó el runtime de reservas y sus tests; no se realizó un cobro real en esta fase.
- [ ] Grabación desde un micrófono y gesto de cierre en dispositivo móvil físico. La transcripción/adjuntos AWS se habían probado en la fase anterior; esto no verifica automáticamente la nueva interfaz.

## Contenido y fuentes

- [x] 16 puestos de LinkedIn con fechas y descripciones disponibles; 29 credenciales con emisión, vencimiento y enlaces disponibles; vencidas identificadas.
- [x] Skills verificadas agrupadas, proyectos con capturas reales, catálogo con los nueve precios conservados.
- [ ] Logos oficiales ausentes de Rayke y NETCORPERU; no se fabrican. Freelance se presenta por nombre.
- [ ] Descripción no publicada de la etapa freelance y ubicación de Indra; enlaces públicos permanentes AZ-900/AWS Solutions Architect. Detalles en `docs/content-pending.md`.
- [ ] Logos transparentes/alta resolución de algunos emisores. Los fondos intrínsecos originales se conservan cuando eliminarlos degradaría la marca; revisar mediciones de contraste, no solo media de luminancia.
- [ ] Helm, Prometheus y Grafana no aparecen en la evidencia capturada; incorporarlos cuando exista una fuente verificable.
- [ ] Evidencias públicas de primer puesto PUCP2007/hackathon2023/AWS Speaker: hechos proporcionados por Oscar, conservados sin inventar certificados.
- [ ] Histórico completo de Medium más allá de los10 artículos disponibles en RSS. Todos los10 se muestran; un feed no garantiza toda la cuenta. Usar archivo verificable para ampliar.

## Límites operativos documentados

- Gmail no dispone de transacción conjunta con DynamoDB: tras aceptación remota y timeout ambiguo puede haber duplicados. Lease, hitos y Message-ID reducen repetición; no se promete exactamente una vez bajo cualquier caída.
- TTL90d es eventual y los correos ya entregados tienen retención propia. La app rechaza sesiones vencidas; S3 expira objetos según ciclo de vida.
- PDF/DOCX/ZIP se validan, almacenan y adjuntan; no se interpreta automáticamente su contenido. Audio sí se transcribe en servidor.
- Sitemaps: URLs externas de Medium no se incluyen como `<loc>` porque no pertenecen a este host; aparecen en llms.txt/llms-full.txt y en las páginas locales bilingües indexadas.
- Holds Calendar vencidos pueden quedar visibles hasta reutilizar horario; la API los ignora para disponibilidad. Comportamiento previo conservado.
- Revisar requisitos de publicación OAuth Google y caducidad de tokens de apps en Testing. Secretos permanecen en Secrets Manager/Vercel.
- Los límites de60 turnos y120000 tokens son independientes: conocimiento y contexto consumen el presupuesto y pueden terminar antes una sesión.
