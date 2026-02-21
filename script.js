// ============================================
// meowrhino studio — fusión
// Grid navegable + portfolio-screenshots flotando
// ============================================

const app = document.getElementById("content");

// ============================================
// GRID CONFIGURATION
// Row 0: [pricing] [politicas] [metodologia] [welcome] [statement]
// Row 1:                                     [portfolio]
// ============================================

const grid = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 1, 0],
];

const nombresEspeciales = {
  "0_0": "pricing",
  "0_1": "politicas",
  "0_2": "metodologia",
  "0_3": "welcome",
  "0_4": "statement",
  "1_3": "portfolio",
};

let posY = 0;
let posX = 3;
let dataCache = null;
let portfolioMode = "clouds";
let portfolioAnimating = false;
let portfolioCloudsNeedLayout = false;
let portfolioCloudsWereRunning = false;
let portfolioCloudsRebuilding = false;

// ============================================
// DATA LOADING
// ============================================

async function loadData() {
  if (dataCache) return dataCache;
  try {
    const res = await fetch("data.json");
    dataCache = await res.json();
    return dataCache;
  } catch (err) {
    console.error("Error loading data.json:", err);
    return null;
  }
}

function getData() {
  if (!dataCache) return null;
  if (dataCache.welcome && dataCache.portfolio) return dataCache;
  if (dataCache.es && dataCache.es.welcome && dataCache.es.portfolio) return dataCache.es;

  for (const key of ["cat", "en"]) {
    if (dataCache[key]?.welcome && dataCache[key]?.portfolio) return dataCache[key];
  }

  return null;
}

// ============================================
// CREATE PAGES
// ============================================

function crearPantallas() {
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x] === 1) {
        const celda = document.createElement("div");
        celda.classList.add("celda", `pos_${y}_${x}`);
        celda.dataset.y = y;
        celda.dataset.x = x;
        const nombre = nombresEspeciales[`${y}_${x}`];
        if (nombre) {
          celda.classList.add(nombre);
          celda.dataset.nombre = nombre;
        }
        app.appendChild(celda);
      }
    }
  }
}

// ============================================
// RENDER: WELCOME
// Links directos + desplegables
// ============================================

function renderWelcome(data) {
  const el = document.querySelector(".celda.welcome");
  if (!el || !data) return;

  const staticLinks = [
    { name: "imgToWeb",            url: "https://meowrhino.github.io/imgToWeb/" },
    { name: "videoToWeb",          url: "https://meowrhino.github.io/videoToWeb/" },
    { name: "colorfun",            url: "https://meowrhino.github.io/colorFun/" },
    { name: "trackr",              url: "https://meowrhino.github.io/trackr/" },
    { name: "calculadora impuestos", url: "https://meowrhino.github.io/calculadoraInversa/" },
    { name: "generador facturas",    url: "https://meowrhino.github.io/generadorFacturas/" },
  ];

  const dropdowns = [
    {
      name: "formateadores",
      items: [
        { name: "paula",   url: "https://meowrhino.github.io/paulabarjau/formateador.html" },
        { name: "miranda", url: "https://meowrhino.github.io/mirandaperezhita/formateador.html" },
        { name: "andrea",  url: "https://meowrhino.github.io/andreacarilla/formateador.html" },
        { name: "jaume",   url: "https://meowrhino.github.io/jaumeclotet/formateador.html" },
      ]
    },
    {
      name: "webs terminadas",
      items: (data.portfolio?.proyectos || []).map(p => ({
        name: p.nombre,
        url: p.url,
      })),
    },
  ];

  const staticLinksHTML = staticLinks.map(item =>
    `<a class="tool-link" href="${item.url}" target="_blank" rel="noopener">${item.name}</a>`
  ).join("");

  const dropdownsHTML = dropdowns.map((dd, i) => {
    const uid = `dd_${i}`;
    const ddItems = dd.items.map(item => {
      return `<a class="tool-link" href="${item.url}" target="_blank" rel="noopener">${item.name}</a>`;
    }).join("");
    return `
      <div class="tools-dropdown-group">
        <button class="tools-dropdown-btn" data-target="${uid}">
          ${dd.name}
          <svg class="tools-dropdown-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="4,6 8,10 12,6"/></svg>
        </button>
        <div class="tools-dropdown-content" id="${uid}">
          <div class="tools-dropdown-inner">${ddItems}</div>
        </div>
      </div>
    `;
  }).join("");

  el.innerHTML = `
    <div class="welcome-content">
      <h1 class="welcome-title">${data.welcome.titulo}</h1>
      <div class="welcome-tools">${staticLinksHTML}${dropdownsHTML}</div>
    </div>
  `;

  el.querySelectorAll(".tools-dropdown-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.target);
      if (!target) return;
      const willOpen = !target.classList.contains("open");

      el.querySelectorAll(".tools-dropdown-content.open").forEach(opened => {
        opened.classList.remove("open");
      });
      el.querySelectorAll(".tools-dropdown-btn.active").forEach(activeBtn => {
        activeBtn.classList.remove("active");
      });

      target.classList.toggle("open", willOpen);
      btn.classList.toggle("active", willOpen);
    });
  });
}

