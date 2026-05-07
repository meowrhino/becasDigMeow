// ============================================
// SHELL — Navegación por teclado + resize compartidos
// ============================================
//
// Listeners globales reutilizados por main.js y archive-main.js.
// Reciben las funciones de navegación necesarias para no acoplar
// a un módulo concreto.

/**
 * Activa flechas + Escape:
 * - Escape: cierra el minimapa expandido si está visible.
 * - Arrow*: mueve la posición si la celda destino existe en el grid.
 */
export function setupKeyboardNav({
  getOverlayEl,
  cerrarMinimapExpandido,
  getGrid,
  getPosicion,
  setPosicion,
  actualizarVista,
}) {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const overlay = getOverlayEl();
      if (overlay?.classList.contains("visible")) {
        cerrarMinimapExpandido();
        return;
      }
    }

    const { posY: curY, posX: curX } = getPosicion();
    let newY = curY;
    let newX = curX;
    switch (e.key) {
      case "ArrowUp":    newY--; break;
      case "ArrowDown":  newY++; break;
      case "ArrowLeft":  newX--; break;
      case "ArrowRight": newX++; break;
      default: return;
    }

    const GRID = getGrid();
    if (GRID[newY]?.[newX] === 1) {
      setPosicion(newY, newX);
      actualizarVista();
    }
  });
}

/**
 * Debounce de resize/orientationchange para reajustar el minimapa.
 */
export function setupResizeDebounce({
  actualizarTamanoMinimapInline,
  actualizarTamanoMinimapExpandido,
}, debounceMs = 120) {
  let resizeTimeoutId = null;

  const onResize = () => {
    actualizarTamanoMinimapInline();
    actualizarTamanoMinimapExpandido();
  };

  const schedule = () => {
    if (resizeTimeoutId) clearTimeout(resizeTimeoutId);
    resizeTimeoutId = setTimeout(onResize, debounceMs);
  };

  window.addEventListener("resize", schedule);
  window.addEventListener("orientationchange", schedule);
}
