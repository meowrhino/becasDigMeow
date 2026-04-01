// ============================================
// PORTFOLIO — Nubes flotantes con crossfade
// ============================================
//
// Una nube por proyecto, flotando horizontalmente con WAAPI
// + deriva vertical con CSS keyframes.
// Cada nube cicla sus imágenes con crossfade suave.
//

import { obtenerDatos } from "./data.js";

// --- Estado del portfolio ---

/** true si las nubes necesitan reconstruirse (ej: tras resize). */
export let portfolioCloudsNeedLayout = false;

/** Rastrea si las nubes estaban corriendo antes de pausarse. */
let portfolioCloudsWereRunning = false;

/** Guard para evitar rebuilds recursivos. */
let portfolioCloudsRebuilding = false;

/** true si la vista detalle (scroll) está abierta. */
let portfolioDetailOpen = false;

// --- Estado centralizado de cycling de imágenes ---
// Cada proyecto tiene su propio "reloj" independiente.
// Tanto las nubes como la vista detalle leen de aquí.

/** @type {Map<number, {currentIndex: number, imagenes: string[], intervalo: number, timerId: number|null, listeners: Set<Function>}>} */
const imageCycleState = new Map();

function iniciarCiclosImagenes(proyectos) {
  detenerCiclosImagenes();
  proyectos.forEach((proyecto, idx) => {
    const imagenes = obtenerImagenesProyecto(proyecto).filter(Boolean);
    if (imagenes.length <= 1) return;

    const intervalo = 5000 + Math.random() * 3000;
    const retraso   = 2000 + Math.random() * 4000;
    const state = { currentIndex: 0, imagenes, intervalo, timerId: null, listeners: new Set() };

    const delayId = setTimeout(() => {
      state.timerId = setInterval(() => {
        state.currentIndex = (state.currentIndex + 1) % state.imagenes.length;
        state.listeners.forEach(fn => fn(state.currentIndex, state.imagenes));
      }, intervalo);
    }, retraso);
    state._delayId = delayId;

    imageCycleState.set(idx, state);
  });
}

function detenerCiclosImagenes() {
  imageCycleState.forEach(state => {
    if (state._delayId) clearTimeout(state._delayId);
    if (state.timerId) clearInterval(state.timerId);
    state.listeners.clear();
  });
  imageCycleState.clear();
}

/** Suscribe un listener al ciclo de un proyecto. Devuelve función de unsub. */
function suscribirCiclo(projectIndex, listener) {
  const state = imageCycleState.get(projectIndex);
  if (!state) return () => {};
  state.listeners.add(listener);
  return () => state.listeners.delete(listener);
}

/** Devuelve la imagen actual de un proyecto. */
function imagenActual(projectIndex) {
  const state = imageCycleState.get(projectIndex);
  if (!state) return null;
  return state.imagenes[state.currentIndex];
}

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
      url: proyecto.url || (proyecto.urls ? proyecto.urls[0].url : ""),
      imagenes: imagenes.length ? imagenes : [proyecto.imagen || ""].filter(Boolean),
      projectIndex,
    };
  }).filter(n => n.imagenes.length > 0);
}

/** Unsub functions de nubes suscritas al ciclo central. */
let cloudCycleUnsubs = [];

function limpiarSuscripcionesNubes() {
  cloudCycleUnsubs.forEach(fn => fn());
  cloudCycleUnsubs = [];
}

// --- Renderizado base ---

