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
  pintarConstelacion,
  cerrarMinimapExpandido,
  getOverlayEl,
  irHacia,
} from "./navigation.js";
import { renderSeccion, SECCIONES } from "./archive-pages.js";
import { fetchJson } from "./utils.js";
import { setupKeyboardNav, setupResizeDebounce } from "./shell.js";

// ============================================
// Datos del archive
// ============================================

let archiveData = null;

async function cargarDatosArchive() {
  archiveData = await fetchJson("/archive-data.json");
  return archiveData;
}

// ============================================
// Renderizado
// ============================================

// Las categorías y cómo se pinta cada una viven en archive-pages.js: las
// comparte con el pre-render de build-seo.js.

async function renderizarContenido() {
  const data = await cargarDatosArchive();
  if (!data) {
    const cont = document.getElementById("content");
    if (cont) {
      cont.innerHTML = `
        <div style="max-width:38rem;margin:12vh auto;padding:0 1.5rem;text-align:center;line-height:1.6;">
          <h1>meowrhino archive</h1>
          <p>No se ha podido cargar el contenido. Recarga la página o escríbeme a
             <a href="mailto:hola@meowrhino.studio">hola@meowrhino.studio</a>.</p>
        </div>`;
    }
    return;
  }

  SECCIONES.forEach(key => {
    if (data[key]) renderSeccion(key, data[key]);
  });
}

// ============================================
// Event Listeners (shell compartido)
// ============================================

setupKeyboardNav({
  getOverlayEl, cerrarMinimapExpandido,
  irHacia,
});
setupResizeDebounce({
  actualizarTamanoMinimapInline,
  pintarConstelacion,
});

// ============================================
// Inicialización
// ============================================

// El HTML llega con el archivo pre-renderizado dentro de #content (SEO, ver
// build-seo.js). El CSS ya lo oculta desde el primer pintado, pero lo sacamos
// del DOM antes de montar el grid: crearCeldas() hace appendChild sobre
// #content y si no, el bloque se quedaría ahí debajo para siempre.
document.getElementById("seo-prerender")?.remove();

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
// «studio», la vuelta a la web, va en la barra de arriba, entre las páginas
// vecinas y «menú». Fuera de .menu-vecinos: esa la rehace navigation.js cada
// vez que cambias de celda.
const studio = document.createElement("a");
studio.href = "/";
studio.className = "menu-btn barra-studio";
studio.textContent = "studio";
document.querySelector(".header-topright .menu-vecinos")?.after(studio);
crearOverlay();
leerHash();
renderizarContenido().then(() => actualizarVista());
