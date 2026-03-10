// ============================================
// ARCHIVE MAIN — Inicialización del archive
// ============================================
//
// Orquesta la carga del archive: grid en cruz 3×3,
// dark por defecto, comparte navigation.js y theme.js.

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
import { crearThemeToggle } from "./theme.js";
import {
  renderWelcome,
  renderProyectos,
  renderTextos,
  renderFacts,
  renderPersonajes,
} from "./archive-pages.js";

// ============================================
// Datos del archive
// ============================================

let archiveData = null;

async function cargarDatosArchive() {
  try {
    const res = await fetch("archive-data.json");
    archiveData = await res.json();
    return archiveData;
  } catch (err) {
    console.error("Error cargando archive-data.json:", err);
    return null;
  }
}

// ============================================
// Renderizado
// ============================================

async function renderizarContenido() {
  const data = await cargarDatosArchive();
  if (!data) return;

  renderWelcome(data);
  renderProyectos(data);
  renderTextos(data);
  renderFacts(data);
  renderPersonajes(data);
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

// --- Resize ---
let resizeTimeoutId = null;

function alResizarViewport() {
  actualizarTamanoMinimapInline();
  actualizarTamanoMinimapExpandido();
}

function programarResize() {
  if (resizeTimeoutId) clearTimeout(resizeTimeoutId);
  resizeTimeoutId = setTimeout(alResizarViewport, 120);
}

window.addEventListener("resize", programarResize);
window.addEventListener("orientationchange", programarResize);

// ============================================
// Inicialización
// ============================================

configurarNavegacion({
  grid: [
    [0, 1, 0], // fila 0: _, textos, _
    [1, 1, 1], // fila 1: facts, hub, proyectos
    [0, 1, 0], // fila 2: _, personajes, _
  ],
  nombres: {
    "0_1": "textos",
    "1_0": "facts",
    "1_1": "welcome",
    "1_2": "proyectos",
    "2_1": "personajes",
  },
  clasesCss: {
    "textos":     "archive-textos",
    "facts":      "archive-facts",
    "welcome":        "archive-welcome",
    "proyectos":  "archive-proyectos",
    "personajes": "archive-personajes",
  },
  posInicial: { y: 1, x: 1 },
});

crearCeldas();
crearZoneLabel();
crearHeader();
crearOverlay();
crearThemeToggle();
leerHash();
renderizarContenido().then(() => actualizarVista());
