# Trazabilidad y diferencias

## Fuentes consultadas

- **Eternas**, exportación de Figma de 14 páginas. Las páginas 1–10 son de escritorio y las páginas 11–14 son de móvil. Se renderizó el PDF y se comparó con capturas del sitio. El archivo nativo `.fig` llegó íntegro y se inspeccionó como contenedor; la exportación fue la fuente visual porque la sesión no contaba con un conector para abrir el lienzo editable.
- **AS_IS_Eternas** y **TO_BE_Eternas**, leídos desde los XML de sus diagramas Bizagi. Se verificaron 20 actividades y 20 transiciones en AS-IS y 29 actividades y 30 transiciones en TO-BE.
- **Repositorio académico**, consultado por Git en modo lectura. `main` (`fb973c1`) contiene dos HTML. `sesion03_registro_solicitudes` (PR #3, `d25a469`) aporta registro y búsqueda en memoria. `validar_identificacion` (PR #2, `0134ec0`) aporta un ejemplo de validación. Se usaron como referencias funcionales para una implementación propia.
- **Encargo y precisiones** de los textos adjuntos. Las diapositivas de la sesión 04 y `Laboratorio__14.pdf` no llegaron a este entorno, así que los requisitos académicos se trazaron contra el encargo y los ejemplos de las ramas accesibles.

| Actividad del proceso | Pantallas de Figma | Requisito académico verificable | Prototipo |
| --- | --- | --- | --- |
| Explorar catálogo y seleccionar un ramo | 1, 2, 11 | Navegación, ficha HTML de `main` | Tienda con cuatro productos, ficha, cantidad, dedicatoria y subtotal. |
| Solicitar datos y pasar al adelanto estándar | 3 | Validación y proceso de compra | Formulario de nombre, zona y fecha. El producto y la cantidad fijan el total. |
| Completar cuestionario de personalización | 4, 12 | PR #3 registra idea, descripción, nombre y fecha | Formulario por secciones, solicitud preliminar y código único. |
| Revisar solicitud y responder | 5, 6, 9, 10, 13 | PR #3 busca y actualiza; Figma muestra las salidas de revisión | Taller con búsqueda, filtros, viabilidad, alternativa y motivo de no viabilidad. |
| Decidir sobre la propuesta | 6, 7, 13, 14 | Encargo y Figma | Aceptar habilita el adelanto. Rechazar cierra la propuesta sin convertirla en pedido. |
| Confirmar adelanto y registrar pedido | 3, 7, 8, 14 | TO-BE exige verificación del 50 % antes del pedido | El dato simulado registra la confirmación. Cancelar antes del adelanto deja un pedido no concretado. |
| Revisar producción, elaborar si corresponde y despachar | 10 | Actividades y decisión de elaboración del TO-BE | Taller puede iniciar elaboración o pasar directamente a listo. Después registra el despacho. |
| Confirmar recepción, informar saldo y verificarlo | Secuencia posterior en TO-BE | Verificación del saldo restante y regularización | Cliente confirma recepción e informa el saldo simulado. Taller verifica y cierra o devuelve a regularización. |
| Retener los registros, buscar y eliminar | 10 | Encargo pide persistencia, búsqueda sin mutar datos y borrado con confirmación | JSON en localStorage con historial, filtros independientes, confirmación y respaldo en caso de datos inválidos. |

## Diferencias deliberadas

- **Lenguaje visual.** Se conservaron portada dividida en escritorio y apilada en móvil, catálogo de cuatro y dos columnas, fondos marfil/gris/rosa, titulares serif, fichas con foto a la izquierda, formulario con resumen, progreso de solicitud y lista/detalle del taller. La marca, el texto y el contenido se adaptaron a Bean Blossoms. El PDF no reveló los nombres originales de fuente, por lo que se usaron Cormorant Garamond y DM Sans como aproximaciones. Las fotos de arreglos de limpiapipas son ilustraciones generadas para esta demostración. El panel reproduce la división lista/detalle sin las secciones laterales que quedan fuera del MVP.
- **Detalle de pantallas.** El formulario personalizado reúne datos y dedicatoria en dos grupos. El MVP simplifica galerías, campos de contacto y dirección, accesorios, contenido testimonial y desglose de envío. El importe y la decisión del cliente aparecen en el seguimiento. El paso de entrega y adelanto estándar usa dos vistas sucesivas.
- **Proceso.** La revisión humana se aplica a la personalización, según las pantallas de Figma. El TO-BE agrupa taller, logística y verificación con mayor detalle. La demo conserva las decisiones relevantes con controles de taller/cliente y agrupa la preparación, envoltorio y coordinación del motorizado en los estados listo y en camino. La simulación del adelanto representa su registro y confirmación en una acción. El saldo sí se informa y verifica en pasos distintos.
- **Datos.** La moneda es PEN, se introducen nombres y distritos ficticios y el acceso es local al navegador. El esquema PostgreSQL es una propuesta de integración y las políticas se probaron con roles simulados, según el informe.
