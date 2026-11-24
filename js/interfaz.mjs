import { buscarProducto } from "./catalogo.mjs";
import { cambiarSolicitud, clave, eliminarSolicitud, leerSolicitudes, registrar } from "./almacen.mjs";
import { filtrarSolicitudes } from "./solicitudes.mjs";
import {
    listaTaller, soles, tarjetasCatalogo, vistaBusqueda, vistaFormulario,
    vistaProducto, vistaSeguimiento, vistaTaller
} from "./vistas.mjs";

const vista = document.querySelector("#vista");
const avisoAlmacenamiento = document.querySelector("#aviso-almacenamiento");
const navegacion = document.querySelector("#navegacion");
const menu = document.querySelector(".menu");
const borradoresCatalogo = new Map();
let borradorPersonalizado = {};
let filtros = { consulta: "", estado: "" };
let mensaje = "";
let avisoMostrado = "";

function mostrarAviso(aviso) {
    if (aviso) {
        avisoMostrado = aviso;
    }

    avisoAlmacenamiento.textContent = avisoMostrado;
    avisoAlmacenamiento.hidden = !avisoMostrado;
}

function solicitudesActuales() {
    try {
        const { solicitudes, aviso } = leerSolicitudes();
        mostrarAviso(aviso);
        return solicitudes;
    } catch {
        mostrarAviso("No se pudo acceder al almacenamiento del navegador. Revisa los permisos o el espacio disponible.");
        return [];
    }
}

function leerRuta() {
    const [pantalla = "inicio", id = ""] = location.hash.slice(1).split("/");
    return { pantalla: pantalla || "inicio", id };
}

function cerrarMenu() {
    navegacion.classList.remove("abierto");
    menu.setAttribute("aria-expanded", "false");
}

menu.addEventListener("click", function () {
    const abierto = navegacion.classList.toggle("abierto");
    menu.setAttribute("aria-expanded", String(abierto));
});

document.addEventListener("keydown", function (evento) {
    if (evento.key === "Escape" && navegacion.classList.contains("abierto")) {
        cerrarMenu();
        menu.focus();
    }
});

function inicio() {
    vista.replaceChildren(document.querySelector("template#plantilla-inicio").content.cloneNode(true));
    vista.querySelector("#productos").innerHTML = tarjetasCatalogo();
}

function marcarNavegacion(pantalla) {
    const equivalencias = { producto: "catalogo", compra: "catalogo", inicio: "catalogo" };
    const actual = equivalencias[pantalla] || pantalla;

    for (const enlace of document.querySelectorAll(".barra a")) {
        if (enlace.hash === "#" + actual) {
            enlace.setAttribute("aria-current", "page");
        } else {
            enlace.removeAttribute("aria-current");
        }
    }
}

function irAlContenido(pantalla, moverFoco) {
    if (pantalla === "catalogo" || pantalla === "historia" || pantalla === "contenido") {
        const destinos = { catalogo: "#titulo-catalogo", historia: "#titulo-historia", contenido: "#contenido" };
        const destino = document.querySelector(destinos[pantalla]);

        if (moverFoco) {
            destino.focus({ preventScroll: true });
        }

        destino.scrollIntoView();
        return;
    }

    if (moverFoco) {
        const titulo = vista.querySelector("h1");
        titulo?.focus({ preventScroll: true });
        window.scrollTo(0, 0);
    }
}

function actualizarLista(id) {
    const solicitudes = solicitudesActuales();
    const visibles = filtrarSolicitudes(solicitudes, filtros.consulta, filtros.estado);
    vista.querySelector("#lista").innerHTML = listaTaller(visibles, id);
    const conteo = vista.querySelector("#conteo");

    if (solicitudes.length === 0) {
        conteo.textContent = "Aún no hay registros. Crea una solicitud desde la tienda.";
    } else if (visibles.length === 0) {
        conteo.textContent = "No hay coincidencias. Cambia el texto o el estado.";
    } else {
        conteo.textContent = visibles.length + " de " + solicitudes.length + " registros";
    }
}

function montarTaller(id) {
    const buscar = vista.querySelector("#campo-buscar");
    const filtro = vista.querySelector("#filtro");
    buscar.value = filtros.consulta;
    filtro.value = filtros.estado;

    buscar.addEventListener("input", function () {
        filtros.consulta = buscar.value;
        actualizarLista(id);
    });

    filtro.addEventListener("change", function () {
        filtros.estado = filtro.value;
        actualizarLista(id);
    });

    actualizarLista(id);
}

