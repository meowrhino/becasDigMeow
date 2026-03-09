// ============================================
// NAVIGATION — Grid, celdas, minimaps, nav labels, hash
// ============================================

import {
  portfolioMode,
  portfolioAnimating,
  alternarModoPortfolio,
  cambiarColumnasPortfolio,
  actualizarBotonesColumnas,
  sincronizarEstadoNubes,
} from "./portfolio.js";

// --- Elemento raíz ---
const app = document.getElementById("content");

// --- Grid config ---

export const GRID = [
  [0, 0, 1, 0], // fila 0: _, _, tools, _
  [1, 1, 1, 1], // fila 1: políticas, metodología, welcome, statement
  [0, 1, 1, 0], // fila 2: _, contacto, portfolio, _
];

export const NOMBRES_CELDAS = {
  "0_2": "tools",
  "1_0": "políticas",
  "1_1": "metodología",
  "1_2": "welcome",
  "1_3": "statement",
  "2_1": "contacto",
  "2_2": "portfolio",
};

const CLASE_CSS = {
  "tools":       "tools",
  "políticas":   "politicas",
  "metodología": "metodologia",
  "welcome":     "welcome",
  "statement":   "statement",
  "portfolio":   "portfolio",
  "contacto":    "contacto",
};

/** Posición actual del usuario en el grid. */
let posY = 1;
let posX = 2; // empieza en "welcome"

export function getPosicion() {
  return { posY, posX };
}

export function setPosicion(y, x) {
  posY = y;
  posX = x;
}

// --- Creación de celdas ---

export function crearCeldas() {
  for (let y = 0; y < GRID.length; y++) {
    for (let x = 0; x < GRID[y].length; x++) {
      if (GRID[y][x] !== 1) continue;

      const celda = document.createElement("div");
      celda.classList.add("celda", `pos_${y}_${x}`);
      celda.dataset.y = y;
      celda.dataset.x = x;

      const nombre = NOMBRES_CELDAS[`${y}_${x}`];
      if (nombre) {
        const claseCss = CLASE_CSS[nombre] || nombre;
        celda.classList.add(claseCss);
        celda.dataset.nombre = nombre;
      }

      app.appendChild(celda);
    }
  }
}

// --- Zone Label ---

let zoneLabelEl = null;

export function getNombrePagina() {
  return NOMBRES_CELDAS[`${posY}_${posX}`] || "";
}

export function crearZoneLabel() {
  zoneLabelEl = document.createElement("div");
  zoneLabelEl.classList.add("zone-label-bg");
  document.body.appendChild(zoneLabelEl);
}

function actualizarZoneLabel() {
  if (!zoneLabelEl) return;
  zoneLabelEl.textContent = getNombrePagina();
}

// --- Minimap inline ---

let minimapInlineEl = null;

function getAspectoViewport() {
  return window.innerHeight > 0 ? window.innerWidth / window.innerHeight : 1;
}

export function actualizarTamanoMinimapInline() {
  if (!minimapInlineEl) return;
  const base   = 14;
  const cellW  = Math.max(8, Math.round(base * getAspectoViewport()));
  const cellH  = base;
  minimapInlineEl.querySelectorAll(".minimap-inline-cell").forEach(cell => {
    cell.style.width  = `${cellW}px`;
    cell.style.height = `${cellH}px`;
  });
}

export function crearHeader() {
  const headerEl = document.createElement("div");
  headerEl.classList.add("header-topright");

  minimapInlineEl = document.createElement("div");
  minimapInlineEl.classList.add("minimap-inline");
  minimapInlineEl.style.gridTemplateColumns = `repeat(${GRID[0].length}, 1fr)`;
  minimapInlineEl.style.gridTemplateRows    = `repeat(${GRID.length}, 1fr)`;

  for (let y = 0; y < GRID.length; y++) {
    for (let x = 0; x < GRID[y].length; x++) {
      const cell = document.createElement("div");
      cell.classList.add("minimap-inline-cell");
      cell.dataset.y = y;
      cell.dataset.x = x;
      if (GRID[y][x] === 0) cell.classList.add("invisible");
      minimapInlineEl.appendChild(cell);
    }
  }

  actualizarTamanoMinimapInline();
  minimapInlineEl.addEventListener("click", () => abrirMinimapExpandido());
  headerEl.appendChild(minimapInlineEl);
  document.body.appendChild(headerEl);
  actualizarHeader();
}

