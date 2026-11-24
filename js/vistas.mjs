import { buscarProducto, productos } from "./catalogo.mjs";
import { calcularAdelanto, estados, estadosPedido, fechaLocal, totalSolicitud } from "./solicitudes.mjs";

const formatoSoles = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });
const formatoDia = new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeZone: "UTC" });
const formatoHora = new Intl.DateTimeFormat("es-PE", {
    dateStyle: "short", timeStyle: "short", timeZone: "America/Lima"
});

export function escapar(valor) {
    const caracteres = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return String(valor ?? "").replace(/[&<>"']/g, function (caracter) {
        return caracteres[caracter];
    });
}

export function soles(centimos) {
    return formatoSoles.format(centimos / 100);
}

function mostrarFecha(fecha) {
    const dia = new Date(fecha + "T00:00:00Z");
    if (Number.isNaN(dia.getTime())) {
        return "Fecha no disponible";
    }

    return formatoDia.format(dia);
}

function encabezado(titulo, descripcion = "", anterior = "#catalogo", enlace = "Volver a la tienda", estado = "") {
    return `<header>
        <a class="ruta" href="${anterior}">${enlace}</a>
        ${estado}
        <h1 tabindex="-1">${titulo}</h1>
        <p class="introduccion">${descripcion}</p>
    </header>`;
}

function pagina(contenido, clases = "contenedor vista-interior") {
    return `<section class="${clases}">${contenido}</section>`;
}

function campo(nombre, etiqueta, atributos = "", valor = "", tipo = "text") {
    const id = "campo-" + nombre;
    const comun = `name="${nombre}" id="${id}" aria-describedby="${id}-error" ${atributos}`;
    let control = `<input type="${tipo}" ${comun} value="${escapar(valor)}">`;

    if (tipo === "textarea") {
        control = `<textarea ${comun}>${escapar(valor)}</textarea>`;
    }

    return `<div class="campo">
        <label for="${id}">${etiqueta}</label>
        ${control}
        <small id="${id}-error" class="error" hidden></small>
    </div>`;
}

function fila(etiqueta, valor) {
    return `<div><dt>${etiqueta}</dt><dd>${valor}</dd></div>`;
}

function avisoFormulario() {
    return '<p class="error" data-error role="alert" hidden></p>';
}

function imagen(producto, atributos = "") {
    return `<img src="${producto.foto}" alt="${producto.alt}" ${atributos}>`;
}

export function tarjetasCatalogo() {
    return productos.map(function (producto) {
        return `<article class="producto">
            ${imagen(producto, 'loading="lazy" width="724" height="724"')}
            <h3>${producto.nombre}</h3>
            <p class="precio">${soles(producto.precio)}</p>
            <a class="boton secundario" href="#producto/${producto.id}" aria-label="Elegir ${producto.nombre}">Elegir este regalo</a>
        </article>`;
    }).join("");
}

export function vistaProducto(producto, borrador) {
    return pagina(`
        <a class="ruta" href="#catalogo">Volver al catálogo</a>
        <div class="columnas ficha">
            ${imagen(producto)}
            <div>
                <p class="rotulo">Ramo artesanal de limpiapipas</p>
                <h1 tabindex="-1">${producto.nombre}</h1>
                <p class="precio">${soles(producto.precio)}</p>
                <p>${producto.descripcion}</p>
                <form class="formulario separado" data-form="producto" data-producto="${producto.id}" novalidate>
                    ${campo("dedicatoria", "Dedicatoria (opcional)", 'maxlength="180" rows="3"', borrador.dedicatoria, "textarea")}
                    ${campo("cantidad", "Cantidad", 'min="1" max="20" step="1" required', borrador.cantidad ?? 1, "number")}
                    ${avisoFormulario()}
                    <button class="boton" type="submit">Continuar · <output for="campo-cantidad">${soles(producto.precio * (borrador.cantidad || 1))}</output></button>
                </form>
            </div>
        </div>
        <aside class="ajuste-producto">
            <div>
                <h2>¿Lo imaginas de otra manera?</h2>
                <p>Elige las flores, los colores y los detalles de tu regalo.</p>
            </div>
            <a class="boton secundario" href="#personalizar">Personaliza un ramo</a>
        </aside>`);
}