// ============================================
// RENDER: STATEMENT
// ============================================

function renderStatement(data) {
  const el = document.querySelector(".celda.statement");
  if (!el || !data?.statement) return;
  const lineas = data.statement.lineas.map(l => `<p>${l}</p>`).join("");
  el.innerHTML = `<div class="statement-content">${lineas}</div>`;
}

// ============================================
// RENDER: METODOLOGIA
// ============================================

function renderMetodologia(data) {
  const el = document.querySelector(".celda.metodologia");
  if (!el || !data?.metodologia) return;

  const placements = [
    "grid-row:1; grid-column:1 / span 2;",
    "grid-row:2; grid-column:2 / span 4;",
    "grid-row:1; grid-column:5 / span 2;",
    "grid-row:2; grid-column:6 / span 4;",
    "grid-row:1; grid-column:9 / span 2;",
  ];

  const pasosHTML = data.metodologia.pasos.map((paso, i) => `
    <div class="metodo-paso" style="${placements[i]}">
      <span class="metodo-semana">${paso.semana}</span>
      <div class="metodo-texto">
        <h3>${paso.titulo}</h3>
        <p>${paso.descripcion.replace(/\n/g, "<br>")}</p>
      </div>
    </div>
  `).join("");

  const timelineHTML = data.metodologia.pasos.map(p => `<span>${p.semana}</span>`).join("");

  el.innerHTML = `
    <div class="metodologia-content">
      <div class="metodo-zigzag">
        ${pasosHTML}
        <div class="metodo-timeline-bar">${timelineHTML}</div>
      </div>
    </div>
  `;
}

// ============================================
// RENDER: PRICING
// ============================================

function renderPricing(data) {
  const el = document.querySelector(".celda.pricing");
  if (!el || !data?.pricing) return;
  const d = data.pricing;
  const incluyeHTML = d.incluye.map(i => `<li class="incluye-item">${i}</li>`).join("");
  el.innerHTML = `
    <div class="pricing-content">
      <p class="precio-rango">${d.rango}</p>
      <p class="precio-nota">${d.nota.replace(/\n/g, "<br>")}</p>
      <ul class="incluye-lista">${incluyeHTML}</ul>
    </div>
  `;
}

// ============================================
// RENDER: POLITICAS
// ============================================

function renderPoliticas(data) {
  const el = document.querySelector(".celda.politicas");
  if (!el || !data?.politicas) return;
  const html = data.politicas.parrafos.map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
  el.innerHTML = `<div class="politicas-content">${html}</div>`;
}

// ============================================
// RENDER: PORTFOLIO
// Screenshots flotando + switch a grid
// ============================================

function renderPortfolio(data) {
  const el = document.querySelector(".celda.portfolio");
  if (!el || !data?.portfolio) return;

  const proyectos = data.portfolio.proyectos;

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

  generarScreenshotsFlotando(proyectos);
  portfolioCloudsNeedLayout = false;
  document.getElementById("portfolio-switch-btn").addEventListener("click", togglePortfolioMode);

  if (portfolioMode === "grid") {
    document.getElementById("portfolio-grid").classList.add("visible");
    document.getElementById("portfolio-clouds").style.opacity = "0";
    document.getElementById("portfolio-switch-btn").textContent = "dispersar";
  }

  syncPortfolioCloudsState();
}

