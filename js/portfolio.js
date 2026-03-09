// ============================================
// PORTFOLIO — Nubes flotantes + transición a grid
// ============================================
//
// Dos modos de visualización:
//   1. "clouds" — screenshots flotando horizontalmente con WAAPI + deriva CSS
//   2. "grid"   — cuadrícula estática ordenada
//
// TODO (Fase 2): Reemplazar grid por vista detalle con scroll vertical.
//   - Una sola nube por proyecto con crossfade de imágenes
//   - Click en nube → scroll vertical con links como texto

import { obtenerDatos } from "./data.js";
import { esMovil } from "./pages.js";

// --- Estado del portfolio ---

/** Modo actual: "clouds" o "grid". */
export let portfolioMode = "clouds";

/** Previene doble-click durante transiciones. */
export let portfolioAnimating = false;

/** Número de columnas seleccionado por el usuario (null = CSS default). */
export let portfolioUserColumns = null;

/** true si las nubes necesitan reconstruirse (ej: tras resize). */
export let portfolioCloudsNeedLayout = false;

/** Rastrea si las nubes estaban corriendo antes de pausarse. */
let portfolioCloudsWereRunning = false;

/** Guard para evitar rebuilds recursivos. */
let portfolioCloudsRebuilding = false;

// --- Utilidades ---

function clamp(valor, min, max) {
  return Math.max(min, Math.min(max, valor));
}

/**
 * Devuelve el listado de imágenes de un proyecto.
 */
export function obtenerImagenesProyecto(proyecto) {
  const principal = typeof proyecto?.imagen === "string" ? proyecto.imagen.trim() : "";
  if (!principal) return [];

  const secundariasRaw = Number.parseInt(proyecto.imagenesSecundarias, 10);
  const secundarias = Number.isFinite(secundariasRaw) ? Math.max(0, secundariasRaw) : 0;
  if (secundarias === 0) return [principal];

  const match = principal.match(/^(.*?)(\.[^./]+)$/);
  if (!match) return [principal];

  const base = match[1];
  const ext = match[2];
  const baseSinIndice = base.replace(/\d+$/, "");
  const tieneIndice = baseSinIndice !== base;

  if (tieneIndice) {
    return Array.from(
      { length: secundarias + 1 },
      (_, i) => `${baseSinIndice}${i}${ext}`
    );
  }

  const extras = Array.from(
    { length: secundarias },
    (_, i) => `${base}${i + 1}${ext}`
  );
  return [principal, ...extras];
}

/**
 * Devuelve todas las "nubes" a renderizar: una entrada por cada imagen de cada proyecto.
 */
function obtenerNubesPortfolio(proyectos) {
  return proyectos.flatMap((proyecto, projectIndex) => {
    const imagenesProyecto = obtenerImagenesProyecto(proyecto);
    const imagenes = (imagenesProyecto.length ? imagenesProyecto : [proyecto.imagen || ""])
      .filter(Boolean);

    return imagenes.map((imagen, variantIndex) => ({
      nombre: proyecto.nombre,
      url: proyecto.url,
      imagen,
      projectIndex,
      variantIndex,
    }));
  });
}

function obtenerIndiceProyectoTrack(track, totalProyectos) {
  const raw = Number.parseInt(track?.dataset?.projectIndex, 10);
  const max = Math.max(0, totalProyectos - 1);
  if (!Number.isFinite(raw)) return 0;
  return clamp(raw, 0, max);
}

// --- Layout del grid ---

export function ajustarLayoutGridPortfolio() {
  const gridContainer = document.getElementById("portfolio-grid");
  const grid = gridContainer?.querySelector(".portfolio-grid");
  if (!grid || !gridContainer) return;

  if (window.innerWidth > 768) {
    if (!portfolioUserColumns) grid.style.removeProperty("--portfolio-columns");
    grid.style.removeProperty("--portfolio-gap");
    return;
  }
}

// --- Renderizado base ---

