// ============================================
// meowrhino studio — Single-Page Application
// ============================================
//
// Arquitectura:
//   - Navegación basada en un grid 2D de "celdas" (páginas)
//   - Cada celda ocupa el 100% del viewport y se activa/desactiva con opacidad
//   - Los datos de contenido se cargan desde data.json
//   - El portfolio tiene dos modos: nubes flotantes (WAAPI) y cuadrícula
//
// Mapa del grid:
//   Fila 0: [pricing] [politicas] [metodologia] [welcome] [statement]
//   Fila 1:                                     [portfolio]
//
// ============================================

// --- Elemento raíz de la app ---
const app = document.getElementById("content");

// ============================================
// 1. CONFIGURACIÓN DEL GRID
// ============================================

/**
 * Matriz que define qué celdas existen.
 * 1 = celda activa, 0 = celda vacía (no navegable).
 */
const GRID = [
  [1, 1, 1, 1, 1], // fila 0: pricing, politicas, metodologia, welcome, statement
  [0, 0, 0, 1, 0], // fila 1: _, _, _, portfolio, _
];

/** Mapa de coordenadas "fila_columna" → nombre legible de la celda. */
const NOMBRES_CELDAS = {
  "0_0": "pricing",
  "0_1": "politicas",
  "0_2": "metodologia",
  "0_3": "welcome",
  "0_4": "statement",
  "1_3": "portfolio",
};

/** Posición actual del usuario en el grid. */
let posY = 0;
let posX = 3; // empieza en "welcome"

// ============================================
// 2. CARGA DE DATOS (data.json)
// ============================================

/** Caché del JSON para evitar múltiples fetches. */
let dataCache = null;

/**
 * Carga data.json y lo almacena en caché.
 * @returns {Promise<Object|null>} Los datos parseados o null si hubo error.
 */
async function cargarDatos() {
  if (dataCache) return dataCache;
  try {
    const res = await fetch("data.json");
    dataCache = await res.json();
    return dataCache;
  } catch (err) {
    console.error("Error cargando data.json:", err);
    return null;
  }
}

/**
 * Obtiene los datos del idioma correcto desde la caché.
 * Soporta estructura plana ({welcome, portfolio, ...})
 * o anidada por idioma ({es: {welcome, ...}, cat: {...}}).
 * @returns {Object|null} Datos del idioma activo o null.
 */
function obtenerDatos() {
  if (!dataCache) return null;

  // Estructura plana (caso actual)
  if (dataCache.welcome && dataCache.portfolio) return dataCache;

  // Estructura anidada por idioma
  for (const lang of ["es", "cat", "en"]) {
    if (dataCache[lang]?.welcome && dataCache[lang]?.portfolio) return dataCache[lang];
  }

  return null;
}

// ============================================
// 3. CREACIÓN DE CELDAS (DOM)
// ============================================

/**
 * Genera un div.celda por cada posición activa del GRID
 * y lo añade al contenedor principal.
 */
function crearCeldas() {
  for (let y = 0; y < GRID.length; y++) {
    for (let x = 0; x < GRID[y].length; x++) {
      if (GRID[y][x] !== 1) continue;

      const celda = document.createElement("div");
      celda.classList.add("celda", `pos_${y}_${x}`);
      celda.dataset.y = y;
      celda.dataset.x = x;

      const nombre = NOMBRES_CELDAS[`${y}_${x}`];
      if (nombre) {
        celda.classList.add(nombre);
        celda.dataset.nombre = nombre;
      }

      app.appendChild(celda);
    }
  }
}

// ============================================
// 4. RENDERIZADO DE PÁGINAS
// ============================================

// --- 4a. Welcome ---
// Muestra el título del estudio y una lista de herramientas/links
// con secciones desplegables (formateadores, webs terminadas).
// Todos los datos se leen de data.json (welcome.herramientas, welcome.formateadores, portfolio.proyectos).

