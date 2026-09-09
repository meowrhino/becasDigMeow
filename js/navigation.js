// ============================================
// NAVIGATION — Grid, celdas, minimaps, nav labels, hash
// ============================================
//
// Configurable: cada página (studio, archive) pasa su
// propio grid, nombres y callbacks mediante configurarNavegacion().

// --- Elemento raíz ---
const app = document.getElementById("content");

// --- Estado configurable ---

let GRID = [];
let NOMBRES_CELDAS = {};
let CLASE_CSS = {};
let REDIRECTS = {};
let posY = 0;
let posX = 0;
let onVistaActualizadaCb = null;
// Función celda→ruta, opcional. Cuando existe, el lienzo vive en el pathname y
// cada celda es una URL de verdad; cuando no, se guarda en el hash como
// siempre. El archive es el segundo caso: otro documento, su propio lienzo.
let rutaDe = null;
// Y la inversa: de un pathname a la celda que le toca. Va aparte porque la
// ida depende del idioma activo y la vuelta no: /en/about es la celda `about`
// vengas del idioma que vengas, y de hecho es la URL la que decide el idioma.
let celdaDeRutaFn = null;

// Traductor del TEXTO VISIBLE de las celdas (zone label, nav labels, minimapa).
// Por defecto es la identidad: se muestra el propio identificador de la celda.
// Los identificadores internos (NOMBRES_CELDAS: hash, alias, clase css, dataset)
// NUNCA pasan por aquí; solo el texto que ve el usuario. main.js lo sustituye
// tras cargar data.json para traducir p. ej. metodología→methodology.
let traducirNombre = (nombre) => nombre;

/**
 * Registra la función que traduce el nombre de celda a su texto visible en el
 * idioma activo. Tras cambiarla, llamar a refrescarTextosCeldas() para re-pintar.
 */
export function setTraductorNombres(fn) {
  traducirNombre = typeof fn === "function" ? fn : ((n) => n);
}

/**
 * Configura el grid de navegación.
 * Debe llamarse ANTES de crearCeldas().
 *
 * `redirects` mapea destino → [aliases]. Resuelve en cadena:
 * { macarrones: ["links"], links: ["tools"] } hace que #tools → #links → #macarrones.
 */
export function configurarNavegacion({ grid, nombres, clasesCss, posInicial, onUpdate, redirects, rutas }) {
  GRID = grid;
  NOMBRES_CELDAS = nombres;
  CLASE_CSS = clasesCss || {};
  REDIRECTS = redirects || {};
  posY = posInicial?.y ?? 0;
  posX = posInicial?.x ?? 0;
  onVistaActualizadaCb = onUpdate || null;
  rutaDe = typeof rutas?.de === "function" ? rutas.de : null;
  celdaDeRutaFn = typeof rutas?.celdaDe === "function" ? rutas.celdaDe : null;

  // Volver atrás tiene que deshacer el último deslizamiento, no sacarte del
  // sitio: con rutas, cada celda es una entrada de historial.
  if (rutaDe && !popstateEnganchado) {
    popstateEnganchado = true;
    window.addEventListener("popstate", () => {
      if (leerURL()) actualizarVista({ historial: false });
    });
  }
}

let popstateEnganchado = false;

function resolverAlias(hash) {
  let actual = hash;
  const vistos = new Set();
  while (!vistos.has(actual)) {
    vistos.add(actual);
    const destino = Object.keys(REDIRECTS).find(k => REDIRECTS[k].includes(actual));
    if (!destino) break;
    actual = destino;
  }
  return actual;
}

export function getGrid() {
  return GRID;
}

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

/**
 * El rectángulo que de verdad tiene celdas dentro del GRID.
 *
 * Lo usa el aterrizaje cuando la celda activa desaparece de la vista: hay que
 * caer en una esquina que exista. Los minimapas ya NO se recortan a este marco
 * —dibujan el terreno entero, ver `pintarMinimapInline`—, así que este cálculo
 * ha dejado de ser lo que define su tamaño.
 */
/**
 * El terreno completo: el mismo 5×5 que se ve y se toca en la celda `mapa`.
 * Es lo que dibujan los dos minimapas, para que una sección esté en el mismo
 * sitio en el juego y en la navegación.
 */