export function renderPortfolio(data) {
  const el = document.querySelector(".celda.portfolio");
  if (!el || !data?.portfolio) return;

  const proyectos = data.portfolio.proyectos;
  const gridItemsHTML = proyectos.map(p => {
    const imagenes = obtenerImagenesProyecto(p);
    const capasHTML = imagenes.map((src, i) => {
      const claseCapa = i === 0 ? "is-primary" : "is-secondary";
      const alt = i === 0 ? p.nombre : "";
      const ariaHidden = i === 0 ? "" : ` aria-hidden="true"`;
      return `
        <img class="portfolio-layer ${claseCapa}" src="${src}" alt="${alt}" loading="lazy"${ariaHidden}>
      `;
    }).join("");

    return `
      <a class="portfolio-item" href="${p.url}"${esMovil ? "" : ' target="_blank"'} rel="noopener" title="${p.nombre}">
        <div class="portfolio-stack">${capasHTML}</div>
      </a>
    `;
  }).join("");

  el.innerHTML = `
    <div class="portfolio-clouds-container" id="portfolio-clouds"></div>
    <div class="portfolio-grid-container" id="portfolio-grid">
      <div class="portfolio-grid-scroll-wrapper">
        <div class="portfolio-grid">${gridItemsHTML}</div>
      </div>
    </div>
  `;

  generarNubesFlotantes(proyectos);
  portfolioCloudsNeedLayout = false;

  const cloudsContainer = document.getElementById("portfolio-clouds");
  cloudsContainer.addEventListener("pointerenter", onCloudPointerEnter);
  cloudsContainer.addEventListener("pointermove", onCloudPointerMove);
  cloudsContainer.addEventListener("pointerleave", onCloudPointerLeave);

  if (portfolioMode === "grid") {
    document.getElementById("portfolio-grid").classList.add("visible");
    document.getElementById("portfolio-clouds").style.opacity = "0";
  }

  ajustarLayoutGridPortfolio();
  sincronizarEstadoNubes();

  const gridEl = el.querySelector(".portfolio-grid");
  if (portfolioUserColumns && gridEl) {
    gridEl.style.setProperty("--portfolio-columns", portfolioUserColumns);
  }

  const gridWrapper = el.querySelector(".portfolio-grid-scroll-wrapper");
  if (gridEl && gridWrapper) {
    const checkGridScroll = () => {
      const atTop = gridEl.scrollTop <= 10;
      const atBottom = gridEl.scrollTop + gridEl.clientHeight >= gridEl.scrollHeight - 10;
      const noScroll = gridEl.scrollHeight <= gridEl.clientHeight;
      gridWrapper.classList.toggle("can-scroll-up", !atTop && !noScroll);
      gridWrapper.classList.toggle("can-scroll-down", !atBottom && !noScroll);
    };
    gridEl.addEventListener("scroll", checkGridScroll);
    checkGridScroll();
    new ResizeObserver(() => checkGridScroll()).observe(gridEl);
  }
}

// --- Nubes flotantes ---

const DRIFT_ANIMATIONS = ["pcloud1", "pcloud2", "pcloud3", "pcloud4", "pcloud5", "pcloud6"];

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function generarNubesFlotantes(proyectos) {
  const container = document.getElementById("portfolio-clouds");
  if (!container) return;
  container.innerHTML = "";
  const nubes = obtenerNubesPortfolio(proyectos);
  if (!nubes.length) return;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const esMobile = vw <= 600;

  const margenSuperior = vh * 0.15;
  const margenInferior = vh * 0.15;
  const alturaUtil     = Math.max(0, vh - margenSuperior - margenInferior);
  const numBandas      = esMobile ? 4 : 5;
  const alturaBanda    = alturaUtil / numBandas;

  const anchoMin = esMobile ? 80 : 120;
  const anchoMax = esMobile ? 150 : 220;

  const numItems = nubes.length;
  const xSlots = Array.from({ length: numItems }, (_, i) => i);
  shuffle(xSlots);

  function configurarNube(track, banda, esPrimeraVez, xSlot) {
    if (!track.isConnected) return;

    const ancho = Math.round(anchoMin + Math.random() * (anchoMax - anchoMin));
    const alto  = Math.round(ancho * 0.68);

    const yCentro    = margenSuperior + banda * alturaBanda + alturaBanda * 0.5;
    const yJitter    = (Math.random() - 0.5) * alturaBanda * 0.6;
    const yMin       = Math.round(margenSuperior);
    const yMax       = Math.round(Math.max(yMin, vh - margenInferior - alto));
    const y          = Math.max(yMin, Math.min(yMax, Math.round(yCentro + yJitter)));

    const factorVelocidad = 1 - (ancho - anchoMin) / (anchoMax - anchoMin);
    const pxPorSegundo    = 20 + factorVelocidad * 30 + Math.random() * 15;
    const recorrido       = vw + 2 * ancho;
    const duracion        = recorrido / pxPorSegundo;

    track.getAnimations().forEach(a => a.cancel());

    track.style.top    = `${y}px`;
    track.style.width  = `${ancho}px`;
    track.style.height = `${alto}px`;
    track.style.zIndex = Math.floor(Math.random() * 5);

    let delay = 0;
    if (esPrimeraVez) {
      const progresoBase = (xSlot + 0.5) / numItems;
      const jitterProgreso = (Math.random() - 0.5) * (0.35 / numItems);
      const progresoInicial = clamp(progresoBase + jitterProgreso, 0, 1);
      track.style.left = `${-ancho}px`;
      delay = -progresoInicial * duracion;
    } else {
      track.style.left = `${-ancho}px`;
    }

    const anim = track.animate(
      [
        { transform: "translateX(0px)" },
        { transform: `translateX(${recorrido}px)` },
      ],
      {
        duration: duracion * 1000,
        delay: delay * 1000,
        iterations: 1,
        easing: "linear",
        fill: "forwards",
      }
    );

    anim.onfinish = () => {
      if (track.isConnected) configurarNube(track, banda, false, null);
    };
  }

  nubes.forEach((nube, i) => {
    const banda     = i % numBandas;
    const driftAnim = DRIFT_ANIMATIONS[i % DRIFT_ANIMATIONS.length];
    const driftDur  = 8 + Math.random() * 10;

    const track = document.createElement("div");
    track.classList.add("portfolio-cloud-track");
    track.style.left = "0px";

    const link = document.createElement("a");
    link.classList.add("portfolio-cloud-item");
    link.href   = nube.url;
    if (!esMovil) link.target = "_blank";
    link.rel    = "noopener";
    link.title  = nube.nombre;
    link.style.left = "0px";

    link.style.animationName           = driftAnim;
    link.style.animationDuration       = `${driftDur}s`;
    link.style.animationDelay          = `${-(Math.random() * driftDur)}s`;
    link.style.animationTimingFunction = "ease-in-out";
    link.style.animationIterationCount = "infinite";
    link.style.animationDirection      = "alternate";

    const img = document.createElement("img");
    img.src = nube.imagen;
    img.alt = nube.nombre;
    img.loading = "eager";
    img.decoding = "async";
    link.appendChild(img);

    const nombre = document.createElement("span");
    nombre.classList.add("pcloud-name");
    nombre.textContent = nube.nombre;
    link.appendChild(nombre);

    track.appendChild(link);
    container.appendChild(track);

    track.dataset.banda = String(banda);
    track.dataset.projectIndex = String(nube.projectIndex);
    track.dataset.variantIndex = String(nube.variantIndex);
    track._configurarNube = configurarNube;
    track._cloudVariantSrc = nube.imagen;

    configurarNube(track, banda, true, xSlots[i]);
  });

  sincronizarEstadoNubes();
}

