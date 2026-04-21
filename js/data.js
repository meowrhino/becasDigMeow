// ============================================
// DATA — Carga de datos, caché e idioma global
// ============================================

// --- Idioma global ---

export const LANGS = ["es", "en", "cat"];

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

/** Callbacks de cada sección para actualizar su contenido al cambiar idioma. */
export const langUpdateCallbacks = [];

/** Genera el HTML de los botones de idioma. */
export function buildLangButtons() {
  return `<div class="lang-group">${LANGS.map(l =>
    `<button class="lang-btn${l === currentLang ? " active" : ""}" data-lang="${l}">${l}</button>`
  ).join("")}</div>`;
}

/** Sincroniza el estado visual de TODOS los .lang-btn en la página. */
export function syncAllLangButtons() {
  document.querySelectorAll(".lang-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.lang === currentLang);
  });
}

/**
 * Conecta los botones de idioma dentro de un contenedor.
 * @param {HTMLElement} container
 * @param {Function} onLangChange - Callback(lang)
 */
export function attachLangListeners(container, onLangChange) {
  langUpdateCallbacks.push(onLangChange);

  container.querySelectorAll(".lang-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.lang;
      if (lang === currentLang) return;
      currentLang = lang;
      localStorage.setItem("lang", lang);
      syncAllLangButtons();
      langUpdateCallbacks.forEach(cb => cb(lang));
    });
  });
}

// --- Carga de datos (data.json) ---

/** Caché del JSON para evitar múltiples fetches. */
let dataCache = null;

/**
 * Carga data.json y lo almacena en caché.
 * @returns {Promise<Object|null>}
 */
export async function cargarDatos() {
  if (dataCache) return dataCache;
  try {
    const res = await fetch("data.json");
    dataCache = await res.json();
    return dataCache;
  } catch (err) {
    console.error("Error cargando data.json:", err);
    return null;
  }
}

/**
 * Obtiene los datos del idioma correcto desde la caché.
 * @returns {Object|null}
 */
export function obtenerDatos() {
  if (!dataCache) return null;

  // Estructura plana (caso actual)
  if (dataCache.welcome && dataCache.portfolio) return dataCache;

  // Estructura anidada por idioma
  for (const lang of ["es", "cat", "en"]) {
    if (dataCache[lang]?.welcome && dataCache[lang]?.portfolio) return dataCache[lang];
  }

  return null;
}
