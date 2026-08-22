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