// --- Control de estado de las nubes ---

export function esPortfolioActivo() {
  return !!document.querySelector(".celda.portfolio")?.classList.contains("activa");
}

function debenCorrerNubes() {
  return esPortfolioActivo() && portfolioMode === "clouds";
}

function reconstruirNubesSiNecesario() {
  if (!portfolioCloudsNeedLayout || !debenCorrerNubes()) return;
  const proyectos = obtenerDatos()?.portfolio?.proyectos;
  if (!proyectos || !document.getElementById("portfolio-clouds")) return;
  portfolioCloudsNeedLayout = false;
  generarNubesFlotantes(proyectos);
}

export function sincronizarEstadoNubes() {
  const cloudsEl = document.getElementById("portfolio-clouds");
  if (!cloudsEl) return;

  const debeCorrer  = debenCorrerNubes();
  const estaResumiendo = debeCorrer && !portfolioCloudsWereRunning;

  if (!debeCorrer) {
    detenerMonitorHoverNubes();
    limpiarHoverNubeActiva();
  } else if (hoverPointerInside) {
    iniciarMonitorHoverNubes();
  }

  if (portfolioCloudsNeedLayout && debeCorrer && !portfolioCloudsRebuilding) {
    portfolioCloudsRebuilding = true;
    reconstruirNubesSiNecesario();
    portfolioCloudsRebuilding = false;
    portfolioCloudsWereRunning = debenCorrerNubes();
    return;
  }

  cloudsEl.querySelectorAll(".portfolio-cloud-item").forEach(item => {
    item.style.animationPlayState = debeCorrer ? "running" : "paused";
  });

  cloudsEl.querySelectorAll(".portfolio-cloud-track").forEach(track => {
    track.getAnimations().forEach(anim => {
      if (debeCorrer) {
        if (estaResumiendo && anim.playState === "paused") {
          const timing  = anim.effect?.getTiming?.();
          const duracion = Number(timing?.duration);
          if (Number.isFinite(duracion) && duracion > 0) {
            anim.currentTime = Math.random() * duracion;
          }
        }
        anim.play();
      } else {
        anim.pause();
      }
    });
  });

  portfolioCloudsWereRunning = debeCorrer;
}

// --- Hover lock ---

let hoverLockedCloud = null;
let hoverPointerX = 0;
let hoverPointerY = 0;
let hoverPointerInside = false;
let hoverMonitorRAF = null;

function puedeUsarHoverNubes() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function obtenerZIndexTrack(track) {
  const inlineZ = Number.parseInt(track?.style?.zIndex, 10);
  if (Number.isFinite(inlineZ)) return inlineZ;
  const computedZ = Number.parseInt(getComputedStyle(track).zIndex, 10);
  if (Number.isFinite(computedZ)) return computedZ;
  return 0;
}

function obtenerTrackHoverPreferido(clientX, clientY, container) {
  const tracks = Array.from(container.querySelectorAll(".portfolio-cloud-track"))
    .filter(track => {
      const r = track.getBoundingClientRect();
      return (
        r.width > 0 &&
        r.height > 0 &&
        clientX >= r.left &&
        clientX <= r.right &&
        clientY >= r.top &&
        clientY <= r.bottom
      );
    });

  if (!tracks.length) return null;

  return tracks.reduce((preferido, candidato) => {
    if (!preferido) return candidato;
    const zPreferido = obtenerZIndexTrack(preferido);
    const zCandidato = obtenerZIndexTrack(candidato);
    if (zCandidato > zPreferido) return candidato;
    return preferido;
  }, null);
}

