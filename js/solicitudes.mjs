import { buscarProducto } from "./catalogo.mjs";

export const estados = Object.freeze({
    recibida: "Solicitud recibida",
    propuesta: "Propuesta disponible",
    pendiente_adelanto: "Pendiente de adelanto",
    acuerdo: "Acuerdo confirmado",
    no_viable: "Solicitud no viable",
    rechazada: "Propuesta rechazada",
    confirmado: "Pedido confirmado",
    elaboracion: "En elaboración",
    listo: "Listo para entrega",
    en_envio: "En camino",
    pendiente_saldo: "Entrega confirmada · saldo pendiente",
    por_verificar: "Saldo por verificar",
    regularizacion: "Saldo pendiente de regularización",
    entregado: "Entregado y pagado",
    no_concretado: "Pedido no concretado"
});

export const estadosPedido = [
    "confirmado", "elaboracion", "listo", "en_envio", "pendiente_saldo",
    "por_verificar", "regularizacion", "entregado"
];

const transiciones = {
    recibida: {
        proponer: "propuesta",
        aprobar: "propuesta",
        descartar: "no_viable"
    },
    propuesta: { aceptar: "acuerdo", rechazar: "rechazada" },
    acuerdo: { pagar: "confirmado", cancelar: "no_concretado" },
    pendiente_adelanto: { pagar: "confirmado", cancelar: "no_concretado" },
    confirmado: { elaborar: "elaboracion", prepararEntrega: "listo" },
    elaboracion: { prepararEntrega: "listo" },
    listo: { despachar: "en_envio" },
    en_envio: { recibir: "pendiente_saldo" },
    pendiente_saldo: { informarSaldo: "por_verificar" },
    por_verificar: { verificarSaldo: "entregado", observarSaldo: "regularizacion" },
    regularizacion: { informarSaldo: "por_verificar" },
    no_viable: {},
    rechazada: {},
    entregado: {},
    no_concretado: {}
};

const calendarioLima = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit"
});

export function fechaLocal(fecha = new Date()) {
    const partes = calendarioLima.formatToParts(fecha);
    const valores = {};

    for (const parte of partes) {
        if (parte.type !== "literal") {
            valores[parte.type] = parte.value;
        }
    }

    return `${valores.year}-${valores.month}-${valores.day}`;
}

export function fechaValida(fecha) {
    if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return false;
    }

    const valor = new Date(fecha + "T00:00:00Z");
    return !Number.isNaN(valor.getTime()) && valor.toISOString().slice(0, 10) === fecha;
}

function texto(datos, campo, etiqueta, minimo, maximo) {
    const valor = String(datos[campo] ?? "").trim();

    if (valor.length < minimo || valor.length > maximo) {
        throw new Error(`${etiqueta} debe tener entre ${minimo} y ${maximo} caracteres.`);
    }

    return valor;
}

function validarFecha(fecha, hoy) {
    if (!fechaValida(fecha) || fecha < hoy) {
        throw new Error("Elige una fecha válida que sea hoy o posterior.");
    }

    return fecha;
}

export function crearSolicitud(datos, id, ahora = new Date()) {
    const solicitud = {
        id,
        tipo: datos.tipo,
        estado: "recibida",
        nombre: texto(datos, "nombre", "El nombre", 2, 60),
        zona: texto(datos, "zona", "La zona de entrega", 2, 80),
        dedicatoria: texto(datos, "dedicatoria", "La dedicatoria", 0, 180),
        fecha: validarFecha(datos.fecha, fechaLocal(ahora)),
        creada: ahora.toISOString(),
        propuesta: null,
        motivo: "",
        adelanto: null,
        saldo: null,
        historial: [{ estado: "recibida", fecha: ahora.toISOString() }]
    };

    if (datos.tipo === "catalogo") {
        const producto = buscarProducto(datos.producto);
        const cantidad = Number(datos.cantidad);

        if (!producto || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > 20) {
            throw new Error("Elige un ramo del catálogo y una cantidad de 1 a 20.");
        }

        solicitud.producto = producto.id;
        solicitud.titulo = producto.nombre;
        solicitud.cantidad = cantidad;
        solicitud.estimado = cantidad * producto.precio;
        solicitud.estado = "pendiente_adelanto";
        solicitud.historial[0].estado = solicitud.estado;
    } else if (datos.tipo === "personalizada") {
        solicitud.titulo = texto(datos, "titulo", "El nombre de la idea", 2, 80);
        solicitud.descripcion = texto(datos, "descripcion", "La descripción", 10, 600);
        solicitud.colores = texto(datos, "colores", "Los colores", 2, 100);
        solicitud.estimado = null;
    } else {
        throw new Error("Elige un tipo de solicitud válido.");
    }

    return solicitud;
}

function cotizar(datos, hoy) {
    const importe = String(datos.importe ?? "").trim();

    if (!/^\d{1,4}(?:[.,]\d{1,2})?$/.test(importe)) {
        throw new Error("Escribe un importe en soles con hasta dos decimales.");
    }

    const monto = Math.round(Number(importe.replace(",", ".")) * 100);

    if (monto < 100) {
        throw new Error("El importe mínimo es S/ 1,00.");
    }

    return {
        detalle: texto(datos, "detalle", "El detalle del taller", 5, 500),
        monto,
        fecha: validarFecha(datos.fecha, hoy)
    };
}

export function totalSolicitud(solicitud) {
    return solicitud.propuesta?.monto ?? solicitud.estimado;
}

export function calcularAdelanto(monto) {
    return Math.ceil(monto / 2);
}

// La misma regla protege las acciones del taller y del seguimiento.
export function cambiarEstado(solicitud, accion, datos = {}, ahora = new Date()) {
    const permitidas = transiciones[solicitud.estado];
    const destino = permitidas && Object.hasOwn(permitidas, accion) && permitidas[accion];

    if (!destino) {
        throw new Error("La solicitud cambió de estado. Vuelve a abrirla para ver las acciones disponibles.");
    }

    const fecha = ahora.toISOString();
    const actualizada = {
        ...solicitud,
        estado: destino,
        historial: [...solicitud.historial, { estado: destino, fecha }]
    };

    if (accion === "proponer" || accion === "aprobar") {
        actualizada.propuesta = cotizar(datos, fechaLocal(ahora));
        actualizada.propuesta.alternativa = accion === "proponer";
    } else if (accion === "descartar") {
        actualizada.motivo = texto(datos, "motivo", "El motivo", 5, 500);
    } else if (accion === "pagar") {
        actualizada.adelanto = { monto: calcularAdelanto(totalSolicitud(solicitud)), fecha };
    } else if (accion === "informarSaldo") {
        actualizada.saldo = { monto: totalSolicitud(solicitud) - solicitud.adelanto.monto, informado: fecha };
    } else if (accion === "verificarSaldo") {
        actualizada.saldo = { ...solicitud.saldo, verificado: fecha };
    }

    return actualizada;
}

function normalizar(texto) {
    return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

export function filtrarSolicitudes(solicitudes, consulta, estado) {
    const termino = normalizar(consulta);

    return solicitudes.filter(function (solicitud) {
        const detalle = normalizar(`${solicitud.id} ${solicitud.nombre} ${solicitud.titulo}`);
        return (!estado || solicitud.estado === estado) && detalle.includes(termino);
    });
}
