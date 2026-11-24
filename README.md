# Bean Blossoms

Prototipo académico de un taller peruano de ramos artesanales de limpiapipas. El catálogo, las solicitudes, el taller y los pagos funcionan con datos ficticios en el navegador.

## Ejecutar localmente

Desde la raíz de **Bean**, abre una terminal y ejecuta:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Abre `http://127.0.0.1:8000/` en un navegador moderno. En Windows puedes usar `py -m http.server 8000 --bind 127.0.0.1`. Detén el servidor con Ctrl+C. Usa el mismo navegador, perfil, host y puerto para conservar los registros. El sitio necesita HTTP para cargar sus módulos JavaScript.

## Recorrer la demostración

- **Tienda.** Elige un ramo, ajusta la cantidad y la dedicatoria, completa los datos ficticios y simula el 50 % de adelanto para confirmar el pedido.
- **Personalización.** Envía una idea y guarda su código. Desde **Panel del taller** abre el registro y envía una propuesta o indica que la idea no es viable. Vuelve al seguimiento para aceptar o rechazar y, si aceptas, simula el adelanto.
- **Taller y entrega.** Abre el pedido confirmado, marca elaboración o listo para entrega según corresponda y registra el despacho. Desde seguimiento confirma la recepción e informa el saldo. El taller lo verifica o lo devuelve a regularización.
- **Operaciones de la práctica.** Busca por código, nombre o idea, filtra por estado y prueba el borrado con confirmación. El panel está abierto como parte de la demo local. Usa datos ficticios.

## Archivos y arquitectura

| Ruta | Responsabilidad |
| --- | --- |
| `index.html`, `css/estilos.css` | Estructura semántica, componentes, variables de diseño y adaptación. |
| `js/catalogo.mjs`, `js/solicitudes.mjs` | Productos, validaciones, cálculo en céntimos, búsqueda y transiciones del negocio. |
| `js/almacen.mjs` | Lectura y escritura de JSON en localStorage, códigos aleatorios, respaldo de JSON inválido y serialización de cambios con Web Locks donde se admite. |
| `js/vistas.mjs`, `js/interfaz.mjs` | Plantillas, rutas hash, formularios, borradores durante la navegación y retroalimentación. |
| `img/`, `fuentes/` | Fotografías ilustrativas de demostración generadas para el proyecto y fuentes locales con sus licencias OFL. |
| `pruebas/` | Pruebas de negocio y de navegador. |
| `sql/`, `docs/` | Esquema, trazabilidad, integración y resultados de revisión. |

El estado se guarda con el historial de cada solicitud. Al detectar JSON inválido se conserva una copia en la clave que termina en `.respaldo` y se inicia una lista vacía. El almacenamiento pertenece a un origen y perfil del navegador. El código de seguimiento identifica un registro en esa copia local. Un error de guardado deja visible el formulario. En navegadores sin Web Locks, las operaciones simultáneas entre pestañas pueden competir.

## Pruebas

```sh
node --test pruebas/solicitudes.test.mjs
```

Para repetir la prueba de navegador, instala Playwright en una carpeta auxiliar para mantener el proyecto sin dependencias. Ejemplo para Bash:

```sh
herramientas="$(mktemp -d)"
npm install --prefix "$herramientas" playwright axe-core
"$herramientas/node_modules/.bin/playwright" install chromium
NODE_PATH="$herramientas/node_modules" BEAN_URL=http://127.0.0.1:8000/ node pruebas/navegador.cjs
NODE_PATH="$herramientas/node_modules" BEAN_URL=http://127.0.0.1:8000/ node pruebas/accesibilidad.cjs
```

Por defecto el recorrido genera capturas en `/tmp/bean-capturas`. `BEAN_CAPTURAS` permite cambiar el destino y `BEAN_CHROMIUM` elegir un Chromium instalado. Consulta los [resultados reales](docs/pruebas.md).

## Integración y despliegue posterior

- Consulta el [esquema PostgreSQL](sql/esquema.sql) y la [guía de Supabase](docs/supabase.md).
- Cuando autorices el despliegue, sube los archivos a tu repositorio personal, selecciona **Settings → Pages → Deploy from a branch**, elige la rama que contiene el proyecto y la carpeta **/(root)**. Tras finalizar el despliegue, abre la URL que indique GitHub y verifica catálogo, navegación, recarga y apertura directa de un enlace con hash. Los recursos se cargan con rutas relativas, incluso en una subcarpeta como `/Bean/`.
- Consulta la [matriz de trazabilidad y las diferencias](docs/trazabilidad.md).
