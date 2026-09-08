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
// `portfolio` tampoco, todavía: su URL natural es /proyectos, que hoy sirve el
// índice lineal de las 21 fichas. Son la misma cosa contada dos veces y hay que
// fundirlas, pero eso toca las 66 fichas y merece su propio paso; hasta
// entonces esa celda sigue con hash y /proyectos sigue siendo lo que era.

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
  },
  en: {
    welcome: "/en",
    about: "/en/about",
    "metodología": "/en/methodology",
    condiciones: "/en/terms",
    links: "/en/links",
  },
  cat: {
    welcome: "/ca",
    about: "/ca/about",
    "metodología": "/ca/metodologia",
    condiciones: "/ca/condicions",
    links: "/ca/links",
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
