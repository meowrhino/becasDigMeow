// ============================================
// PORTFOLIO — Nubes flotantes con crossfade
// ============================================
//
// Una nube por proyecto, flotando horizontalmente con WAAPI
// + deriva vertical con CSS keyframes.
// Cada nube cicla sus imágenes con crossfade suave.
//
// TODO (Fase 2c): Click en nube → vista scroll vertical con links como texto.

import { obtenerDatos } from "./data.js";
import { esMovil } from "./pages.js";

// --- Estado del portfolio ---

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
 * Devuelve UNA nube por proyecto, con todas sus imágenes para crossfade.
 */
function obtenerNubesPortfolio(proyectos) {
  return proyectos.map((proyecto, projectIndex) => {
    const imagenes = obtenerImagenesProyecto(proyecto).filter(Boolean);
    return {
      nombre: proyecto.nombre,
      url: proyecto.url,
      imagenes: imagenes.length ? imagenes : [proyecto.imagen || ""].filter(Boolean),
      projectIndex,
    };
  }).filter(n => n.imagenes.length > 0);
}

/** Timers de crossfade activos (para limpiar al reconstruir). */
let crossfadeTimers = [];

function limpiarCrossfadeTimers() {
  crossfadeTimers.forEach(id => clearInterval(id));
  crossfadeTimers = [];
}

// --- Renderizado base ---

export function renderPortfolio(data) {
  const el = document.querySelector(".celda.portfolio");
  if (!el || !data?.portfolio) return;

  const proyectos = data.portfolio.proyectos;

  el.innerHTML = `
    <div class="portfolio-clouds-container" id="portfolio-clouds"></div>
  `;

  generarNubesFlotantes(proyectos);
  portfolioCloudsNeedLayout = false;

  const cloudsContainer = document.getElementById("portfolio-clouds");
  cloudsContainer.addEventListener("pointerenter", onCloudPointerEnter);
  cloudsContainer.addEventListener("pointermove", onCloudPointerMove);
  cloudsContainer.addEventListener("pointerleave", onCloudPointerLeave);

  sincronizarEstadoNubes();
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
  limpiarCrossfadeTimers();
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

  const anchoMin = esMobile ? 100 : 160;
  const anchoMax = esMobile ? 180 : 300;

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

    // — Imagen principal (capa A) —
    const imgA = document.createElement("img");
    imgA.classList.add("pcloud-img", "pcloud-img-a");
    imgA.src = nube.imagenes[0];
    imgA.alt = nube.nombre;
    imgA.loading = "eager";
    imgA.decoding = "async";
    link.appendChild(imgA);

    // — Crossfade (capa B): solo si hay varias imágenes —
    if (nube.imagenes.length > 1) {
      const imgB = document.createElement("img");
      imgB.classList.add("pcloud-img", "pcloud-img-b");
      imgB.src = nube.imagenes[1];
      imgB.alt = nube.nombre;
      imgB.loading = "lazy";
      imgB.decoding = "async";
      link.appendChild(imgB);

      let currentIndex = 0;
      let showingA = true;
      const intervalo = 5000 + Math.random() * 3000; // 5–8s por imagen
      const retraso   = 2000 + Math.random() * 4000; // stagger inicial

      const delayId = setTimeout(() => {
        const timerId = setInterval(() => {
          if (!track.isConnected) { clearInterval(timerId); return; }
          currentIndex = (currentIndex + 1) % nube.imagenes.length;
          if (showingA) {
            imgB.src = nube.imagenes[currentIndex];
            link.classList.add("crossfade-flip");
          } else {
            imgA.src = nube.imagenes[currentIndex];
            link.classList.remove("crossfade-flip");
          }
          showingA = !showingA;
        }, intervalo);
        crossfadeTimers.push(timerId);
      }, retraso);
      crossfadeTimers.push(delayId);
    }

    const nombre = document.createElement("span");
    nombre.classList.add("pcloud-name");
    nombre.textContent = nube.nombre;
    link.appendChild(nombre);

    track.appendChild(link);
    container.appendChild(track);

    track.dataset.banda = String(banda);
    track.dataset.projectIndex = String(nube.projectIndex);
    track._configurarNube = configurarNube;

    configurarNube(track, banda, true, xSlots[i]);
  });

  sincronizarEstadoNubes();
}

// --- Control de estado de las nubes ---

export function esPortfolioActivo() {
  return !!document.querySelector(".celda.portfolio")?.classList.contains("activa");
}

function debenCorrerNubes() {
  return esPortfolioActivo();
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
  if (draggedCloud) return;
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
    esPortfolioActivo() &&
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
    anchoMin: esMobile ? 100 : 160,
    anchoMax: esMobile ? 180 : 300,
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

// --- Resize y visibilidad ---

export function alResizarPortfolio() {
  const proyectos = obtenerDatos()?.portfolio?.proyectos;
  if (!proyectos || !document.getElementById("portfolio-clouds")) return;
  if (esPortfolioActivo()) {
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
    sincronizarEstadoNubes();
  }, 80);
}

// Re-exportar funciones de evento que necesita onCloudPointerMove
export { onCloudPointerMove, onCloudPointerLeave };
