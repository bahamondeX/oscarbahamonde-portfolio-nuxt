# Contenido profesional y recursos verificados

Auditoría: 2026-11-14. Los datos biográficos preservados por indicación del propietario no se presentan como validación independiente.

## Trayectoria y credenciales

- Fuente primaria: [experiencia de Oscar en LinkedIn](https://linkedin.com/in/obahamondem/details/experience/), abierta en la sesión del propietario. Texto público archivado en `docs/linkedin-full-experience.txt` con 16 puestos, cargos, fechas, ubicaciones cuando se publican, descripciones y tecnologías. Fechas expresadas con precisión mensual; trabajos simultáneos se conservan. Las métricas de impacto son afirmaciones del propio perfil, sin auditoría independiente.
- Fuente primaria: [credenciales de Oscar en LinkedIn](https://linkedin.com/in/obahamondem/details/certifications/), abierta en la sesión del propietario. `docs/linkedin-certifications-source.txt` contiene 29 entradas. `data/certifications.json` conserva nombres, emisores, fechas de expedición y vencimiento, identificadores públicos y enlaces públicos de verificación cuando existen. Las credenciales vencidas se etiquetan como tales; no se afirma que estén vigentes.
- Los enlaces de descarga que incorporaban un token de acceso o reporte personalizado no se publican: la tarjeta dirige al perfil público. AZ-900 y AWS Solutions Achitect Associate no mostraban enlace de verificación. El título «Achitect» se conserva tal como figura en el perfil.
- [Sessionize](https://sessionize.com/obahamonde) confirma la participación en AWS UG Perú Conf 2023 y el stack del taller: Python, AioFauna, TypeScript, Vue, Docker, OpenAI y AWS.
- Logros PUCP 2007 y hackathon AWS User Group Perú 2023: proporcionados por Oscar y preservados sin alterar.

## Logos e iconos

- PNG en `public/logos/`: imágenes oficiales de empresa/emisor mostradas por LinkedIn, descargadas desde los `src` observados, convertidas a PNG con `sharp`. No se sustituyen por marcas inventadas. Se conserva el fondo original cuando forma parte de la imagen oficial; un chip neutro evita conflictos entre temas. La baja resolución de algunas fuentes de LinkedIn sigue documentada como limitación.
- Dynata y Globant usan sus marcas de mayor resolución, obtenidas de sus sitios oficiales (fuentes detalladas en `docs/company-logo-sources.md`), rasterizadas desde SVG a PNG con `sharp`.
- `docs/logo-download-sources.json` registra las URLs de origen sin firmas ni consultas temporales. Freelance, Rayke y NETCORPERU no tenían imagen de empresa en la fuente: se muestra el nombre, sin inventar un logo.
- `scripts/analyze-logos.mjs` calcula luminancia relativa media de píxeles opacos, clasificación `logoTone` y fondo de chip. `docs/logo-analysis.json` registra la medición. La media **no** constituye prueba de contraste: los tests de navegador miden el primer decil del primer plano sólido renderizado, separando el fondo incluido en la imagen.
- Iconos de tecnologías: catálogo [Devicon](https://github.com/devicons/devicon), salvo Milvus, OpenTelemetry y TeamCity de [Simple Icons](https://github.com/simple-icons/simple-icons). Agentic AI & RAG usa un pictograma propio porque es una práctica, no una marca. La grilla contiene tecnologías verificadas en LinkedIn y Sessionize.

## Proyectos y capturas

- [VOZ](https://voz.oscarbahamonde.com): captura real de la web, preserva su condición de plataforma en desarrollo.
- [Quipubase](https://github.com/bahamondeX/quipubase): captura real del README, identificada como repositorio; stack y propósito extraídos del README (RocksDB, JSON Schema, búsqueda vectorial, pub/sub).
- [aiofauna](https://github.com/obahamonde/aiofauna): captura real del README, identificada como repositorio; Python, Aiohttp, Pydantic y FaunaDB. Ocho estrellas observadas en la auditoría, sin presentarlas como contador en tiempo real.
- Archivos JPG originales en `public/images/projects/`; versiones WebP optimizadas a un máximo de 1100 px para la interfaz. No son mockups ni imágenes generadas. No se inventan métricas de adopción/impacto.
- Contenido de Medium y SEO: se detalla a continuación.

## Medium y descubribilidad

- Fuente primaria: `https://medium.com/feed/@obahamonde`, consultada el 14 de noviembre de 2026. El RSS entregó 10 entradas; la versión anterior descartaba 5 artículos alojados en publicaciones de Medium y solo mostraba las otras 5 entradas.
- Publicaciones observadas y permitidas: `medium.com`, `python.plainenglish.io`, `ai.plainenglish.io`, `blog.gopenai.com`. Un enlace de publicación solo se acepta si el GUID canónico de Medium y el identificador final del enlace coinciden. No se aceptan hosts arbitrarios.
- `server/data/medium-seed.json` y `knowledge/posts.json` conservan una copia versionada de metadatos y extractos de las 10 entradas. No contienen artículos completos. El RSS no garantiza todo el archivo histórico: la base de datos puede acumular entradas recibidas, pero no se inventan artículos fuera del feed.
- Cinco entradas incluyen una portada real; las otras cinco solo contienen píxeles de seguimiento de Medium de 1×1. Se descartan esos píxeles. Solo las entradas sin imagen real usan una portada tipográfica identificable, no una foto inventada.
- Títulos, enlaces, fechas y etiquetas proceden del RSS. El idioma ES/EN se infiere del texto y el tiempo de lectura se estima a 220 palabras/minuto; no son valores publicados por Medium. Los extractos eliminan etiquetas, scripts, iframes, firma del autor, URLs sueltas y enlaces de `medium.com/media/`.
- `/llms.txt` y `/llms-full.txt` enlazan versiones `/es` y `/en`, URL canónica de Medium y URL de publicación. Se generan con caché de Nitro y usan la última copia válida si el RSS falla.
- El sitemap conserva solamente URLs del dominio del sitio: el protocolo Sitemap requiere URLs del mismo host que el sitemap. Incluir un `<loc>` de Medium dentro de `oscarbahamonde.com` produciría un sitemap inválido. Las URLs externas se mantienen en las páginas y ambos archivos llms; no se afirma haber incluido esos dominios como `<loc>`.
- Fuente del requisito de host: `https://www.sitemaps.org/protocol.html`. Las rutas locales de blog usan `lastmod` de la fecha RSS y transformación i18n del módulo de sitemap. `BreadcrumbList` y `BlogPosting` enlazan cada extracto local con su publicación original.