/**
 * Genera el HTML de un enlace tipo tarjeta.
 * @param {{ nombre: string, url: string }} item
 * @returns {string} HTML del enlace.
 */
function crearLinkHTML(item) {
  return `<a class="tool-link" href="${item.url}" target="_blank" rel="noopener">${item.nombre}</a>`;
}

/**
 * Genera el HTML de un grupo desplegable (dropdown).
 * @param {string} titulo - Texto del botón.
 * @param {{ nombre: string, url: string }[]} items - Enlaces internos.
 * @param {string} uid - ID único para el desplegable.
 * @returns {string} HTML del dropdown.
 */
function crearDropdownHTML(titulo, items, uid) {
  const linksHTML = items.map(crearLinkHTML).join("");
  return `
    <div class="tools-dropdown-group">
      <button class="tools-dropdown-btn" data-target="${uid}">
        ${titulo}
        <svg class="tools-dropdown-icon" viewBox="0 0 16 16" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <polyline points="4,6 8,10 12,6"/>
        </svg>
      </button>
      <div class="tools-dropdown-content" id="${uid}">
        <div class="tools-dropdown-inner">${linksHTML}</div>
      </div>
    </div>
  `;
}

/**
 * Renderiza la página de bienvenida con el título y los links/herramientas.
 * @param {Object} data - Datos del JSON.
 */
function renderWelcome(data) {
  const el = document.querySelector(".celda.welcome");
  if (!el || !data) return;

  const herramientas  = data.welcome?.herramientas || [];
  const formateadores = data.welcome?.formateadores || [];
  const websTerminadas = (data.portfolio?.proyectos || []).map(p => ({ nombre: p.nombre, url: p.url }));

  const linksHTML = herramientas.map(crearLinkHTML).join("");
  const dropdownsHTML = [
    crearDropdownHTML("formateadores", formateadores, "dd_formateadores"),
    crearDropdownHTML("webs terminadas", websTerminadas, "dd_webs"),
  ].join("");

  el.innerHTML = `
    <div class="welcome-content">
      <h1 class="welcome-title">${data.welcome.titulo}</h1>
      <div class="welcome-tools">${linksHTML}${dropdownsHTML}</div>
    </div>
  `;

  // Lógica de abrir/cerrar desplegables (accordion)
  el.querySelectorAll(".tools-dropdown-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.target);
      if (!target) return;

      const willOpen = !target.classList.contains("open");

      // Cerrar todos los desplegables abiertos
      el.querySelectorAll(".tools-dropdown-content.open").forEach(d => d.classList.remove("open"));
      el.querySelectorAll(".tools-dropdown-btn.active").forEach(b => b.classList.remove("active"));

      // Abrir el seleccionado (si no estaba abierto)
      target.classList.toggle("open", willOpen);
      btn.classList.toggle("active", willOpen);
    });
  });
}

// --- 4b. Statement ---
// Manifiesto del estudio: una lista de frases.

/**
 * Renderiza la página del manifiesto/statement.
 * @param {Object} data - Datos del JSON.
 */
function renderStatement(data) {
  const el = document.querySelector(".celda.statement");
  if (!el || !data?.statement) return;

  const lineas = data.statement.lineas.map(l => `<p>${l}</p>`).join("");
  el.innerHTML = `<div class="statement-content">${lineas}</div>`;
}

// --- 4c. Metodología ---
// Proceso de trabajo en 5 semanas, mostrado en zigzag (desktop) o stack (mobile).
// La posición de cada paso en el grid CSS viene de data.json (paso.gridPos).

/**
 * Renderiza la página de metodología con el timeline de semanas.
 * @param {Object} data - Datos del JSON.
 */
