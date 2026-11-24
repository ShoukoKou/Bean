const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const base = new URL(process.env.BEAN_URL || "http://127.0.0.1:8765/");
const axe = process.env.BEAN_AXE || require.resolve("axe-core/axe.min.js");
const etiquetasAxe = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const rutas = [
    ["", "Hay detalles que se quedan."],
    ["catalogo", "Hay detalles que se quedan."],
    ["producto/tulipanes", "Tulipanes de rubor"],
    ["compra/tulipanes", "Un detalle que lo dice todo."],
    ["personalizar", "Cuéntanos lo que imaginas."],
    ["seguimiento", "Mis pedidos"],
    ["seguimiento/BB-111111111111", "Tu idea ya está en buenas manos."],
    ["seguimiento/BB-222222222222", "Un pequeño cambio. La misma ilusión."],
    ["seguimiento/BB-333333333333", "Lo tenemos. Va a ser especial."],
    ["seguimiento/BB-444444444444", "Esta vez no podremos crearlo."],
    ["taller", "Solicitudes y pedidos"],
    ["taller/BB-111111111111", "Solicitudes y pedidos"]
];

async function sembrarDatos(pagina) {
    await pagina.evaluate(async function () {
        const modulo = new URL("js/solicitudes.mjs", document.baseURI);
        const { crearSolicitud, cambiarEstado, fechaLocal } = await import(modulo.href);
        const datos = {
            tipo: "personalizada", nombre: "Nombre Ficticio", zona: "Distrito de Ejemplo",
            titulo: "Ramo de aniversario", fecha: fechaLocal(),
            descripcion: "Ramo de margaritas y flores pequeñas de limpiapipas.", colores: "Rosa y lavanda"
        };
        const propuesta = { importe: "95,55", detalle: "Ramo viable con cinta lavanda.", fecha: datos.fecha };
        const recibida = crearSolicitud(datos, "BB-111111111111");
        const alternativa = cambiarEstado(crearSolicitud(datos, "BB-222222222222"), "proponer", propuesta);
        const viable = cambiarEstado(crearSolicitud(datos, "BB-333333333333"), "aprobar", propuesta);
        const acuerdo = cambiarEstado(viable, "aceptar");
        const inviable = cambiarEstado(crearSolicitud(datos, "BB-444444444444"), "descartar", { motivo: "Materiales no disponibles." });
        const largo = "A".repeat(60);
        const cadenaLarga = crearSolicitud({
            ...datos, nombre: largo, titulo: largo, zona: largo, descripcion: largo + largo, colores: largo
        }, "BB-555555555555");
        localStorage.setItem("bean-blossoms.solicitudes.v1", JSON.stringify([recibida, alternativa, acuerdo, inviable, cadenaLarga]));
    });
}

async function comprobarGeometria(pagina, ruta, ancho) {
    const problemas = await pagina.evaluate(function () {
        const controles = document.querySelectorAll("#contenido .boton, #contenido input, #contenido select, .menu, .seguimiento-cabecera");
        return {
            desborde: document.documentElement.scrollWidth > innerWidth,
            controles: Array.from(controles).filter(function (control) {
                const caja = control.getBoundingClientRect();
                return caja.width > 0 && Math.min(caja.width, caja.height) < 24;
            }).map(function (control) { return control.id || control.textContent.trim(); }),
            imagenes: Array.from(document.images).filter(function (imagen) {
                return !imagen.hasAttribute("alt") || (imagen.complete && imagen.naturalWidth === 0);
            }).map(function (imagen) { return imagen.currentSrc || imagen.src; })
        };
    });
    const contexto = ruta + " a " + ancho + " px";
    assert.equal(problemas.desborde, false, contexto);
    assert.deepEqual(problemas.controles, [], contexto);
    assert.deepEqual(problemas.imagenes, [], contexto);
}

async function comprobarAccesibilidad(pagina, ruta, ancho) {
    await pagina.addScriptTag({ path: axe });
    const infracciones = await pagina.evaluate(async function (etiquetas) {
        const resultado = await window.axe.run({ runOnly: { type: "tag", values: etiquetas } });
        return resultado.violations.map(function (infraccion) {
            return { id: infraccion.id, nodos: infraccion.nodes.map(function (nodo) { return nodo.target; }) };
        });
    }, etiquetasAxe);
    assert.deepEqual(infracciones, [], ruta + " a " + ancho + " px");
}

async function ejecutar() {
    const navegador = await chromium.launch({
        executablePath: process.env.BEAN_CHROMIUM || undefined,
        args: ["--no-sandbox"]
    });

    try {
        for (const ancho of [360, 390, 768, 1024, 1440]) {
            const contexto = await navegador.newContext({ viewport: { width: ancho, height: 900 } });
            const pagina = await contexto.newPage();
            await pagina.goto(base.href);
            await sembrarDatos(pagina);

            for (const [ruta, titulo] of rutas) {
                await pagina.goto(new URL("#" + ruta, base).href);
                await pagina.getByRole("heading", { level: 1, name: titulo, exact: true }).waitFor();
                await pagina.evaluate(function () { return document.fonts.ready; });
                await comprobarGeometria(pagina, ruta, ancho);

                if (ancho === 390 || ancho === 1440) {
                    await comprobarAccesibilidad(pagina, ruta, ancho);
                }
            }

            await pagina.goto(new URL("#taller/BB-555555555555", base).href);
            await pagina.getByRole("heading", { name: "A".repeat(60), exact: true }).waitFor();
            await comprobarGeometria(pagina, "Detalle con texto largo", ancho);
            await contexto.close();
        }

        console.log("OK · 60 combinaciones de geometría, 5 casos de texto largo y 24 escaneos axe sin infracciones.");
    } finally {
        await navegador.close();
    }
}

ejecutar().catch(function (error) {
    console.error(error);
    process.exitCode = 1;
});
