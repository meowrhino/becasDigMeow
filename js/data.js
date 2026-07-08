// ============================================
// DATA — Carga de datos, caché e idioma global
// ============================================

// --- Idioma global ---

export const LANGS = ["es", "en", "cat"];

/** Caché de data.json (declarado aquí para que sincronizarMetaDescripcion,
 * llamado desde el arranque más abajo, pueda leerlo sin TDZ). */
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

// Preferencia guardada manda sobre autodetección del navegador.
const idiomaGuardado = localStorage.getItem("lang");
export let currentLang = idiomaGuardado && LANGS.includes(idiomaGuardado)
  ? idiomaGuardado
  : detectarIdiomaNavegador();

/** Refleja el idioma activo en <html lang> (catalán → código BCP-47 "ca"). */
function sincronizarLangDocumento(lang) {
  document.documentElement.lang = lang === "cat" ? "ca" : lang;
  sincronizarMetaDescripcion(lang);
}
sincronizarLangDocumento(currentLang);

/**
 * Actualiza <meta name="description"> con la variante del idioma activo.
 * No-op hasta que data.json está en caché (en el arranque, antes del primer
 * fetch, y también si data.json no trae `meta.description`).
 */
function sincronizarMetaDescripcion(lang) {
  const desc = dataCache?.meta?.description;
  if (!desc) return;
  const metaEl = document.querySelector('meta[name="description"]');
  if (metaEl) metaEl.setAttribute("content", desc[lang] ?? desc.es ?? "");
}

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

/** Genera el HTML de los botones de idioma. */
export function buildLangButtons() {
  return `<div class="lang-group">${LANGS.map(l =>
    `<button class="lang-btn${l === currentLang ? " is-active" : ""}" data-lang="${l}" aria-pressed="${l === currentLang}">${l}</button>`
  ).join("")}</div>`;
}

/** Sincroniza el estado visual de TODOS los .lang-btn en la página. */
export function syncAllLangButtons() {
  document.querySelectorAll(".lang-btn").forEach(b => {
    const activo = b.dataset.lang === currentLang;
    b.classList.toggle("is-active", activo);
    b.setAttribute("aria-pressed", activo ? "true" : "false");
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
    btn.addEventListener("click", () => {
      const lang = btn.dataset.lang;
      if (lang === currentLang) return;
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
  try {
    const res = await fetch("data.json");
    // Sin esto, un 404 intenta parsear la página de error como JSON y el
    // fallo confunde (SyntaxError) en vez de decir claramente qué pasó.
    if (!res.ok) throw new Error(`HTTP ${res.status} al cargar data.json`);
    dataCache = await res.json();
    // En el arranque, sincronizarLangDocumento(currentLang) ya corrió antes de
    // este fetch (dataCache aún era null), así que la meta description quedó
    // sin actualizar: la sincronizamos ahora que ya hay datos.
    sincronizarMetaDescripcion(currentLang);
  } catch (err) {
    console.error("Error cargando data.json:", err);
    dataCache = null;
  }
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
