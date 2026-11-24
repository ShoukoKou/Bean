import assert from "node:assert/strict";
import test from "node:test";
import { clave, leerSolicitudes, respaldo } from "../js/almacen.mjs";
import { cambiarEstado, crearSolicitud, fechaLocal, filtrarSolicitudes } from "../js/solicitudes.mjs";

const ahora = new Date("2026-11-24T20:00:00Z");
const datos = {
    tipo: "personalizada", nombre: "María Ficticia", zona: "Barranco",
    titulo: "Un ramo rosa", descripcion: "Ramo con cinco flores pequeñas.", colores: "Rosa", fecha: "2026-11-25"
};
const cotizacion = { detalle: "Entrega del regalo con cinta rosada.", importe: "95,51", fecha: "2026-11-25" };

function solicitudPersonalizada() {
    return crearSolicitud(datos, "BB-000000000001", ahora);
}

test("valida textos, cantidad y fechas reales", function () {
    assert.throws(function () { crearSolicitud({ ...datos, nombre: "  " }, "ID", ahora); }, /nombre/);
    assert.throws(function () { crearSolicitud({ ...datos, fecha: "2026-11-31" }, "ID", ahora); }, /fecha/);
    assert.throws(function () { crearSolicitud({ ...datos, fecha: "2026-11-23" }, "ID", ahora); }, /fecha/);
    assert.throws(function () {
        crearSolicitud({ ...datos, tipo: "catalogo", producto: "tulipanes", cantidad: 21 }, "ID", ahora);
    }, /cantidad/);
});

test("la fecha mínima usa el día de Lima", function () {
    assert.equal(fechaLocal(new Date("2026-11-25T03:30:00Z")), "2026-11-24");
});

test("la compra estándar habilita el adelanto según cantidad total y puede cancelarse", function () {
    const solicitud = crearSolicitud({ ...datos, tipo: "catalogo", producto: "tulipanes", cantidad: "2" }, "BB-000000000002", ahora);
    assert.equal(solicitud.estado, "pendiente_adelanto");
    assert.equal(solicitud.estimado, 9800);
    assert.equal(cambiarEstado(solicitud, "pagar", {}, ahora).adelanto.monto, 4900);
    assert.equal(cambiarEstado(solicitud, "cancelar", {}, ahora).estado, "no_concretado");
});

test("una propuesta aceptada aún requiere adelanto y el centavo impar se conserva", function () {
    const original = solicitudPersonalizada();
    assert.throws(function () { cambiarEstado(original, "pagar", {}, ahora); }, /estado/);
    const propuesta = cambiarEstado(original, "proponer", cotizacion, ahora);
    assert.equal(propuesta.propuesta.alternativa, true);
    assert.equal(cambiarEstado(propuesta, "rechazar", {}, ahora).estado, "rechazada");
    const acuerdo = cambiarEstado(propuesta, "aceptar", {}, ahora);
    assert.equal(acuerdo.estado, "acuerdo");
    assert.equal(acuerdo.adelanto, null);
    const confirmada = cambiarEstado(acuerdo, "pagar", {}, ahora);
    assert.equal(confirmada.adelanto.monto, 4776);
    assert.throws(function () { cambiarEstado(confirmada, "pagar", {}, ahora); }, /estado/);
    assert.equal(original.historial.length, 1);
});

test("pago restante se informa después de recibir y el taller puede observarlo y verificarlo", function () {
    let solicitud = solicitudPersonalizada();
    const acciones = [
        "aprobar", "aceptar", "pagar", "elaborar", "prepararEntrega", "despachar", "recibir",
        "informarSaldo", "observarSaldo", "informarSaldo", "verificarSaldo"
    ];

    for (const accion of acciones) {
        solicitud = cambiarEstado(solicitud, accion, cotizacion, ahora);
    }

    assert.equal(solicitud.estado, "entregado");
    assert.equal(solicitud.saldo.monto, 4775);
    assert.equal(solicitud.saldo.verificado, ahora.toISOString());
    assert.equal(solicitud.historial.length, acciones.length + 1);
});

test("la respuesta no viable es terminal y conserva el motivo", function () {
    const respuesta = cambiarEstado(solicitudPersonalizada(), "descartar", { motivo: "No hay ese material." }, ahora);
    assert.equal(respuesta.estado, "no_viable");
    assert.equal(respuesta.motivo, "No hay ese material.");
    assert.throws(function () { cambiarEstado(respuesta, "pagar", {}, ahora); }, /estado/);
});

test("la búsqueda ignora mayúsculas y tildes sin modificar los registros", function () {
    const original = solicitudPersonalizada();
    const lista = [original];
    assert.deepEqual(filtrarSolicitudes(lista, " MARIA ", "recibida"), [original]);
    assert.deepEqual(filtrarSolicitudes(lista, "maria", "entregado"), []);
    assert.deepEqual(filtrarSolicitudes(lista, "violeta", ""), []);
    assert.equal(lista.length, 1);
});

test("recupera JSON inválido o registros duplicados conservando respaldo", function () {
    const memoria = new Map([[clave, "{mal"]]);
    const almacen = {
        getItem: function (id) { return memoria.get(id) ?? null; },
        setItem: function (id, valor) { memoria.set(id, valor); }
    };
    assert.deepEqual(leerSolicitudes(almacen).solicitudes, []);
    assert.equal(memoria.get(respaldo), "{mal");
    const datosDuplicados = JSON.stringify([solicitudPersonalizada(), solicitudPersonalizada()]);
    memoria.set(clave, datosDuplicados);
    assert.match(leerSolicitudes(almacen).aviso, /recuperó/);
    assert.equal(memoria.get(respaldo), datosDuplicados);
    assert.equal(memoria.get(clave), "[]");
});