function actualizarHeader() {
  if (!minimapInlineEl) return;
  minimapInlineEl.querySelectorAll(".minimap-inline-cell").forEach(cell => {
    cell.classList.toggle("activa", +cell.dataset.y === posY && +cell.dataset.x === posX);
  });
}

// --- Minimap expandido ---

let overlayEl = null;
let minimapExpandedEl = null;

export function actualizarTamanoMinimapExpandido() {
  if (!minimapExpandedEl) return;
  const base   = Math.min(window.innerWidth * 0.12, 120);
  const cellW  = Math.max(40, Math.round(base));
  const cellH  = Math.max(24, Math.round(base / getAspectoViewport()));
  minimapExpandedEl.querySelectorAll(".minimap-expanded-cell").forEach(cell => {
    cell.style.width  = `${cellW}px`;
    cell.style.height = `${cellH}px`;
  });
}

export function crearOverlay() {
  overlayEl = document.createElement("div");
  overlayEl.classList.add("minimap-overlay");

  minimapExpandedEl = document.createElement("div");
  minimapExpandedEl.classList.add("minimap-expanded");
  minimapExpandedEl.style.gridTemplateColumns = `repeat(${GRID[0].length}, 1fr)`;
  minimapExpandedEl.style.gridTemplateRows    = `repeat(${GRID.length}, 1fr)`;

  for (let y = 0; y < GRID.length; y++) {
    for (let x = 0; x < GRID[y].length; x++) {
      const cell = document.createElement("button");
      cell.classList.add("minimap-expanded-cell");
      cell.dataset.y = y;
      cell.dataset.x = x;

      if (GRID[y][x] === 0) {
        cell.classList.add("invisible");
      } else {
        cell.textContent = NOMBRES_CELDAS[`${y}_${x}`] || "";
        cell.addEventListener("click", () => {
          setPosicion(y, x);
          actualizarVista();
          actualizarMinimapExpandido();
          setTimeout(() => cerrarMinimapExpandido(), 650);
        });
      }

      minimapExpandedEl.appendChild(cell);
    }
  }

  actualizarTamanoMinimapExpandido();
  overlayEl.appendChild(minimapExpandedEl);
  overlayEl.addEventListener("click", e => {
    if (e.target === overlayEl) cerrarMinimapExpandido();
  });
  document.body.appendChild(overlayEl);
}

function abrirMinimapExpandido() {
  actualizarMinimapExpandido();
  overlayEl.classList.add("visible");
}

export function cerrarMinimapExpandido() {
  overlayEl.classList.remove("visible");
}

function actualizarMinimapExpandido() {
  if (!overlayEl) return;
  overlayEl.querySelectorAll(".minimap-expanded-cell").forEach(cell => {
    cell.classList.toggle("activa", +cell.dataset.y === posY && +cell.dataset.x === posX);
  });
}

/** Referencia al overlayEl para el listener de Escape. */
export function getOverlayEl() {
  return overlayEl;
}

// --- Nav Labels ---

const DIRECCIONES = [
  { dy: -1, dx:  0, pos: "top" },
  { dy:  1, dx:  0, pos: "bottom" },
  { dy:  0, dx: -1, pos: "left" },
  { dy:  0, dx:  1, pos: "right" },
];

function getVecinos() {
  const vecinos = {};
  DIRECCIONES.forEach(({ dy, dx, pos }) => {
    const ny = posY + dy;
    const nx = posX + dx;
    if (GRID[ny]?.[nx] === 1) {
      vecinos[pos] = { y: ny, x: nx, nombre: NOMBRES_CELDAS[`${ny}_${nx}`] || "" };
    }
  });
  return vecinos;
}

