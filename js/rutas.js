// ============================================
// RUTAS — las URL públicas que dependen del idioma.
// ============================================
//
// Vive aparte y sin imports porque lo necesitan módulos que no se conocen entre
// sí (el pre-render, el grid del portfolio, la card del welcome) y hasta ahora
// cada uno llevaba su propia copia de la tabla. Con dos copias basta con que
// alguien añada un idioma en una para que la otra mande a la página equivocada:
// justo lo que pasaba con la card, que enlazaba a /proyectos desde /en y /ca.
//
// Los segmentos están traducidos porque son los que genera build-seo.js; el
// slug del proyecto NO se traduce (es un nombre propio).

/** Índice de proyectos de cada idioma. Las claves son las de data.json. */
export const RUTA_PROYECTOS = {
  es: "/proyectos",
  en: "/en/projects",
  cat: "/ca/projectes",
};

/** Base de la ruta de proyectos en un idioma, con fallback a castellano. */
export const rutaProyectos = (lang) => RUTA_PROYECTOS[lang] || RUTA_PROYECTOS.es;

/**
 * Convierte el `nombre` de data.json en slug de URL.
 * Parte el camelCase antes de bajar a minúsculas (mokakopaTwins →
 * mokakopa-twins) y quita los acentos, que en una URL sobran.
 *
 * Vive aquí y no en proyecto-template.js porque también lo necesita
 * easy-template.js, y ese ya es de quien proyecto-template importa: tenerlo
 * allí montaba un import circular. Es código de URLs, su sitio es este.
 *
 * El resultado tiene que coincidir con el `slug` de proyectos-seo.json, que es
 * la URL canónica; si algún día dejan de cuadrar, estos enlaces darían 404.
 */
export const slugify = (s) => String(s ?? "")
  .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
  .toLowerCase()
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

// ============================================
// RUTAS DE CELDA — el lienzo deja de vivir en un hash
// ============================================
//
// Hasta ahora las siete celdas del lienzo compartían una sola URL y la celda
// activa se guardaba en el hash (`/#metodologia`). Para un buscador eso es UNA
// página: el texto de metodología, el del statement y el de contacto competían
// entre sí dentro del mismo documento, y /easy servía una copia entera de todo
// con canonical a la raíz, así que nunca podía posicionar.
//
// Ahora cada celda es una URL de verdad, con su propio HTML generado por
// build-seo.js (su title, su description, su canonical y su pre-render). El
// lienzo sigue siendo el lienzo: al deslizar se hace pushState y no hay recarga.
//
// El archive NO entra en esta tabla: es otro documento con su propio lienzo de
// once celdas, y sigue navegando por hash exactamente como antes.
//
// `portfolio` tampoco: es la celda de las capturas en movimiento y no tiene URL
// propia; se entra por `/#portfolio`, que leerHash() resuelve al cargar.
//
// `proyectos` ESTUVO aquí y ya no está. Fue celda del lienzo durante un día: la
// lista de las 21 al lado de la rejilla. Contaba lo mismo que el portfolio pero
// sin las capturas, y en un sitio donde el trabajo es lo visual, una columna de
// nombres al lado de las imágenes solo podía ser la versión pobre. El índice
// sigue vivo en `/proyectos` como página lineal suelta —con sus fichas, sus
// resúmenes y su hreflang— porque ahí sí sirve: es lo que rastrea un buscador.
// Lo que se fue del mapa es la celda, no la página.
//
// `mapa` ocupa ahora esa casilla, a la derecha del portfolio: el plano del
// sitio, que además puedes recolocar. Sí tiene ruta, aunque lo que se guarda
// (dónde has puesto cada sección) viva solo en tu navegador: la página existe
// igual para quien llega de fuera, y sin JS se lee como lo que es, el índice
// de las secciones con sus enlaces.

/**
 * Celda → ruta, por idioma. La clave es el identificador interno de la celda
 * (el de NOMBRES_CELDAS en main.js), que no se traduce nunca; lo que cambia por
 * idioma es el segmento de URL, igual que ya pasaba con /proyectos.
 *
 * `welcome` es la raíz de cada idioma: es la celda de entrada del lienzo.
 */
export const RUTA_CELDAS = {
  es: {
    welcome: "/",
    about: "/about",
    "metodología": "/metodologia",
    condiciones: "/condiciones",
    links: "/links",
    mapa: "/mapa",
  },
  en: {
    welcome: "/en",
    about: "/en/about",
    "metodología": "/en/methodology",
    condiciones: "/en/terms",
    links: "/en/links",
    mapa: "/en/map",
  },
  cat: {
    welcome: "/ca",
    about: "/ca/about",
    "metodología": "/ca/metodologia",
    condiciones: "/ca/condicions",
    links: "/ca/links",
    mapa: "/ca/mapa",
  },
};

/** La ruta de una celda en un idioma, con vuelta a castellano si falta. */
export const rutaCelda = (nombre, lang) =>
  RUTA_CELDAS[lang]?.[nombre] ?? RUTA_CELDAS.es[nombre] ?? null;

/**
 * Normaliza un pathname para poder compararlo con la tabla: Cloudflare sirve
 * `metodologia.html` en `/metodologia`, así que las dos formas tienen que
 * resolver a la misma celda. La barra final tampoco distingue.
 */
export const normalizarRuta = (pathname) =>
  (String(pathname ?? "").replace(/\.html$/, "").replace(/\/+$/, "") || "/");

/**
 * Qué celda y en qué idioma corresponde a una URL. Devuelve null si la ruta no
 * es del lienzo (una ficha de proyecto, el archive, un 404…), y entonces quien
 * llama se queda donde estaba.
 */
export function celdaDeRuta(pathname) {
  const ruta = normalizarRuta(pathname);
  for (const [lang, tabla] of Object.entries(RUTA_CELDAS)) {
    for (const [nombre, r] of Object.entries(tabla)) {
      if (r === ruta) return { nombre, lang };
    }
  }
  return null;
}
