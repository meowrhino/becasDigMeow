// ============================================
// SHELL — Navegación por teclado + resize compartidos
// ============================================
//
// Listeners globales reutilizados por main.js y archive-main.js.
// Reciben las funciones de navegación necesarias para no acoplar
// a un módulo concreto.

/**
 * Activa flechas + Escape:
 * - Escape: cierra el mapa de «menú» si está abierto.
 * - Arrow*: va a la página conectada que cae en esa dirección, si la hay.
 */
export function setupKeyboardNav({ getOverlayEl, cerrarMinimapExpandido, irHacia }) {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const overlay = getOverlayEl();
      if (overlay?.classList.contains("visible")) {
        cerrarMinimapExpandido();
        return;
      }
    }
    const paso = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
    if (paso) irHacia(...paso);
  });
}

/**
 * Debounce de resize/orientationchange: llama a cada función que reciba
 * (reajustar el minimapa, recolocar los nombres del mapa).
 */
export function setupResizeDebounce(alCambiar, debounceMs = 120) {
  let resizeTimeoutId = null;
  const onResize = () => Object.values(alCambiar).forEach(f => f());

  const schedule = () => {
    if (resizeTimeoutId) clearTimeout(resizeTimeoutId);
    resizeTimeoutId = setTimeout(onResize, debounceMs);
  };

  window.addEventListener("resize", schedule);
  window.addEventListener("orientationchange", schedule);
}
