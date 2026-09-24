// ============================================
// DATA — Carga de datos, caché e idioma global
// ============================================

import { fetchJson } from "./utils.js";
import { celdaDeRuta, rutaCelda } from "./rutas.js";

// --- Idioma global ---

export const LANGS = ["es", "en", "cat"];

/** Caché de data.json. */
let dataCache = null;

/**
 * URL pública de cada idioma. La home se sirve pre-renderizada en tres
 * variantes (index.html, en.html, ca.html — ver build-seo.js) para que cada
 * idioma tenga su URL indexable, así que cambiar de idioma es navegar.
 */
export const RUTA_IDIOMA = { es: "/", en: "/en", cat: "/ca" };

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
 * Lo son todas las celdas del lienzo. En /archive devuelve null y manda
 * la preferencia guardada, como siempre.
 *
 * Cuando aplica, manda sobre localStorage y sobre el navegador a propósito: si
 * alguien llega a /en desde una búsqueda en inglés tiene que ver inglés aunque
 * en su última visita eligiera otra cosa. Si no, Google indexaría un texto y el
 * visitante vería otro.
 */
function idiomaDeLaRuta() {
  // Cloudflare sirve en.html como /en, así que normalizamos ambas formas.
  const ruta = location.pathname.replace(/\.html$/, "").replace(/\/+$/, "") || "/";
  if (ruta === "/index") return "es";
  // Todas las celdas del lienzo tienen ruta por idioma, no solo la portada:
  // quien cae en /en/about desde una búsqueda en inglés tiene que ver inglés
  // aunque su última visita fuera en otro idioma. La tabla es la de rutas.js,
  // que es la misma que usa el enrutado, así que no puede desincronizarse.
  return celdaDeRuta(ruta)?.lang ?? null;
}

// Prioridad: idioma que impone la URL > preferencia guardada > navegador.
const idiomaGuardado = localStorage.getItem("lang");
export let currentLang = idiomaDeLaRuta()
  ?? (idiomaGuardado && LANGS.includes(idiomaGuardado) ? idiomaGuardado : detectarIdiomaNavegador());

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

/**
 * Callbacks de cada sección para actualizar su contenido al cambiar idioma.
 * Cada entrada guarda también el contenedor que registró el callback, para
 * poder purgar automáticamente los que quedan huérfanos (contenedor ya fuera
 * del DOM) en vez de acumularlos sin límite y dispararlos sobre nodos muertos.
 */
export const langUpdateCallbacks = [];

/**
 * Registra un callback global que se dispara en cada cambio de idioma, sin
 * requerir un contenedor con botones .lang-btn (p.ej. theme.js, que solo
 * necesita re-traducir su aria-label). Se vincula a document.body, que
 * nunca se desconecta del DOM, así que nunca se purga.
 */
export function onLangChange(cb) {
  langUpdateCallbacks.push({ container: document.body, cb });
}

/** Código BCP-47 de un idioma interno (catalán se guarda como "cat"). */
const bcp47 = (lang) => (lang === "cat" ? "ca" : lang);

/**
 * Genera el HTML de los botones de idioma.
 *
 * En el lienzo cada celda tiene URL propia por idioma, así que ahí se pintan
 * como <a href> de verdad y no como <button>. No es cosmético: eran la única
 * forma de llegar a /en y /ca desde el sitio, y al ser botones con
 * `location.href` no existía NI UN enlace rastreable hacia esas páginas —
 * Google solo las conocía por el sitemap y los hreflang.
 *
 * El destino es la misma celda en el otro idioma (/en/about → /ca/about). Antes
 * el salto era siempre a la portada del idioma, así que cambiar de lengua
 * mientras leías las condiciones te devolvía al principio.
 *
 * Fuera del lienzo (archive y demás) no hay variante por URL: siguen siendo
 * <button> y el cambio se hace en caliente.
 */
export function buildLangButtons() {
  const aqui = celdaDeRuta(location.pathname);
  return `<div class="lang-group">${LANGS.map(l => {
    const activo = l === currentLang;
    const clase = `lang-btn${activo ? " is-active" : ""}`;
    const destino = aqui ? rutaCelda(aqui.nombre, l) : null;
    return destino
      ? `<a class="${clase}" href="${destino}" hreflang="${bcp47(l)}" data-lang="${l}"${activo ? ' aria-current="true"' : ""}>${l}</a>`
      : `<button class="${clase}" data-lang="${l}" aria-pressed="${activo}">${l}</button>`;
  }).join("")}</div>`;
}

/** Sincroniza el estado visual de TODOS los .lang-btn en la página. */
export function syncAllLangButtons() {
  document.querySelectorAll(".lang-btn").forEach(b => {
    const activo = b.dataset.lang === currentLang;
    b.classList.toggle("is-active", activo);
    // Los enlaces marcan el idioma activo con aria-current; aria-pressed es de
    // botones de estado y sobre un <a> no significa nada.
    if (b.tagName === "A") {
      if (activo) b.setAttribute("aria-current", "true");
      else b.removeAttribute("aria-current");
    } else {
      b.setAttribute("aria-pressed", activo ? "true" : "false");
    }
  });
}

/**
 * Conecta los botones de idioma dentro de un contenedor.
 * @param {HTMLElement} container
 * @param {Function} onLangChange - Callback(lang)
 */
export function attachLangListeners(container, onLangChange) {
  langUpdateCallbacks.push({ container, cb: onLangChange });

  container.querySelectorAll(".lang-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const lang = btn.dataset.lang;

      // Cmd/Ctrl/Shift/Alt + clic: que el navegador haga lo suyo (abrir en
      // pestaña o ventana nueva) en vez de que se lo comamos nosotros.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (lang === currentLang) { e.preventDefault(); return; }

      // En el lienzo cada idioma es una URL propia, así que cambiar de idioma
      // es navegar: si no, la URL diría /en mientras se lee catalán. El enlace
      // ya apunta a la celda correcta; lo interceptamos solo para arrastrar el
      // hash y guardar la preferencia.
      if (idiomaDeLaRuta()) {
        e.preventDefault();
        localStorage.setItem("lang", lang);
        const destino = btn.getAttribute("href") || RUTA_IDIOMA[lang];
        location.href = destino + location.hash;
        return;
      }

      currentLang = lang;
      localStorage.setItem("lang", lang);
      sincronizarLangDocumento(lang);
      syncAllLangButtons();
      // Purga huérfanos (contenedor ya fuera del DOM) recorriendo hacia atrás
      // para que el splice no desordene el resto, y dispara el resto en orden.
      for (let i = langUpdateCallbacks.length - 1; i >= 0; i--) {
        if (!langUpdateCallbacks[i].container.isConnected) langUpdateCallbacks.splice(i, 1);
      }
      langUpdateCallbacks.forEach(({ cb }) => cb(lang));
    });
  });
}

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
