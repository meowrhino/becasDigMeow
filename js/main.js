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
  renderFooter,
  renderContacto,
} from "./pages.js";
import { renderPortfolio } from "./portfolio.js";
import { crearThemeToggle } from "./theme.js";
import { setupKeyboardNav, setupResizeDebounce } from "./shell.js";

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
  renderFooter(data);
  renderPortfolio(data);
  renderContacto(data);
}

// ============================================
// Event Listeners (shell compartido)
// ============================================

setupKeyboardNav({
  getOverlayEl, cerrarMinimapExpandido,
  getGrid, getPosicion, setPosicion, actualizarVista,
});
setupResizeDebounce({
  actualizarTamanoMinimapInline,
  actualizarTamanoMinimapExpandido,
});

// ============================================
// Inicialización
// ============================================

configurarNavegacion({
  grid: [
    [0, 1, 0, 0], // fila 0: _, tools, _, _
    [1, 1, 1, 1], // fila 1: footer, welcome, metodología, statement
    [0, 1, 1, 0], // fila 2: _, portfolio, contacto, _
  ],
  nombres: {
    "0_1": "tools",
    "1_0": "footer",
    "1_1": "welcome",
    "1_2": "metodología",
    "1_3": "statement",
    "2_1": "portfolio",
    "2_2": "contacto",
  },
  clasesCss: {
    "tools": "tools",
    "footer": "footer",
    "metodología": "metodologia",
    "welcome": "welcome",
    "statement": "statement",
    "portfolio": "portfolio",
    "contacto": "contacto",
  },
  posInicial: { y: 1, x: 1 },
});

crearCeldas();
crearZoneLabel();
crearHeader();
crearOverlay();
crearThemeToggle(getOverlayEl());
leerHash();
renderizarContenido().then(() => actualizarVista());