// ============================================
// PORTFOLIO: screenshots flotando
// ============================================

// 6 velocidades distintas de viento — las nubes rápidas son más pequeñas
// Las animaciones css sólo hacen la deriva vertical leve + rotación mínima.
// El movimiento horizontal lo hacemos con una animación de translateX que va
// de -imageWidth a 100vw+imageWidth, lineal, infinita.

function generarScreenshotsFlotando(proyectos) {
  const container = document.getElementById("portfolio-clouds");
  if (!container) return;
  container.innerHTML = "";

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isMobile = vw <= 600;

  const items = proyectos;

  // Vertical area: leave 15dvh at top and 10dvh at bottom
  const topMargin = vh * 0.15;
  const bottomMargin = vh * 0.10;
  const usableH = Math.max(0, vh - topMargin - bottomMargin);
  const numBandas  = isMobile ? 4 : 5;
  const bandaH     = usableH / numBandas;

  const driftAnims = ["pcloud1","pcloud2","pcloud3","pcloud4","pcloud5","pcloud6"];
  const minW = isMobile ? 80 : 120;
  const maxW = isMobile ? 150 : 220;

  // Anti-collision for firstRun: distribute X slots evenly across the screen
  // so no two clouds land on the same spot at page load.
  const numItems   = items.length;
  // Shuffle slot indices so the order isn't always the same
  const xSlots     = Array.from({ length: numItems }, (_, i) => i);
  for (let i = xSlots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [xSlots[i], xSlots[j]] = [xSlots[j], xSlots[i]];
  }

  function randomizarNube(el, banda, firstRun, xSlot) {
    if (!el.isConnected) return;

    const w = Math.round(minW + Math.random() * (maxW - minW));
    const h = Math.round(w * 0.68);

    // Y: centered in band + small random jitter (max ±30% of bandaH)
    const yBase = topMargin + banda * bandaH + bandaH * 0.5;
    const yOff  = (Math.random() - 0.5) * bandaH * 0.6;
    const minY = Math.round(topMargin);
    const maxY = Math.round(Math.max(minY, vh - bottomMargin - h));
    const yUnclamped = Math.round(yBase + yOff);
    const y = Math.max(minY, Math.min(maxY, yUnclamped));

    const speedFactor = 1 - (w - minW) / (maxW - minW);
    const pxPerSec    = 20 + speedFactor * 30 + Math.random() * 15;
    const recorrido   = vw + 2 * w;
    const duration    = recorrido / pxPerSec;

    // Cancel any previous WAAPI animation so fill:"forwards" doesn't lock the element
    el.getAnimations().forEach(a => a.cancel());

    if (firstRun) {
      // Spread clouds evenly across the screen width using xSlot,
      // then add a small random offset within the slot so they don't look grid-like.
      const slotW   = vw / numItems;
      const slotX   = xSlot * slotW + Math.random() * slotW * 0.6;
      const clampedX = Math.max(0, Math.min(vw - w, Math.round(slotX)));
      el.style.left = "0px";
      // Use a negative delay so the cloud appears at clampedX on screen.
      // translateX at time 0 = 0, at time duration = recorrido.
      // We want translateX = clampedX at currentTime 0, so delay = -(clampedX / recorrido) * duration
      const delayFrac = clampedX / recorrido;
      const delay = -(delayFrac * duration);
      el.style.top    = `${y}px`;
      el.style.width  = `${w}px`;
      el.style.height = `${h}px`;
      el.style.zIndex = 1 + Math.floor(Math.random() * 4);

      const anim = el.animate(
        [
          { transform: "translateX(0px)" },
          { transform: `translateX(${recorrido}px)` }
        ],
        { duration: duration * 1000, delay: delay * 1000, iterations: 1, easing: "linear", fill: "forwards" }
      );
      anim.onfinish = () => {
        if (!el.isConnected) return;
        randomizarNube(el, banda, false, null);
      };
    } else {
      // Re-entry: start from just off the left edge
      el.style.left   = `${-w}px`;
      el.style.top    = `${y}px`;
      el.style.width  = `${w}px`;
      el.style.height = `${h}px`;
      el.style.zIndex = 1 + Math.floor(Math.random() * 4);

      const anim = el.animate(
        [
          { transform: "translateX(0px)" },
          { transform: `translateX(${recorrido}px)` }
        ],
        { duration: duration * 1000, delay: 0, iterations: 1, easing: "linear", fill: "forwards" }
      );
      anim.onfinish = () => {
        if (!el.isConnected) return;
        randomizarNube(el, banda, false, null);
      };
    }
  }

  items.forEach((p, i) => {
    const banda     = i % numBandas;
    const driftAnim = driftAnims[i % driftAnims.length];
    const driftDur  = 8 + Math.random() * 10;

    const track = document.createElement("div");
    track.classList.add("portfolio-cloud-track");
    track.style.left = "0px";

    const a = document.createElement("a");
    a.classList.add("portfolio-cloud-item");
    a.href   = p.url;
    a.target = "_blank";
    a.rel    = "noopener";
    a.title  = p.nombre;
    a.style.left = "0px";

    // Deriva vertical + rotación leve (CSS keyframes)
    a.style.animationName           = driftAnim;
    a.style.animationDuration       = `${driftDur}s`;
    a.style.animationDelay          = `${-(Math.random() * driftDur)}s`;
    a.style.animationTimingFunction = "ease-in-out";
    a.style.animationIterationCount = "infinite";
    a.style.animationDirection      = "alternate";

    const img = document.createElement("img");
    img.src     = p.imagen;
    img.alt     = p.nombre;
    img.loading = "eager";
    img.decoding = "async";
    a.appendChild(img);

    const name = document.createElement("span");
    name.classList.add("pcloud-name");
    name.textContent = p.nombre;
    a.appendChild(name);

    track.appendChild(a);
    container.appendChild(track);
    randomizarNube(track, banda, true, xSlots[i]);
  });

  syncPortfolioCloudsState();
}