function activarHoverNube(track) {
  const container = document.getElementById("portfolio-clouds");
  if (!container || !track || !track.isConnected) return;
  limpiarHoverNubeActiva();
  hoverLockedCloud = track;
  track.classList.add("is-hover-active");
  container.classList.add("has-hover-lock");
}

function limpiarHoverNubeActiva() {
  const container = document.getElementById("portfolio-clouds");
  if (container) container.classList.remove("has-hover-lock");
  if (hoverLockedCloud?.isConnected) {
    hoverLockedCloud.classList.remove("is-hover-active");
  }
  if (container) {
    container.querySelectorAll(".portfolio-cloud-track.is-hover-active")
      .forEach(track => track.classList.remove("is-hover-active"));
  }
  hoverLockedCloud = null;
}

function puntoDentroTrack(track, clientX, clientY) {
  if (!track?.isConnected) return false;
  const r = track.getBoundingClientRect();
  return (
    r.width > 0 && r.height > 0 &&
    clientX >= r.left && clientX <= r.right &&
    clientY >= r.top && clientY <= r.bottom
  );
}

function actualizarHoverNubesEnPunto(clientX, clientY) {
  if (!puedeUsarHoverNubes()) return;
  if (portfolioMode !== "clouds" || portfolioAnimating || draggedCloud) return;
  const container = document.getElementById("portfolio-clouds");
  if (!container) return;
  if (hoverLockedCloud && puntoDentroTrack(hoverLockedCloud, clientX, clientY)) return;
  limpiarHoverNubeActiva();
  const preferida = obtenerTrackHoverPreferido(clientX, clientY, container);
  if (!preferida) return;
  activarHoverNube(preferida);
}

function onCloudPointerLeave() {
  hoverPointerInside = false;
  detenerMonitorHoverNubes();
  limpiarHoverNubeActiva();
}

function debeMonitorearHoverNubes() {
  return (
    hoverPointerInside &&
    puedeUsarHoverNubes() &&
    portfolioMode === "clouds" &&
    esPortfolioActivo() &&
    !portfolioAnimating &&
    !draggedCloud
  );
}

function iniciarMonitorHoverNubes() {
  if (hoverMonitorRAF !== null) return;
  const tick = () => {
    hoverMonitorRAF = null;
    if (!debeMonitorearHoverNubes()) return;
    actualizarHoverNubesEnPunto(hoverPointerX, hoverPointerY);
    hoverMonitorRAF = requestAnimationFrame(tick);
  };
  hoverMonitorRAF = requestAnimationFrame(tick);
}

function detenerMonitorHoverNubes() {
  if (hoverMonitorRAF === null) return;
  cancelAnimationFrame(hoverMonitorRAF);
  hoverMonitorRAF = null;
}

function onCloudPointerEnter(e) {
  hoverPointerInside = true;
  hoverPointerX = e.clientX;
  hoverPointerY = e.clientY;
  actualizarHoverNubesEnPunto(hoverPointerX, hoverPointerY);
  iniciarMonitorHoverNubes();
}

// --- Drag ---

let draggedCloud = null;
let dragDidMove = false;
let dragFrozen = false;

const dragState = {
  startX: 0, startY: 0,
  lastX: 0, lastY: 0, lastTime: 0,
  velocityX: 0, velocityY: 0,
  originX: 0, originY: 0,
  throwRAF: null,
};

function getPosicionVisualNube(track) {
  const left = parseFloat(track.style.left) || 0;
  const top  = parseFloat(track.style.top) || 0;
  const ct = getComputedStyle(track).transform;
  let tx = 0;
  if (ct && ct !== "none") {
    const m = ct.match(/matrix\(([^)]+)\)/);
    if (m) tx = parseFloat(m[1].split(",")[4]) || 0;
  }
  return { x: left + tx, y: top };
}

function obtenerRangoAnchoNubes() {
  const esMobile = window.innerWidth <= 600;
  return {
    anchoMin: esMobile ? 80 : 120,
    anchoMax: esMobile ? 150 : 220,
  };
}

function calcularVelocidadNube(ancho) {
  const { anchoMin, anchoMax } = obtenerRangoAnchoNubes();
  const rango = Math.max(1, anchoMax - anchoMin);
  const factorVelocidad = 1 - (ancho - anchoMin) / rango;
  const factor = Math.max(0, Math.min(1, factorVelocidad));
  return 20 + factor * 30 + Math.random() * 15;
}

function reanudarNubeDesdePosicionActual(track) {
  if (!track?.isConnected) return;
  const vw    = window.innerWidth;
  const banda = parseInt(track.dataset.banda, 10) || 0;
  const ancho = parseFloat(track.style.width) || track.offsetWidth || 0;
  const x     = parseFloat(track.style.left) || 0;
  const destinoX = vw + ancho;
  const distancia = Math.max(0, destinoX - x);

  track.getAnimations().forEach(a => a.cancel());
  track.style.transform = "none";

  if (distancia < 1) {
    if (typeof track._configurarNube === "function") {
      track._configurarNube(track, banda, false, null);
    }
    return;
  }

  const velocidad = calcularVelocidadNube(ancho);
  const duracionMs = (distancia / velocidad) * 1000;

  const anim = track.animate(
    [
      { transform: "translateX(0px)" },
      { transform: `translateX(${distancia}px)` },
    ],
    {
      duration: duracionMs,
      iterations: 1,
      easing: "linear",
      fill: "forwards",
    }
  );

  anim.onfinish = () => {
    if (!track.isConnected) return;
    if (typeof track._configurarNube === "function") {
      track._configurarNube(track, banda, false, null);
    }
  };
}