function renderizar(moverFoco = true) {
    const { pantalla, id } = leerRuta();
    const confirmacion = mensaje;
    mensaje = "";
    const producto = buscarProducto(id);
    const solicitud = solicitudesActuales().find(function (registro) {
        return registro.id === id;
    });

    cerrarMenu();
    marcarNavegacion(pantalla);

    if (pantalla === "producto" && producto) {
        vista.innerHTML = vistaProducto(producto, borradoresCatalogo.get(id) ?? {});
    } else if (pantalla === "compra" && producto) {
        vista.innerHTML = vistaFormulario(producto, borradoresCatalogo.get(id) ?? {});
    } else if (pantalla === "personalizar") {
        vista.innerHTML = vistaFormulario(null, borradorPersonalizado);
    } else if (pantalla === "seguimiento" && solicitud) {
        vista.innerHTML = vistaSeguimiento(solicitud, confirmacion);
    } else if (pantalla === "seguimiento") {
        let alerta = "";
        if (id) {
            alerta = "No encontramos ese código en este navegador.";
        }

        vista.innerHTML = vistaBusqueda(id, alerta);
    } else if (pantalla === "taller") {
        vista.innerHTML = vistaTaller(solicitud, id, confirmacion);
        montarTaller(id);
    } else {
        inicio();
    }

    const detalle = vista.querySelector("#detalle-taller");
    if (moverFoco && detalle) {
        detalle.focus({ preventScroll: true });
        if (matchMedia("(max-width: 40rem)").matches) {
            detalle.scrollIntoView();
        } else {
            window.scrollTo(0, 0);
        }
    } else {
        irAlContenido(pantalla, moverFoco);
    }
}

function datosFormulario(formulario) {
    return Object.fromEntries(new FormData(formulario));
}

// Los borradores viven durante la navegación, sin persistir datos antes de enviar.
function conservarBorrador(formulario) {
    const datos = datosFormulario(formulario);
    const producto = formulario.dataset.producto;

    if (formulario.dataset.form === "personalizada") {
        borradorPersonalizado = datos;
    } else if (producto) {
        borradoresCatalogo.set(producto, { ...borradoresCatalogo.get(producto), ...datos });
    }
}

function errorCampo(campo, mensajeCampo) {
    const texto = document.getElementById(campo.id + "-error");

    if (texto) {
        texto.textContent = mensajeCampo;
        texto.hidden = !mensajeCampo;
    }

    if (mensajeCampo) {
        campo.setAttribute("aria-invalid", "true");
    } else {
        campo.removeAttribute("aria-invalid");
    }
}

function mensajeRestriccion(campo) {
    if (campo.name === "cantidad") {
        return "Elige una cantidad entera de 1 a 20.";
    }

    if (campo.type === "date") {
        return "Elige una fecha válida que sea hoy o posterior.";
    }

    return "Revisa que el valor cumpla el formato indicado.";
}

function validar(formulario) {
    let primero = null;

    for (const campo of formulario.elements) {
        if (!campo.willValidate || campo.type === "submit") {
            continue;
        }

        let error = "";
        const valor = campo.value.trim();

        if (campo.validity.badInput) {
            error = mensajeRestriccion(campo);
        } else if (campo.required && !valor) {
            error = "Completa este campo.";
        } else if (valor && campo.minLength > 0 && valor.length < campo.minLength) {
            error = "Escribe al menos " + campo.minLength + " caracteres.";
        } else if (!campo.validity.valid) {
            error = mensajeRestriccion(campo);
        }

        errorCampo(campo, error);

        if (error && !primero) {
            primero = campo;
        }
    }

    if (primero) {
        primero.focus();
        return false;
    }

    return true;
}

function mostrarError(formulario, texto) {
    const error = formulario.querySelector("[data-error]");
    error.textContent = texto;
    error.hidden = !texto;
}

function actualizarTotal(formulario) {
    const producto = buscarProducto(formulario.dataset.producto);
    const cantidad = formulario.elements.cantidad;
    const salida = formulario.querySelector("output");

    if (cantidad.validity.valid && cantidad.value) {
        salida.textContent = soles(producto.precio * Number(cantidad.value));
    } else {
        salida.textContent = "elige la cantidad";
    }
}

vista.addEventListener("input", function (evento) {
    const campo = evento.target;
    const formulario = campo.form;

    if (!formulario || !formulario.dataset.form) {
        return;
    }

    errorCampo(campo, "");
    mostrarError(formulario, "");
    conservarBorrador(formulario);

    if (formulario.dataset.form === "producto" && campo.name === "cantidad") {
        actualizarTotal(formulario);
    }
});

vista.addEventListener("change", function (evento) {
    if (evento.target.id !== "decision") {
        return;
    }

    const descartar = evento.target.value === "descartar";
    const cotizacion = vista.querySelector("#cotizacion");
    const motivo = vista.querySelector("#no-viable");
    cotizacion.hidden = descartar;
    cotizacion.disabled = descartar;
    motivo.hidden = !descartar;
    motivo.disabled = !descartar;
    mostrarError(evento.target.form, "");
});

