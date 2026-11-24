# Resultados de pruebas y revisiones

Pruebas ejecutadas el 24 de noviembre de 2026 en Chromium 156.0.8078.79 y un servidor HTTP local. El recorrido final se ejecutó con la aplicación montada bajo `/Bean/`, equivalente a la estructura de rutas de un sitio de proyecto en GitHub Pages.

| Comprobación final | Resultado observado |
| --- | --- |
| Lógica y almacenamiento | 8 pruebas de Node aprobadas. Cubrieron validación, fecha de Lima, compra estándar, aceptación, adelanto y saldo en céntimos, no viabilidad, búsqueda y recuperación. |
| Catálogo y compra estándar | La cantidad inválida se rechazó con un mensaje en español. Cantidad, dedicatoria y nombre se conservaron al volver entre pantallas. Dos ramos de S/ 49,00 originaron un adelanto de S/ 49,00. |
| Personalización, respuesta y seguimiento | Los campos inválidos bloquearon el envío y recibieron foco. Se conservaron los campos válidos. Dos solicitudes tuvieron códigos distintos. Se probaron búsqueda por código con y sin coincidencia, filtro por estado, alternativa, aceptación, rechazo y no viabilidad. |
| Estados y persistencia | Se verificaron recargas después del registro, de la propuesta, del acuerdo y del cierre. Aceptar la propuesta conservó la solicitud separada del pedido confirmado por adelanto. Se completaron elaboración, despacho, recepción, saldo observado, reenvío y cierre. |
| Borrado y datos inválidos | Cancelar conservó el registro. Confirmar lo eliminó incluso tras recargar. Inyectar JSON malformado generó un respaldo, presentó un aviso y permitió generar un registro nuevo. |
| Responsive y teclado | 30 combinaciones de seis vistas con anchos de 360, 390, 768, 1024 y 1440 px en el recorrido. Se verificaron etiquetas, saltos y foco del teclado, menú móvil y uso del flujo personalizado a 390 px. La auditoría separada añadió 60 combinaciones de 12 rutas, comprobó alt e imágenes, controles revisados de al menos 24 px y cinco casos con texto largo. |
| Accesibilidad automática | 24 escaneos axe-core 4.10.3 a 390 y 1440 px, con reglas WCAG A/AA aplicables, sin infracciones detectadas. El recorrido también verificó foco visible, cierre del menú con Escape y enlace de retorno a la lista. Se usó movimiento reducido en el recorrido. |
| Consola y red | Cero errores de JavaScript, consola o respuestas HTTP fallidas durante la ejecución final de Playwright. |
| PostgreSQL | El esquema se aplicó en PGlite 0.6.0 con esquemas y roles simulados de Supabase. Se verificaron escritura de servicio, restricciones de adelanto, lectura aislada entre dos clientes, acceso del taller al historial, y bloqueo de escritura directa y lectura anónima. |

La verificación cubre un motor de navegador, tamaños emulados y análisis automatizado. Quedan fuera de la evidencia lector de pantalla, pruebas en dispositivos físicos, otros motores, Supabase desplegado y GitHub Pages publicado.

## Ronda 1 · Construcción y contraste

La inspección contrastó las vistas del prototipo con las páginas 1–14. Se identificó un selector de prueba ambiguo, un encabezado de seguimiento que anunciaba una alternativa para una propuesta original y mensajes nativos de cantidad en inglés. La revisión visual independiente y la inspección de navegador coincidieron en un problema de severidad alta: seleccionar una solicitud móvil dejaba el detalle fuera de la vista y el foco en el título general. Se observó también el foco perdido al regresar a inicio y la propuesta enterrada por la foto en móvil.

## Ronda 2 · Revisión crítica y reejecución

| Gravedad | Corrección y evidencia |
| --- | --- |
| Alta | El taller desplaza y enfoca el detalle en móvil. En la comprobación con 20 registros, el artículo pasó de estar por debajo de la ventana (a unos 2623 px) a entrar en pantalla con el foco activo. El recorrido final verifica apertura y retorno a la lista. |
| Media | Las condiciones y el total se muestran junto al progreso y antes del resumen móvil. Playwright verifica su orden. La viabilidad original y la alternativa tienen encabezados diferentes. |
| Media | Las reglas de cantidad y fecha tienen mensajes en español. El inicio acepta foco al volver mediante la marca. El enlace de salto fue comprobado desde una carga inicial. |
| Baja | Se declaró un icono relativo para evitar la petición de favicon ausente detectada en la consola. El recorrido final también pasó bajo la ruta `/Bean/`. |

La evaluación visual de UXCritique y la comprobación de navegador se hicieron en revisiones separadas. El ejecutable `impeccable detect` no estaba instalado. La revisión de navegador usó Playwright, axe e inspección de las capturas. Corregidos los defectos, los recorridos y comprobaciones de la tabla volvieron a ejecutarse.

## Capturas finales

| Pantalla | Escritorio · 1440 px | Móvil · 390 px |
| --- | --- | --- |
| Portada y catálogo | [Inicio](capturas/escritorio-inicio.webp) | [Inicio](capturas/movil-inicio.webp) |
| Producto y entrega estándar | [Ficha](capturas/escritorio-producto.webp) · [Entrega](capturas/escritorio-compra.webp) | — |
| Personalización | [Formulario](capturas/escritorio-personalizar.webp) | [Formulario](capturas/movil-personalizar.webp) |
| Seguimiento | [Propuesta](capturas/escritorio-propuesta.webp) · [Acuerdo](capturas/escritorio-acuerdo.webp) · [No viable](capturas/escritorio-no-viable.webp) | [Propuesta](capturas/movil-propuesta.webp) · [Acuerdo](capturas/movil-acuerdo.webp) |
| Taller | [Taller](capturas/escritorio-taller.webp) | — |

Las diferencias visibles y de proceso se detallan en la [matriz de trazabilidad](trazabilidad.md).