function terreno() {
  return { y0: 0, y1: GRID.length - 1, x0: 0, x1: (GRID[0]?.length || 1) - 1 };
}

export function marcoOcupado() {
  const ys = [], xs = [];
  for (let y = 0; y < GRID.length; y++) {
    for (let x = 0; x < (GRID[y]?.length || 0); x++) {
      if (GRID[y][x] === 1) { ys.push(y); xs.push(x); }
    }
  }
  if (!ys.length) return { y0: 0, y1: GRID.length - 1, x0: 0, x1: (GRID[0]?.length || 1) - 1 };
  return { y0: Math.min(...ys), y1: Math.max(...ys), x0: Math.min(...xs), x1: Math.max(...xs) };
}

/**
 * Cambia el reparto de celdas sin recrear ni repintar su contenido.
 *
 * Se puede porque `pos_Y_X` no coloca nada: todas las celdas están apiladas en
 * el mismo hueco con `position:absolute` y solo se ve la que lleva `.activa`
 * (ver la sección 2 de style.css). La clase es un selector, no una posición. Así
 * que mudar una sección es re-etiquetar su div y redibujar los dos minimapas —
 * el portfolio no reinicia sus ciclos de imagen ni el welcome sus tarjetas,
 * que es lo que costaría destruir y volver a montar el lienzo.
 *
 * La celda ACTIVA se sigue por su nombre, no por su casilla: si mueves la que
 * estás mirando, te quedas en ella y no te teletransporta a lo que haya caído
 * en sus coordenadas viejas.
 */
export function reconfigurarGrid({ grid, nombres }) {
  const nombreActivo = getNombrePagina();
  GRID = grid;
  NOMBRES_CELDAS = nombres;

  for (const [clave, nombre] of Object.entries(NOMBRES_CELDAS)) {
    const celda = document.querySelector(`.celda[data-nombre="${nombre}"]`);
    if (!celda) continue;
    const [y, x] = clave.split("_");
    celda.classList.remove(`pos_${celda.dataset.y}_${celda.dataset.x}`);
    celda.classList.add(`pos_${y}_${x}`);
    celda.dataset.y = y;
    celda.dataset.x = x;
  }

  if (!(nombreActivo && irACeldaLlamada(nombreActivo))) {
    const { y0, x0 } = marcoOcupado();
    setPosicion(y0, x0);
  }

  rehacerMinimapas();
  actualizarVista({ historial: false });
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
  zoneLabelEl.textContent = traducirNombre(getNombrePagina());
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

/**
 * Rellena el minimapa de la esquina con el terreno ENTERO.
 *
 * Antes se recortaba al rectángulo ocupado, para no dibujar una rejilla de 25
 * casillas casi todas vacías. Pero entonces la celda `mapa` y el minimapa
 * contaban cosas distintas: colocabas una sección en una esquina del 5×5 y el
 * minimapa la enseñaba pegada al centro, porque había recortado el vacío. Si
 * el mapa es un sitio donde se juega a mover las cosas, lo que se mueve tiene
 * que quedarse donde lo pusiste. El vacío también es información.
 */
function pintarMinimapInline() {
  if (!minimapInlineEl) return;
  const { y0, y1, x0, x1 } = terreno();
  minimapInlineEl.innerHTML = "";
  minimapInlineEl.style.gridTemplateColumns = `repeat(${x1 - x0 + 1}, 1fr)`;
  minimapInlineEl.style.gridTemplateRows    = `repeat(${y1 - y0 + 1}, 1fr)`;

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const cell = document.createElement("div");
      cell.classList.add("minimap-inline-cell");
      cell.dataset.y = y;
      cell.dataset.x = x;
      if (GRID[y]?.[x] !== 1) cell.classList.add("invisible");
      minimapInlineEl.appendChild(cell);
    }
  }
  actualizarTamanoMinimapInline();
}

export function crearHeader() {
  const headerEl = document.createElement("div");
  headerEl.classList.add("header-topright");

  minimapInlineEl = document.createElement("div");
  minimapInlineEl.classList.add("minimap-inline");
  minimapInlineEl.setAttribute("role", "button");
  minimapInlineEl.setAttribute("tabindex", "0");
  minimapInlineEl.setAttribute("aria-label", "Abrir mapa de navegación");
  pintarMinimapInline();
  minimapInlineEl.addEventListener("click", () => abrirMinimapExpandido());
  minimapInlineEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      abrirMinimapExpandido();
    }
  });
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