function renderMetodologia(data) {
  const el = document.querySelector(".celda.metodologia");
  if (!el || !data?.metodologia) return;

  const pasosHTML = data.metodologia.pasos.map(paso => `
    <div class="metodo-paso" style="${paso.gridPos || ""}">
      <span class="metodo-semana">${paso.semana}</span>
      <div class="metodo-texto">
        <h3>${paso.titulo}</h3>
        <p>${paso.descripcion.replace(/\n/g, "<br>")}</p>
      </div>
    </div>
  `).join("");

  const timelineHTML = data.metodologia.pasos
    .map(p => `<span>${p.semana}</span>`)
    .join("");

  el.innerHTML = `
    <div class="metodologia-content">
      <div class="metodo-zigzag">
        ${pasosHTML}
        <div class="metodo-timeline-bar">${timelineHTML}</div>
      </div>
    </div>
  `;
}

// --- 4d. Pricing ---
// Rango de precios, nota explicativa y lista de lo que incluye.

/**
 * Renderiza la página de precios.
 * @param {Object} data - Datos del JSON.
 */
function renderPricing(data) {
  const el = document.querySelector(".celda.pricing");
  if (!el || !data?.pricing) return;

  const d = data.pricing;
  const incluyeHTML = d.incluye
    .map(item => `<li class="incluye-item">${item}</li>`)
    .join("");

  el.innerHTML = `
    <div class="pricing-content">
      <p class="precio-rango">${d.rango}</p>
      <p class="precio-nota">${d.nota.replace(/\n/g, "<br>")}</p>
      <ul class="incluye-lista">${incluyeHTML}</ul>
    </div>
  `;
}

// --- 4e. Políticas ---
// Términos de pago y condiciones.

/**
 * Renderiza la página de políticas.
 * @param {Object} data - Datos del JSON.
 */
function renderPoliticas(data) {
  const el = document.querySelector(".celda.politicas");
  if (!el || !data?.politicas) return;

  const html = data.politicas.parrafos
    .map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

  el.innerHTML = `<div class="politicas-content">${html}</div>`;
}

// --- 4f. Portfolio ---
// Dos modos de visualización:
//   1. "clouds" — screenshots flotando horizontalmente con WAAPI + deriva CSS
//   2. "grid"   — cuadrícula estática ordenada

/** Modo actual del portfolio: "clouds" o "grid". */
let portfolioMode = "clouds";

/** Previene doble-click durante la transición entre modos. */
let portfolioAnimating = false;

/** true si el layout de las nubes necesita reconstruirse (ej: tras un resize). */
let portfolioCloudsNeedLayout = false;

/** Rastrea si las nubes estaban corriendo antes de pausarse. */
let portfolioCloudsWereRunning = false;

/** Guard para evitar rebuilds recursivos. */
let portfolioCloudsRebuilding = false;

/**
 * Renderiza la estructura base del portfolio (contenedores + botón switch).
 * @param {Object} data - Datos del JSON.
 */
function renderPortfolio(data) {
  const el = document.querySelector(".celda.portfolio");
  if (!el || !data?.portfolio) return;

  const proyectos = data.portfolio.proyectos;

  // Crear los dos contenedores (nubes y grid) + botón de cambio
  el.innerHTML = `
    <div class="portfolio-clouds-container" id="portfolio-clouds"></div>
    <div class="portfolio-grid-container" id="portfolio-grid">
      <div class="portfolio-grid">${
        proyectos.map(p => `
          <a class="portfolio-item" href="${p.url}" target="_blank" rel="noopener" title="${p.nombre}">
            <img src="${p.imagen}" alt="${p.nombre}" loading="lazy">
          </a>
        `).join("")
      }</div>
    </div>
    <button class="portfolio-switch" id="portfolio-switch-btn">ordenar</button>
  `;

  // Generar animación de nubes
  generarNubesFlotantes(proyectos);
  portfolioCloudsNeedLayout = false;

  // Botón para alternar entre modos
  document.getElementById("portfolio-switch-btn")
    .addEventListener("click", alternarModoPortfolio);

  // Si ya estaba en modo grid, aplicar ese estado visual
  if (portfolioMode === "grid") {
    document.getElementById("portfolio-grid").classList.add("visible");
    document.getElementById("portfolio-clouds").style.opacity = "0";
    document.getElementById("portfolio-switch-btn").textContent = "dispersar";
  }

  sincronizarEstadoNubes();
}

