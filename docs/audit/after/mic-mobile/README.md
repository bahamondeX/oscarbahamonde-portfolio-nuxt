# Audio móvil — evidencia y límite real

Revisión del 14 de noviembre de 2026. `verification.json` no marca aprobados iOS ni Android: no hay dispositivo móvil controlable expuesto, conexión BrowserStack autenticada ni herramientas adb/idevice_id. Desktop Commander solo devolvió un equipo de escritorio desconectado. No se grabó audio ambiente ni se enviaron mensajes o correos desde esta comprobación.

## Fallo corregido y alcance de las pruebas

`file-type` identifica un contenedor M4A como `audio/x-m4a`. El worker esperaba `audio/mp4` y lo rechazaba como `mime_mismatch`. Ahora se normaliza esa firma, se conservan los MIME permitidos y se indica a Transcribe el contenedor MP4/M4A/WebM/Ogg detectado en el archivo. El test usa una cabecera ISO BMFF sintética para reproducir exactamente la clasificación; **no es una grabación válida ni prueba Transcribe**.

El navegador negocia con `MediaRecorder.isTypeSupported`, incluye MP4/AAC para Safari y WebM/Opus para Chromium, valida el MIME resultante y permite previsualización antes de enviar. Evita solicitudes de permiso simultáneas, cierra pistas al fallar/desmontar y presenta mensajes diferenciados para permiso denegado o grabación no compatible. Se puede adjuntar MP4/M4A, WebM u Ogg como alternativa. Se añadió `Permissions-Policy: microphone=(self)`; la consulta HTTPS previa al cambio respondió200 sin ese encabezado. Su presencia tras publicar requiere volver a comprobarla.

Reproducción de pruebas locales: `cd assistant && node --import tsx --test test/audio.test.ts`. Tres pruebas aprobadas y typecheck Nuxt aprobado. El typecheck global del backend se ejecutó mientras otro cambio de grounding seguía en curso y registró errores ajenos al audio; debe repetirse sobre la versión congelada. Los archivos `unit-tests.txt`, `backend-typecheck.txt` y `nuxt-typecheck.txt` contienen sus resultados reales. Esto no sustituye la prueba de permisos, grabación, vista previa, subida, Transcribe y Gmail en cada dispositivo físico.

## Procedimiento pendiente en cada dispositivo

1. Anotar modelo, versión de SO y navegador reales. Abrir `/es` o `/en` por HTTPS en una sesión nueva; completar Turnstile si lo pide.
2. Abrir el bot, pulsar grabar, aceptar el permiso de guardar audio/conversación y permitir el micrófono. Grabar una frase no personal identificable, por ejemplo «Prueba de audio móvil, necesito información sobre una landing».
3. Detener y escuchar la vista previa; comprobar temporizador, botón descartar y tamaño. Enviar y verificar texto transcrito coherente, sin dar por correcto un archivo solo por haberse subido.
4. Pulsar «Enviar a Oscar» y comprobar recepción con transcripción completa y audio adjunto o enlace. Conservar capturas/video sin tokens, identificadores privados ni correo personal visible.
5. Repetir con permiso denegado: debe aparecer la alternativa de adjuntar audio o escribir. Revocar el permiso desde ajustes del navegador, no desde una imitación en un test.
6. Actualizar cada campo `null` de `verification.json` solo con evidencia observada y agregar los archivos de captura por dispositivo.

## Turnstile

La UI ahora ofrece «Reintentar verificación» ante error, expiración o timeout. El reintento usa `turnstile.reset(widgetId)` o vuelve a cargar el script si falló; conserva el borrador y no elude el captcha. Un script fallido se retira y su espera está acotada a15s. La comprobación de éxito en sesión nueva y de consola de aplicación limpia continúa pendiente del navegador real; no se presenta el manejo de callbacks como una verificación de Cloudflare aprobada.

## Referencias oficiales

- [WebKit MediaRecorder, contenedor MP4 y AAC](https://webkit.org/blog/11353/)
- [MDN isTypeSupported](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static)
- [MDN Permissions-Policy microphone](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy/microphone)
- [Amazon Transcribe StartTranscriptionJob y formatos](https://docs.aws.amazon.com/transcribe/latest/APIReference/API_StartTranscriptionJob.html)
- [Cloudflare errores y reintentos](https://developers.cloudflare.com/turnstile/troubleshooting/client-side-errors/)