/** Rellena el minimapa grande con el marco que hoy tiene celdas. */
function pintarMinimapExpandido() {
  if (!minimapExpandedEl) return;
  const { y0, y1, x0, x1 } = terreno();
  minimapExpandedEl.innerHTML = "";
  minimapExpandedEl.style.gridTemplateColumns = `repeat(${x1 - x0 + 1}, 1fr)`;
  minimapExpandedEl.style.gridTemplateRows    = `repeat(${y1 - y0 + 1}, 1fr)`;

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const cell = document.createElement("button");
      cell.classList.add("minimap-expanded-cell");
      cell.dataset.y = y;
      cell.dataset.x = x;

      if (GRID[y]?.[x] !== 1) {
        cell.classList.add("invisible");
      } else {
        const nombreCelda = NOMBRES_CELDAS[`${y}_${x}`] || "";
        const visible = traducirNombre(nombreCelda);
        cell.textContent = visible;
        // Ya es un <button> (foco y teclado nativos); el aria-label añade
        // el verbo de la acción, más claro que solo el nombre destino.
        if (nombreCelda) cell.setAttribute("aria-label", `Ir a ${visible}`);
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
}

/** Vuelve a dibujar los dos minimapas tras recolocar las secciones. */
function rehacerMinimapas() {
  pintarMinimapInline();
  pintarMinimapExpandido();
}

export function crearOverlay() {
  overlayEl = document.createElement("div");
  overlayEl.classList.add("minimap-overlay");

  minimapExpandedEl = document.createElement("div");
  minimapExpandedEl.classList.add("minimap-expanded");
  pintarMinimapExpandido();
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

/**
 * El slot de un borde de la celda, creándolo si aún no existe.
 *
 * Un borde es un sitio, no una cosa: puede llevar la navegación al vecino, un
 * control de la propia celda, o las dos. Antes lo era `.nav-label`, que hacía
 * de estilo, de posición y de botón a la vez, y obligaba a los controles a
 * disfrazarse de etiqueta de navegación para poder colocarse.
 *
 * Lo usan las celdas que se quedan un borde (portfolio, archive, buscaminas)
 * para colgar ahí lo suyo antes de que exista ninguna navegación.
 *
 * @param {HTMLElement} celda
 * @param {"top"|"bottom"|"left"|"right"} pos
 */
export function bordeCelda(celda, pos) {
  let slot = celda.querySelector(`:scope > .nav-slot.${pos}`);
  if (!slot) {
    slot = document.createElement("div");
    slot.className = `nav-slot ${pos}`;
    celda.appendChild(slot);
  }
  return slot;
}

/**
 * Los cuatro bordes de la celda activa: a dónde se va desde aquí.
 *
 * Si el borde ya lo ocupaba un control de la celda —los niveles del
 * buscaminas, `archive` en el portfolio, `studio` en el archive—, los dos
 * comparten el lado: la navegación se antepone y se queda pegada al borde, y
 * el control se aparta hacia dentro.
 *
 * Manda la navegación y no al revés a propósito. Es lo único que está en el
 * mismo sitio en las ocho celdas: si se moviera según lo que cada celda tenga
 * puesto, dejaría de poder confiarse. Antes esto ni se compartía —el control
 * ganaba y la navegación no se dibujaba—, y mover una sección al lado del
 * buscaminas la dejaba sin forma visible de llegar: con teclado y minimapa sí,
 * pero en un móvil no hay flechas.
 */
function crearNavLabels(celda) {
  celda.querySelectorAll(".nav-label:not([data-permanent])").forEach(l => l.remove());

  Object.entries(getVecinos()).forEach(([pos, info]) => {
    const label = document.createElement("button");
    label.classList.add("nav-label");
    label.textContent = traducirNombre(info.nombre);
    label.addEventListener("click", () => {
      setPosicion(info.y, info.x);
      actualizarVista();
    });
    bordeCelda(celda, pos).prepend(label);
  });
}

// --- La URL ---
//
// Dos modos, según haya tabla de rutas o no:
//   con rutas → la celda vive en el pathname y cada una es una URL indexable.
//   sin rutas → la celda vive en el hash, como siempre (es el caso del archive).

/** Coloca el lienzo en la celda `nombre`. Devuelve si la encontró. */
function irACeldaLlamada(nombre) {
  for (const [key, n] of Object.entries(NOMBRES_CELDAS)) {
    if (n === nombre) {
      const [y, x] = key.split("_").map(Number);
      setPosicion(y, x);
      return true;
    }
  }
  return false;
}

/**
 * Escribe la celda activa en la URL.
 *
 * Con rutas se hace pushState y no replaceState: deslizar de una celda a otra
 * es cambiar de página, y el botón «atrás» tiene que deshacerlo. Solo se
 * empuja si la ruta cambia de verdad, para que repintar (cambio de idioma,
 * resize) no llene el historial de entradas iguales.
 */
function actualizarURL(historial = true) {
  const nombre = getNombrePagina();

  if (rutaDe) {
    const ruta = nombre ? rutaDe(nombre) : null;
    if (!ruta) return;
    if (normalizar(window.location.pathname) === normalizar(ruta)) return;
    if (historial) history.pushState(null, "", ruta);
    else history.replaceState(null, "", ruta);
    return;
  }

  const nuevoHash = nombre ? `#${nombre}` : "#";
  history.replaceState(null, "", nuevoHash || window.location.pathname);
}

/** `metodologia.html`, `/metodologia/` y `/metodologia` son la misma ruta. */
const normalizar = (ruta) =>
  (String(ruta ?? "").replace(/\.html$/, "").replace(/\/+$/, "") || "/");

/**
 * Coloca el lienzo según la URL de entrada. Primero el pathname (si hay tabla
 * de rutas) y después el hash, que sigue funcionando: las 66 fichas de proyecto
 * enlazan a `/#portfolio` y los enlaces viejos de fuera no se pueden arreglar.
 */
export function leerURL() {
  // El hash manda cuando lo hay: las 66 fichas enlazan a `/#portfolio`, y los
  // hash viejos (`#contacto`, `#statement`) siguen llevando a donde fue a parar
  // su contenido. Si mirásemos primero el pathname, `/#contacto` se quedaría en
  // la portada porque "/" ya resuelve a una celda.
  if (leerHash()) return true;
  const nombre = celdaDeRutaFn?.(window.location.pathname);
  return nombre ? irACeldaLlamada(nombre) : false;
}

export function leerHash() {
  const hash = decodeURIComponent(window.location.hash.replace("#", "")).toLowerCase().trim();
  if (!hash) return false;
  return irACeldaLlamada(resolverAlias(hash));
}

// --- Actualizar vista ---

export function actualizarVista({ historial = true } = {}) {
  document.querySelectorAll(".celda").forEach(c => c.classList.remove("activa"));
  const activa = document.querySelector(`.pos_${posY}_${posX}`);
  if (activa) {
    activa.classList.add("activa");
    crearNavLabels(activa);
  }
  actualizarHeader();
  actualizarZoneLabel();
  actualizarMinimapExpandido();
  actualizarURL(historial);
  if (onVistaActualizadaCb) onVistaActualizadaCb();
}

/**
 * Re-pinta el TEXTO VISIBLE de las celdas con el traductor actual: zone label,
 * nav labels de la celda activa y etiquetas del minimapa expandido (cuyo texto
 * se fija una sola vez al crearlo). Llamar tras setTraductorNombres() y en cada
 * cambio de idioma. No toca identificadores internos ni el hash.
 */
export function refrescarTextosCeldas() {
  actualizarZoneLabel();

  if (minimapExpandedEl) {
    minimapExpandedEl.querySelectorAll(".minimap-expanded-cell").forEach(cell => {
      const nombre = NOMBRES_CELDAS[`${cell.dataset.y}_${cell.dataset.x}`];
      if (!nombre) return;
      const visible = traducirNombre(nombre);
      cell.textContent = visible;
      cell.setAttribute("aria-label", `Ir a ${visible}`);
    });
  }

  const activa = document.querySelector(`.pos_${posY}_${posX}`);
  if (activa) crearNavLabels(activa);
}
