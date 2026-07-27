// ============================================
// MAIN — Inicialización y event listeners
// ============================================
//
// Orquesta la carga de todos los módulos del studio.

import { cargarDatos, obtenerDatos, currentLang, onLangChange } from "./data.js";
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
  setTraductorNombres,
  refrescarTextosCeldas,
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
  if (!data) {
    const cont = document.getElementById("content");
    if (cont) {
      cont.innerHTML = `
        <div style="max-width:38rem;margin:12vh auto;padding:0 1.5rem;text-align:center;line-height:1.6;">
          <h1>meowrhino studio</h1>
          <p>No se ha podido cargar el contenido. Recarga la página o escríbeme a
             <a href="mailto:hola@meowrhino.studio">hola@meowrhino.studio</a>.</p>
        </div>`;
    }
    return;
  }

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

// El HTML llega con el contenido pre-renderizado dentro de #content (SEO, ver
// build-seo.js). Ya está oculto por CSS desde el primer pintado, pero lo
// sacamos del DOM antes de montar el grid: crearCeldas() hace appendChild
// sobre #content, así que si no, el bloque quedaría ahí de por vida.
document.getElementById("seo-prerender")?.remove();

configurarNavegacion({
  grid: [
    [0, 1, 0, 0], // fila 0: _, links, _, _
    [1, 1, 1, 1], // fila 1: footer, welcome, metodología, statement
    [0, 1, 1, 0], // fila 2: _, portfolio, contacto, _
  ],
  nombres: {
    "0_1": "links",
    "1_0": "footer",
    "1_1": "welcome",
    "1_2": "metodología",
    "1_3": "statement",
    "2_1": "portfolio",
    "2_2": "contacto",
  },
  clasesCss: {
    "links": "tools",
    "footer": "footer",
    "metodología": "metodologia",
    "welcome": "welcome",
    "statement": "statement",
    "portfolio": "portfolio",
    "contacto": "contacto",
  },
  redirects: {
    "links": ["tools"],
  },
  posInicial: { y: 1, x: 1 },
});

crearCeldas();
crearZoneLabel();
crearHeader();
crearOverlay();
crearThemeToggle(getOverlayEl());
leerHash();
renderizarContenido().then(() => {
  // Zone labels traducibles: los identificadores de celda (hash, clase css)
  // NO cambian; solo el texto visible. Los que faltan en `zoneLabels` (o los 3
  // idiomas iguales: portfolio, tools, links…) se muestran con su identificador.
  const data = obtenerDatos();
  const zoneLabels = data?.zoneLabels || {};
  setTraductorNombres((nombre) => {
    const t = zoneLabels[nombre];
    return t ? (t[currentLang] ?? t.es ?? nombre) : nombre;
  });
  actualizarVista();
  refrescarTextosCeldas();       // aplica traducción al minimapa expandido
  onLangChange(refrescarTextosCeldas);
});
