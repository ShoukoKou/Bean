import { cambiarEstado, crearSolicitud, estados, estadosPedido } from "./solicitudes.mjs";

export const clave = "bean-blossoms.solicitudes.v1";
export const respaldo = clave + ".respaldo";
const patronCodigo = /^BB-[A-F0-9]{12}$/;

function registroValido(fila) {
    return fila !== null && typeof fila === "object" &&
        patronCodigo.test(fila.id) && Object.hasOwn(estados, fila.estado) &&
        ["catalogo", "personalizada"].includes(fila.tipo) &&
        ["nombre", "titulo", "zona", "fecha", "creada", "dedicatoria", "motivo"].every(function (campo) {
            return typeof fila[campo] === "string";
        }) &&
        (fila.tipo !== "catalogo" || (Number.isSafeInteger(fila.estimado) && fila.estimado >= 100)) &&
        (fila.tipo !== "personalizada" || (typeof fila.descripcion === "string" && typeof fila.colores === "string")) &&
        (fila.propuesta === null || (fila.propuesta && typeof fila.propuesta.detalle === "string" &&
            typeof fila.propuesta.fecha === "string" && Number.isSafeInteger(fila.propuesta.monto) && fila.propuesta.monto >= 100)) &&
        (!["propuesta", "acuerdo"].includes(fila.estado) || fila.propuesta !== null) &&
        (!estadosPedido.includes(fila.estado) || (fila.adelanto && Number.isSafeInteger(fila.adelanto.monto))) &&
        Array.isArray(fila.historial) && fila.historial.length > 0 && fila.historial.every(function (paso) {
            return paso && Object.hasOwn(estados, paso.estado) && typeof paso.fecha === "string";
        });
}

export function leerSolicitudes(almacen = localStorage) {
    const contenido = almacen.getItem(clave);
    if (contenido === null) {
        return { solicitudes: [], aviso: "" };
    }

    try {
        const solicitudes = JSON.parse(contenido);
        if (!Array.isArray(solicitudes) || !solicitudes.every(registroValido) ||
            new Set(solicitudes.map(function (fila) { return fila.id; })).size !== solicitudes.length) {
            throw new Error("Formato inválido");
        }

        return { solicitudes, aviso: "" };
    } catch {
        // Conserva una copia del contenido original antes de permitir nuevas escrituras.
        almacen.setItem(respaldo, contenido);
        almacen.setItem(clave, "[]");
        return { solicitudes: [], aviso: "Se recuperó el almacenamiento. El contenido inválido quedó guardado como respaldo." };
    }
}

function guardar(almacen, solicitudes) {
    try {
        almacen.setItem(clave, JSON.stringify(solicitudes));
    } catch {
        throw new Error("El navegador no pudo guardar el cambio. Revisa los permisos o el espacio de almacenamiento.");
    }
}

function conBloqueo(cambio) {
    if (navigator.locks) {
        return navigator.locks.request(clave, cambio);
    }

    return cambio();
}

export async function registrar(datos) {
    return conBloqueo(function () {
        const almacen = localStorage;
        const { solicitudes, aviso } = leerSolicitudes(almacen);
        let id;

        do {
            const bytes = crypto.getRandomValues(new Uint8Array(6));
            const codigo = Array.from(bytes, function (byte) {
                return byte.toString(16).padStart(2, "0");
            }).join("");
            id = "BB-" + codigo.toUpperCase();
        } while (solicitudes.some(function (fila) { return fila.id === id; }));

        const solicitud = crearSolicitud(datos, id);
        guardar(almacen, [solicitud, ...solicitudes]);
        return { solicitud, aviso };
    });
}

async function actualizar(id, cambiar) {
    return conBloqueo(function () {
        const almacen = localStorage;
        const { solicitudes, aviso } = leerSolicitudes(almacen);
        const indice = solicitudes.findIndex(function (fila) {
            return fila.id === id;
        });

        if (indice === -1) {
            throw new Error("La solicitud ya no está disponible en este navegador.");
        }

        const actualizada = cambiar(solicitudes[indice]);

        if (actualizada) {
            solicitudes[indice] = actualizada;
        } else {
            solicitudes.splice(indice, 1);
        }

        guardar(almacen, solicitudes);
        return { solicitud: actualizada, aviso };
    });
}

export function cambiarSolicitud(id, accion, datos) {
    return actualizar(id, function (solicitud) {
        return cambiarEstado(solicitud, accion, datos);
    });
}

export function eliminarSolicitud(id) {
    return actualizar(id, function () {
        return null;
    });
}