export function renderPortfolio(data) {
  const el = document.querySelector(".celda.portfolio");
  if (!el || !data?.portfolio) return;

  const proyectos = data.portfolio.proyectos;

  el.innerHTML = `
    <div class="portfolio-clouds-container" id="portfolio-clouds"></div>
    <div class="portfolio-detail" id="portfolio-detail">
      <div class="portfolio-detail-scroll-wrapper">
        <div class="portfolio-detail-content" id="portfolio-detail-content"></div>
      </div>
    </div>
  `;

  // Click fuera del scroll → cerrar
  document.getElementById("portfolio-detail").addEventListener("click", (e) => {
    if (!e.target.closest(".portfolio-detail-scroll-wrapper")) {
      cerrarVistaDetalle();
    }
  });

  // Iniciar ciclos centrales ANTES de crear suscriptores
  iniciarCiclosImagenes(proyectos);

  // Poblar vista detalle (con crossfade suscrita al ciclo central)
  const detailContent = document.getElementById("portfolio-detail-content");
  proyectos.forEach((proyecto, idx) => {
    const imagenes = obtenerImagenesProyecto(proyecto).filter(Boolean);
    const tieneCiclo = imagenes.length > 1;

    const item = document.createElement("div");
    item.classList.add("portfolio-detail-item");
    item.dataset.projectIndex = String(idx);

    const imgContainer = document.createElement("div");
    imgContainer.classList.add("portfolio-detail-img-container");

    const imgA = document.createElement("img");
    imgA.classList.add("pdetail-img", "pdetail-img-a");
    imgA.src = proyecto.imagen;
    imgA.alt = proyecto.nombre;
    imgA.loading = "lazy";
    imgContainer.appendChild(imgA);

    if (tieneCiclo) {
      const imgB = document.createElement("img");
      imgB.classList.add("pdetail-img", "pdetail-img-b");
      imgB.src = imagenes.length > 1 ? imagenes[1] : proyecto.imagen;
      imgB.alt = proyecto.nombre;
      imgB.loading = "lazy";
      imgContainer.appendChild(imgB);

      let showingA = true;
      suscribirCiclo(idx, (newIndex, imgs) => {
        if (showingA) {
          imgB.src = imgs[newIndex];
          imgContainer.classList.add("crossfade-flip");
        } else {
          imgA.src = imgs[newIndex];
          imgContainer.classList.remove("crossfade-flip");
        }
        showingA = !showingA;
      });
    }

    item.appendChild(imgContainer);

    if (proyecto.urls) {
      const dualContainer = document.createElement("div");
      dualContainer.classList.add("portfolio-detail-dual-links");
      proyecto.urls.forEach(u => {
        const a = document.createElement("a");
        a.classList.add("portfolio-detail-link");
        a.href = u.url;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = u.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
        dualContainer.appendChild(a);
      });
      item.appendChild(dualContainer);
    } else {
      const link = document.createElement("a");
      link.classList.add("portfolio-detail-link");
      link.href = proyecto.url;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = proyecto.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
      item.appendChild(link);
    }

    detailContent.appendChild(item);
  });

  // Nav-label "archive" en la parte inferior de la celda portfolio
  const archiveLabel = document.createElement("a");
  archiveLabel.href = "archive.html";
  archiveLabel.classList.add("nav-label", "bottom");
  archiveLabel.dataset.permanent = "true";
  archiveLabel.textContent = "archive";
  archiveLabel.addEventListener("click", () => {
    const current = localStorage.getItem("meowrhino-theme") || "light";
    localStorage.setItem("meowrhino-theme", current === "dark" ? "light" : "dark");
  });
  el.appendChild(archiveLabel);

  generarNubesFlotantes(proyectos);
  portfolioCloudsNeedLayout = false;
  portfolioDetailOpen = false;

  const cloudsContainer = document.getElementById("portfolio-clouds");
  cloudsContainer.addEventListener("pointerenter", onCloudPointerEnter);
  cloudsContainer.addEventListener("pointermove", onCloudPointerMove);
  cloudsContainer.addEventListener("pointerleave", onCloudPointerLeave);

  sincronizarEstadoNubes();
}

// --- Vista detalle (scroll vertical) ---

function abrirVistaDetalle(projectIndex) {
  if (portfolioDetailOpen) return;
  portfolioDetailOpen = true;

  const clouds = document.getElementById("portfolio-clouds");
  const detail = document.getElementById("portfolio-detail");
  if (!clouds || !detail) return;

  const tracks = Array.from(clouds.querySelectorAll(".portfolio-cloud-track"));
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  // 1. Capturar posición visual y congelar cada nube
  tracks.forEach(track => {
    const rect = track.getBoundingClientRect();
    track.getAnimations().forEach(a => a.cancel());
    track.style.left = `${rect.left}px`;
    track.style.top  = `${rect.top}px`;
    track.style.transform = "none";
    const item = track.querySelector(".portfolio-cloud-item");
    if (item) item.style.animationPlayState = "paused";
  });

  // 2. Animar nubes hacia el centro + fade out (stagger)
  const promises = tracks.map((track, i) => {
    const w = parseFloat(track.style.width) || 200;
    const h = parseFloat(track.style.height) || 136;
    return track.animate(
      [
        { opacity: 1 },
        { left: `${centerX - w / 2}px`, top: `${centerY - h / 2}px`, opacity: 0 },
      ],
      { duration: 450, easing: "ease-in", fill: "forwards", delay: i * 15 }
    ).finished;
  });

  // 3. Mostrar vista detalle en paralelo (con ligero delay)
  setTimeout(() => {
    detail.classList.add("visible");

    const content = document.getElementById("portfolio-detail-content");
    if (content) {
      if (typeof projectIndex === "number") {
        const target = content.querySelector(`[data-project-index="${projectIndex}"]`);
        if (target) target.scrollIntoView({ behavior: "instant", block: "start" });
      } else {
        content.scrollTop = 0;
      }
      actualizarGradientesDetalle(content);
      content.addEventListener("scroll", onDetailScroll, { passive: true });
    }
  }, 200);

  // 4. Ocultar contenedor de nubes al acabar la animación
  Promise.allSettled(promises).then(() => {
    clouds.classList.add("hidden");
  });
}

