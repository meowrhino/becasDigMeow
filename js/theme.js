// ============================================
// THEME — Toggle claro/oscuro con SVG morph
// ============================================
//
// Gestiona el tema claro/oscuro con un toggle SVG
// que hace morph suave entre luna y sol.
// Persiste la preferencia en localStorage.
// El tema se aplica ANTES del render mediante un script
// inline en <head> (ver index.html) para evitar flash.

import { currentLang, onLangChange } from "./data.js";

const STORAGE_KEY = "meowrhino-theme";
const TINTE_KEY = "meowrhino-tinte";

/**
 * Los modos de color. Los dos de siempre son el tema (`data-theme`); los otros
 * cuatro son un tinte (`data-tinte`, sus colores están en style.css) puesto
 * encima de uno de los dos, del que heredan lo que no cambian.
 */
export const MODOS = {
  claro:     { base: "light" },
  oscuro:    { base: "dark" },
  papel:     { base: "light", tinte: "papel" },
  chicle:    { base: "light", tinte: "chicle" },
  cianotipo: { base: "dark",  tinte: "cianotipo" },
  fosforo:   { base: "dark",  tinte: "fosforo" },
};
const NOMBRES_MODO = {
  es:  { claro: "claro", oscuro: "oscuro", papel: "papel", chicle: "chicle", cianotipo: "cianotipo", fosforo: "fósforo" },
  en:  { claro: "light", oscuro: "dark",   papel: "paper", chicle: "bubblegum", cianotipo: "cyanotype", fosforo: "phosphor" },
  cat: { claro: "clar",  oscuro: "fosc",   papel: "paper", chicle: "xiclet", cianotipo: "cianotip", fosforo: "fòsfor" },
};

/** El nombre de un modo en el idioma de la página. */
export const nombreModo = (modo) => (NOMBRES_MODO[currentLang] || NOMBRES_MODO.es)[modo] || modo;

/** El modo que se está viendo. */
export function modoActual() {
  return document.documentElement.dataset.tinte || (getTema() === "dark" ? "oscuro" : "claro");
}

/** Pone un modo y lo recuerda: su tinte, si lo tiene, y el tema del que cuelga. */
export function aplicarModo(modo) {
  const { base, tinte } = MODOS[modo] || MODOS.claro;
  if (tinte) {
    document.documentElement.dataset.tinte = tinte;
    localStorage.setItem(TINTE_KEY, tinte);
  } else {
    delete document.documentElement.dataset.tinte;
    localStorage.removeItem(TINTE_KEY);
  }
  aplicarTema(base);
}

/** Textos del aria-label del toggle por idioma (claves = LANGS de data.js). */
const TEXTOS_TOGGLE = {
  es: { aClaro: "Cambiar a modo claro", aOscuro: "Cambiar a modo oscuro" },
  en: { aClaro: "Switch to light mode", aOscuro: "Switch to dark mode" },
  cat: { aClaro: "Canvia a mode clar", aOscuro: "Canvia a mode fosc" },
};

const SVG_MOON = `<svg class="toggle-icon toggle-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

const SVG_SUN = `<svg class="toggle-icon toggle-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;

let toggleEl = null;

/** Devuelve el tema actual ("light" | "dark"). */
function getTema() {
  return document.documentElement.getAttribute("data-theme") || "light";
}

/** Actualiza el aria-label del toggle según tema activo e idioma actual. */
function actualizarAriaLabelToggle() {
  if (!toggleEl) return;
  const textos = TEXTOS_TOGGLE[currentLang] || TEXTOS_TOGGLE.es;
  const tema = getTema();
  toggleEl.setAttribute("aria-label", tema === "dark" ? textos.aClaro : textos.aOscuro);
}

/** Aplica el tema y actualiza los iconos SVG. */
function aplicarTema(tema) {
  document.documentElement.setAttribute("data-theme", tema);
  localStorage.setItem(STORAGE_KEY, tema);
  if (toggleEl) {
    toggleEl.classList.toggle("is-dark", tema === "dark");
    actualizarAriaLabelToggle();
  }
  sincronizarLogosTema(tema);
  forzarRepaintCapasCompuestas();
}

/**
 * Pone los logos de la subvención en la tinta que toca: NEGRO sobre claro,
 * BLANCO sobre oscuro.
 *
 * Sin filtrar por clase: `.footer-logo` es el del lienzo (lo pinta pages.js ya
 * con el tono bueno) y `.easy-logo` el de las páginas lineales, que son HTML
 * escrito de antemano y siempre nace en NEGRO. Por eso hace falta llamarla al
 * arrancar y no solo al cambiar de tema: quien abre /condiciones en oscuro
 * vería cuatro logos negros sobre fondo negro.
 */
export function sincronizarLogosTema(tema = getTema()) {
  const tone = tema === "dark" ? "BLANCO" : "NEGRO";
  document.querySelectorAll("img[data-logo-name]").forEach(img => {
    img.src = `/img/LOGOS/${tone}/${img.dataset.logoName}.webp`;
  });
}

/**
 * iOS Safari no repinta las capas compuestas por GPU cuando solo cambian
 * variables CSS (--bg, --text, --minimap-*, --overlay-bg). Esos elementos se
 * quedan con los colores del tema anterior — el clásico "solo cambia una parte
 * de la página". Destruir y recrear la capa (display none→reflow→'') la
 * re-rasteriza con los colores nuevos. Es síncrono, antes del próximo paint,
 * así que no parpadea.
 *
 * Capas afectadas:
 *  - .minimap-overlay  → es position:fixed y, además, contiene el propio toggle
 *    de tema, así que es la superficie que el usuario está mirando al cambiar.
 *    Recrearla re-rasteriza también sus celdas hijas (--minimap-*).
 *  - .zone-label-bg    → position:fixed + transform permanente (--zone-label).
 *  - .welcome-cupon-wrapper → capa permanente por su animación de rebote.
 */
function forzarRepaintCapasCompuestas() {
  document.querySelectorAll(
    ".minimap-overlay, .zone-label-bg, .welcome-cupon-wrapper"
  ).forEach(el => {
    el.style.display = "none";
    void el.offsetHeight; // fuerza reflow → re-rasteriza al volver
    el.style.display = "";
  });
}

/** Alterna entre claro y oscuro con animación de rotación. */
function alternarTema() {
  if (toggleEl) {
    toggleEl.animate(
      [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
      { duration: 500, easing: "ease-in-out" }
    );
  }
  // El interruptor va de claro a oscuro y vuelta: si había un tinte, lo quita.
  aplicarModo(getTema() === "dark" ? "claro" : "oscuro");
}

/** Crea el botón toggle de tema (SVG moon/sun) dentro del contenedor dado. */
export function crearThemeToggle(parent = document.body) {
  toggleEl = document.createElement("button");
  toggleEl.classList.add("theme-toggle");
  toggleEl.innerHTML = SVG_MOON + SVG_SUN;
  toggleEl.addEventListener("click", alternarTema);

  // Sincronizar estado con el tema actual (ya aplicado por el script de <head>)
  toggleEl.classList.toggle("is-dark", getTema() === "dark");
  actualizarAriaLabelToggle();
  sincronizarLogosTema();
  // Re-traduce el aria-label cuando cambia el idioma (sin depender de pages.js).
  onLangChange(actualizarAriaLabelToggle);

  parent.appendChild(toggleEl);
}
