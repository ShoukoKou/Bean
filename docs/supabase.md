# Integración futura con Supabase

La demostración se ejecuta por completo en el navegador. El SQL propone dos tablas, restricciones de integridad y políticas de lectura por cliente autenticado o por rol de taller. Los códigos públicos sirven para encontrar una solicitud dentro de la cuenta autorizada.

1. En un proyecto de **pruebas** de Supabase, habilita Auth y aplica [el esquema](../sql/esquema.sql) una vez mediante SQL Editor o una migración versionada. Usa dos cuentas de cliente y una de taller para probar el aislamiento.
2. Asigna `bean_rol: taller` en `app_metadata` a la cuenta autorizada mediante la API administrativa, desde un entorno de confianza. Renueva la sesión para que el JWT refleje el cambio.
3. Implementa las mutaciones en una función de servidor o de base de datos con una interfaz específica por operación. Antes de escribir, valida sesión, titularidad o rol, transición, fecha y montos. Usa un catálogo confiable en el servidor y guarda el estado y su evento en la misma transacción. Bloquea la fila o compara el estado esperado para que un reintento no duplique el efecto. El esquema concede lectura a clientes autenticados y reserva las escrituras al rol de servicio.
4. Sustituye el adaptador [almacen.mjs](../js/almacen.mjs) por llamadas asíncronas al servicio y cambia sus consumidores de lectura para esperar el resultado y mostrar carga y errores. Conserva la interfaz, los códigos y los estados. Prepara una estrategia explícita para importar datos ficticios si se requiere.
5. Configura la URL y la clave publicable del proyecto en el cliente cuando exista el servicio. Mantén la clave privada del rol de servicio exclusivamente en el entorno seguro del servidor. Verifica en Supabase real que un cliente solo lee sus filas, el taller lee las que corresponden, el acceso anónimo queda denegado y los clientes no escriben directamente.

El cálculo redondea hacia arriba al centavo en el adelanto cuando el total tiene un número impar de céntimos y conserva exactamente el resto. Por ejemplo, S/ 95,51 se divide en S/ 47,76 y S/ 47,75. La integración seguirá siendo una simulación mientras no exista otro alcance.
