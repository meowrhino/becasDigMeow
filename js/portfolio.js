// ============================================
// PORTFOLIO — Grid de proyectos con crossfade
// ============================================

import { obtenerDatos } from "./data.js";

// --- Estado centralizado de cycling de imágenes ---

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

function suscribirCiclo(projectIndex, listener) {
  const state = imageCycleState.get(projectIndex);
  if (!state) return () => {};
  state.listeners.add(listener);
  return () => state.listeners.delete(listener);
}

// --- Utilidades ---

function limpiarUrl(u) {
  return (u || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
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

// --- Renderizado ---

export function renderPortfolio(data) {
  const el = document.querySelector(".celda.portfolio");
  if (!el || !data?.portfolio) return;

  const proyectos = data.portfolio.proyectos;

  el.innerHTML = `
    <div class="portfolio-grid-wrapper">
      <div class="portfolio-grid" id="portfolio-grid"></div>
    </div>
  `;

  iniciarCiclosImagenes(proyectos);
  renderGridProyectos(proyectos);

  // Nav-label "archive" en la parte inferior
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
}

function renderGridProyectos(proyectos) {
  const grid = document.getElementById("portfolio-grid");
  if (!grid) return;
  grid.innerHTML = "";

  proyectos.forEach((proyecto, idx) => {
    const imagenes = obtenerImagenesProyecto(proyecto).filter(Boolean);
    const tieneCiclo = imagenes.length > 1;
    const tieneDualUrls = Array.isArray(proyecto.urls) && proyecto.urls.length > 0;

    const item = document.createElement(tieneDualUrls ? "div" : "a");
    item.classList.add("pgrid-item");
    if (!tieneDualUrls) {
      item.href = proyecto.url;
      item.target = "_blank";
      item.rel = "noopener";
    }

    const thumb = document.createElement("div");
    thumb.classList.add("pgrid-thumb");

    const imgA = document.createElement("img");
    imgA.classList.add("pgrid-img", "pgrid-img-a");
    imgA.src = proyecto.imagen;
    imgA.alt = proyecto.nombre;
    imgA.loading = "lazy";
    thumb.appendChild(imgA);

    if (tieneCiclo) {
      const imgB = document.createElement("img");
      imgB.classList.add("pgrid-img", "pgrid-img-b");
      imgB.src = imagenes[1];
      imgB.alt = proyecto.nombre;
      imgB.loading = "lazy";
      thumb.appendChild(imgB);

      let showingA = true;
      suscribirCiclo(idx, (newIndex, imgs) => {
        if (showingA) {
          imgB.src = imgs[newIndex];
          thumb.classList.add("crossfade-flip");
        } else {
          imgA.src = imgs[newIndex];
          thumb.classList.remove("crossfade-flip");
        }
        showingA = !showingA;
      });
    }

    item.appendChild(thumb);

    const meta = document.createElement("div");
    meta.classList.add("pgrid-meta");
    if (tieneDualUrls) {
      proyecto.urls.forEach(u => {
        const link = document.createElement("a");
        link.classList.add("pgrid-url");
        link.href = u.url;
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = limpiarUrl(u.url);
        meta.appendChild(link);
      });
    } else {
      const url = document.createElement("span");
      url.classList.add("pgrid-url");
      url.textContent = limpiarUrl(proyecto.url);
      meta.appendChild(url);
    }
    item.appendChild(meta);

    grid.appendChild(item);
  });
}