function camposEntrega(borrador) {
    return `<fieldset>
        <legend>¿A quién enviamos el regalo?</legend>
        <p class="nota">Usa un nombre y una zona ficticios para esta demostración.</p>
        <div class="pares">
            ${campo("nombre", "Nombre", 'required minlength="2" maxlength="60" autocomplete="off"', borrador.nombre)}
            ${campo("zona", "Distrito o zona de entrega", 'required minlength="2" maxlength="80" autocomplete="off"', borrador.zona)}
        </div>
        ${campo("fecha", "Fecha deseada", `required min="${fechaLocal()}"`, borrador.fecha, "date")}
    </fieldset>`;
}

export function vistaFormulario(producto, borrador) {
    if (producto) {
        const cantidad = Number(borrador.cantidad || 1);
        const monto = producto.precio * cantidad;

        return pagina(`
            ${encabezado("Un detalle que lo dice todo.", "Confirma los detalles del regalo y continúa al adelanto simulado.", "#producto/" + producto.id, "Volver al ramo")}
            <div class="columnas">
                <form class="formulario" data-form="catalogo" data-producto="${producto.id}" novalidate>
                    ${camposEntrega(borrador)}
                    ${avisoFormulario()}
                    <button class="boton" type="submit">Continuar al adelanto</button>
                </form>
                <aside class="panel" aria-label="Resumen del regalo">
                    <h2>Tu regalo</h2>
                    ${imagen(producto)}
                    <p><strong>${producto.nombre}</strong> · ${cantidad} unidad(es)</p>
                    <p class="prelinea">${escapar(borrador.dedicatoria)}</p>
                    <dl class="valores">
                        ${fila("Total", soles(monto))}
                        ${fila("Adelanto simulado (50 %)", soles(calcularAdelanto(monto)))}
                    </dl>
                </aside>
            </div>`);
    }

    return pagina(`
        ${encabezado("Cuéntanos lo que imaginas.", "Describe el regalo que tienes en mente. El taller revisará los detalles antes del adelanto.")}
        <div class="columnas">
            <form class="formulario" id="formulario-personalizar" data-form="personalizada" novalidate>
                <fieldset>
                    <legend>Ese regalo que tienes en mente</legend>
                    ${campo("titulo", "Nombre de tu idea", 'required minlength="2" maxlength="80"', borrador.titulo)}
                    ${campo("descripcion", "¿Cómo imaginas el ramo?", 'required minlength="10" maxlength="600" rows="5"', borrador.descripcion, "textarea")}
                    ${campo("colores", "Flores o colores que prefieres", 'required minlength="2" maxlength="100"', borrador.colores)}
                    ${campo("dedicatoria", "Dedicatoria (opcional)", 'maxlength="180" rows="3"', borrador.dedicatoria, "textarea")}
                </fieldset>
                ${camposEntrega(borrador)}
                ${avisoFormulario()}
            </form>
            <aside class="panel resumen-personalizar">
                <h2>Tu regalo, a medida.</h2>
                <img src="img/encuentro.webp" alt="Ejemplo de un ramo personalizado de limpiapipas">
                <p>Verás la respuesta del taller con tu código de seguimiento. El adelanto queda disponible después de aceptar la propuesta.</p>
                <button class="boton" type="submit" form="formulario-personalizar">Enviar mi solicitud</button>
            </aside>
        </div>`);
}

export function vistaBusqueda(codigo, mensaje = "") {
    return pagina(`
        ${encabezado("Mis pedidos", "Introduce el código que recibiste al registrar tu solicitud en este navegador.")}
        <form class="formulario" data-form="seguimiento" novalidate>
            ${campo("codigo", "Código de seguimiento", 'required maxlength="15" placeholder="BB-000000000000" autocomplete="off"', codigo)}
            ${avisoFormulario()}
            <button class="boton" type="submit">Consultar solicitud</button>
        </form>
        <p class="separado" role="status">${mensaje}</p>`);
}