// ============================================
// 5. PORTFOLIO: SISTEMA DE NUBES FLOTANTES
// ============================================
//
// Cada screenshot es una "nube" que se mueve horizontalmente (WAAPI)
// y tiene una ligera deriva vertical + rotación (CSS keyframes).
//
// Flujo:
//   1. Se distribuyen N nubes en bandas verticales para evitar solapamiento
//   2. Las posiciones X iniciales se reparten uniformemente (anti-colisión)
//   3. Al llegar al borde derecho, la nube vuelve a entrar por la izquierda
//   4. Las nubes más rápidas son más pequeñas (efecto profundidad)

/** Nombres de las animaciones CSS de deriva vertical. */
const DRIFT_ANIMATIONS = ["pcloud1", "pcloud2", "pcloud3", "pcloud4", "pcloud5", "pcloud6"];

/**
 * Mezcla un array in-place (Fisher-Yates shuffle).
 * @param {any[]} arr
 */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * Crea y anima las nubes flotantes del portfolio.
 * @param {{ nombre: string, imagen: string, url: string }[]} proyectos
 */
function generarNubesFlotantes(proyectos) {
  const container = document.getElementById("portfolio-clouds");
  if (!container) return;
  container.innerHTML = "";

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const esMobile = vw <= 600;

  // --- Distribución vertical en bandas ---
  const margenSuperior = vh * 0.15;
  const margenInferior = vh * 0.10;
  const alturaUtil     = Math.max(0, vh - margenSuperior - margenInferior);
  const numBandas      = esMobile ? 4 : 5;
  const alturaBanda    = alturaUtil / numBandas;

  // --- Tamaños de las nubes ---
  const anchoMin = esMobile ? 80 : 120;
  const anchoMax = esMobile ? 150 : 220;

  // --- Anti-colisión: slots de X distribuidos uniformemente ---
  const numItems = proyectos.length;
  const xSlots = Array.from({ length: numItems }, (_, i) => i);
  shuffle(xSlots);

  /**
   * Configura posición, tamaño y animación WAAPI de una nube individual.
   *
   * @param {HTMLElement} track - El div.portfolio-cloud-track
   * @param {number} banda - Índice de la banda vertical (0..numBandas-1)
   * @param {boolean} esPrimeraVez - true en la carga inicial, false al re-entrar por la izquierda
   * @param {number|null} xSlot - Índice del slot X (solo en primera carga)
   */
  function configurarNube(track, banda, esPrimeraVez, xSlot) {
    if (!track.isConnected) return;

    // Tamaño aleatorio dentro del rango
    const ancho = Math.round(anchoMin + Math.random() * (anchoMax - anchoMin));
    const alto  = Math.round(ancho * 0.68); // aspect ratio ~3:2

    // Posición Y: centro de la banda + jitter aleatorio (±30% de la banda)
    const yCentro    = margenSuperior + banda * alturaBanda + alturaBanda * 0.5;
    const yJitter    = (Math.random() - 0.5) * alturaBanda * 0.6;
    const yMin       = Math.round(margenSuperior);
    const yMax       = Math.round(Math.max(yMin, vh - margenInferior - alto));
    const y          = Math.max(yMin, Math.min(yMax, Math.round(yCentro + yJitter)));

    // Velocidad: las nubes pequeñas van más rápido (sensación de profundidad)
    const factorVelocidad = 1 - (ancho - anchoMin) / (anchoMax - anchoMin);
    const pxPorSegundo    = 20 + factorVelocidad * 30 + Math.random() * 15;
    const recorrido       = vw + 2 * ancho; // de -ancho hasta vw+ancho
    const duracion        = recorrido / pxPorSegundo;

    // Cancelar animaciones WAAPI previas (evita que fill:"forwards" bloquee el transform)
    track.getAnimations().forEach(a => a.cancel());

    // Aplicar estilos comunes
    track.style.top    = `${y}px`;
    track.style.width  = `${ancho}px`;
    track.style.height = `${alto}px`;
    track.style.zIndex = 1 + Math.floor(Math.random() * 4);

    // Calcular delay para posición inicial
    let delay = 0;
    if (esPrimeraVez) {
      // Distribuir uniformemente en el viewport
      const slotAncho = vw / numItems;
      const slotX     = xSlot * slotAncho + Math.random() * slotAncho * 0.6;
      const xInicial  = Math.max(0, Math.min(vw - ancho, Math.round(slotX)));
      track.style.left = "0px";
      // Delay negativo: la nube aparece en xInicial al tiempo 0
      delay = -(xInicial / recorrido) * duracion;
    } else {
      // Re-entrada desde el borde izquierdo
      track.style.left = `${-ancho}px`;
    }

    // Animación WAAPI: movimiento horizontal lineal
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

    // Al terminar, volver a entrar por la izquierda
    anim.onfinish = () => {
      if (track.isConnected) configurarNube(track, banda, false, null);
    };
  }

  // --- Crear elementos DOM para cada proyecto ---
  proyectos.forEach((proyecto, i) => {
    const banda     = i % numBandas;
    const driftAnim = DRIFT_ANIMATIONS[i % DRIFT_ANIMATIONS.length];
    const driftDur  = 8 + Math.random() * 10;

    // Track: capa que se mueve horizontalmente (WAAPI)
    const track = document.createElement("div");
    track.classList.add("portfolio-cloud-track");
    track.style.left = "0px";

    // Link con imagen: tiene la animación de deriva vertical (CSS)
    const link = document.createElement("a");
    link.classList.add("portfolio-cloud-item");
    link.href   = proyecto.url;
    link.target = "_blank";
    link.rel    = "noopener";
    link.title  = proyecto.nombre;
    link.style.left = "0px";

    // Animación CSS de deriva vertical + rotación leve
    link.style.animationName           = driftAnim;
    link.style.animationDuration       = `${driftDur}s`;
    link.style.animationDelay          = `${-(Math.random() * driftDur)}s`;
    link.style.animationTimingFunction = "ease-in-out";
    link.style.animationIterationCount = "infinite";
    link.style.animationDirection      = "alternate";

    // Imagen del screenshot
    const img = document.createElement("img");
    img.src      = proyecto.imagen;
    img.alt      = proyecto.nombre;
    img.loading  = "eager";
    img.decoding = "async";
    link.appendChild(img);

    // Nombre visible al hover
    const nombre = document.createElement("span");
    nombre.classList.add("pcloud-name");
    nombre.textContent = proyecto.nombre;
    link.appendChild(nombre);

    track.appendChild(link);
    container.appendChild(track);

    // Lanzar la animación inicial
    configurarNube(track, banda, true, xSlots[i]);
  });

  sincronizarEstadoNubes();
}

