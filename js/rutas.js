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
