// ============================================
// MAIN — Inicialización y event listeners
// ============================================
//
// Orquesta la carga de todos los módulos del studio.

import { cargarDatos, obtenerDatos } from "./data.js";
import {
  crearCeldas,
  crearZoneLabel,
  crearHeader,
  crearOverlay,
  leerHash,
  actualizarVista,
  actualizarTamanoMinimapInline,
  actualizarTamanoMinimapExpandido,
  cerrarMinimapExpandido,
  getOverlayEl,
  GRID,
  getPosicion,
  setPosicion,
} from "./navigation.js";
import {
  renderTools,
  renderWelcome,
  renderStatement,
  renderMetodologia,
  renderPoliticas,
  renderContacto,
} from "./pages.js";
import {
  renderPortfolio,
  sincronizarEstadoNubes,
  alResizarPortfolio,
  rehidratarPortfolioTrasRetorno,
  onCloudPointerDown,
  onCloudPointerUp,
  cerrarVistaDetalle,
  esVistaDetalleAbierta,
} from "./portfolio.js";
import { crearThemeToggle } from "./theme.js";

// ============================================
// Orquestador de renderizado
// ============================================

async function renderizarContenido() {
  await cargarDatos();
  const data = obtenerDatos();
  if (!data) return;

  renderTools(data);
  renderWelcome(data);
  renderStatement(data);
  renderMetodologia(data);
  renderPoliticas(data);
  renderPortfolio(data);
  renderContacto(data);
}

// ============================================
// Event Listeners
// ============================================

// --- Navegación por teclado ---
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    const overlay = getOverlayEl();
    if (overlay?.classList.contains("visible")) {
      cerrarMinimapExpandido();
      return;
    }
    if (esVistaDetalleAbierta()) {
      cerrarVistaDetalle();
      return;
    }
  }

  // No navegar con flechas si la vista detalle está abierta
  if (esVistaDetalleAbierta()) return;

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

  if (GRID[newY]?.[newX] === 1) {
    setPosicion(newY, newX);
    actualizarVista();
  }
});

// --- Drag de nubes (pointer global) ---
document.addEventListener("pointerdown", onCloudPointerDown);
document.addEventListener("pointerup", onCloudPointerUp);

// --- Resize ---
let resizeTimeoutId = null;

function alResizarViewport() {
  actualizarTamanoMinimapInline();
  actualizarTamanoMinimapExpandido();
  alResizarPortfolio();
}

function programarResize() {
  if (resizeTimeoutId) clearTimeout(resizeTimeoutId);
  resizeTimeoutId = setTimeout(alResizarViewport, 120);
}

window.addEventListener("resize", programarResize);
window.addEventListener("orientationchange", programarResize);

// --- Visibilidad ---
let lastHiddenAt = 0;

function onVisibilityChange() {
  if (document.hidden) {
    lastHiddenAt = Date.now();
    sincronizarEstadoNubes();
    return;
  }
  const hiddenMs = lastHiddenAt > 0 ? Date.now() - lastHiddenAt : 0;
  const forzarRebuild = hiddenMs > 90_000;
  rehidratarPortfolioTrasRetorno(forzarRebuild);
}

document.addEventListener("visibilitychange", onVisibilityChange);

// ============================================
// Inicialización
// ============================================

crearCeldas();
crearZoneLabel();
crearHeader();
crearOverlay();
crearThemeToggle();
leerHash();
renderizarContenido().then(() => actualizarVista());