const mensajesEstado = {
    recibida: ["Tu idea ya está en buenas manos.", "El taller puede confirmar si es viable o enviarte una alternativa."],
    propuesta: ["Un pequeño cambio. La misma ilusión.", "Revisa la propuesta del taller y decide si quieres seguir."],
    pendiente_adelanto: ["Tu ramo está por confirmarse.", "Simula el adelanto para confirmar el pedido."],
    acuerdo: ["Lo tenemos. Va a ser especial.", "Aceptaste la propuesta. El pedido se confirma al registrar el adelanto simulado."],
    no_viable: ["Esta vez no podremos crearlo.", "Revisa el motivo del taller y envía una nueva idea si lo deseas."],
    rechazada: ["La propuesta quedó rechazada.", "Puedes enviar otra idea o elegir un ramo del catálogo."],
    confirmado: ["Tu pedido está confirmado.", "Registramos el adelanto simulado. Aquí podrás consultar el avance del taller."],
    elaboracion: ["Estamos elaborando tu ramo.", "El progreso se actualizará cuando esté listo."],
    listo: ["El ramo está listo.", "El taller puede registrar el despacho."],
    en_envio: ["Tu regalo va en camino.", "Confirma la recepción cuando se simule la entrega."],
    pendiente_saldo: ["Recibiste tu regalo.", "Simula el pago del saldo restante. El taller debe verificarlo."],
    por_verificar: ["El saldo está por verificar.", "El taller revisará el pago informado en la demostración."],
    regularizacion: ["El saldo sigue pendiente.", "Puedes volver a informar el saldo en esta demostración."],
    entregado: ["Tu regalo fue entregado.", "El taller verificó el saldo simulado y cerró el pedido."],
    no_concretado: ["El pedido no se concretó.", "El adelanto quedó sin registrar y esta solicitud se cerró."]
};

function formularioAccion(accion, etiqueta, clase = "") {
    return `<form class="formulario" data-form="accion" data-accion="${accion}" novalidate>
        ${avisoFormulario()}
        <button class="boton ${clase}" type="submit">${etiqueta}</button>
    </form>`;
}

function opcionesCliente(solicitud) {
    if (solicitud.estado === "propuesta") {
        return `<div class="acciones">
            ${formularioAccion("aceptar", "Aceptar y confirmar propuesta")}
            ${formularioAccion("rechazar", "Rechazar propuesta", "secundario")}
        </div>`;
    }

    if (["acuerdo", "pendiente_adelanto"].includes(solicitud.estado)) {
        return `<div class="acciones">
            ${formularioAccion("pagar", "Simular adelanto · " + soles(calcularAdelanto(totalSolicitud(solicitud))))}
            ${formularioAccion("cancelar", "Cancelar antes del adelanto", "secundario")}
        </div>`;
    }

    if (solicitud.estado === "en_envio") {
        return formularioAccion("recibir", "Confirmar que recibí el pedido");
    }

    if (["pendiente_saldo", "regularizacion"].includes(solicitud.estado)) {
        return formularioAccion("informarSaldo", "Simular saldo · " + soles(totalSolicitud(solicitud) - solicitud.adelanto.monto));
    }

    if (["no_viable", "rechazada", "no_concretado"].includes(solicitud.estado)) {
        return '<div class="acciones"><a class="boton" href="#catalogo">Ver diseños disponibles</a><a class="boton secundario" href="#personalizar">Enviar otra idea</a></div>';
    }

    return "";
}

function detallePropuesta(solicitud) {
    if (!solicitud.propuesta) {
        return "";
    }

    const titulo = solicitud.propuesta.alternativa ? "Lo que cambia, con transparencia." : "Detalles de la propuesta";
    return `<section class="panel blanco separado">
        <h2>${titulo}</h2>
        <p class="prelinea">${escapar(solicitud.propuesta.detalle)}</p>
        <dl class="valores">
            ${fila("Fecha propuesta", mostrarFecha(solicitud.propuesta.fecha))}
            ${fila("Total propuesto", soles(solicitud.propuesta.monto))}
        </dl>
    </section>`;
}

function resumenSolicitud(solicitud) {
    const producto = buscarProducto(solicitud.producto) ?? buscarProducto("encuentro");
    const total = totalSolicitud(solicitud);
    let importes = "";

    if (total !== null) {
        importes = `<dl class="valores">
            ${fila("Total", soles(total))}
            ${fila("Adelanto simulado", soles(calcularAdelanto(total)))}
            ${fila("Saldo restante", soles(total - calcularAdelanto(total)))}
        </dl>`;
    }

    let dedicatoria = "";
    if (solicitud.dedicatoria) {
        dedicatoria = `<p class="prelinea"><strong>Dedicatoria:</strong> ${escapar(solicitud.dedicatoria)}</p>`;
    }

    let detalle = "";
    if (solicitud.motivo) {
        detalle = `<p class="aviso prelinea"><strong>Motivo del taller:</strong> ${escapar(solicitud.motivo)}</p>`;
    }

    return `<aside class="panel blanco resumen-seguimiento">
        <p class="rotulo">${escapar(solicitud.id)} · ${solicitud.tipo === "catalogo" ? "Catálogo" : "Personalizado"}</p>
        <h2>${escapar(solicitud.titulo)}</h2>
        ${imagen(producto)}
        ${dedicatoria}
        ${detalle}
        ${importes}
        <p class="nota">Demostración. Sin cargos ni datos bancarios.</p>
        ${opcionesCliente(solicitud)}
    </aside>`;
}