function cerrarVistaDetalle() {
  if (!portfolioDetailOpen) return;
  portfolioDetailOpen = false;

  const detail = document.getElementById("portfolio-detail");
  if (detail) detail.classList.remove("visible");

  const content = document.getElementById("portfolio-detail-content");
  if (content) content.removeEventListener("scroll", onDetailScroll);

  // Regenerar nubes frescas y animarlas DESDE el centro hacia sus posiciones
  const proyectos = obtenerDatos()?.portfolio?.proyectos;
  const clouds = document.getElementById("portfolio-clouds");
  if (!proyectos || !clouds) return;

  clouds.classList.remove("hidden");
  generarNubesFlotantes(proyectos);

  const tracks = Array.from(clouds.querySelectorAll(".portfolio-cloud-track"));
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  tracks.forEach((track, i) => {
    const w = parseFloat(track.style.width) || 200;
    const h = parseFloat(track.style.height) || 136;

    // Capturar posición visual real (WAAPI ya en marcha)
    const rect = track.getBoundingClientRect();
    const realLeft = rect.left;
    const realTop = rect.top;

    // Congelar en posición real
    track.getAnimations().forEach(a => a.cancel());
    track.style.left = `${realLeft}px`;
    track.style.top  = `${realTop}px`;
    track.style.transform = "none";
    const item = track.querySelector(".portfolio-cloud-item");
    if (item) item.style.animationPlayState = "paused";

    // Volar desde centro → posición real (inverso del enter)
    const anim = track.animate(
      [
        { left: `${centerX - w / 2}px`, top: `${centerY - h / 2}px`, opacity: 0 },
        { left: `${realLeft}px`, top: `${realTop}px`, opacity: 1 },
      ],
      { duration: 450, easing: "ease-out", fill: "forwards", delay: i * 15 }
    );

    anim.onfinish = () => {
      anim.cancel();
      track.style.left = `${realLeft}px`;
      track.style.top  = `${realTop}px`;
      track.style.transform = "none";
      if (item) item.style.animationPlayState = "running";
      reanudarNubeDesdePosicionActual(track);
    };
  });
}

function onDetailScroll() {
  const content = document.getElementById("portfolio-detail-content");
  if (content) actualizarGradientesDetalle(content);
}

function actualizarGradientesDetalle(content) {
  const wrapper = content.closest(".portfolio-detail-scroll-wrapper");
  if (!wrapper) return;
  const { scrollTop, scrollHeight, clientHeight } = content;
  wrapper.classList.toggle("can-scroll-up", scrollTop > 2);
  wrapper.classList.toggle("can-scroll-down", scrollTop + clientHeight < scrollHeight - 2);
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
  limpiarSuscripcionesNubes();
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

    const link = document.createElement("div");
    link.classList.add("portfolio-cloud-item");
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

    // — Crossfade (capa B): suscrita al ciclo central —
    if (nube.imagenes.length > 1) {
      const imgB = document.createElement("img");
      imgB.classList.add("pcloud-img", "pcloud-img-b");
      imgB.src = nube.imagenes[1];
      imgB.alt = nube.nombre;
      imgB.loading = "lazy";
      imgB.decoding = "async";
      link.appendChild(imgB);

      let showingA = true;
      const unsub = suscribirCiclo(nube.projectIndex, (newIndex, imagenes) => {
        if (!track.isConnected) { unsub(); return; }
        if (showingA) {
          imgB.src = imagenes[newIndex];
          link.classList.add("crossfade-flip");
        } else {
          imgA.src = imagenes[newIndex];
          link.classList.remove("crossfade-flip");
        }
        showingA = !showingA;
      });
      cloudCycleUnsubs.push(unsub);
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

  // Auto-cerrar vista detalle si se navega fuera del portfolio
  if (portfolioDetailOpen && !esPortfolioActivo()) {
    portfolioDetailOpen = false;
    cloudsEl.classList.remove("hidden");
    document.getElementById("portfolio-detail")?.classList.remove("visible");
  }

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
    esPortfolioActivo()
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

// --- Click en nube ---

export function onCloudPointerDown(e) {
  const track = e.target.closest(".portfolio-cloud-track");
  if (!track) return;
  e.preventDefault();
  const idx = parseInt(track.dataset.projectIndex, 10);
  abrirVistaDetalle(Number.isFinite(idx) ? idx : undefined);
}

function onCloudPointerMove(e) {
  hoverPointerInside = true;
  hoverPointerX = e.clientX;
  hoverPointerY = e.clientY;
  actualizarHoverNubesEnPunto(e.clientX, e.clientY);
  iniciarMonitorHoverNubes();
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

  const { anchoMin, anchoMax } = (window.innerWidth <= 600)
    ? { anchoMin: 100, anchoMax: 180 }
    : { anchoMin: 160, anchoMax: 300 };
  const rango = Math.max(1, anchoMax - anchoMin);
  const factor = Math.max(0, Math.min(1, 1 - (ancho - anchoMin) / rango));
  const velocidad = 20 + factor * 30 + Math.random() * 15;
  const duracionMs = (distancia / velocidad) * 1000;

  const anim = track.animate(
    [
      { transform: "translateX(0px)" },
      { transform: `translateX(${distancia}px)` },
    ],
    { duration: duracionMs, iterations: 1, easing: "linear", fill: "forwards" }
  );

  anim.onfinish = () => {
    if (!track.isConnected) return;
    if (typeof track._configurarNube === "function") {
      track._configurarNube(track, banda, false, null);
    }
  };
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

// Re-exportar funciones
export { onCloudPointerMove, onCloudPointerLeave, cerrarVistaDetalle };

export function esVistaDetalleAbierta() {
  return portfolioDetailOpen;
}
