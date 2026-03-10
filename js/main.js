// ============================================
// MAIN — Inicialización y event listeners
// ============================================
//
// Orquesta la carga de todos los módulos del studio.

import { cargarDatos, obtenerDatos } from "./data.js";
import {
  configurarNavegacion,
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
  getGrid,
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

  const GRID = getGrid();
  if (GRID[newY]?.[newX] === 1) {
    setPosicion(newY, newX);
    actualizarVista();
  }
});

// --- Click en nubes ---
document.addEventListener("pointerdown", onCloudPointerDown);

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

configurarNavegacion({
  grid: [
    [0, 0, 1, 0], // fila 0: _, _, tools, _
    [1, 1, 1, 1], // fila 1: políticas, metodología, welcome, statement
    [0, 1, 1, 0], // fila 2: _, contacto, portfolio, _
  ],
  nombres: {
    "0_2": "tools",
    "1_0": "políticas",
    "1_1": "metodología",
    "1_2": "welcome",
    "1_3": "statement",
    "2_1": "contacto",
    "2_2": "portfolio",
  },
  clasesCss: {
    "tools": "tools",
    "políticas": "politicas",
    "metodología": "metodologia",
    "welcome": "welcome",
    "statement": "statement",
    "portfolio": "portfolio",
    "contacto": "contacto",
  },
  posInicial: { y: 1, x: 2 },
  onUpdate: sincronizarEstadoNubes,
});

crearCeldas();
crearZoneLabel();
crearHeader();
crearOverlay();
crearThemeToggle();
leerHash();
renderizarContenido().then(() => actualizarVista());