function reiniciarNubeTrasDrag(track) {
  if (!track.isConnected) return;
  track.style.transform = "";
  track.style.transformOrigin = "";
  const item = track.querySelector(".portfolio-cloud-item");
  if (item) item.style.animationPlayState = "running";
  const banda = parseInt(track.dataset.banda, 10) || 0;
  if (typeof track._configurarNube === "function") {
    track._configurarNube(track, banda, false, null);
  }
}

function congelarNubeParaDrag(track) {
  const pos = getPosicionVisualNube(track);
  track.getAnimations().forEach(a => a.cancel());
  track.style.left      = `${pos.x}px`;
  track.style.transform = "none";
  const item = track.querySelector(".portfolio-cloud-item");
  if (item) item.style.animationPlayState = "paused";
  dragState.originX = pos.x;
  dragState.originY = pos.y;
  dragFrozen = true;
}

export function onCloudPointerDown(e) {
  if (portfolioMode !== "clouds" || portfolioAnimating) return;
  const track = e.target.closest(".portfolio-cloud-track");
  if (!track) return;

  hoverPointerInside = true;
  hoverPointerX = e.clientX;
  hoverPointerY = e.clientY;
  detenerMonitorHoverNubes();
  limpiarHoverNubeActiva();

  e.preventDefault();
  track.setPointerCapture(e.pointerId);

  draggedCloud = track;
  dragDidMove = false;
  dragFrozen = false;

  if (dragState.throwRAF) {
    cancelAnimationFrame(dragState.throwRAF);
    dragState.throwRAF = null;
  }

  dragState.startX  = e.clientX;
  dragState.startY  = e.clientY;
  dragState.lastX   = e.clientX;
  dragState.lastY   = e.clientY;
  dragState.lastTime = performance.now();
  dragState.velocityX = 0;
  dragState.velocityY = 0;
}

function onCloudPointerMove(e) {
  if (!draggedCloud) {
    hoverPointerInside = true;
    hoverPointerX = e.clientX;
    hoverPointerY = e.clientY;
    actualizarHoverNubesEnPunto(e.clientX, e.clientY);
    iniciarMonitorHoverNubes();
    return;
  }
  e.preventDefault();

  const now = performance.now();
  const dt  = Math.max(1, now - dragState.lastTime);
  const dx  = e.clientX - dragState.lastX;

  if (!dragDidMove) {
    const totalDx = e.clientX - dragState.startX;
    const totalDy = e.clientY - dragState.startY;
    if (Math.abs(totalDx) + Math.abs(totalDy) > 5) dragDidMove = true;
  }

  if (dragDidMove && !dragFrozen) {
    congelarNubeParaDrag(draggedCloud);
  }

  if (!dragFrozen) {
    dragState.lastX    = e.clientX;
    dragState.lastY    = e.clientY;
    dragState.lastTime = now;
    return;
  }

  const a = 0.3;
  dragState.velocityX = a * (dx / dt * 1000) + (1 - a) * dragState.velocityX;
  dragState.velocityY = a * ((e.clientY - dragState.lastY) / dt * 1000) + (1 - a) * dragState.velocityY;
  dragState.lastX    = e.clientX;
  dragState.lastY    = e.clientY;
  dragState.lastTime = now;

  const totalDx = e.clientX - dragState.startX;
  const totalDy = e.clientY - dragState.startY;
  draggedCloud.style.left = `${dragState.originX + totalDx}px`;
  draggedCloud.style.top  = `${dragState.originY + totalDy}px`;
}

export function onCloudPointerUp(e) {
  if (!draggedCloud) return;
  const track = draggedCloud;
  draggedCloud = null;

  hoverPointerInside = true;
  hoverPointerX = e.clientX;
  hoverPointerY = e.clientY;

  if (!dragFrozen) {
    actualizarHoverNubesEnPunto(e.clientX, e.clientY);
    iniciarMonitorHoverNubes();
    return;
  }

  const maxVel = 2000;
  let vx = Math.max(-maxVel, Math.min(maxVel, dragState.velocityX));
  let vy = Math.max(-maxVel, Math.min(maxVel, dragState.velocityY));

  const friction = 0.95;
  const minSpeed = 5;
  const speed = Math.sqrt(vx * vx + vy * vy);

  if (speed < minSpeed) {
    reiniciarNubeTrasDrag(track);
    iniciarMonitorHoverNubes();
    return;
  }

  let lastFrame = performance.now();

  function throwStep(now) {
    const dt = (now - lastFrame) / 1000;
    lastFrame = now;
    const cx = parseFloat(track.style.left) || 0;
    const cy = parseFloat(track.style.top) || 0;
    track.style.left = `${cx + vx * dt}px`;
    track.style.top  = `${cy + vy * dt}px`;
    vx *= friction;
    vy *= friction;
    if (Math.sqrt(vx * vx + vy * vy) > minSpeed && track.isConnected) {
      dragState.throwRAF = requestAnimationFrame(throwStep);
    } else {
      reiniciarNubeTrasDrag(track);
    }
  }

  dragState.throwRAF = requestAnimationFrame(throwStep);
  iniciarMonitorHoverNubes();
}

