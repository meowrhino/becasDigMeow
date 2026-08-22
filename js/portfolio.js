// ============================================
// PORTFOLIO — Grid de proyectos con crossfade
// ============================================

import { currentLang, obtenerDatos, onLangChange } from "./data.js";
import { slugify } from "./proyecto-template.js";
import { rutaProyectos } from "./rutas.js";
import { setupScrollGradients } from "./scroll-gradients.js";

/** Texto del enlace al caso de estudio, por idioma. */
const CASO = { es: "ver el caso →", en: "see the case →", cat: "veure el cas →" };

const pick = (obj, lang) => obj?.[lang] ?? obj?.es ?? "";

// --- Estado centralizado de cycling de imágenes ---

/** @type {Map<number, {currentIndex: number, imagenes: string[], intervalo: number, timerId: number|null, listeners: Set<Function>, paused: boolean, ready: boolean, _pendiente: boolean}>} */
const imageCycleState = new Map();

let visibilityObserver = null;

function arrancarTimer(state) {
  // No arrancar el crossfade hasta que la imagen primaria de la nube
  // haya cargado; si aún no, dejar la petición pendiente.
  if (!state.ready) { state._pendiente = true; return; }
  state._pendiente = false;
  state.timerId = setInterval(() => {
    state.currentIndex = (state.currentIndex + 1) % state.imagenes.length;
    state.listeners.forEach(fn => fn(state.currentIndex, state.imagenes));
  }, state.intervalo);
}

// Marca la nube como cargada y arranca su ciclo si estaba pendiente.
function marcarCicloListo(projectIndex) {
  const state = imageCycleState.get(projectIndex);
  if (!state) return;
  state.ready = true;
  if (state._pendiente && !state.paused) arrancarTimer(state);
}

function iniciarCiclosImagenes(proyectos) {
  detenerCiclosImagenes();
  proyectos.forEach((proyecto, idx) => {
    const imagenes = obtenerImagenesProyecto(proyecto).filter(Boolean);
    if (imagenes.length <= 1) return;

    const intervalo = 5000 + Math.random() * 3000;
    const retraso   = 2000 + Math.random() * 4000;
    const state = { currentIndex: 0, imagenes, intervalo, timerId: null, listeners: new Set(), paused: false, ready: false, _pendiente: false };

    // El timeout de retraso queda registrado en _delayId: un stop durante el
    // delay lo cancela y evita que arranque el interval (sin timers huérfanos).
    state._delayId = setTimeout(() => {
      state._delayId = null;
      if (!state.paused) arrancarTimer(state);
    }, retraso);

    imageCycleState.set(idx, state);
  });

  observarVisibilidadPortfolio();
}

function detenerCiclosImagenes() {
  imageCycleState.forEach(state => {
    if (state._delayId) clearTimeout(state._delayId);
    if (state.timerId) clearInterval(state.timerId);
    state.listeners.clear();
  });
  imageCycleState.clear();

  if (visibilityObserver) {
    visibilityObserver.disconnect();
    visibilityObserver = null;
  }
}

function pausarCiclos() {
  imageCycleState.forEach(state => {
    if (state.paused) return;
    state.paused = true;
    if (state._delayId) { clearTimeout(state._delayId); state._delayId = null; }
    if (state.timerId)  { clearInterval(state.timerId); state.timerId = null; }
  });
}

function reanudarCiclos() {
  imageCycleState.forEach(state => {
    if (!state.paused) return;
    state.paused = false;
    if (!state.timerId) arrancarTimer(state);
  });
}

// Las celdas están apiladas en el mismo hueco del viewport (solo cambia su
// opacidad/visibility vía la clase .activa), así que IntersectionObserver no
// distingue la celda visible. Observamos la clase .activa: solo entonces se
// cargan las imágenes (evita descargar las ~13 en el load inicial) y corren
// los ciclos.
function observarVisibilidadPortfolio() {
  const celda = document.querySelector(".celda.portfolio");
  if (!celda) return;

  const sincronizar = () => {
    if (celda.classList.contains("activa")) {
      reanudarCiclos();
      activarCargaPortfolio();
    } else {
      pausarCiclos();
    }
  };

  if (typeof MutationObserver !== "undefined") {
    visibilityObserver = new MutationObserver(sincronizar);
    visibilityObserver.observe(celda, { attributes: true, attributeFilter: ["class"] });
  }
  sincronizar(); // estado inicial (p.ej. entrada directa al portfolio por hash)
}

