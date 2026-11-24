const assert = require("node:assert/strict");
const { mkdir } = require("node:fs/promises");
const { join } = require("node:path");
const { chromium } = require("playwright");

const base = process.env.BEAN_URL || "http://127.0.0.1:8765/";
const carpeta = process.env.BEAN_CAPTURAS || "/tmp/bean-capturas";
const clave = "bean-blossoms.solicitudes.v1";

async function titulo(pagina, texto) {
    await pagina.getByRole("heading", { name: texto, exact: true, level: 1 }).waitFor();
}

async function acceder(pagina, ruta) {
    await pagina.goto(base + "#" + ruta);
    await pagina.locator("main h1").waitFor();
}

async function captura(pagina, nombre) {
    await pagina.evaluate(function () { return document.fonts.ready; });
    await pagina.screenshot({ path: join(carpeta, nombre + ".png"), fullPage: true, animations: "disabled" });
}

async function fechaValida(pagina) {
    const campo = pagina.getByLabel("Fecha deseada", { exact: true });
    const minima = await campo.getAttribute("min");
    await campo.fill(minima);
    return minima;
}

async function personalizar(pagina, nombre, idea) {
    await acceder(pagina, "personalizar");
    await titulo(pagina, "Cuéntanos lo que imaginas.");
    await pagina.getByLabel("Nombre de tu idea", { exact: true }).fill(idea);
    await pagina.getByLabel("¿Cómo imaginas el ramo?", { exact: true }).fill("Un ramo de margaritas y detalles pequeños.");
    await pagina.getByLabel("Flores o colores que prefieres").fill("Marfil y rosa");
    await pagina.getByLabel("Nombre", { exact: true }).fill(nombre);
    await pagina.getByLabel("Distrito o zona de entrega").fill("Barranco");
    const fecha = await fechaValida(pagina);
    await pagina.getByRole("button", { name: "Enviar mi solicitud" }).click();
    await titulo(pagina, "Tu idea ya está en buenas manos.");
    return { id: await pagina.locator(".codigo").textContent(), fecha };
}

async function pulsar(pagina, texto) {
    await pagina.getByRole("button", { name: texto }).click();
}

async function registros(pagina) {
    return pagina.evaluate(function (llave) {
        return JSON.parse(localStorage.getItem(llave));
    }, clave);
}

async function estado(pagina, id, esperado) {
    await pagina.waitForFunction(function ({ llave, id, esperado }) {
        return JSON.parse(localStorage.getItem(llave)).some(function (fila) {
            return fila.id === id && fila.estado === esperado;
        });
    }, { llave: clave, id, esperado });
}

async function compraEstandar(pagina) {
    await acceder(pagina, "inicio");
    await captura(pagina, "escritorio-inicio");
    await pagina.getByRole("link", { name: "Ver diseños disponibles" }).click();
    await pagina.getByRole("link", { name: "Elegir Tulipanes de rubor" }).click();
    await titulo(pagina, "Tulipanes de rubor");
    await captura(pagina, "escritorio-producto");
    await pagina.getByLabel("Dedicatoria (opcional)").fill("Para alguien especial");
    await pagina.getByLabel("Cantidad").fill("0");
    await pulsar(pagina, "Continuar");
    assert.equal(await pagina.getByLabel("Cantidad").getAttribute("aria-invalid"), "true");
    await pagina.getByText("Elige una cantidad entera de 1 a 20.", { exact: true }).waitFor();
    await pagina.getByLabel("Cantidad").fill("2");
    await pulsar(pagina, "Continuar");
    await titulo(pagina, "Un detalle que lo dice todo.");
    await pagina.getByLabel("Nombre", { exact: true }).fill("Cliente estándar");
    await pagina.getByRole("link", { name: "Volver al ramo" }).click();
    await titulo(pagina, "Tulipanes de rubor");
    assert.equal(await pagina.getByLabel("Cantidad").inputValue(), "2");
    assert.equal(await pagina.getByLabel("Dedicatoria (opcional)").inputValue(), "Para alguien especial");
    await pulsar(pagina, "Continuar");
    await titulo(pagina, "Un detalle que lo dice todo.");
    assert.equal(await pagina.getByLabel("Nombre", { exact: true }).inputValue(), "Cliente estándar");
    await pagina.getByLabel("Distrito o zona de entrega").fill("Miraflores");
    await fechaValida(pagina);
    await captura(pagina, "escritorio-compra");
    await pulsar(pagina, "Continuar al adelanto");
    await titulo(pagina, "Tu ramo está por confirmarse.");
    const id = await pagina.locator(".codigo").textContent();
    await estado(pagina, id, "pendiente_adelanto");
    await pulsar(pagina, /Simular adelanto/);
    await titulo(pagina, "Tu pedido está confirmado.");
    await estado(pagina, id, "confirmado");
    const fila = (await registros(pagina)).find(function (registro) { return registro.id === id; });
    assert.equal(fila.adelanto.monto, 4900);
    assert.equal(fila.cantidad, 2);
    assert.equal(fila.dedicatoria, "Para alguien especial");
    return id;
}