// --- Transición clouds ↔ grid ---

export function cambiarColumnasPortfolio(delta) {
  const grid = document.querySelector(".portfolio-grid");
  if (!grid) return;
  const current = portfolioUserColumns || parseInt(getComputedStyle(grid).getPropertyValue("--portfolio-columns")) || 3;
  const next = Math.max(1, Math.min(3, current + delta));
  if (next === current) return;

  const items = Array.from(grid.querySelectorAll(".portfolio-item"));
  const oldRects = items.map(item => item.getBoundingClientRect());

  portfolioUserColumns = next;
  grid.style.setProperty("--portfolio-columns", next);
  grid.offsetHeight;

  items.forEach((item, i) => {
    const newRect = item.getBoundingClientRect();
    const dx = oldRects[i].left - newRect.left;
    const dy = oldRects[i].top - newRect.top;
    const sx = oldRects[i].width / newRect.width;
    const sy = oldRects[i].height / newRect.height;

    item.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, transformOrigin: "top left" },
      { transform: "translate(0, 0) scale(1, 1)", transformOrigin: "top left" },
    ], {
      duration: 400,
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
    });
  });

  setTimeout(() => grid.dispatchEvent(new Event("scroll")), 420);
  actualizarBotonesColumnas();
}

export function actualizarBotonesColumnas() {
  const grid = document.querySelector(".portfolio-grid");
  if (!grid) return;
  const current = portfolioUserColumns || parseInt(getComputedStyle(grid).getPropertyValue("--portfolio-columns")) || 3;
  const plusBtn = document.getElementById("portfolio-col-plus");
  const minusBtn = document.getElementById("portfolio-col-minus");
  if (plusBtn) plusBtn.disabled = current <= 1;
  if (minusBtn) minusBtn.disabled = current >= 3;
}

function medirPosicionesGrid() {
  const gridContainer = document.getElementById("portfolio-grid");
  const wasVisible = gridContainer.classList.contains("visible");
  ajustarLayoutGridPortfolio();
  const gridScroll = gridContainer.querySelector(".portfolio-grid");
  if (gridScroll) gridScroll.scrollTop = 0;
  gridContainer.style.visibility    = "hidden";
  gridContainer.style.opacity       = "0";
  gridContainer.style.pointerEvents = "none";
  gridContainer.classList.add("visible");
  gridContainer.offsetHeight;
  const items = gridContainer.querySelectorAll(".portfolio-item");
  const rects = Array.from(items).map(item => item.getBoundingClientRect());
  gridContainer.classList.toggle("visible", wasVisible);
  gridContainer.style.visibility    = "";
  gridContainer.style.opacity       = "";
  gridContainer.style.pointerEvents = "";
  return rects;
}

export function alternarModoPortfolio() {
  if (portfolioAnimating) return;
  portfolioAnimating = true;
  detenerMonitorHoverNubes();
  limpiarHoverNubeActiva();

  const cloudsEl = document.getElementById("portfolio-clouds");
  const gridEl   = document.getElementById("portfolio-grid");
  const btn      = document.getElementById("portfolio-switch-btn");

  if (portfolioMode === "clouds") {
    animarNubesAGrid(cloudsEl, gridEl, btn);
  } else {
    animarGridANubes(cloudsEl, gridEl, btn);
  }
}