function isPortfolioCellActive() {
  const portfolioCell = document.querySelector(".celda.portfolio");
  return !!portfolioCell?.classList.contains("activa");
}

function shouldRunPortfolioClouds() {
  return isPortfolioCellActive() && portfolioMode === "clouds";
}

function ensurePortfolioCloudsLayoutIfNeeded() {
  if (!portfolioCloudsNeedLayout || !shouldRunPortfolioClouds()) return;
  const proyectos = getData()?.portfolio?.proyectos;
  if (!proyectos || !document.getElementById("portfolio-clouds")) return;
  portfolioCloudsNeedLayout = false;
  generarScreenshotsFlotando(proyectos);
}

function syncPortfolioCloudsState() {
  const cloudsEl = document.getElementById("portfolio-clouds");
  if (!cloudsEl) return;

  const shouldRun = shouldRunPortfolioClouds();
  const isResuming = shouldRun && !portfolioCloudsWereRunning;

  if (portfolioCloudsNeedLayout && shouldRun && !portfolioCloudsRebuilding) {
    portfolioCloudsRebuilding = true;
    ensurePortfolioCloudsLayoutIfNeeded();
    portfolioCloudsRebuilding = false;
    portfolioCloudsWereRunning = shouldRunPortfolioClouds();
    return;
  }

  cloudsEl.querySelectorAll(".portfolio-cloud-item").forEach(item => {
    item.style.animationPlayState = shouldRun ? "running" : "paused";
  });
  cloudsEl.querySelectorAll(".portfolio-cloud-track").forEach(track => {
    track.getAnimations().forEach(anim => {
      if (shouldRun) {
        if (isResuming && anim.playState === "paused") {
          const timing = anim.effect?.getTiming?.();
          const duration = Number(timing?.duration);
          if (Number.isFinite(duration) && duration > 0) {
            anim.currentTime = Math.random() * duration;
          }
        }
        anim.play();
      } else {
        anim.pause();
      }
    });
  });

  portfolioCloudsWereRunning = shouldRun;
}