export function vistaSeguimiento(solicitud, mensaje) {
    let [titulo, descripcion] = mensajesEstado[solicitud.estado];

    if (solicitud.estado === "propuesta" && !solicitud.propuesta.alternativa) {
        titulo = "Tu idea es viable.";
    }
    const estado = `<div><span class="estado">${estados[solicitud.estado]}</span></div>`;
    const pasos = solicitud.historial.map(function (paso) {
        const fecha = new Date(paso.fecha);
        let marcaTiempo = "";

        if (!Number.isNaN(fecha.getTime())) {
            marcaTiempo = `<time datetime="${escapar(paso.fecha)}">${formatoHora.format(fecha)}</time>`;
        }

        return `<li>${estados[paso.estado]}${marcaTiempo}</li>`;
    }).join("");

    let confirmacion = "";
    if (mensaje) {
        confirmacion = `<p class="aviso" role="status">${escapar(mensaje)}</p>`;
    }

    return pagina(`
        ${encabezado(titulo, descripcion, "#seguimiento", "Mis pedidos", estado)}
        ${confirmacion}
        <div class="columnas">
            <div>
                <section class="panel">
                    <h2>El camino de tu regalo</h2>
                    <ol class="progreso">${pasos}</ol>
                </section>
                ${detallePropuesta(solicitud)}
                <p class="aviso">Guarda tu código: <strong class="codigo">${escapar(solicitud.id)}</strong>. Podrás consultarlo en este navegador.</p>
            </div>
            ${resumenSolicitud(solicitud)}
        </div>`);
}

function opcionesTaller(solicitud) {
    if (solicitud.estado === "recibida") {
        return `<h3>¿Cómo respondemos?</h3>
            <form class="formulario separado" data-form="revision" novalidate>
                <div class="campo">
                    <label for="decision">Respuesta del taller</label>
                    <select id="decision" name="decision" required>
                        <option value="aprobar">Confirmar viabilidad</option>
                        <option value="proponer">Enviar propuesta alternativa</option>
                        <option value="descartar">Indicar que no es viable</option>
                    </select>
                </div>
                <fieldset id="cotizacion">
                    ${campo("detalle", "Detalles de la propuesta", 'required minlength="5" maxlength="500" rows="4"', "", "textarea")}
                    <div class="pares">
                        ${campo("importe", "Total (S/)", 'required inputmode="decimal" maxlength="7" placeholder="95,50"')}
                        ${campo("fecha", "Fecha propuesta de entrega", `required min="${fechaLocal()}"`, solicitud.fecha, "date")}
                    </div>
                </fieldset>
                <fieldset id="no-viable" hidden disabled>
                    ${campo("motivo", "Motivo de no viabilidad", 'required minlength="5" maxlength="500" rows="4"', "", "textarea")}
                </fieldset>
                ${avisoFormulario()}
                <button class="boton" type="submit">Enviar respuesta</button>
            </form>`;
    }

    if (solicitud.estado === "confirmado") {
        return `<div class="acciones">
            ${formularioAccion("elaborar", "Iniciar elaboración")}
            ${formularioAccion("prepararEntrega", "Marcar listo sin elaboración", "secundario")}
        </div>`;
    }

    if (solicitud.estado === "elaboracion") {
        return formularioAccion("prepararEntrega", "Marcar listo para entrega");
    }

    if (solicitud.estado === "listo") {
        return formularioAccion("despachar", "Registrar despacho");
    }

    if (solicitud.estado === "por_verificar") {
        return `<div class="acciones">
            ${formularioAccion("verificarSaldo", "Verificar saldo y cerrar")}
            ${formularioAccion("observarSaldo", "Marcar saldo pendiente", "secundario")}
        </div>`;
    }

    return '<p class="nota">Por ahora, no hay acciones de proceso pendientes para el taller.</p>';
}