function animarNubesAGrid(cloudsEl, gridEl, btn) {
  portfolioMode = "grid";
  const tracks = Array.from(cloudsEl.querySelectorAll(".portfolio-cloud-track"));
  const proyectos = obtenerDatos()?.portfolio?.proyectos || [];

  tracks.forEach(track => {
    const projectIndex = obtenerIndiceProyectoTrack(track, proyectos.length);
    const proyecto = proyectos[projectIndex];
    if (!proyecto) return;
    const imagenPrincipal = obtenerImagenesProyecto(proyecto)[0] || proyecto.imagen || "";
    if (!imagenPrincipal) return;
    const img = track.querySelector(".portfolio-cloud-item img");
    if (img) img.src = imagenPrincipal;
  });

  const cloudPositions = tracks.map(track => {
    const item = track.querySelector(".portfolio-cloud-item");
    if (item) item.style.animationPlayState = "paused";
    const pos = getPosicionVisualNube(track);
    const w = parseFloat(track.style.width) || track.offsetWidth;
    const h = parseFloat(track.style.height) || track.offsetHeight;
    let driftTy = 0;
    if (item) {
      const ct = getComputedStyle(item).transform;
      if (ct && ct !== "none") {
        const m = ct.match(/matrix\(([^)]+)\)/);
        if (m) driftTy = parseFloat(m[1].split(",")[5]) || 0;
      }
      item.style.animationName = "none";
    }
    track.getAnimations().forEach(a => a.cancel());
    track.style.left            = `${pos.x}px`;
    track.style.top             = `${pos.y + driftTy}px`;
    track.style.transformOrigin = "center center";
    return { x: pos.x, y: pos.y + driftTy, w, h };
  });

  const gridRects     = medirPosicionesGrid();
  const portfolioRect = document.querySelector(".celda.portfolio").getBoundingClientRect();

  cloudsEl.classList.add("transitioning");

  const duration     = 700;
  const maxStagger   = 350;
  const staggerDelay = Math.min(40, maxStagger / Math.max(1, tracks.length));
  const animations   = [];
  const totalProyectos = gridRects.length;

  tracks.forEach((track, i) => {
    const from = cloudPositions[i];
    const projectIndex = obtenerIndiceProyectoTrack(track, totalProyectos);
    const to = gridRects[projectIndex];
    if (!from || !to) return;
    const targetX = to.left - portfolioRect.left;
    const targetY = to.top - portfolioRect.top;
    const s = to.width / from.w;
    const dx = (targetX + to.width / 2) - (from.x + from.w / 2);
    const dy = (targetY + to.height / 2) - (from.y + from.h / 2);

    const anim = track.animate([
      { transform: "translate(0px, 0px) scale(1)" },
      { transform: `translate(${dx}px, ${dy}px) scale(${s})` },
    ], {
      duration,
      delay: i * staggerDelay,
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
      fill: "forwards",
    });
    animations.push(anim);
  });

  Promise.all(animations.map(a => a.finished)).then(() => {
    cloudsEl.classList.remove("transitioning");
    const prevTransition = gridEl.style.transition;
    gridEl.style.transition = "none";
    gridEl.classList.add("visible");
    gridEl.offsetHeight;
    gridEl.style.transition = prevTransition;
    cloudsEl.style.opacity       = "0";
    cloudsEl.style.pointerEvents = "none";
    if (btn) btn.textContent = "dispersar";
    const colBar = document.getElementById("portfolio-col-bar");
    if (colBar) colBar.style.display = "flex";
    const gridScroll = gridEl.querySelector(".portfolio-grid");
    if (gridScroll) setTimeout(() => gridScroll.dispatchEvent(new Event("scroll")), 50);
    sincronizarEstadoNubes();
    portfolioAnimating = false;
  });
}

function animarGridANubes(cloudsEl, gridEl, btn) {
  portfolioMode = "clouds";
  const tracks = Array.from(cloudsEl.querySelectorAll(".portfolio-cloud-track"));

  tracks.forEach(track => {
    const variante = track._cloudVariantSrc;
    if (!variante) return;
    const img = track.querySelector(".portfolio-cloud-item img");
    if (img) img.src = variante;
  });

  const gridRects     = medirPosicionesGrid();
  const portfolioRect = document.querySelector(".celda.portfolio").getBoundingClientRect();
  const totalProyectos = gridRects.length;

  const vw       = window.innerWidth;
  const vh       = window.innerHeight;
  const esMobile = vw <= 600;
  const numBandas      = esMobile ? 4 : 5;
  const margenSuperior = vh * 0.15;
  const margenInferior = vh * 0.10;
  const alturaUtil     = Math.max(0, vh - margenSuperior - margenInferior);
  const alturaBanda    = alturaUtil / numBandas;
  const { anchoMin, anchoMax } = obtenerRangoAnchoNubes();

  const targets = tracks.map((_, i) => {
    const banda = i % numBandas;
    const ancho = Math.round(anchoMin + Math.random() * (anchoMax - anchoMin));
    const alto  = Math.round(ancho * 0.68);
    const yCentro = margenSuperior + banda * alturaBanda + alturaBanda * 0.5;
    const yJitter = (Math.random() - 0.5) * alturaBanda * 0.6;
    const y = Math.max(margenSuperior, Math.min(vh - margenInferior - alto, Math.round(yCentro + yJitter)));
    const x = Math.random() * (vw - ancho);
    return { x, y, w: ancho, h: alto };
  });

  tracks.forEach((track) => {
    track.getAnimations().forEach(a => a.cancel());
    track.style.transform       = "";
    track.style.transformOrigin = "center center";
    const item = track.querySelector(".portfolio-cloud-item");
    if (item) item.style.animationName = "none";
    const projectIndex = obtenerIndiceProyectoTrack(track, totalProyectos);
    const fromRect = gridRects[projectIndex];
    if (!fromRect) return;
    track.style.left   = `${fromRect.left - portfolioRect.left}px`;
    track.style.top    = `${fromRect.top - portfolioRect.top}px`;
    track.style.width  = `${fromRect.width}px`;
    track.style.height = `${fromRect.height}px`;
  });

  const prevTransition = gridEl.style.transition;
  gridEl.style.transition = "none";
  gridEl.classList.remove("visible");
  gridEl.offsetHeight;
  gridEl.style.transition = prevTransition;
  cloudsEl.style.opacity       = "1";
  cloudsEl.style.pointerEvents = "auto";
  cloudsEl.classList.add("transitioning");

  const duration     = 700;
  const maxStagger   = 350;
  const staggerDelay = Math.min(40, maxStagger / Math.max(1, tracks.length));
  const animations   = [];

  tracks.forEach((track, i) => {
    const projectIndex = obtenerIndiceProyectoTrack(track, totalProyectos);
    const fromRect = gridRects[projectIndex];
    if (!fromRect) return;
    const fromX = fromRect.left - portfolioRect.left;
    const fromW = fromRect.width;
    const fromH = fromRect.height;
    const to    = targets[i];
    const s = to.w / fromW;
    const dx = (to.x + to.w / 2) - (fromX + fromW / 2);
    const dy = (to.y + to.h / 2) - ((fromRect.top - portfolioRect.top) + fromH / 2);

    const anim = track.animate([
      { transform: "translate(0, 0) scale(1)" },
      { transform: `translate(${dx}px, ${dy}px) scale(${s})` },
    ], {
      duration,
      delay: i * staggerDelay,
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
      fill: "forwards",
    });
    animations.push(anim);
  });

  if (btn) btn.textContent = "ordenar";
  const colBar = document.getElementById("portfolio-col-bar");
  if (colBar) colBar.style.display = "none";

  Promise.all(animations.map(a => a.finished)).then(() => {
    cloudsEl.classList.remove("transitioning");
    tracks.forEach((track, i) => {
      track.getAnimations().forEach(a => a.cancel());
      track.style.transform = "";
      track.style.transformOrigin = "";
      const to = targets[i];
      if (!to) return;
      track.style.left   = `${to.x}px`;
      track.style.top    = `${to.y}px`;
      track.style.width  = `${to.w}px`;
      track.style.height = `${to.h}px`;
      const item = track.querySelector(".portfolio-cloud-item");
      if (item) {
        const driftAnim = DRIFT_ANIMATIONS[i % DRIFT_ANIMATIONS.length];
        const driftDur  = 8 + Math.random() * 10;
        item.style.animationName           = driftAnim;
        item.style.animationDuration       = `${driftDur}s`;
        item.style.animationDelay          = `${-(Math.random() * driftDur)}s`;
        item.style.animationTimingFunction = "ease-in-out";
        item.style.animationIterationCount = "infinite";
        item.style.animationDirection      = "alternate";
        item.style.animationPlayState      = "running";
      }
      reanudarNubeDesdePosicionActual(track);
    });
    portfolioCloudsNeedLayout = false;
    sincronizarEstadoNubes();
    portfolioAnimating = false;
  });
}

