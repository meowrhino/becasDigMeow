// ============================================
// DATA — Carga de datos, caché e idioma global
// ============================================

import { fetchJson } from "./utils.js";
import { celdaDeRuta, normalizarRuta } from "./rutas.js";

// --- Idioma global ---

export const LANGS = ["es", "en", "cat"];

/** Caché de data.json. */
let dataCache = null;

/**
 * Detecta idioma desde `navigator.language(s)`. Catalán se mapea a "cat"
 * (tanto `ca` como `ca-ES`). Cualquier otro → "es".
 */
function detectarIdiomaNavegador() {
  const nav = (navigator.languages?.[0] || navigator.language || "").toLowerCase();
  if (nav.startsWith("ca")) return "cat";
  if (nav.startsWith("en")) return "en";
  if (nav.startsWith("es")) return "es";
  return "es";
}

/**
 * Idioma que impone la URL, o null si la página no es una variante por idioma.
 *
 * Lo son todas las celdas del lienzo. /archive, que no tiene traducción, va
 * siempre en castellano.
 *
 * Cuando aplica, manda sobre el idioma del navegador a propósito: si
 * alguien llega a /en desde una búsqueda en inglés tiene que ver inglés aunque
 * en su última visita eligiera otra cosa. Si no, Google indexaría un texto y el
 * visitante vería otro.
 */
function idiomaDeLaRuta() {
  // Cloudflare sirve en.html como /en, así que normalizamos ambas formas.
  const ruta = normalizarRuta(location.pathname);
  // /archive no tiene traducción: va en castellano, como su <html lang>, y no
  // con el idioma del navegador (decía «mode(light)» y no había cómo cambiarlo).
  if (ruta === "/index" || ruta === "/archive") return "es";
  // Todas las celdas del lienzo tienen ruta por idioma, no solo la portada:
  // quien cae en /en/about desde una búsqueda en inglés tiene que ver inglés
  // aunque su última visita fuera en otro idioma. La tabla es la de rutas.js,
  // que es la misma que usa el enrutado, así que no puede desincronizarse.
  return celdaDeRuta(ruta)?.lang ?? null;
}

// Prioridad: idioma que impone la URL > navegador. Cambiar de idioma es ir a
// otra URL (la barra, js/navigation.js), así que no cambia con la página abierta.
export const currentLang = idiomaDeLaRuta() ?? detectarIdiomaNavegador();

/**
 * Refleja el idioma activo en <html lang> (catalán → código BCP-47 "ca").
 *
 * Aquí también se sincronizaba la meta description, pero con la de la portada
 * (`meta.description`) en cualquier página: al cargar /about, el JS cambiaba
 * su description por la de la home, y como Google ejecuta el JS veía la misma
 * en todas las celdas. Ahora la pone main.js según la celda activa.
 */
function sincronizarLangDocumento(lang) {
  document.documentElement.lang = lang === "cat" ? "ca" : lang;
}
sincronizarLangDocumento(currentLang);

// --- Carga de datos (data.json) ---

/**
 * Carga data.json y lo almacena en caché.
 * @returns {Promise<Object|null>}
 */
export async function cargarDatos() {
  if (dataCache) return dataCache;
  // Absoluta, no "data.json": desde que cada celda es una página, la misma
  // aplicación se sirve en /about y en /en/about, y una ruta relativa buscaría
  // el JSON en /en/data.json. Misma razón en las rutas de imagen del portfolio
  // y de los logos del pie.
  dataCache = await fetchJson("/data.json");
  return dataCache;
}

/**
 * Obtiene los datos desde la caché (estructura plana, un único data.json
 * para todos los idiomas; las variantes por idioma van dentro de cada campo).
 * @returns {Object|null}
 */
export function obtenerDatos() {
  if (!dataCache) return null;
  if (dataCache.welcome && dataCache.portfolio) return dataCache;
  return null;
}
