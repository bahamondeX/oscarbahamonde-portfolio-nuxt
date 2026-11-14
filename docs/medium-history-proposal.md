# Histórico de Medium — propuesta pendiente de aprobación

El RSS consultado contiene10 publicaciones y el sitio muestra las10. No se ha establecido el total histórico de la cuenta, por lo que no se afirma que el feed represente todos sus artículos. Esta propuesta no añade un importador, scraper ni artículos nuevos.

| Alternativa | Qué haría | Revisión necesaria |
|---|---|---|
| Exportación de Medium | Leer el archivo de exportación proporcionado por Oscar y generar un índice versionado de sus publicaciones, conservando título, fecha original y URL verificable. | Seleccionar únicamente posts publicados; excluir borradores y datos personales de la exportación. Mantener solo extractos y portadas autorizadas, no republicar automáticamente el cuerpo completo. |
| Índice manual versionado | Agregar a un JSON las URLs históricas aprobadas por Oscar, con título, fecha, idioma y portada verificables. | Comprobar autoría y destino de cada URL, evitar duplicados por identificador Medium y mantener el RSS para novedades. |

La exportación permite cubrir más artículos con menos trabajo manual; el índice manual es adecuado si faltan pocas URLs. En ambos casos se reutilizarían las páginas bilingües, llms y sitemap local existentes después de validar metadatos. La publicación histórica en otra web de Medium conserva su enlace original y no se convierte en una URL inventada.

**No implementado.** Hace falta el OK de Oscar sobre una de las alternativas y el archivo de exportación o lista de enlaces correspondiente. No se solicita contraseña, cookie ni token de Medium.
