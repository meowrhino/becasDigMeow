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
//   Fila 0: [políticas] [metodología] [welcome] [statement]
//   Fila 1:                           [portfolio]
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
  [1, 1, 1, 1], // fila 0: políticas, metodología, welcome, statement
  [0, 0, 1, 0], // fila 1: _, _, portfolio, _
  [0, 0, 1, 0], // fila 2: _, _, contacto, _
];

/** Mapa de coordenadas "fila_columna" → nombre legible de la celda. */
const NOMBRES_CELDAS = {
  "0_0": "políticas",
  "0_1": "metodología",
  "0_2": "welcome",
  "0_3": "statement",
  "1_2": "portfolio",
  "2_2": "contacto",
};

/** Posición actual del usuario en el grid. */
let posY = 0;
let posX = 2; // empieza en "welcome"

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
 * Mapa de nombre con tildes → clase CSS sin tildes.
 * Las clases CSS no llevan tildes para evitar problemas de encoding.
 */
const CLASE_CSS = {
  "políticas":   "politicas",
  "metodología": "metodologia",
  "welcome":     "welcome",
  "statement":   "statement",
  "portfolio":   "portfolio",
  "contacto":    "contacto",
};

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
        const claseCss = CLASE_CSS[nombre] || nombre;
        celda.classList.add(claseCss);
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

// --- 4d. Políticas ---
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
 * @param {number} valor
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(valor, min, max) {
  return Math.max(min, Math.min(max, valor));
}

/**
 * Devuelve el listado de imágenes de un proyecto.
 *
 * Convenciones soportadas:
 * - Sin índice:  imagen = "img/web.png", imagenesSecundarias = 2
 *   → ["img/web.png", "img/web1.png", "img/web2.png"]
 * - Con índice 0: imagen = "img/web0.png", imagenesSecundarias = 2
 *   → ["img/web0.png", "img/web1.png", "img/web2.png"]
 *
 * @param {{ imagen?: string, imagenesSecundarias?: number|string }} proyecto
 * @returns {string[]}
 */