function togglePortfolioMode() {
  if (portfolioAnimating) return;
  portfolioAnimating = true;

  const cloudsEl = document.getElementById("portfolio-clouds");
  const gridEl = document.getElementById("portfolio-grid");
  const btn = document.getElementById("portfolio-switch-btn");

  if (portfolioMode === "clouds") {
    portfolioMode = "grid";
    cloudsEl.style.transition = "opacity 0.4s ease";
    cloudsEl.style.opacity = "0";
    cloudsEl.style.pointerEvents = "none";
    syncPortfolioCloudsState();
    setTimeout(() => {
      gridEl.classList.add("visible");
      if (btn) btn.textContent = "dispersar";
      portfolioAnimating = false;
    }, 400);
  } else {
    portfolioMode = "clouds";
    if (portfolioCloudsNeedLayout) ensurePortfolioCloudsLayoutIfNeeded();
    gridEl.classList.remove("visible");
    cloudsEl.style.transition = "opacity 0.5s ease";
    cloudsEl.style.opacity = "1";
    cloudsEl.style.pointerEvents = "auto";
    if (btn) btn.textContent = "ordenar";
    syncPortfolioCloudsState();
    setTimeout(() => { portfolioAnimating = false; }, 500);
  }
}

// ============================================
// RENDER ALL
// ============================================

async function renderizarContenido() {
  await loadData();
  const data = getData();
  if (!data) return;

  renderWelcome(data);
  renderStatement(data);
  renderMetodologia(data);
  renderPricing(data);
  renderPoliticas(data);
  renderPortfolio(data);
}

// ============================================
// HEADER
// ============================================

let overlayEl = null;
let zoneLabelEl = null;
let minimapInlineEl = null;
let minimapExpandedEl = null;
let resizeTimeoutId = null;

function getNombrePagina() {
  return nombresEspeciales[`${posY}_${posX}`] || "";
}

function crearZoneLabel() {
  zoneLabelEl = document.createElement("div");
  zoneLabelEl.classList.add("zone-label-bg");
  document.body.appendChild(zoneLabelEl);
}

function actualizarZoneLabel() {
  if (!zoneLabelEl) return;
  zoneLabelEl.textContent = getNombrePagina();
}

function getViewportAspect() {
  return window.innerHeight > 0 ? window.innerWidth / window.innerHeight : 1;
}

function actualizarTamanoMinimapInline() {
  if (!minimapInlineEl) return;
  const base = 14;
  const cellW = Math.max(8, Math.round(base * getViewportAspect()));
  const cellH = base;

  minimapInlineEl.querySelectorAll(".minimap-inline-cell").forEach(cell => {
    cell.style.width = `${cellW}px`;
    cell.style.height = `${cellH}px`;
  });
}

function actualizarTamanoMinimapExpandido() {
  if (!minimapExpandedEl) return;
  const base = Math.min(window.innerWidth * 0.12, 120);
  const cellW = Math.max(40, Math.round(base));
  const cellH = Math.max(24, Math.round(base / getViewportAspect()));

  minimapExpandedEl.querySelectorAll(".minimap-expanded-cell").forEach(cell => {
    cell.style.width = `${cellW}px`;
    cell.style.height = `${cellH}px`;
  });
}

function onViewportResize() {
  actualizarTamanoMinimapInline();
  actualizarTamanoMinimapExpandido();

  const proyectos = getData()?.portfolio?.proyectos;
  if (!proyectos || !document.getElementById("portfolio-clouds")) return;

  if (isPortfolioCellActive() && portfolioMode === "clouds") {
    generarScreenshotsFlotando(proyectos);
    portfolioCloudsNeedLayout = false;
  } else {
    portfolioCloudsNeedLayout = true;
  }
  syncPortfolioCloudsState();
}

