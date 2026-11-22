// ============================================
// PORTFOLIO — Grid de proyectos con crossfade
// ============================================

import { currentLang, obtenerDatos } from "./data.js";
import { controlesDeCelda } from "./navigation.js";
import { etiquetaVista } from "./controles.js";
import { slugify } from "./proyecto-template.js";
import { altProyecto, pickLang as pick } from "./easy-template.js";
import { rutaProyectos } from "./rutas.js";
import { pintarLista, capturaAlPasar } from "./utils.js";
import { celdaHeadingHTML } from "./pages.js";

/** Texto del enlace al caso de estudio, por idioma. */
const CASO = { es: "ver el caso", en: "see the case", cat: "veure el cas" };


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
        ${celdaHeadingHTML(data, "portfolio", currentLang, "about-pregunta")}
        <div class="plista" id="portfolio-lista"></div>
        <img class="plista-captura" alt="" decoding="async">
        <div class="portfolio-grid" id="portfolio-grid" hidden></div>
      </div>
    </div>
  `;

  iniciarCiclosImagenes(proyectos);
  renderGridProyectos(proyectos);
  renderListaProyectos(el, proyectos);

  // Dos vistas, lista al entrar y la rejilla a un clic: `vista(…)` en la barra.
  let vista = "lista";
  const ponerVista = (v) => {
    vista = v;
    el.querySelector("#portfolio-lista").hidden = v !== "lista";
    el.querySelector(".plista-captura").classList.remove("visible");
    el.querySelector("#portfolio-grid").hidden = v === "lista";
  };
  controlesDeCelda("portfolio", () => {
    const t = VISTA[currentLang] || VISTA.es;
    return [{
      etiqueta: `${etiquetaVista(currentLang)}(${t[vista]})`,
      opciones: ["lista", "rejilla"].map(v => ({ texto: t[v], activa: v === vista, alPulsar: () => ponerVista(v) })),
    }];
  });


  // El enlace a "archive" vivía aquí, en el borde de abajo. Se fue al pie del
  // about, junto al de neocities: el archivo es de manu, no del portfolio de
  // clientes, y ahí está el resto de sitios donde encontrarle.
}

const VISTA = {
  es:  { lista: "lista",  rejilla: "rejilla", cols: ["web", "descripción"] },
  en:  { lista: "list",   rejilla: "grid",    cols: ["site", "description"] },
  cat: { lista: "llista", rejilla: "graella", cols: ["web", "descripció"] },
};
// La columna «descripción» es el campo `sector` de proyectos.json.
const CAMPOS = ["nombre", "sector"];
// `sector` va por idioma en proyectos.json; el nombre es un nombre propio.
const textoCampo = (p, campo, lang) => (typeof p[campo] === "string" ? p[campo] : pick(p[campo], lang));

/** La lista: una fila por web con sus datos, que se ordena al pulsar una columna. */
function renderListaProyectos(el, proyectos) {
  const lista = el.querySelector("#portfolio-lista");
  const pintar = pintarLista(lista, proyectos, {
    campos: CAMPOS,
    cols: (lang) => (VISTA[lang] || VISTA.es).cols,
    texto: textoCampo,
    href: (p, lang) => `${rutaProyectos(lang)}/${slugify(p.nombre)}`,
  });

  capturaAlPasar(lista, el.querySelector(".plista-captura"), proyectos, (p) => `/${p.imagen}`);

  pintar(currentLang);
}

function renderGridProyectos(proyectos) {
  const grid = document.getElementById("portfolio-grid");
  if (!grid) return;
  grid.innerHTML = "";

  proyectos.forEach((proyecto, idx) => {
    const imagenes = obtenerImagenesProyecto(proyecto).filter(Boolean);
    const tieneCiclo = imagenes.length > 1;

    // El item es SIEMPRE un div y la imagen va dentro de su propio <a>. Antes el
    // item entero era el enlace, pero desde que la ficha lleva también un enlace
    // al caso de estudio quedarían anclas anidadas, que el navegador desarma y
    // rompe la maqueta.
    const item = document.createElement("div");
    item.classList.add("pgrid-item");

    // La captura va SIEMPRE a la ficha del proyecto, nunca a la web del cliente.
    // Antes iba fuera, y era el objetivo de clic más grande de la rejilla: quien
    // tocaba una captura perdía la pestaña y se iba justo antes de leer lo único
    // que le convence de contratarnos, que está en la ficha y no en la web del
    // cliente. La salida externa no desaparece: vive en la ficha, en un botón
    // más grande que el textito que había aquí. Y de paso la rejilla y la card
    // del welcome hacen por fin lo mismo: un solo destino, el mismo.
    // Como ya no depende de la url, el caso de las dos urls (mokakopaTwins)
    // deja de ser especial: la captura enlaza igual que las demás.
    const href = `${rutaProyectos(currentLang)}/${slugify(proyecto.nombre)}`;

    const thumb = document.createElement("a");
    thumb.classList.add("pgrid-thumb");
    thumb.href = href;
    thumb.setAttribute("aria-label", `${proyecto.nombre} — ${pick(CASO, currentLang)}`);

    const imgA = document.createElement("img");
    imgA.classList.add("pgrid-img", "pgrid-img-a");
    imgA.alt = altProyecto(proyecto, currentLang);
    imgA.loading = "lazy";
    imgA.decoding = "async";
    imgA.width = 800;          // aspect-ratio 4:3, el CSS reescala al 100%
    imgA.height = 600;
    // Al cargar (o fallar) la primaria: fade-in de la nube (quita skeleton) y
    // habilita su ciclo de crossfade. En error se quita igual el skeleton.
    imgA.addEventListener("load", () => { thumb.classList.add("loaded"); marcarCicloListo(idx); });
    imgA.addEventListener("error", () => { thumb.classList.add("loaded"); marcarCicloListo(idx); });
    imgA.dataset.src = `/${proyecto.imagen}`;  // src diferido: se asigna al activar el portfolio
    thumb.appendChild(imgA);

    if (tieneCiclo) {
      const imgB = document.createElement("img");
      imgB.classList.add("pgrid-img", "pgrid-img-b");
      imgB.alt = "";   // decorativa: es la misma web que imgA, en crossfade
      imgB.loading = "lazy";
      imgB.decoding = "async";
      imgB.width = 800;
      imgB.height = 600;
      thumb.appendChild(imgB);

      let showingA = true;
      suscribirCiclo(idx, (newIndex, imgs) => {
        if (showingA) {
          imgB.src = `/${imgs[newIndex]}`;
          thumb.classList.add("crossfade-flip");
        } else {
          imgA.src = `/${imgs[newIndex]}`;
          thumb.classList.remove("crossfade-flip");
        }
        showingA = !showingA;
      });
    }

    item.appendChild(thumb);

    // Debajo, el nombre del proyecto y "ver el caso". La url del cliente ya no
    // está aquí: en una tarjeta de 200px había dos destinos distintos y en
    // móvil eso es una trampa para el dedo. El dominio se lee en la ficha.
    const meta = document.createElement("div");
    meta.classList.add("pgrid-meta");

    const nombre = document.createElement("a");
    nombre.classList.add("pgrid-nombre");
    nombre.href = href;
    nombre.textContent = proyecto.nombre;
    meta.appendChild(nombre);

    // El texto se retraduce al cambiar de idioma.
    const caso = document.createElement("a");
    caso.classList.add("pgrid-caso");
    caso.href = href;
    caso.textContent = pick(CASO, currentLang);
    meta.appendChild(caso);

    item.appendChild(meta);

    grid.appendChild(item);
  });
}