// --- Resize y visibilidad ---

export function alResizarPortfolio() {
  ajustarLayoutGridPortfolio();
  const proyectos = obtenerDatos()?.portfolio?.proyectos;
  if (!proyectos || !document.getElementById("portfolio-clouds")) return;
  if (esPortfolioActivo() && portfolioMode === "clouds") {
    generarNubesFlotantes(proyectos);
    portfolioCloudsNeedLayout = false;
  } else {
    portfolioCloudsNeedLayout = true;
  }
  sincronizarEstadoNubes();
}

function reanudarNubesTrasRetornoSinRecolocar() {
  const cloudsEl = document.getElementById("portfolio-clouds");
  if (!cloudsEl) return;
  const tracks = Array.from(cloudsEl.querySelectorAll(".portfolio-cloud-track"));
  tracks.forEach(track => {
    const item = track.querySelector(".portfolio-cloud-item");
    if (item) item.style.animationPlayState = "running";
    const animaciones = track.getAnimations();
    if (animaciones.length > 0) return;
    const left = parseFloat(track.style.left);
    const top = parseFloat(track.style.top);
    const tienePosicion = Number.isFinite(left) && Number.isFinite(top);
    if (tienePosicion) {
      reanudarNubeDesdePosicionActual(track);
      return;
    }
    const banda = parseInt(track.dataset.banda, 10) || 0;
    if (typeof track._configurarNube === "function") {
      track._configurarNube(track, banda, false, null);
    }
  });
}

let resumeCloudsTimeoutId = null;

export function rehidratarPortfolioTrasRetorno(forzarRebuild = false) {
  if (resumeCloudsTimeoutId) clearTimeout(resumeCloudsTimeoutId);
  resumeCloudsTimeoutId = setTimeout(() => {
    const proyectos = obtenerDatos()?.portfolio?.proyectos;
    const cloudsEl = document.getElementById("portfolio-clouds");
    if (!proyectos || !cloudsEl) return;
    if (portfolioMode === "clouds") {
      if (esPortfolioActivo()) {
        if (forzarRebuild) {
          generarNubesFlotantes(proyectos);
          portfolioCloudsNeedLayout = false;
        } else {
          reanudarNubesTrasRetornoSinRecolocar();
        }
      } else {
        portfolioCloudsNeedLayout = true;
      }
    }
    sincronizarEstadoNubes();
  }, 80);
}

// Re-exportar funciones de evento que necesita onCloudPointerMove
export { onCloudPointerMove, onCloudPointerLeave };