// --- Control de estado de las nubes ---

/** @returns {boolean} true si la celda del portfolio es la celda activa. */
function esPortfolioActivo() {
  return !!document.querySelector(".celda.portfolio")?.classList.contains("activa");
}

/** @returns {boolean} true si las nubes deberían estar animándose ahora mismo. */
function debenCorrerNubes() {
  return esPortfolioActivo() && portfolioMode === "clouds";
}

/**
 * Reconstruye el layout de las nubes si es necesario
 * (por ejemplo, después de un resize mientras la celda no estaba activa).
 */
function reconstruirNubesSiNecesario() {
  if (!portfolioCloudsNeedLayout || !debenCorrerNubes()) return;

  const proyectos = obtenerDatos()?.portfolio?.proyectos;
  if (!proyectos || !document.getElementById("portfolio-clouds")) return;

  portfolioCloudsNeedLayout = false;
  generarNubesFlotantes(proyectos);
}

/**
 * Sincroniza el estado play/pause de todas las nubes.
 * - Si el portfolio está activo y en modo clouds → play
 * - Si no → pause
 * - Al reanudar, randomiza los currentTime para evitar agrupamiento
 */
function sincronizarEstadoNubes() {
  const cloudsEl = document.getElementById("portfolio-clouds");
  if (!cloudsEl) return;

  const debeCorrer  = debenCorrerNubes();
  const estaResumiendo = debeCorrer && !portfolioCloudsWereRunning;

  // Si necesita rebuild y debe correr, hacerlo primero
  if (portfolioCloudsNeedLayout && debeCorrer && !portfolioCloudsRebuilding) {
    portfolioCloudsRebuilding = true;
    reconstruirNubesSiNecesario();
    portfolioCloudsRebuilding = false;
    portfolioCloudsWereRunning = debenCorrerNubes();
    return;
  }

  // Controlar animaciones CSS (deriva vertical)
  cloudsEl.querySelectorAll(".portfolio-cloud-item").forEach(item => {
    item.style.animationPlayState = debeCorrer ? "running" : "paused";
  });

  // Controlar animaciones WAAPI (movimiento horizontal)
  cloudsEl.querySelectorAll(".portfolio-cloud-track").forEach(track => {
    track.getAnimations().forEach(anim => {
      if (debeCorrer) {
        // Al reanudar, randomizar posición para evitar sincronización
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

/**
 * Alterna entre modo "clouds" y modo "grid" con transición animada.
 */
function alternarModoPortfolio() {
  if (portfolioAnimating) return;
  portfolioAnimating = true;

  const cloudsEl = document.getElementById("portfolio-clouds");
  const gridEl   = document.getElementById("portfolio-grid");
  const btn      = document.getElementById("portfolio-switch-btn");

  if (portfolioMode === "clouds") {
    // Clouds → Grid
    portfolioMode = "grid";
    cloudsEl.style.transition    = "opacity 0.4s ease";
    cloudsEl.style.opacity       = "0";
    cloudsEl.style.pointerEvents = "none";
    sincronizarEstadoNubes();
    setTimeout(() => {
      gridEl.classList.add("visible");
      if (btn) btn.textContent = "dispersar";
      portfolioAnimating = false;
    }, 400);
  } else {
    // Grid → Clouds
    portfolioMode = "clouds";
    if (portfolioCloudsNeedLayout) reconstruirNubesSiNecesario();
    gridEl.classList.remove("visible");
    cloudsEl.style.transition    = "opacity 0.5s ease";
    cloudsEl.style.opacity       = "1";
    cloudsEl.style.pointerEvents = "auto";
    if (btn) btn.textContent = "ordenar";
    sincronizarEstadoNubes();
    setTimeout(() => { portfolioAnimating = false; }, 500);
  }
}

// ============================================
// 6. ORQUESTADOR DE RENDERIZADO
// ============================================

/**
 * Carga los datos y renderiza todas las páginas.
 */
async function renderizarContenido() {
  await cargarDatos();
  const data = obtenerDatos();
  if (!data) return;

  renderWelcome(data);
  renderStatement(data);
  renderMetodologia(data);
  renderPricing(data);
  renderPoliticas(data);
  renderPortfolio(data);
}

// ============================================
// 7. INTERFAZ DE NAVEGACIÓN
// ============================================

// --- 7a. Zone Label ---
// Texto grande semi-transparente con el nombre de la celda actual.

let zoneLabelEl = null;

/** @returns {string} Nombre de la celda actual (ej: "welcome", "portfolio"). */
function getNombrePagina() {
  return NOMBRES_CELDAS[`${posY}_${posX}`] || "";
}

/** Crea el elemento del zone label y lo añade al body. */
function crearZoneLabel() {
  zoneLabelEl = document.createElement("div");
  zoneLabelEl.classList.add("zone-label-bg");
  document.body.appendChild(zoneLabelEl);
}

/** Actualiza el texto del zone label con el nombre de la página actual. */
function actualizarZoneLabel() {
  if (!zoneLabelEl) return;
  zoneLabelEl.textContent = getNombrePagina();
}

// --- 7b. Minimap inline ---
// Cuadrícula pequeña en la esquina superior derecha que muestra la posición actual.

let minimapInlineEl = null;

/** @returns {number} Relación de aspecto del viewport (ancho/alto). */
function getAspectoViewport() {
  return window.innerHeight > 0 ? window.innerWidth / window.innerHeight : 1;
}

/** Recalcula el tamaño de las celdas del minimap inline según el viewport. */
function actualizarTamanoMinimapInline() {
  if (!minimapInlineEl) return;

  const base   = 14; // px base para la altura
  const cellW  = Math.max(8, Math.round(base * getAspectoViewport()));
  const cellH  = base;

  minimapInlineEl.querySelectorAll(".minimap-inline-cell").forEach(cell => {
    cell.style.width  = `${cellW}px`;
    cell.style.height = `${cellH}px`;
  });
}

/** Crea el header con el minimap inline y lo añade al body. */
function crearHeader() {
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

/** Resalta la celda activa en el minimap inline. */
function actualizarHeader() {
  if (!minimapInlineEl) return;
  minimapInlineEl.querySelectorAll(".minimap-inline-cell").forEach(cell => {
    cell.classList.toggle("activa", +cell.dataset.y === posY && +cell.dataset.x === posX);
  });
}

// --- 7c. Minimap expandido (overlay) ---
// Overlay a pantalla completa con celdas clickeables para navegar directamente.

let overlayEl = null;
let minimapExpandedEl = null;

/** Recalcula el tamaño de las celdas del minimap expandido según el viewport. */
function actualizarTamanoMinimapExpandido() {
  if (!minimapExpandedEl) return;

  const base   = Math.min(window.innerWidth * 0.12, 120);
  const cellW  = Math.max(40, Math.round(base));
  const cellH  = Math.max(24, Math.round(base / getAspectoViewport()));

  minimapExpandedEl.querySelectorAll(".minimap-expanded-cell").forEach(cell => {
    cell.style.width  = `${cellW}px`;
    cell.style.height = `${cellH}px`;
  });
}

/** Crea el overlay del minimap expandido con las celdas clickeables. */
function crearOverlay() {
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
          posY = y;
          posX = x;
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

  // Cerrar al hacer click fuera del minimap
  overlayEl.addEventListener("click", e => {
    if (e.target === overlayEl) cerrarMinimapExpandido();
  });

  document.body.appendChild(overlayEl);
}

function abrirMinimapExpandido() {
  actualizarMinimapExpandido();
  overlayEl.classList.add("visible");
}

function cerrarMinimapExpandido() {
  overlayEl.classList.remove("visible");
}

/** Resalta la celda activa en el minimap expandido. */
function actualizarMinimapExpandido() {
  if (!overlayEl) return;
  overlayEl.querySelectorAll(".minimap-expanded-cell").forEach(cell => {
    cell.classList.toggle("activa", +cell.dataset.y === posY && +cell.dataset.x === posX);
  });
}

// --- 7d. Nav Labels ---
// Botones de texto en los bordes de la celda activa que indican las celdas vecinas.

/** Direcciones de navegación con su offset y posición CSS. */
const DIRECCIONES = [
  { dy: -1, dx:  0, pos: "top" },
  { dy:  1, dx:  0, pos: "bottom" },
  { dy:  0, dx: -1, pos: "left" },
  { dy:  0, dx:  1, pos: "right" },
];

/**
 * Calcula las celdas vecinas navegables desde la posición actual.
 * @returns {Object.<string, { y: number, x: number, nombre: string }>}
 */
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

/**
 * Crea los botones de navegación en los bordes de una celda.
 * @param {HTMLElement} celda - La celda activa.
 */
function crearNavLabels(celda) {
  // Limpiar labels anteriores
  celda.querySelectorAll(".nav-label").forEach(l => l.remove());

  Object.entries(getVecinos()).forEach(([pos, info]) => {
    const label = document.createElement("button");
    label.classList.add("nav-label", pos);
    label.textContent = info.nombre;
    label.addEventListener("click", () => {
      posY = info.y;
      posX = info.x;
      actualizarVista();
    });
    celda.appendChild(label);
  });
}

// ============================================
// 8. NAVEGACIÓN POR URL (hash)
// ============================================

/**
 * Actualiza el hash de la URL sin añadir al historial (replaceState).
 * Esto permite compartir la URL actual pero no llena el historial al navegar.
 */
function actualizarHash() {
  const nombre = getNombrePagina();
  const nuevoHash = nombre ? `#${nombre}` : "#";
  history.replaceState(null, "", nuevoHash || window.location.pathname);
}

/**
 * Lee el hash de la URL y posiciona la vista en la celda correspondiente.
 * @returns {boolean} true si se encontró una celda válida en el hash.
 */
function leerHash() {
  const hash = window.location.hash.replace("#", "").toLowerCase().trim();
  if (!hash) return false;

  for (const [key, nombre] of Object.entries(NOMBRES_CELDAS)) {
    if (nombre === hash) {
      const [y, x] = key.split("_").map(Number);
      posY = y;
      posX = x;
      return true;
    }
  }
  return false;
}

// ============================================
// 9. ACTUALIZACIÓN DE LA VISTA
// ============================================

/**
 * Función central que sincroniza toda la UI:
 * - Activa la celda actual y desactiva las demás
 * - Crea los nav labels de la celda activa
 * - Actualiza minimaps, zone label, hash y estado de las nubes
 */
function actualizarVista() {
  // Desactivar todas las celdas
  document.querySelectorAll(".celda").forEach(c => c.classList.remove("activa"));

  // Activar la celda actual
  const activa = document.querySelector(`.pos_${posY}_${posX}`);
  if (activa) {
    activa.classList.add("activa");
    crearNavLabels(activa);
  }

  // Sincronizar todos los elementos de navegación
  actualizarHeader();
  actualizarZoneLabel();
  actualizarMinimapExpandido();
  actualizarHash();
  sincronizarEstadoNubes();
}

// ============================================
// 10. EVENT LISTENERS
// ============================================

// --- Navegación por teclado ---
document.addEventListener("keydown", e => {
  // Escape cierra el minimap expandido
  if (e.key === "Escape" && overlayEl?.classList.contains("visible")) {
    cerrarMinimapExpandido();
    return;
  }

  // Flechas para navegar entre celdas
  let newY = posY;
  let newX = posX;
  switch (e.key) {
    case "ArrowUp":    newY--; break;
    case "ArrowDown":  newY++; break;
    case "ArrowLeft":  newX--; break;
    case "ArrowRight": newX++; break;
    default: return;
  }

  if (GRID[newY]?.[newX] === 1) {
    posY = newY;
    posX = newX;
    actualizarVista();
  }
});

// --- Resize del viewport ---
// Usa un debounce de 120ms para evitar rebuilds excesivos.

let resizeTimeoutId = null;

/**
 * Maneja el resize del viewport:
 * - Recalcula tamaños de los minimaps
 * - Reconstruye las nubes del portfolio si está activo
 */
function alResizarViewport() {
  actualizarTamanoMinimapInline();
  actualizarTamanoMinimapExpandido();

  // Reconstruir nubes si el portfolio está visible, o marcar para rebuild posterior
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

function programarResize() {
  if (resizeTimeoutId) clearTimeout(resizeTimeoutId);
  resizeTimeoutId = setTimeout(alResizarViewport, 120);
}

window.addEventListener("resize", programarResize);
window.addEventListener("orientationchange", programarResize);

// ============================================
// 11. INICIALIZACIÓN
// ============================================

crearCeldas();
crearZoneLabel();
crearHeader();
crearOverlay();
leerHash(); // posicionar según la URL antes del primer render
renderizarContenido().then(() => actualizarVista());