const mensajes = {
    aceptar: "Aceptaste la propuesta. El adelanto ya está habilitado.",
    rechazar: "Registramos tu decisión.",
    pagar: "Adelanto simulado registrado. Tu pedido está confirmado.",
    cancelar: "Se canceló el pedido antes del adelanto.",
    recibir: "Registramos la entrega. Puedes simular el saldo restante.",
    informarSaldo: "Informaste el saldo simulado. El taller debe verificarlo.",
    aprobar: "Propuesta enviada al cliente.",
    proponer: "Propuesta alternativa enviada al cliente.",
    descartar: "Se guardó el motivo de no viabilidad.",
    elaborar: "El pedido pasó a elaboración.",
    prepararEntrega: "El pedido está listo para entrega.",
    despachar: "Se registró el despacho.",
    verificarSaldo: "Saldo verificado. El pedido quedó cerrado.",
    observarSaldo: "El saldo quedó pendiente de regularización."
};

async function enviarRegistro(formulario, tipo) {
    const datos = datosFormulario(formulario);
    const producto = formulario.dataset.producto;

    if (producto) {
        Object.assign(datos, borradoresCatalogo.get(producto), datosFormulario(formulario));
        datos.producto = producto;
        datos.cantidad ||= 1;
    }

    datos.tipo = tipo;
    const resultado = await registrar(datos);
    mostrarAviso(resultado.aviso);
    mensaje = "Registro guardado. Conserva tu código de seguimiento.";

    if (producto) {
        borradoresCatalogo.delete(producto);
    } else {
        borradorPersonalizado = {};
    }

    location.hash = "#seguimiento/" + resultado.solicitud.id;
}

async function procesar(formulario) {
    const tipo = formulario.dataset.form;
    const { id } = leerRuta();

    if (tipo === "producto") {
        conservarBorrador(formulario);
        location.hash = "#compra/" + formulario.dataset.producto;
    } else if (tipo === "personalizada" || tipo === "catalogo") {
        await enviarRegistro(formulario, tipo);
    } else if (tipo === "seguimiento") {
        const codigo = formulario.elements.codigo.value.trim().toUpperCase();

        if (!/^BB-[A-F0-9]{12}$/.test(codigo)) {
            errorCampo(formulario.elements.codigo, "Escribe el código completo, incluido BB-.");
            formulario.elements.codigo.focus();
            return;
        }

        if (!solicitudesActuales().some(function (solicitud) { return solicitud.id === codigo; })) {
            mostrarError(formulario, "No encontramos ese código en este navegador.");
            return;
        }

        location.hash = "#seguimiento/" + codigo;
    } else {
        const datos = datosFormulario(formulario);
        const accion = formulario.dataset.accion || datos.decision;
        const resultado = await cambiarSolicitud(id, accion, datos);
        mostrarAviso(resultado.aviso);
        mensaje = mensajes[accion];
        renderizar();
    }
}

vista.addEventListener("submit", async function (evento) {
    const formulario = evento.target;

    if (!formulario.dataset.form) {
        return;
    }

    evento.preventDefault();
    mostrarError(formulario, "");

    if (formulario.dataset.enviando || !validar(formulario)) {
        return;
    }

    const boton = evento.submitter;
    formulario.dataset.enviando = "true";
    if (boton) {
        boton.disabled = true;
    }

    try {
        await procesar(formulario);
    } catch (error) {
        mostrarError(formulario, error.message || "No se pudo guardar el cambio.");
    } finally {
        if (boton) {
            boton.disabled = false;
        }
        delete formulario.dataset.enviando;
    }
});

vista.addEventListener("click", function (evento) {
    if (!evento.target.closest("[data-eliminar]")) {
        return;
    }

    const dialogo = vista.querySelector("#confirmar-eliminar");
    dialogo.returnValue = "";
    dialogo.showModal();
});

vista.addEventListener("close", async function (evento) {
    const dialogo = evento.target;

    if (dialogo.id !== "confirmar-eliminar" || dialogo.returnValue !== "eliminar") {
        return;
    }

    try {
        const resultado = await eliminarSolicitud(leerRuta().id);
        mostrarAviso(resultado.aviso);
        mensaje = "Registro eliminado.";
        location.hash = "#taller";
    } catch (error) {
        const salida = dialogo.querySelector("[data-error-eliminar]");
        salida.textContent = error.message;
        salida.hidden = false;
        dialogo.returnValue = "";
        dialogo.showModal();
    }
}, true);

document.addEventListener("click", function (evento) {
    const enlace = evento.target.closest("a[href^='#']");

    if (!enlace || evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey) {
        return;
    }

    if (enlace.hash === "#contenido") {
        evento.preventDefault();
        irAlContenido("contenido", true);
    } else if (enlace.hash === location.hash) {
        evento.preventDefault();
        cerrarMenu();
        irAlContenido(leerRuta().pantalla, true);
    }
});

window.addEventListener("hashchange", function () {
    renderizar();
});

window.addEventListener("storage", function (evento) {
    if (evento.key === clave && leerRuta().pantalla === "taller") {
        actualizarLista(leerRuta().id);
    }
});

renderizar(false);