async function validarYTramitar(pagina, idEstandar) {
    await acceder(pagina, "personalizar");
    await pagina.getByLabel("Nombre de tu idea", { exact: true }).fill("Se conserva");
    await pulsar(pagina, "Enviar mi solicitud");
    const descripcion = pagina.getByLabel("¿Cómo imaginas el ramo?", { exact: true });
    assert.equal(await descripcion.getAttribute("aria-invalid"), "true");
    assert.equal(await descripcion.evaluate(function (el) { return el === document.activeElement; }), true);
    assert.equal(await pagina.getByLabel("Nombre de tu idea", { exact: true }).inputValue(), "Se conserva");
    assert.equal((await registros(pagina)).length, 1);
    await captura(pagina, "escritorio-personalizar");
    const { id, fecha } = await personalizar(pagina, "Lucía Ficticia", "Ramo de aniversario");
    assert.notEqual(id, idEstandar);
    await pagina.reload();
    await titulo(pagina, "Tu idea ya está en buenas manos.");
    await acceder(pagina, "seguimiento");
    await pagina.getByLabel("Código de seguimiento").fill("BB-000000000000");
    await pulsar(pagina, "Consultar solicitud");
    await pagina.getByRole("alert").filter({ hasText: "No encontramos" }).waitFor();
    await pagina.getByLabel("Código de seguimiento").fill(id.toLowerCase());
    await pulsar(pagina, "Consultar solicitud");
    await titulo(pagina, "Tu idea ya está en buenas manos.");
    await acceder(pagina, "taller");
    await pagina.getByLabel("Buscar por código, nombre o idea").fill("lucia");
    assert.equal(await pagina.locator("#lista li").count(), 1);
    await pagina.getByLabel("Filtrar por estado").selectOption("entregado");
    await pagina.getByText("No hay coincidencias.", { exact: false }).waitFor();
    await pagina.getByLabel("Filtrar por estado").selectOption("");
    await pagina.locator("#lista a").filter({ hasText: id }).click();
    await pagina.getByLabel("Respuesta del taller").selectOption("proponer");
    await pagina.getByLabel("Detalles de la propuesta").fill("Podemos cambiar a una cinta lavanda.");
    await pagina.getByLabel("Total (S/)").fill("95,51");
    await pagina.getByLabel("Fecha propuesta de entrega").fill(fecha);
    await captura(pagina, "escritorio-taller");
    await pulsar(pagina, "Enviar respuesta");
    await estado(pagina, id, "propuesta");
    await pagina.reload();
    await pagina.locator("#detalle-taller .estado").getByText("Propuesta disponible", { exact: true }).waitFor();
    await pagina.getByRole("link", { name: "Ver seguimiento del cliente" }).click();
    await titulo(pagina, "Un pequeño cambio. La misma ilusión.");
    await captura(pagina, "escritorio-propuesta");
    await pulsar(pagina, "Aceptar y confirmar propuesta");
    await titulo(pagina, "Lo tenemos. Va a ser especial.");
    await estado(pagina, id, "acuerdo");
    await captura(pagina, "escritorio-acuerdo");
    await pagina.reload();
    await titulo(pagina, "Lo tenemos. Va a ser especial.");
    await pulsar(pagina, /Simular adelanto/);
    await titulo(pagina, "Tu pedido está confirmado.");
    await acceder(pagina, "taller/" + id);
    await pulsar(pagina, "Iniciar elaboración");
    await estado(pagina, id, "elaboracion");
    await pulsar(pagina, "Marcar listo para entrega");
    await estado(pagina, id, "listo");
    await pulsar(pagina, "Registrar despacho");
    await estado(pagina, id, "en_envio");
    await acceder(pagina, "seguimiento/" + id);
    await pulsar(pagina, "Confirmar que recibí el pedido");
    await titulo(pagina, "Recibiste tu regalo.");
    await pulsar(pagina, /Simular saldo/);
    await titulo(pagina, "El saldo está por verificar.");
    await acceder(pagina, "taller/" + id);
    await pulsar(pagina, "Marcar saldo pendiente");
    await estado(pagina, id, "regularizacion");
    await acceder(pagina, "seguimiento/" + id);
    await pulsar(pagina, /Simular saldo/);
    await estado(pagina, id, "por_verificar");
    await acceder(pagina, "taller/" + id);
    await pulsar(pagina, "Verificar saldo y cerrar");
    await estado(pagina, id, "entregado");
    await pagina.reload();
    assert.match(await pagina.locator("#detalle-taller .estado").textContent(), /Entregado y pagado/);
    const filas = await registros(pagina);
    assert.equal(filas.length, 2);
    assert.equal(filas.find(function (fila) { return fila.id === id; }).saldo.monto, 4775);
    return id;
}