function obtenerImagenesProyecto(proyecto) {
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
 * Devuelve todas las "nubes" a renderizar en modo clouds:
 * una entrada por cada imagen de cada proyecto.
 *
 * @param {{ nombre: string, imagen?: string, imagenesSecundarias?: number|string, url: string }[]} proyectos
 * @returns {{ nombre: string, url: string, imagen: string, projectIndex: number, variantIndex: number }[]}
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

/**
 * @param {HTMLElement} track
 * @param {number} totalProyectos
 * @returns {number}
 */
function obtenerIndiceProyectoTrack(track, totalProyectos) {
  const raw = Number.parseInt(track?.dataset?.projectIndex, 10);
  const max = Math.max(0, totalProyectos - 1);
  if (!Number.isFinite(raw)) return 0;
  return clamp(raw, 0, max);
}

/**
 * Ajusta columnas y ratio del grid del portfolio según:
 * - cantidad de proyectos
 * - ancho/alto útil real del contenedor
 * Solo se aplica en móvil/tablet; en desktop usa el CSS base.
 */
function ajustarLayoutGridPortfolio() {
  const gridContainer = document.getElementById("portfolio-grid");
  const grid = gridContainer?.querySelector(".portfolio-grid");
  if (!grid || !gridContainer) return;

  // Mantener CSS base en desktop.
  if (window.innerWidth > 768) {
    grid.style.removeProperty("--portfolio-columns");
    grid.style.removeProperty("--portfolio-gap");
    return;
  }

  // En mobile, el CSS ya define columnas y gap; solo ajustar si hace falta.
  // Las imágenes determinan su propia altura (height: auto), así que no necesitamos
  // calcular ratios — el contenedor scrollea si no cabe.
}

/**
 * Renderiza la estructura base del portfolio (contenedores + botón switch).
 * @param {Object} data - Datos del JSON.
 */
function renderPortfolio(data) {
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
      <a class="portfolio-item" href="${p.url}" target="_blank" rel="noopener" title="${p.nombre}">
        <div class="portfolio-stack">${capasHTML}</div>
      </a>
    `;
  }).join("");

  // Crear los dos contenedores (nubes y grid)
  el.innerHTML = `
    <div class="portfolio-clouds-container" id="portfolio-clouds"></div>
    <div class="portfolio-grid-container" id="portfolio-grid">
      <div class="portfolio-grid">${gridItemsHTML}</div>
    </div>
  `;

  // Generar animación de nubes
  generarNubesFlotantes(proyectos);
  portfolioCloudsNeedLayout = false;

  // Interacciones en nubes: hover lock (sin drag para no bloquear clicks)
  const cloudsContainer = document.getElementById("portfolio-clouds");
  cloudsContainer.addEventListener("pointerenter", onCloudPointerEnter);
  cloudsContainer.addEventListener("pointermove", onCloudPointerMove);
  cloudsContainer.addEventListener("pointerleave", onCloudPointerLeave);

  // Si ya estaba en modo grid, aplicar ese estado visual
  if (portfolioMode === "grid") {
    document.getElementById("portfolio-grid").classList.add("visible");
    document.getElementById("portfolio-clouds").style.opacity = "0";
  }

  ajustarLayoutGridPortfolio();
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
 * @param {{ nombre: string, imagen: string, imagenesSecundarias?: number|string, url: string }[]} proyectos
 */
function generarNubesFlotantes(proyectos) {
  const container = document.getElementById("portfolio-clouds");
  if (!container) return;
  container.innerHTML = "";
  const nubes = obtenerNubesPortfolio(proyectos);
  if (!nubes.length) return;

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
  const numItems = nubes.length;
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
    track.style.zIndex = Math.floor(Math.random() * 5);

    // Calcular delay para posición inicial
    let delay = 0;
    if (esPrimeraVez) {
      // Distribución uniforme por progreso de animación para evitar "clusters"
      // extraños en el primer render.
      const progresoBase = (xSlot + 0.5) / numItems;
      const jitterProgreso = (Math.random() - 0.5) * (0.35 / numItems);
      const progresoInicial = clamp(progresoBase + jitterProgreso, 0, 1);
      track.style.left = `${-ancho}px`;

      // Delay negativo: la nube arranca en un punto distribuido del recorrido.
      delay = -progresoInicial * duracion;
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

  // --- Crear elementos DOM para cada imagen de cada proyecto ---
  nubes.forEach((nube, i) => {
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
    link.href   = nube.url;
    link.target = "_blank";
    link.rel    = "noopener";
    link.title  = nube.nombre;
    link.style.left = "0px";

    // Animación CSS de deriva vertical + rotación leve
    link.style.animationName           = driftAnim;
    link.style.animationDuration       = `${driftDur}s`;
    link.style.animationDelay          = `${-(Math.random() * driftDur)}s`;
    link.style.animationTimingFunction = "ease-in-out";
    link.style.animationIterationCount = "infinite";
    link.style.animationDirection      = "alternate";

    // Imagen única por nube (sin stack visual en movimiento)
    const img = document.createElement("img");
    img.src = nube.imagen;
    img.alt = nube.nombre;
    img.loading = "eager";
    img.decoding = "async";
    link.appendChild(img);

    // Nombre visible al hover
    const nombre = document.createElement("span");
    nombre.classList.add("pcloud-name");
    nombre.textContent = nube.nombre;
    link.appendChild(nombre);

    track.appendChild(link);
    container.appendChild(track);

    // Guardar metadata para poder reiniciar la nube tras un drag
    track.dataset.banda = String(banda);
    track.dataset.projectIndex = String(nube.projectIndex);
    track.dataset.variantIndex = String(nube.variantIndex);
    track._configurarNube = configurarNube;
    track._cloudVariantSrc = nube.imagen;

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

  if (!debeCorrer) {
    detenerMonitorHoverNubes();
    limpiarHoverNubeActiva();
  } else if (hoverPointerInside) {
    iniciarMonitorHoverNubes();
  }

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

// ============================================
// 5b. PORTFOLIO: DRAG-TO-PUSH
// ============================================
//
// El usuario puede arrastrar una nube y "empujarla".
// Al soltar, la nube se desliza con la velocidad del gesto
// y luego se reincorpora al flujo horizontal normal.

/** Track actualmente en hover lock, o null. */
let hoverLockedCloud = null;

/** Última posición conocida del puntero para resolver hover de forma estable. */
let hoverPointerX = 0;
let hoverPointerY = 0;
let hoverPointerInside = false;
let hoverMonitorRAF = null;

/** @returns {boolean} true si el dispositivo soporta hover fino (mouse/trackpad). */
function puedeUsarHoverNubes() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/**
 * @param {HTMLElement} track
 * @returns {number}
 */
function obtenerZIndexTrack(track) {
  const inlineZ = Number.parseInt(track?.style?.zIndex, 10);
  if (Number.isFinite(inlineZ)) return inlineZ;
  const computedZ = Number.parseInt(getComputedStyle(track).zIndex, 10);
  if (Number.isFinite(computedZ)) return computedZ;
  return 0;
}

/**
 * Devuelve el track preferido bajo el puntero:
 * el de z-index más alto entre los tracks que contienen ese punto.
 *
 * @param {number} clientX
 * @param {number} clientY
 * @param {HTMLElement} container
 * @returns {HTMLElement|null}
 */
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

/**
 * Activa el hover lock de una nube.
 * @param {HTMLElement} track
 */
function activarHoverNube(track) {
  const container = document.getElementById("portfolio-clouds");
  if (!container || !track || !track.isConnected) return;

  limpiarHoverNubeActiva();
  hoverLockedCloud = track;
  track.classList.add("is-hover-active");
  container.classList.add("has-hover-lock");
}

/** Limpia el hover lock actual. */
function limpiarHoverNubeActiva() {
  const container = document.getElementById("portfolio-clouds");
  if (container) container.classList.remove("has-hover-lock");

  if (hoverLockedCloud?.isConnected) {
    hoverLockedCloud.classList.remove("is-hover-active");
  }

  if (container) {
    container
      .querySelectorAll(".portfolio-cloud-track.is-hover-active")
      .forEach(track => track.classList.remove("is-hover-active"));
  }

  hoverLockedCloud = null;
}

/**
 * @param {HTMLElement} track
 * @param {number} clientX
 * @param {number} clientY
 * @returns {boolean}
 */
function puntoDentroTrack(track, clientX, clientY) {
  if (!track?.isConnected) return false;
  const r = track.getBoundingClientRect();
  return (
    r.width > 0 &&
    r.height > 0 &&
    clientX >= r.left &&
    clientX <= r.right &&
    clientY >= r.top &&
    clientY <= r.bottom
  );
}

/**
 * Actualiza el hover lock según la posición del puntero.
 * - Solo una nube puede estar activa.
 * - Si el puntero sigue dentro de la activa, no cambia.
 * - Si sale, se elige otra (priorizando z-index más alto).
 *
 * @param {number} clientX
 * @param {number} clientY
 */
function actualizarHoverNubesEnPunto(clientX, clientY) {
  if (!puedeUsarHoverNubes()) return;
  if (portfolioMode !== "clouds" || portfolioAnimating || draggedCloud) return;

  const container = document.getElementById("portfolio-clouds");
  if (!container) return;

  if (hoverLockedCloud && puntoDentroTrack(hoverLockedCloud, clientX, clientY)) {
    return;
  }

  limpiarHoverNubeActiva();
  const preferida = obtenerTrackHoverPreferido(clientX, clientY, container);
  if (!preferida) return;
  activarHoverNube(preferida);
}

/** Limpia hover lock al salir del contenedor de nubes. */
function onCloudPointerLeave() {
  hoverPointerInside = false;
  detenerMonitorHoverNubes();
  limpiarHoverNubeActiva();
}

/**
 * @returns {boolean}
 */
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

/** Inicia el monitor de hover continuo (RAF) si aplica. */
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

/** Detiene el monitor de hover continuo. */
function detenerMonitorHoverNubes() {
  if (hoverMonitorRAF === null) return;
  cancelAnimationFrame(hoverMonitorRAF);
  hoverMonitorRAF = null;
}

/**
 * Registra entrada del puntero en el contenedor de nubes.
 * @param {PointerEvent} e
 */
function onCloudPointerEnter(e) {
  hoverPointerInside = true;
  hoverPointerX = e.clientX;
  hoverPointerY = e.clientY;
  actualizarHoverNubesEnPunto(hoverPointerX, hoverPointerY);
  iniciarMonitorHoverNubes();
}

/** Track actualmente siendo arrastrado, o null. */
let draggedCloud = null;

/** true si hubo movimiento durante el drag (para distinguir click de drag). */
let dragDidMove = false;

/** Estado interno del drag actual. */
const dragState = {
  startX: 0, startY: 0,
  lastX: 0, lastY: 0, lastTime: 0,
  velocityX: 0, velocityY: 0,
  originX: 0, originY: 0,
  throwRAF: null,
};

/**
 * Obtiene la posición visual actual de un track,
 * combinando style.left + translateX del WAAPI.
 * @param {HTMLElement} track
 * @returns {{ x: number, y: number }}
 */
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

/**
 * Obtiene los anchos mínimo/máximo de nubes según viewport.
 * @returns {{ anchoMin: number, anchoMax: number }}
 */
function obtenerRangoAnchoNubes() {
  const esMobile = window.innerWidth <= 600;
  return {
    anchoMin: esMobile ? 80 : 120,
    anchoMax: esMobile ? 150 : 220,
  };
}

/**
 * Calcula la velocidad horizontal de una nube en px/s en función de su ancho.
 * Nubes más pequeñas se mueven más rápido.
 * @param {number} ancho
 * @returns {number}
 */
function calcularVelocidadNube(ancho) {
  const { anchoMin, anchoMax } = obtenerRangoAnchoNubes();
  const rango = Math.max(1, anchoMax - anchoMin);
  const factorVelocidad = 1 - (ancho - anchoMin) / rango;
  const factor = Math.max(0, Math.min(1, factorVelocidad));
  return 20 + factor * 30 + Math.random() * 15;
}

/**
 * Reanuda una nube desde su X actual hacia la derecha y,
 * al terminar, la devuelve al flujo normal de re-entrada.
 * @param {HTMLElement} track
 */
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

  // Si ya está prácticamente fuera, reiniciar ciclo normal directamente.
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

/**
 * Reinicia la animación normal de una nube tras ser arrastrada/lanzada.
 * @param {HTMLElement} track
 */
function reiniciarNubeTrasDrag(track) {
  if (!track.isConnected) return;
  track.style.transform = "";
  track.style.transformOrigin = "";

  // Reactivar CSS drift
  const item = track.querySelector(".portfolio-cloud-item");
  if (item) item.style.animationPlayState = "running";

  const banda = parseInt(track.dataset.banda, 10) || 0;
  if (typeof track._configurarNube === "function") {
    track._configurarNube(track, banda, false, null);
  }
}

/** true si la nube ha sido congelada (animaciones canceladas) durante el drag. */
let dragFrozen = false;

function onCloudPointerDown(e) {
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

  // Cancelar throw en curso
  if (dragState.throwRAF) {
    cancelAnimationFrame(dragState.throwRAF);
    dragState.throwRAF = null;
  }

  // Guardar posición inicial del pointer (sin congelar la nube aún)
  dragState.startX  = e.clientX;
  dragState.startY  = e.clientY;
  dragState.lastX   = e.clientX;
  dragState.lastY   = e.clientY;
  dragState.lastTime = performance.now();
  dragState.velocityX = 0;
  dragState.velocityY = 0;
}

/**
 * Congela la nube en su posición visual actual (solo se llama al iniciar drag real).
 * @param {HTMLElement} track
 */
function congelarNubeParaDrag(track) {
  const pos = getPosicionVisualNube(track);
  track.getAnimations().forEach(a => a.cancel());
  track.style.left      = `${pos.x}px`;
  track.style.transform = "none";

  // Pausar CSS drift
  const item = track.querySelector(".portfolio-cloud-item");
  if (item) item.style.animationPlayState = "paused";

  dragState.originX = pos.x;
  dragState.originY = pos.y;
  dragFrozen = true;
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
  const dy  = e.clientY - dragState.lastY;

  // Marcar como drag real si el movimiento supera 5px
  if (!dragDidMove) {
    const totalDx = e.clientX - dragState.startX;
    const totalDy = e.clientY - dragState.startY;
    if (Math.abs(totalDx) + Math.abs(totalDy) > 5) dragDidMove = true;
  }

  // Si es un drag real pero aún no hemos congelado la nube, congelarla ahora
  if (dragDidMove && !dragFrozen) {
    congelarNubeParaDrag(draggedCloud);
  }

  // Si la nube no está congelada, no moverla todavía
  if (!dragFrozen) {
    dragState.lastX    = e.clientX;
    dragState.lastY    = e.clientY;
    dragState.lastTime = now;
    return;
  }

  // Velocidad suavizada (exponential moving average)
  const a = 0.3;
  dragState.velocityX = a * (dx / dt * 1000) + (1 - a) * dragState.velocityX;
  dragState.velocityY = a * (dy / dt * 1000) + (1 - a) * dragState.velocityY;
  dragState.lastX    = e.clientX;
  dragState.lastY    = e.clientY;
  dragState.lastTime = now;

  // Mover la nube
  const totalDx = e.clientX - dragState.startX;
  const totalDy = e.clientY - dragState.startY;
  draggedCloud.style.left = `${dragState.originX + totalDx}px`;
  draggedCloud.style.top  = `${dragState.originY + totalDy}px`;
}

function onCloudPointerUp(e) {
  if (!draggedCloud) return;
  const track = draggedCloud;
  draggedCloud = null;

  hoverPointerInside = true;
  hoverPointerX = e.clientX;
  hoverPointerY = e.clientY;

  // Si no hubo drag real, no tocar la nube (dejar que siga su animación normal)
  if (!dragFrozen) {
    actualizarHoverNubesEnPunto(e.clientX, e.clientY);
    iniciarMonitorHoverNubes();
    return;
  }

  // Capar velocidad
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

// ============================================
// 5c. PORTFOLIO: TRANSICIÓN ANIMADA CLOUDS ↔ GRID
// ============================================
//
// En vez de un fade, cada nube vuela a su posición en el grid (y viceversa).
// Se usa WAAPI con transform: translate + scale (GPU-composited).

/**
 * Mide las posiciones de los items del grid forzando un layout temporal.
 * @returns {DOMRect[]} Bounding rects de cada .portfolio-item.
 */
function medirPosicionesGrid() {
  const gridContainer = document.getElementById("portfolio-grid");
  const wasVisible = gridContainer.classList.contains("visible");

  ajustarLayoutGridPortfolio();

  // Forzar layout sin flash visual
  gridContainer.style.visibility    = "hidden";
  gridContainer.style.opacity       = "0";
  gridContainer.style.pointerEvents = "none";
  gridContainer.classList.add("visible");
  gridContainer.offsetHeight; // forzar reflow

  const items = gridContainer.querySelectorAll(".portfolio-item");
  const rects = Array.from(items).map(item => item.getBoundingClientRect());

  // Restaurar
  gridContainer.classList.toggle("visible", wasVisible);
  gridContainer.style.visibility    = "";
  gridContainer.style.opacity       = "";
  gridContainer.style.pointerEvents = "";

  return rects;
}

/**
 * Alterna entre modo "clouds" y modo "grid" con transición animada.
 */
function alternarModoPortfolio() {
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

/**
 * Anima cada nube desde su posición flotante hasta su posición en el grid.
 */
function animarNubesAGrid(cloudsEl, gridEl, btn) {
  portfolioMode = "grid";

  const tracks = Array.from(cloudsEl.querySelectorAll(".portfolio-cloud-track"));
  const proyectos = obtenerDatos()?.portfolio?.proyectos || [];

  // Forzar imagen principal al ordenar (siempre la primera del proyecto)
  tracks.forEach(track => {
    const projectIndex = obtenerIndiceProyectoTrack(track, proyectos.length);
    const proyecto = proyectos[projectIndex];
    if (!proyecto) return;

    const imagenPrincipal = obtenerImagenesProyecto(proyecto)[0] || proyecto.imagen || "";
    if (!imagenPrincipal) return;

    const img = track.querySelector(".portfolio-cloud-item img");
    if (img) img.src = imagenPrincipal;
  });

  // 1. Pausar CSS drift, compensar su offset y congelar posiciones (todo síncrono)
  const cloudPositions = tracks.map(track => {
    const item = track.querySelector(".portfolio-cloud-item");
    if (item) item.style.animationPlayState = "paused";

    const pos = getPosicionVisualNube(track);
    const w = parseFloat(track.style.width) || track.offsetWidth;
    const h = parseFloat(track.style.height) || track.offsetHeight;

    // Obtener offset vertical del drift CSS pausado (translateY de la animación)
    let driftTy = 0;
    if (item) {
      const ct = getComputedStyle(item).transform;
      if (ct && ct !== "none") {
        const m = ct.match(/matrix\(([^)]+)\)/);
        if (m) driftTy = parseFloat(m[1].split(",")[5]) || 0;
      }
      // Eliminar drift para que no interfiera con la transición
      item.style.animationName = "none";
    }

    // Cancelar WAAPI y fijar posición visual compensando el drift
    track.getAnimations().forEach(a => a.cancel());
    track.style.left            = `${pos.x}px`;
    track.style.top             = `${pos.y + driftTy}px`;
    track.style.transformOrigin = "center center";

    return { x: pos.x, y: pos.y + driftTy, w, h };
  });

  // 2. Medir posiciones target del grid
  const gridRects     = medirPosicionesGrid();
  const portfolioRect = document.querySelector(".celda.portfolio").getBoundingClientRect();

  // 3. Marcar como en transición
  cloudsEl.classList.add("transitioning");

  // 4. Animar cada nube a su posición en el grid
  //    Arrancamos con transform en la identidad (posición ya fijada por left/top)
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
    const sx = to.width / from.w;
    const sy = to.height / from.h;
    // Centro-a-centro para escalar desde el centro de cada nube
    const dx = (targetX + to.width / 2) - (from.x + from.w / 2);
    const dy = (targetY + to.height / 2) - (from.y + from.h / 2);

    const anim = track.animate([
      { transform: "translate(0px, 0px) scale(1, 1)" },
      { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
    ], {
      duration,
      delay: i * staggerDelay,
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
      fill: "forwards",
    });

    animations.push(anim);
  });

  // 5. Al completar, mostrar grid real y ocultar nubes
  Promise.all(animations.map(a => a.finished)).then(() => {
    cloudsEl.classList.remove("transitioning");

    // Swap instantáneo para evitar blink entre fin de vuelo y fade del grid.
    const prevTransition = gridEl.style.transition;
    gridEl.style.transition = "none";
    gridEl.classList.add("visible");
    gridEl.offsetHeight;
    gridEl.style.transition = prevTransition;

    cloudsEl.style.opacity       = "0";
    cloudsEl.style.pointerEvents = "none";
    if (btn) btn.textContent = "dispersar";
    sincronizarEstadoNubes();
    portfolioAnimating = false;
  });
}

/**
 * Anima cada nube desde su posición en el grid a una posición flotante aleatoria,
 * y luego reinicia el flujo horizontal normal.
 */
function animarGridANubes(cloudsEl, gridEl, btn) {
  portfolioMode = "clouds";

  const tracks = Array.from(cloudsEl.querySelectorAll(".portfolio-cloud-track"));

  // Recuperar la imagen variante de cada nube al volver a dispersar.
  tracks.forEach(track => {
    const variante = track._cloudVariantSrc;
    if (!variante) return;
    const img = track.querySelector(".portfolio-cloud-item img");
    if (img) img.src = variante;
  });

  // 1. Medir posiciones del grid (aún visible)
  const gridRects     = medirPosicionesGrid();
  const portfolioRect = document.querySelector(".celda.portfolio").getBoundingClientRect();
  const totalProyectos = gridRects.length;

  // 2. Generar posiciones random de destino
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

  // 3. ANTES de hacer visibles las nubes: cancelar animaciones previas y
  //    posicionar cada track exactamente donde estaba su grid item.
  //    Así cuando se hagan visibles ya están en la posición correcta.
  tracks.forEach((track) => {
    track.getAnimations().forEach(a => a.cancel());
    track.style.transform       = "";
    track.style.transformOrigin = "center center";

    // Limpiar drift CSS del child para alinear exactamente con el grid
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

  // 4. Ahora sí: hacer nubes visibles y ocultar grid (sin flash, ya están posicionadas)
  const prevTransition = gridEl.style.transition;
  gridEl.style.transition = "none";
  gridEl.classList.remove("visible");
  gridEl.offsetHeight;
  gridEl.style.transition = prevTransition;
  cloudsEl.style.opacity       = "1";
  cloudsEl.style.pointerEvents = "auto";
  cloudsEl.classList.add("transitioning");

  // 5. Animar cada nube de posición-grid a posición-random
  const duration     = 700;
  const maxStagger   = 350;
  const staggerDelay = Math.min(40, maxStagger / Math.max(1, tracks.length));
  const animations   = [];

  tracks.forEach((track, i) => {
    const projectIndex = obtenerIndiceProyectoTrack(track, totalProyectos);
    const fromRect = gridRects[projectIndex];
    if (!fromRect) return;

    const fromX = fromRect.left - portfolioRect.left;
    const fromY = fromRect.top - portfolioRect.top;
    const fromW = fromRect.width;
    const fromH = fromRect.height;
    const to    = targets[i];

    const sx = to.w / fromW;
    const sy = to.h / fromH;
    // Centro-a-centro para escalar desde el centro
    const dx = (to.x + to.w / 2) - (fromX + fromW / 2);
    const dy = (to.y + to.h / 2) - (fromY + fromH / 2);

    const anim = track.animate([
      { transform: "translate(0, 0) scale(1, 1)" },
      { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
    ], {
      duration,
      delay: i * staggerDelay,
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
      fill: "forwards",
    });

    animations.push(anim);
  });

  if (btn) btn.textContent = "ordenar";

  // 6. Al completar, reenganchar cada nube al flujo horizontal sin rebuild.
  Promise.all(animations.map(a => a.finished)).then(() => {
    cloudsEl.classList.remove("transitioning");

    // Fijar estado final visual y reanudar animación horizontal desde ahí.
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

      // Re-establecer drift CSS con parámetros frescos
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
  renderPoliticas(data);
  renderPortfolio(data);
  renderContacto(data);
}

/**
 * Renderiza la página de contacto.
 * @param {Object} data - Datos del JSON.
 */
function renderContacto(data) {
  const el = document.querySelector(".celda.contacto");
  if (!el || !data?.contacto) return;

  const { email, instagram } = data.contacto;
  el.innerHTML = `
    <div class="contacto-content">
      <a class="contacto-email" href="mailto:${email}">${email}</a>
      <a class="contacto-instagram" href="${instagram.url}" target="_blank" rel="noopener">${instagram.usuario}</a>
    </div>
  `;
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
  // Limpiar labels y grupos anteriores
  celda.querySelectorAll(".nav-label").forEach(l => l.remove());
  celda.querySelectorAll(".nav-label-group").forEach(l => l.remove());

  const isPortfolio = celda.classList.contains("portfolio");
  const vecinos = getVecinos();

  Object.entries(vecinos).forEach(([pos, info]) => {
    // En portfolio, el bottom se gestiona aparte (grupo con switch + nav)
    if (isPortfolio && pos === "bottom") return;

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

  // En portfolio: crear grupo bottom con botón switch + nav label contacto
  if (isPortfolio) {
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
        posY = vecinos.bottom.y;
        posX = vecinos.bottom.x;
        actualizarVista();
      });
      group.appendChild(navBtn);
    }

    celda.appendChild(group);
  }
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
  ajustarLayoutGridPortfolio();

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

let resumeCloudsTimeoutId = null;
let lastHiddenAt = 0;

/**
 * Reanuda nubes tras volver de background sin recolocarlas aleatoriamente.
 * Si una nube perdió su animación WAAPI, continúa desde su posición actual.
 */
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

/**
 * Rehidrata el estado de nubes tras volver desde background/BFCache.
 * Esto evita estados colapsados si el navegador suspende WAAPI.
 */
function rehidratarPortfolioTrasRetorno(forzarRebuild = false) {
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

/** Sincroniza/reconstruye nubes cuando la pestaña cambia de visibilidad. */
function onVisibilityChange() {
  if (document.hidden) {
    lastHiddenAt = Date.now();
    hoverPointerInside = false;
    detenerMonitorHoverNubes();
    limpiarHoverNubeActiva();
    sincronizarEstadoNubes();
    return;
  }

  const hiddenMs = lastHiddenAt > 0 ? Date.now() - lastHiddenAt : 0;
  const forzarRebuild = hiddenMs > 90_000;
  rehidratarPortfolioTrasRetorno(forzarRebuild);
}

window.addEventListener("resize", programarResize);
window.addEventListener("orientationchange", programarResize);
document.addEventListener("visibilitychange", onVisibilityChange);

// ============================================
// 11. INICIALIZACIÓN
// ============================================

crearCeldas();
crearZoneLabel();
crearHeader();
crearOverlay();
leerHash(); // posicionar según la URL antes del primer render
renderizarContenido().then(() => actualizarVista());
