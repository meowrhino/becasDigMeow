// ============================================
// THEME — modos de color
// ============================================
//
// Gestiona el tema claro/oscuro y los tintes.
// Persiste la preferencia en localStorage.
// El tema se aplica ANTES del render mediante un script
// inline en <head> (ver index.html) para evitar flash.

import { currentLang } from "./data.js";
import { MODOS, NOMBRES_MODO, modoActual, ponerModo } from "./controles.js";

export { MODOS, modoActual };

/** El nombre de un modo en el idioma de la página. */
export const nombreModo = (modo) => (NOMBRES_MODO[currentLang] || NOMBRES_MODO.es)[modo] || modo;

/** Pone un modo (js/controles.js) y repinta lo que no se entera solo. */
export function aplicarModo(modo) {
  ponerModo(modo);
  sincronizarLogosTema();
  forzarRepaintCapasCompuestas();
}

/** Devuelve el tema actual ("light" | "dark"). */
function getTema() {
  return document.documentElement.getAttribute("data-theme") || "light";
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
 * variables CSS (--bg, --text, --overlay-bg). Esos elementos se
 * quedan con los colores del tema anterior — el clásico "solo cambia una parte
 * de la página". Destruir y recrear la capa (display none→reflow→'') la
 * re-rasteriza con los colores nuevos. Es síncrono, antes del próximo paint,
 * así que no parpadea.
 *
 * Capas afectadas:
 *  - .minimap-overlay  → es position:fixed.
 */
function forzarRepaintCapasCompuestas() {
  document.querySelectorAll(
    ".minimap-overlay"
  ).forEach(el => {
    el.style.display = "none";
    void el.offsetHeight; // fuerza reflow → re-rasteriza al volver
    el.style.display = "";
  });
}