function detalleTaller(solicitud, id) {
    if (!solicitud) {
        let mensaje = "Elige un registro en la lista para revisarlo.";
        if (id) {
            mensaje = "Este registro no está disponible. Elige otro de la lista.";
        }

        return `<aside class="panel blanco"><h2>Detalle</h2><p>${mensaje}</p></aside>`;
    }

    let personalizado = "";
    if (solicitud.tipo === "personalizada") {
        personalizado = fila("Idea", escapar(solicitud.descripcion)) + fila("Colores", escapar(solicitud.colores));
    }

    let propuesta = "";
    if (solicitud.propuesta) {
        propuesta = fila("Propuesta", escapar(solicitud.propuesta.detalle)) + fila("Total", soles(totalSolicitud(solicitud)));
    }

    let recepcion = "";
    if (solicitud.saldo) {
        recepcion = fila("Saldo informado", soles(solicitud.saldo.monto));
    }

    return `<article class="panel blanco" id="detalle-taller" tabindex="-1">
        <a class="ruta volver-lista" href="#taller">Volver a la lista</a>
        <p class="rotulo">${escapar(solicitud.id)} · ${estadosPedido.includes(solicitud.estado) ? "Pedido" : "Solicitud"}</p>
        <h2>${escapar(solicitud.titulo)}</h2>
        <p class="estado">${estados[solicitud.estado]}</p>
        <dl class="valores">
            ${fila("Cliente ficticio", escapar(solicitud.nombre))}
            ${fila("Zona de entrega", escapar(solicitud.zona))}
            ${fila("Fecha deseada", mostrarFecha(solicitud.fecha))}
            ${personalizado}
            ${propuesta}
            ${recepcion}
        </dl>
        ${opcionesTaller(solicitud)}
        <div class="acciones separado">
            <a href="#seguimiento/${escapar(solicitud.id)}">Ver seguimiento del cliente</a>
            <button type="button" class="boton secundario peligro" data-eliminar>Eliminar registro</button>
        </div>
        <dialog aria-labelledby="titulo-confirmacion" id="confirmar-eliminar">
            <h2 id="titulo-confirmacion">¿Eliminar este registro?</h2>
            <p>Se borrará su historial de este navegador.</p>
            <form class="acciones" method="dialog">
                <button class="boton secundario" autofocus value="cancelar">Conservar registro</button>
                <button class="boton" value="eliminar">Sí, eliminar</button>
            </form>
            <p class="error" data-error-eliminar role="alert" hidden></p>
        </dialog>
    </article>`;
}

export function vistaTaller(solicitud, id, mensaje) {
    const opciones = Object.entries(estados).map(function ([valor, etiqueta]) {
        return `<option value="${valor}">${etiqueta}</option>`;
    }).join("");

    let confirmacion = "";
    if (mensaje) {
        confirmacion = `<p class="aviso" role="status">${escapar(mensaje)}</p>`;
    }

    return `<div class="taller-fondo">${pagina(`
        ${encabezado("Solicitudes y pedidos", "Panel del taller · Demostración local.")}
        ${confirmacion}
        <div class="columnas taller-columnas">
            <section aria-label="Buscar y filtrar">
                ${campo("buscar", "Buscar por código, nombre o idea", 'placeholder="Buscar solicitudes"', "", "search")}
                <div class="campo separado">
                    <label for="filtro">Filtrar por estado</label>
                    <select id="filtro"><option value="">Todos los estados</option>${opciones}</select>
                </div>
                <p id="conteo" class="nota separado" role="status"></p>
                <ul id="lista" class="lista-solicitudes"></ul>
            </section>
            ${detalleTaller(solicitud, id)}
        </div>`)}</div>`;
}

export function listaTaller(solicitudes, id) {
    return solicitudes.map(function (solicitud) {
        const actual = solicitud.id === id ? ' aria-current="true"' : "";
        return `<li><a href="#taller/${escapar(solicitud.id)}"${actual}>
            <small>${escapar(solicitud.id)}</small>
            <strong>${escapar(solicitud.titulo)}</strong>
            <small>${escapar(solicitud.nombre)} · ${estados[solicitud.estado]}</small>
        </a></li>`;
    }).join("");
}
