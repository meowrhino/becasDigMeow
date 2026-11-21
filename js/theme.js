// ============================================
// THEME — modos de color
// ============================================
//
// Gestiona el tema claro/oscuro y los tintes.
// Persiste la preferencia en localStorage.
// El tema se aplica ANTES del render mediante un script
// inline en <head> (ver index.html) para evitar flash.

import { currentLang, onLangChange } from "./data.js";
import { MODOS, NOMBRES_MODO } from "./modos.js";

const STORAGE_KEY = "meowrhino-theme";
const TINTE_KEY = "meowrhino-tinte";

export { MODOS };

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

/** Devuelve el tema actual ("light" | "dark"). */
function getTema() {
  return document.documentElement.getAttribute("data-theme") || "light";
}

/** Aplica el tema. */
function aplicarTema(tema) {
  document.documentElement.setAttribute("data-theme", tema);
  localStorage.setItem(STORAGE_KEY, tema);
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
 *  - .minimap-overlay  → es position:fixed. Recrearla re-rasteriza también sus celdas hijas (--minimap-*).
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
