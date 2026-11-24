export const productos = [
    {
        id: "tulipanes",
        nombre: "Tulipanes de rubor",
        descripcion: "Tulipanes de limpiapipas en tonos rosa y frambuesa, con envoltura rosada.",
        precio: 4900,
        foto: "img/tulipanes.webp",
        alt: "Ramo rosado de tulipanes de limpiapipas"
    },
    {
        id: "margaritas",
        nombre: "Días de margaritas",
        descripcion: "Margaritas de limpiapipas con centro amarillo y una envoltura de papel kraft.",
        precio: 4200,
        foto: "img/margaritas.webp",
        alt: "Ramo de margaritas artesanales blancas envuelto en papel kraft"
    },
    {
        id: "lavanda",
        nombre: "Carta de lavanda",
        descripcion: "Flores artesanales en lavanda y crema, reunidas en una envoltura lila.",
        precio: 5400,
        foto: "img/lavanda.webp",
        alt: "Ramo artesanal de flores lilas y crema"
    },
    {
        id: "encuentro",
        nombre: "Primer encuentro",
        descripcion: "Flores rosadas, margaritas y un lazo frambuesa para un detalle especial.",
        precio: 5900,
        foto: "img/encuentro.webp",
        alt: "Ramo de limpiapipas rosado y blanco con lazo frambuesa"
    }
];

export function buscarProducto(id) {
    return productos.find(function (producto) {
        return producto.id === id;
    });
}
