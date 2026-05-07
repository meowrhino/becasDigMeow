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
import { renderSeccion } from "./archive-pages.js";
import { fetchJson } from "./utils.js";
import { setupKeyboardNav, setupResizeDebounce } from "./shell.js";

// ============================================
// Datos del archive
// ============================================

let archiveData = null;

async function cargarDatosArchive() {
  archiveData = await fetchJson("archive-data.json");
  return archiveData;
}

// ============================================
// Renderizado
// ============================================

// Categorías que se renderizan como secciones shooter
const SECCIONES = [
  "tools", "misc", "sidequests", "meowrhino",
  "games", "experiments", "social", "unfinished",
  "texts", "WIP", "hidden",
];

async function renderizarContenido() {
  const data = await cargarDatosArchive();
  if (!data) return;

  SECCIONES.forEach(key => {
    if (data[key]) renderSeccion(key, data[key]);
  });

  // Nav-label "studio" permanente en la celda meowrhino
  const meowEl = document.querySelector(".celda.archive-meowrhino");
  if (meowEl) {
    const studioLabel = document.createElement("a");
    studioLabel.href = data.welcome.studioUrl;
    studioLabel.classList.add("nav-label", "bottom");
    studioLabel.dataset.permanent = "true";
    studioLabel.textContent = "studio";
    studioLabel.addEventListener("click", () => {
      const current = localStorage.getItem("meowrhino-theme") || "dark";
      localStorage.setItem("meowrhino-theme", current === "dark" ? "light" : "dark");
    });
    meowEl.appendChild(studioLabel);
  }
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
    [0, 0, 1, 0, 0], // fila 0: _, _, tools, _, _
    [0, 1, 1, 1, 0], // fila 1: _, misc, sidequests, experiments, _
    [1, 1, 1, 1, 1], // fila 2: texts, social, meowrhino, games, unfinished
    [0, 1, 0, 1, 0], // fila 3: _, WIP, _, hidden, _
  ],
  nombres: {
    "0_2": "tools",
    "1_1": "misc",
    "1_2": "sidequests",
    "1_3": "experiments",
    "2_0": "texts",
    "2_1": "social",
    "2_2": "meowrhino",
    "2_3": "games",
    "2_4": "unfinished",
    "3_1": "WIP",
    "3_3": "hidden",
  },
  clasesCss: {
    "tools":       "archive-tools",
    "misc":        "archive-misc",
    "sidequests":  "archive-sidequests",
    "experiments": "archive-experiments",
    "texts":       "archive-texts",
    "social":      "archive-social",
    "meowrhino":   "archive-meowrhino",
    "games":       "archive-games",
    "unfinished":  "archive-unfinished",
    "WIP":         "archive-wip",
    "hidden":      "archive-hidden",
  },
  posInicial: { y: 2, x: 2 },
});

crearCeldas();
crearZoneLabel();
crearHeader();
crearOverlay();
crearThemeToggle(getOverlayEl());
leerHash();
renderizarContenido().then(() => actualizarVista());
