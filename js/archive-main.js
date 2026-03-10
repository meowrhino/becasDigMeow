// ============================================
// ARCHIVE MAIN — Inicialización del archive
// ============================================
//
// Orquesta la carga del archive: grid diamante 4×4,
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
import { renderWelcome, renderSeccion } from "./archive-pages.js";

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

// Categorías que se renderizan como secciones shooter
const SECCIONES = [
  "tools", "misc", "meowrhino", "games",
  "experiments", "social", "unfinished",
  "texts", "WIP", "hidden",
];

async function renderizarContenido() {
  const data = await cargarDatosArchive();
  if (!data) return;

  renderWelcome(data);
  SECCIONES.forEach(key => {
    if (data[key]) renderSeccion(key, data[key]);
  });
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
    [0, 1, 0, 0], // fila 0: _, tools, _, _
    [1, 1, 1, 0], // fila 1: misc, meowrhino, games, _
    [1, 1, 1, 1], // fila 2: texts, welcome, experiments, social
    [1, 1, 1, 0], // fila 3: WIP, unfinished, hidden, _
  ],
  nombres: {
    "0_1": "tools",
    "1_0": "misc",
    "1_1": "meowrhino",
    "1_2": "games",
    "2_0": "texts",
    "2_1": "welcome",
    "2_2": "experiments",
    "2_3": "social",
    "3_0": "WIP",
    "3_1": "unfinished",
    "3_2": "hidden",
  },
  clasesCss: {
    "tools":       "archive-tools",
    "misc":        "archive-misc",
    "meowrhino":   "archive-meowrhino",
    "games":       "archive-games",
    "texts":       "archive-texts",
    "welcome":     "archive-welcome",
    "experiments": "archive-experiments",
    "social":      "archive-social",
    "WIP":         "archive-wip",
    "unfinished":  "archive-unfinished",
    "hidden":      "archive-hidden",
  },
  posInicial: { y: 2, x: 1 },
});

crearCeldas();
crearZoneLabel();
crearHeader();
crearOverlay();
crearThemeToggle(getOverlayEl());
leerHash();
renderizarContenido().then(() => actualizarVista());