function crearNavLabels(celda) {
  celda.querySelectorAll(".nav-label").forEach(l => l.remove());
  celda.querySelectorAll(".nav-label-group").forEach(l => l.remove());
  celda.querySelectorAll(".portfolio-bottom-bar").forEach(l => l.remove());

  const isPortfolio = celda.classList.contains("portfolio");
  const vecinos = getVecinos();

  Object.entries(vecinos).forEach(([pos, info]) => {
    // En portfolio, el bottom se gestiona aparte (grupo con switch + nav)
    if (isPortfolio && pos === "bottom") return;

    const label = document.createElement("button");
    label.classList.add("nav-label", pos);
    label.textContent = info.nombre;
    label.addEventListener("click", () => {
      setPosicion(info.y, info.x);
      actualizarVista();
    });
    celda.appendChild(label);
  });

  // En portfolio: crear grupo bottom con botón switch + nav label contacto
  if (isPortfolio) {
    // Barra +/- columnas (solo visible en modo grid)
    const colBar = document.createElement("div");
    colBar.classList.add("portfolio-bottom-bar");
    colBar.id = "portfolio-col-bar";
    if (portfolioMode !== "grid") colBar.style.display = "none";

    const plusBtn = document.createElement("button");
    plusBtn.classList.add("portfolio-col-btn");
    plusBtn.id = "portfolio-col-plus";
    plusBtn.textContent = "+";
    plusBtn.addEventListener("click", () => cambiarColumnasPortfolio(-1));

    const minusBtn = document.createElement("button");
    minusBtn.classList.add("portfolio-col-btn");
    minusBtn.id = "portfolio-col-minus";
    minusBtn.textContent = "\u2212";
    minusBtn.addEventListener("click", () => cambiarColumnasPortfolio(1));

    colBar.appendChild(plusBtn);
    colBar.appendChild(minusBtn);
    celda.appendChild(colBar);
    actualizarBotonesColumnas();

    const group = document.createElement("div");
    group.classList.add("nav-label-group", "bottom");

    const switchBtn = document.createElement("button");
    switchBtn.classList.add("portfolio-switch");
    switchBtn.id = "portfolio-switch-btn";
    switchBtn.textContent = portfolioMode === "clouds" ? "ordenar" : "dispersar";
    switchBtn.addEventListener("click", alternarModoPortfolio);
    group.appendChild(switchBtn);

    if (vecinos.bottom) {
      const navBtn = document.createElement("button");
      navBtn.classList.add("nav-label-inline");
      navBtn.textContent = vecinos.bottom.nombre;
      navBtn.addEventListener("click", () => {
        setPosicion(vecinos.bottom.y, vecinos.bottom.x);
        actualizarVista();
      });
      group.appendChild(navBtn);
    }

    celda.appendChild(group);
  }
}

// --- Hash ---

function actualizarHash() {
  const nombre = getNombrePagina();
  const nuevoHash = nombre ? `#${nombre}` : "#";
  history.replaceState(null, "", nuevoHash || window.location.pathname);
}

export function leerHash() {
  const hash = decodeURIComponent(window.location.hash.replace("#", "")).toLowerCase().trim();
  if (!hash) return false;
  for (const [key, nombre] of Object.entries(NOMBRES_CELDAS)) {
    if (nombre === hash) {
      const [y, x] = key.split("_").map(Number);
      setPosicion(y, x);
      return true;
    }
  }
  return false;
}

// --- Actualizar vista ---

export function actualizarVista() {
  document.querySelectorAll(".celda").forEach(c => c.classList.remove("activa"));
  const activa = document.querySelector(`.pos_${posY}_${posX}`);
  if (activa) {
    activa.classList.add("activa");
    crearNavLabels(activa);
  }
  actualizarHeader();
  actualizarZoneLabel();
  actualizarMinimapExpandido();
  actualizarHash();
  sincronizarEstadoNubes();
}