async function decisionesYBorrado(pagina, idBorrar) {
    const noViable = await personalizar(pagina, "Elena Ficticia", "Ramo no viable");
    await acceder(pagina, "taller/" + noViable.id);
    await pagina.getByLabel("Respuesta del taller").selectOption("descartar");
    await pagina.getByLabel("Motivo de no viabilidad").fill("En esta demostración ese color no está disponible.");
    await pulsar(pagina, "Enviar respuesta");
    await estado(pagina, noViable.id, "no_viable");
    await acceder(pagina, "seguimiento/" + noViable.id);
    await titulo(pagina, "Esta vez no podremos crearlo.");
    await captura(pagina, "escritorio-no-viable");
    assert.equal(await pagina.getByRole("button", { name: /Simular adelanto/ }).count(), 0);

    const rechazada = await personalizar(pagina, "Ana Ficticia", "Ramo para rechazar");
    await acceder(pagina, "taller/" + rechazada.id);
    await pagina.getByLabel("Detalles de la propuesta").fill("Es viable con los colores elegidos.");
    await pagina.getByLabel("Total (S/)").fill("75");
    await pulsar(pagina, "Enviar respuesta");
    await estado(pagina, rechazada.id, "propuesta");
    await acceder(pagina, "seguimiento/" + rechazada.id);
    await titulo(pagina, "Tu idea es viable.");
    await pulsar(pagina, "Rechazar propuesta");
    await titulo(pagina, "La propuesta quedó rechazada.");

    await acceder(pagina, "taller/" + idBorrar);
    await pulsar(pagina, "Eliminar registro");
    assert.equal(await pagina.getByRole("dialog").isVisible(), true);
    await pulsar(pagina, "Conservar registro");
    assert.equal((await registros(pagina)).length, 4);
    await pulsar(pagina, "Eliminar registro");
    await pulsar(pagina, "Sí, eliminar");
    await pagina.getByText("Registro eliminado.", { exact: true }).waitFor();
    await pagina.reload();
    assert.equal((await registros(pagina)).some(function (fila) { return fila.id === idBorrar; }), false);
    await pagina.evaluate(function (llave) { localStorage.setItem(llave, "{invalid"); }, clave);
    await pagina.reload();
    await pagina.getByText(/Se recuperó el almacenamiento/).waitFor();
    await pagina.getByText(/Aún no hay registros/).waitFor();
    assert.equal(await pagina.evaluate(function (llave) { return localStorage.getItem(llave + ".respaldo"); }, clave), "{invalid");
    await personalizar(pagina, "Luz Ficticia", "Después del respaldo");
    assert.equal((await registros(pagina)).length, 1);
}