function crearHeader() {
  const headerEl = document.createElement("div");
  headerEl.classList.add("header-topright");

  minimapInlineEl = document.createElement("div");
  minimapInlineEl.classList.add("minimap-inline");
  minimapInlineEl.style.gridTemplateColumns = `repeat(${grid[0].length}, 1fr)`;
  minimapInlineEl.style.gridTemplateRows = `repeat(${grid.length}, 1fr)`;

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const cell = document.createElement("div");
      cell.classList.add("minimap-inline-cell");
      cell.dataset.y = y;
      cell.dataset.x = x;

      if (grid[y][x] === 0) {
        cell.classList.add("invisible");
      }

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

  const cells = minimapInlineEl.querySelectorAll(".minimap-inline-cell");
  cells.forEach(cell => {
    cell.classList.toggle("activa", +cell.dataset.y === posY && +cell.dataset.x === posX);
  });

}

// ============================================
// MINIMAP OVERLAY
// ============================================

function crearOverlay() {
  overlayEl = document.createElement("div");
  overlayEl.classList.add("minimap-overlay");

  minimapExpandedEl = document.createElement("div");
  minimapExpandedEl.classList.add("minimap-expanded");
  minimapExpandedEl.style.gridTemplateColumns = `repeat(${grid[0].length}, 1fr)`;
  minimapExpandedEl.style.gridTemplateRows = `repeat(${grid.length}, 1fr)`;

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const cell = document.createElement("button");
      cell.classList.add("minimap-expanded-cell");
      cell.dataset.y = y;
      cell.dataset.x = x;

      if (grid[y][x] === 0) {
        cell.classList.add("invisible");
      } else {
        cell.textContent = nombresEspeciales[`${y}_${x}`] || "";
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

function actualizarMinimapExpandido() {
  if (!overlayEl) return;
  overlayEl.querySelectorAll(".minimap-expanded-cell").forEach(cell => {
    cell.classList.toggle("activa", +cell.dataset.y === posY && +cell.dataset.x === posX);
  });
}

// ============================================
// NAVIGATION LABELS
// ============================================

function getVecinos() {
  const vecinos = {};
  [
    { dy: -1, dx: 0, pos: "top" },
    { dy: 1,  dx: 0, pos: "bottom" },
    { dy: 0, dx: -1, pos: "left" },
    { dy: 0,  dx: 1, pos: "right" },
  ].forEach(({ dy, dx, pos }) => {
    const ny = posY + dy, nx = posX + dx;
    if (grid[ny]?.[nx] === 1) {
      vecinos[pos] = { y: ny, x: nx, nombre: nombresEspeciales[`${ny}_${nx}`] || "" };
    }
  });
  return vecinos;
}

function crearNavLabels(celda) {
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
// URL HASH NAVIGATION
// ============================================

function actualizarHash() {
  const nombre = getNombrePagina();
  const nuevoHash = nombre ? `#${nombre}` : "#";
  // replaceState so back/forward button doesn't fill up with every scroll step
  history.replaceState(null, "", nuevoHash || window.location.pathname);
}

function leerHash() {
  const hash = window.location.hash.replace("#", "").toLowerCase().trim();
  if (!hash) return false;

  for (const [key, nombre] of Object.entries(nombresEspeciales)) {
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
// VIEW UPDATE
// ============================================

function actualizarVista() {
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
  syncPortfolioCloudsState();
}

// ============================================
// KEYBOARD NAVIGATION
// ============================================

document.addEventListener("keydown", e => {
  if (e.key === "Escape" && overlayEl?.classList.contains("visible")) {
    cerrarMinimapExpandido();
    return;
  }

  let newY = posY, newX = posX;
  switch (e.key) {
    case "ArrowUp":    newY--; break;
    case "ArrowDown":  newY++; break;
    case "ArrowLeft":  newX--; break;
    case "ArrowRight": newX++; break;
    default: return;
  }

  if (grid[newY]?.[newX] === 1) {
    posY = newY;
    posX = newX;
    actualizarVista();
  }
});

function scheduleViewportResize() {
  if (resizeTimeoutId) clearTimeout(resizeTimeoutId);
  resizeTimeoutId = setTimeout(onViewportResize, 120);
}

window.addEventListener("resize", scheduleViewportResize);

window.addEventListener("orientationchange", scheduleViewportResize);

// ============================================
// INIT
// ============================================

crearPantallas();
crearZoneLabel();
crearHeader();
crearOverlay();
leerHash(); // set posY/posX from URL before first render
renderizarContenido().then(() => actualizarVista());
