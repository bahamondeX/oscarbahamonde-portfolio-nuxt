# Reversión del asistente sin cambiar su URL

## Estado de esta entrega

Plan y script preparados; **ninguna captura, publicación de versión, alias, change set o rollback AWS se ejecutó** en esta fase. La sesión AWS está vencida. `node --check` y el modo local `--plan` pasan; evidencia: `docs/audit/after/grounding/rollback-plan.json` (`awsCalls: 0`). Esto no equivale a una prueba de rollback en producción.

La plantilla SAM local configura `Chat.FunctionUrlConfig` con `RESPONSE_STREAM` y no contiene `AutoPublishAlias`. Esto sugiere `$LATEST` en un despliegue normal, pero no confirma el estado remoto: antes de desplegar hay que capturar `ListFunctionUrlConfigs` y las aliases actuales. Una URL puede estar asociada a `$LATEST` o a una alias; cambiar una alias solo cambia el tráfico si **esa URL** apunta a ella. No se crea una URL ni se cambia el binding durante este procedimiento.

## Antes de desplegar

```sh
node assistant/scripts/snapshot-rollback.mjs --plan
AWS_REGION=us-east-1 ASSISTANT_STACK=oscar-assistant node assistant/scripts/snapshot-rollback.mjs --capture
```

`--capture` requiere AWS autenticado. Lee el stack estable y la plantilla SAM **empaquetada** actual, parámetros, funciones, configuración, aliases y URLs. Descarga cada ZIP de Lambda y comprueba su SHA-256. Conserva una versión publicada que coincida en código/configuración, o publica una nueva con precondiciones `CodeSha256` y `RevisionId` para evitar capturar una revisión que cambió a mitad de la operación. No modifica código, configuración, aliases ni tráfico.

Todo se escribe en un directorio temporal nuevo `oscar-assistant-rollback-*`, permisos `0700`, archivos `0600`. `snapshot.json` contiene configuración y podría contener secretos: **nunca copiarlo al repo, logs públicos o artefactos CI**. Las URLs firmadas de descarga nunca se imprimen ni guardan. Los backups ZIP también son privados. Conservar este directorio en almacenamiento privado seguro durante la ventana de reversión; `/tmp` no es almacenamiento duradero.

Si una operación falla, `complete` queda `false`: no desplegar con una captura incompleta. Los parámetros `NoEcho` enmascarados necesitan un procedimiento separado con valores anteriores seguros; el script aborta en lugar de convertir `****` en un secreto. Un `PublishVersion` sin cambios puede no crear versión nueva; se reutiliza una versión publicada coincidente cuando su configuración es verificable.

Registrar en la evidencia pública solo: fecha, commit previo, nombres/lógicos de funciones, SHA de código, números de versión y binding de URL, sin variables, parámetros privados ni ZIP. Verificar que los artefactos S3 del SAM anterior no se borran durante la ventana de reversión.

## Reversión preferida: restaurar mediante CloudFormation

```sh
AWS_REGION=us-east-1 ASSISTANT_STACK=oscar-assistant node assistant/scripts/snapshot-rollback.mjs --prepare /ruta/privada/oscar-assistant-rollback-...
```

El script comprueba cuenta/región/identidad del stack, snapshot completo, referencias S3 empaquetadas y existencia de sus objetos. Crea un **change set UPDATE**, sin ejecutarlo, con la plantilla y los parámetros capturados. Si el cuerpo supera 51.200 bytes, aborta: se debe subir la plantilla a un objeto privado del bucket de artefactos existente y usar `TemplateURL`, nunca truncarla.

1. Esperar `CREATE_COMPLETE` del change set y revisar todos sus cambios. Para una reversión de esta entrega se esperan código/configuración de Lambdas y únicamente los cambios SAM correspondientes. Detenerse ante eliminación/reemplazo de tablas, bucket, URL, KMS, secretos o funciones, o cualquier cambio no esperado.
2. Ejecutar el change set revisado con `aws cloudformation execute-change-set --stack-name oscar-assistant --change-set-name NOMBRE --region us-east-1`.
3. Esperar `UPDATE_COMPLETE`; si ocurre `UPDATE_ROLLBACK_*`, inspeccionar los eventos y no declarar la reversión concluida.
4. Comparar `GetFunction` y `GetFunctionConfiguration` con la captura: SHA, runtime, handler, memoria, timeout, modelo/Guardrail y otras configuraciones. Comparar valores sensibles solo en memoria; publicar únicamente coincidencia/no coincidencia.
5. Comprobar que la **misma Function URL** conserva su ARN de destino, modo streaming, CORS y autenticación. Si antes apuntaba a `$LATEST`, el rollback debe restaurar `$LATEST`; una alias adicional no lo resolvería.
6. Repetir ES/EN, consentimiento, aislamiento de sesiones, tools, tarifa S/20 y la batería HTTP desplegada. No crear un evento ni cobrar para verificar una reversión sin autorización específica.

Restaurar por CloudFormation mantiene el template SAM y sus recursos alineados. Conservar el commit del SAM anterior y el nuevo; si se revierte producción, registrar qué revisión está realmente activa. Evitar cambios manuales de código/configuración como camino normal: producirían drift. Un rollback de emergencia manual requiere reconciliar después el stack con la plantilla anterior y comprobar drift de recursos soportados, además de comparar explícitamente hashes/configuración de Lambda porque la detección de drift no cubre todos los aspectos del código.

## Alcance y límites

- Las versiones de Lambda preservan código/configuración, no copian DynamoDB, S3, secretos ni políticas externas.
- Este procedimiento no revierte migraciones de datos; esta entrega no debe introducirlas para una corrección de grounding.
- Las escrituras de leads ya realizadas y correos enviados no se deshacen al cambiar código.
- Las aliases y URLs se capturan como evidencia; no se inventa ni asume una estrategia de tráfico por alias.
- Los backups ZIP permiten recuperación si un artefacto S3 desaparece, pero hay que reponerlo de forma privada y preparar de nuevo un SAM empaquetado consistente antes de ejecutar el rollback.

Fuentes oficiales consultadas el 14-11-2026: [Function URLs y versiones/aliases](https://docs.aws.amazon.com/lambda/latest/dg/urls-configuration.html), [FunctionUrlConfig](https://docs.aws.amazon.com/lambda/latest/api/API_FunctionUrlConfig.html), [PublishVersion y precondiciones](https://docs.aws.amazon.com/lambda/latest/api/API_PublishVersion.html).