async function responsive(pagina, baseDatos, id) {
    await pagina.evaluate(function ({ llave, datos }) {
        localStorage.setItem(llave, JSON.stringify(datos));
    }, { llave: clave, datos: baseDatos });
    const vistas = ["inicio", "producto/tulipanes", "compra/tulipanes", "personalizar", "seguimiento/" + id, "taller/" + id];

    for (const ancho of [360, 390, 768, 1024, 1440]) {
        await pagina.setViewportSize({ width: ancho, height: 920 });

        for (const ruta of vistas) {
            await acceder(pagina, ruta);
            await pagina.evaluate(function () { return document.fonts.ready; });
            assert.equal(await pagina.evaluate(function () {
                return document.documentElement.scrollWidth <= window.innerWidth;
            }), true, ruta + " desborda a " + ancho + " px");
            assert.equal(await pagina.locator("label").evaluateAll(function (etiquetas) {
                return etiquetas.every(function (etiqueta) { return etiqueta.control !== null; });
            }), true);
        }
    }

    await pagina.setViewportSize({ width: 390, height: 844 });
    await pagina.goto("about:blank");
    await acceder(pagina, "inicio");
    await pagina.keyboard.press("Tab");
    assert.equal(await pagina.locator(".saltar").evaluate(function (el) { return el === document.activeElement; }), true);
    await pagina.keyboard.press("Tab");
    assert.equal(await pagina.getByRole("button", { name: "Menú" }).evaluate(function (el) { return el.matches(":focus-visible"); }), true);
    await pagina.keyboard.press("Enter");
    await pagina.getByRole("navigation").waitFor();
    await pagina.keyboard.press("Escape");
    assert.equal(await pagina.getByRole("button", { name: "Menú" }).getAttribute("aria-expanded"), "false");
    await captura(pagina, "movil-inicio");
    await pulsar(pagina, "Menú");
    await pagina.getByRole("link", { name: "Personaliza tu regalo" }).click();
    await titulo(pagina, "Cuéntanos lo que imaginas.");
    await captura(pagina, "movil-personalizar");
    const movil = await personalizar(pagina, "Rosa Ficticia", "Ramo desde el móvil");
    await acceder(pagina, "taller");
    await pagina.locator("#lista a").filter({ hasText: movil.id }).click();
    await pagina.waitForFunction(function () { return document.activeElement.id === "detalle-taller"; });
    await pagina.getByRole("link", { name: "Volver a la lista" }).click();
    await pagina.getByRole("heading", { name: "Detalle", exact: true }).waitFor();
    await pagina.locator("#lista a").filter({ hasText: movil.id }).click();
    await pagina.getByLabel("Respuesta del taller").selectOption("proponer");
    await pagina.getByLabel("Detalles de la propuesta").fill("Cinta lavanda y envoltura clara.");
    await pagina.getByLabel("Total (S/)").fill("78");
    await pulsar(pagina, "Enviar respuesta");
    await estado(pagina, movil.id, "propuesta");
    await acceder(pagina, "seguimiento/" + movil.id);
    assert.equal(await pagina.evaluate(function () {
        const detalle = Array.from(document.querySelectorAll("h2")).find(function (h2) {
            return h2.textContent === "Lo que cambia, con transparencia.";
        });
        return detalle.getBoundingClientRect().top < document.querySelector(".resumen-seguimiento").getBoundingClientRect().top;
    }), true);
    await captura(pagina, "movil-propuesta");
    await pulsar(pagina, "Aceptar y confirmar propuesta");
    await titulo(pagina, "Lo tenemos. Va a ser especial.");
    await captura(pagina, "movil-acuerdo");
}

async function probar() {
    await mkdir(carpeta, { recursive: true });
    const navegador = await chromium.launch({
        executablePath: process.env.BEAN_CHROMIUM || undefined,
        args: ["--no-sandbox"]
    });
    const errores = [];
    const contexto = await navegador.newContext({ viewport: { width: 1440, height: 920 }, reducedMotion: "reduce" });
    contexto.on("page", function (pagina) {
        pagina.on("pageerror", function (error) { errores.push(error.message); });
        pagina.on("console", function (mensaje) {
            if (mensaje.type() === "error") {
                errores.push(mensaje.text() + " " + mensaje.location().url);
            }
        });
        pagina.on("response", function (respuesta) {
            if (respuesta.status() >= 400) {
                errores.push(respuesta.status() + " " + respuesta.url());
            }
        });
    });

    try {
        const pagina = await contexto.newPage();
        pagina.setDefaultTimeout(6000);
        const estandar = await compraEstandar(pagina);
        console.log("OK · Catálogo, ficha, cantidad, borrador, compra y adelanto estándar.");
        const personal = await validarYTramitar(pagina, estandar);
        console.log("OK · Validación, IDs, búsqueda, filtro, propuesta, persistencia, adelanto, elaboración, entrega y saldo.");
        const datos = await registros(pagina);
        const movil = await contexto.newPage();
        await acceder(movil, "inicio");
        await responsive(movil, datos, personal);
        await movil.close();
        console.log("OK · 30 combinaciones de ancho/vista, etiquetas, menú móvil, teclado y propuesta en móvil.");
        await pagina.evaluate(function ({ llave, datos }) {
            localStorage.setItem(llave, JSON.stringify(datos));
        }, { llave: clave, datos });
        await decisionesYBorrado(pagina, personal);
        console.log("OK · No viable, propuesta rechazada, confirmación de borrado y recuperación JSON.");
        assert.deepEqual(errores, []);
        console.log("OK · Sin errores de JavaScript, consola o HTTP en las vistas ejecutadas.");
    } finally {
        await navegador.close();
    }
}

probar().catch(function (error) {
    console.error(error);
    process.exitCode = 1;
});