// Asigna el src real a las imágenes primarias (diferido hasta que el portfolio
// es visible). loading="lazy" sigue difiriendo las que queden fuera del scroll.
function activarCargaPortfolio() {
  const grid = document.getElementById("portfolio-grid");
  if (!grid) return;
  grid.querySelectorAll("img[data-src]").forEach(img => {
    img.src = img.dataset.src;
    delete img.dataset.src;
  });
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
 * Estructura esperada: img/<slug>/1.webp, img/<slug>/2.webp, ...
 * El campo `imagen` apunta a la primera, `imagenesSecundarias` cuenta las extras.
 */
function obtenerImagenesProyecto(proyecto) {
  const principal = typeof proyecto?.imagen === "string" ? proyecto.imagen.trim() : "";
  if (!principal) return [];

  const secundariasRaw = Number.parseInt(proyecto.imagenesSecundarias, 10);
  const secundarias = Number.isFinite(secundariasRaw) ? Math.max(0, secundariasRaw) : 0;
  if (secundarias === 0) return [principal];

  const match = principal.match(/^(.*\/)(\d+)(\.[^./]+)$/);
  if (!match) return [principal];

  const dir = match[1];
  const ext = match[3];
  const total = secundarias + 1;
  return Array.from({ length: total }, (_, i) => `${dir}${i + 1}${ext}`);
}

// --- Renderizado ---

export function renderPortfolio(data) {
  const el = document.querySelector(".celda.portfolio");
  if (!el || !data?.portfolio) return;

  const proyectos = data.portfolio.proyectos;

  el.innerHTML = `
    <div class="scroll-wrapper portfolio-scroll-wrapper">
      <div class="scroll-content portfolio-scroll-content">
        <div class="portfolio-grid" id="portfolio-grid"></div>
      </div>
    </div>
  `;

  iniciarCiclosImagenes(proyectos);
  renderGridProyectos(proyectos);

  // El enlace al caso cambia de texto Y de ruta con el idioma (/proyectos,
  // /en/projects, /ca/projectes), así que hay que repintar los dos.
  onLangChange((lang) => {
    el.querySelectorAll(".pgrid-caso").forEach((a, i) => {
      const p = proyectos[i];
      if (!p) return;
      a.textContent = pick(CASO, lang);
      a.href = `${rutaProyectos(lang)}/${slugify(p.nombre)}`;
    });
  });

  const wrapper = el.querySelector(".portfolio-scroll-wrapper");
  const content = el.querySelector(".portfolio-scroll-content");
  setupScrollGradients(wrapper, content);

  // Nav-label "archive" en la parte inferior
  const archiveLabel = document.createElement("a");
  archiveLabel.href = "/archive";   // "archive.html" responde 307 en Cloudflare
  archiveLabel.classList.add("nav-label", "bottom");
  archiveLabel.dataset.permanent = "true";
  archiveLabel.textContent = "archive";
  // El archivo se siente oscuro por defecto: fija el tema destino en vez de
  // invertir el actual (determinista; no pisa de forma rara una elección manual).
  archiveLabel.addEventListener("click", () => {
    localStorage.setItem("meowrhino-theme", "dark");
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

    // El item es SIEMPRE un div y la imagen va dentro de su propio <a>. Antes el
    // item entero era el enlace, pero desde que la ficha lleva también un enlace
    // al caso de estudio quedarían anclas anidadas, que el navegador desarma y
    // rompe la maqueta.
    const item = document.createElement("div");
    item.classList.add("pgrid-item");

    const thumb = document.createElement(tieneDualUrls ? "div" : "a");
    thumb.classList.add("pgrid-thumb");
    if (!tieneDualUrls) {
      thumb.href = proyecto.url;
      thumb.target = "_blank";
      thumb.rel = "noopener";
    }

    const imgA = document.createElement("img");
    imgA.classList.add("pgrid-img", "pgrid-img-a");
    imgA.alt = proyecto.nombre;
    imgA.loading = "lazy";
    imgA.decoding = "async";
    imgA.width = 800;          // aspect-ratio 4:3, el CSS reescala al 100%
    imgA.height = 600;
    // Al cargar (o fallar) la primaria: fade-in de la nube (quita skeleton) y
    // habilita su ciclo de crossfade. En error se quita igual el skeleton.
    imgA.addEventListener("load", () => { thumb.classList.add("loaded"); marcarCicloListo(idx); });
    imgA.addEventListener("error", () => { thumb.classList.add("loaded"); marcarCicloListo(idx); });
    imgA.dataset.src = proyecto.imagen;  // src diferido: se asigna al activar el portfolio
    thumb.appendChild(imgA);

    if (tieneCiclo) {
      const imgB = document.createElement("img");
      imgB.classList.add("pgrid-img", "pgrid-img-b");
      imgB.alt = proyecto.nombre;
      imgB.loading = "lazy";
      imgB.decoding = "async";
      imgB.width = 800;
      imgB.height = 600;
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
      const url = document.createElement("a");
      url.classList.add("pgrid-url");
      url.href = proyecto.url;
      url.target = "_blank";
      url.rel = "noopener";
      url.textContent = proyecto.urlLabel || limpiarUrl(proyecto.url);
      meta.appendChild(url);
    }

    // Enlace al caso de estudio. Es la única vía desde el grid hacia
    // /proyectos/<slug>, y de paso le da a esas páginas los enlaces internos que
    // necesitan para posicionar. El texto se retraduce al cambiar de idioma.
    const caso = document.createElement("a");
    caso.classList.add("pgrid-caso");
    caso.href = `${rutaProyectos(currentLang)}/${slugify(proyecto.nombre)}`;
    caso.textContent = pick(CASO, currentLang);
    meta.appendChild(caso);

    item.appendChild(meta);

    grid.appendChild(item);
  });
}
