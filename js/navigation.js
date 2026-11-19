// ============================================
// NAVIGATION — Grid, celdas, minimaps, nav labels, hash
// ============================================
//
// Configurable: cada página (studio, archive) pasa su
// propio grid, nombres y callbacks mediante configurarNavegacion().

// --- Elemento raíz ---
const app = document.getElementById("content");

// PRUEBA (19 nov 2026): durante la llegada, `html.entrando` deja que el CSS haga
// entrar las cosas de una en una. Se pone aquí, antes de pintar nada, y se
// quita sola: después, cambiar de página no vuelve a disparar la entrada.
document.documentElement.classList.add("entrando");
setTimeout(() => document.documentElement.classList.remove("entrando"), 3500);

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
 * El terreno completo: el mismo 8×8 que se ve y se toca en la celda `mapa`.
 * Es lo que dibuja el minimapa grande, para que una sección esté en el mismo
 * sitio en el juego y en la navegación.
 */
function terreno() {
  return { y0: 0, y1: GRID.length - 1, x0: 0, x1: (GRID[0]?.length || 1) - 1 };
}

/**
 * El rectángulo que de verdad tiene celdas dentro del GRID.
 *
 * Es lo que dibuja el minimapa de la esquina (ver `pintarMinimapInline`), y lo
 * usa el aterrizaje cuando la celda activa desaparece de la vista: hay que
 * caer en una esquina que exista.
 */
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
let vecinosEl = null;

// El orden de `padding` y `border` en CSS: arriba, derecha, abajo, izquierda.
const ORDEN_CSS = ["top", "right", "bottom", "left"];

const IDIOMAS = ["es", "en", "cat"];
const ZOOMS = [85, 100, 115, 130];
let zoomIdx = 1;
let controlesEl = null;

/**
 * Un control que despliega sus opciones hacia arriba, como un tooltip. Es un
 * <details>: abre y cierra solo, también con el teclado, y con el mismo `name`
 * el navegador deja abierto uno a la vez.
 */
function desplegable(etiqueta, opciones) {
  const caja = document.createElement("details");
  caja.classList.add("desplegable");
  caja.setAttribute("name", "controles");
  const resumen = document.createElement("summary");
  resumen.classList.add("menu-btn");
  resumen.textContent = etiqueta;
  const lista = document.createElement("div");
  lista.classList.add("desplegable-opciones");
  opciones.forEach(({ texto, nombre, activa, alPulsar }) => {
    const b = document.createElement("button");
    b.type = "button";
    b.classList.add("menu-btn");
    b.classList.toggle("is-active", !!activa);
    b.textContent = texto;
    if (nombre) b.setAttribute("aria-label", nombre);
    b.addEventListener("click", alPulsar);
    lista.appendChild(b);
  });
  caja.append(resumen, lista);
  controlesEl.appendChild(caja);
  return caja;
}

/** Un botón de la barra. `grupo` separa los controles de las páginas. */
function botonBarra(texto, grupo, alPulsar) {
  const boton = document.createElement("button");
  boton.classList.add("menu-btn", `barra-${grupo}`);
  boton.textContent = texto;
  boton.addEventListener("click", alPulsar);
  vecinosEl.appendChild(boton);
  return boton;
}

/**
 * PRUEBA: pinta la barra entera. Los controles de cada celda (lista/rejilla,
 * idiomas, zoom) siguen existiendo en la celda, escondidos por CSS; aquí se
 * pintan como texto y se les pasa el clic, para no duplicar su lógica.
 */
function pintarVecinosHeader() {
  if (!vecinosEl || !controlesEl) return;
  vecinosEl.innerHTML = "";
  const activa = document.querySelector(".celda.activa");

  // lista / rejilla, solo donde las hay (portfolio)
  activa?.querySelectorAll(".pvista-btn").forEach(orig => {
    const b = botonBarra(orig.textContent, "vista", () => { orig.click(); pintarVecinosHeader(); });
    b.classList.toggle("is-active", orig.classList.contains("is-active"));
  });

  // Idioma y zoom van aparte, abajo a la derecha, y cada uno despliega lo suyo.
  controlesEl.innerHTML = "";

  // zoom(100%): solo en las páginas de texto; despliega el − y el +
  if (activa?.querySelector(".footer-bottom-bar")) {
    const cambiar = (paso) => {
      zoomIdx = Math.min(ZOOMS.length - 1, Math.max(0, zoomIdx + paso));
      document.documentElement.style.setProperty("--zoom", ZOOMS[zoomIdx] / 100);
      window.dispatchEvent(new Event("resize"));   // los degradados de scroll se recalculan
      zoom.querySelector("summary").textContent = `zoom(${ZOOMS[zoomIdx]}%)`;
    };
    const en = document.documentElement.lang === "en";
    const zoom = desplegable(`zoom(${ZOOMS[zoomIdx]}%)`, [
      { texto: "−", nombre: en ? "smaller text" : "letra más pequeña", alPulsar: () => cambiar(-1) },
      { texto: "+", nombre: en ? "larger text" : "letra más grande", alPulsar: () => cambiar(1) },
    ]);
  }

  // idioma(es): despliega los tres
  const langActual = document.querySelector(".lang-btn.is-active")?.dataset.lang;
  if (langActual) {
    desplegable(`${langActual === "en" ? "language" : "idioma"}(${langActual})`, IDIOMAS.map(l => ({
      texto: l,
      activa: l === langActual,
      alPulsar: () => document.querySelector(`.lang-btn[data-lang="${l}"]`)?.click(),
    })));
  }

  const vecinos = getVecinos();
  ORDEN_CSS.forEach((pos) => {
    const info = vecinos[pos];
    if (!info) return;
    botonBarra(traducirNombre(info.nombre), "pagina", () => {
      setPosicion(info.y, info.x);
      actualizarVista();
    });
  });
}

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
 * Rellena el minimapa de la esquina con el rectángulo OCUPADO, no con el
 * terreno entero.
 *
 * Durante un tiempo dibujó el terreno entero, para que una sección movida a
 * una esquina se viera en esa esquina. Con el terreno de 8×8 eso son dos filas
 * y dos columnas de aire por cada lado, y el minimapa quedaba flotando lejos
 * de su esquina en todas las páginas. Recortado vuelve a estar pegado a ella.
 * La forma se conserva (si alejas una sección, el rectángulo crece hasta
 * ella); lo que se pierde es el aire de alrededor, y ese lo sigue enseñando
 * el minimapa grande, que sí dibuja el terreno entero.
 */
function pintarMinimapInline() {
  if (!minimapInlineEl) return;
  const { y0, y1, x0, x1 } = marcoOcupado();
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
  // PRUEBA (19 nov 2026): en la esquina, las páginas vecinas y «menú», que abre
  // el mapa. El minimapa pequeño sigue en el DOM pero el CSS lo esconde.
  vecinosEl = document.createElement("nav");
  vecinosEl.classList.add("menu-vecinos");
  headerEl.appendChild(vecinosEl);
  const menuBtn = document.createElement("button");
  menuBtn.classList.add("menu-btn");
  menuBtn.textContent = document.documentElement.lang === "en" ? "menu" : "menú";
  menuBtn.addEventListener("click", () => abrirMinimapExpandido());
  headerEl.appendChild(menuBtn);
  headerEl.appendChild(minimapInlineEl);
  document.body.appendChild(headerEl);
  ponerFondo();
  controlesEl = document.createElement("div");
  controlesEl.classList.add("controles");
  document.body.appendChild(controlesEl);
  // Un clic fuera cierra el desplegable que esté abierto.
  document.addEventListener("click", (e) => {
    controlesEl.querySelectorAll("details[open]").forEach(d => { if (!d.contains(e.target)) d.open = false; });
  });
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
let listaEl = null;

export function actualizarTamanoMinimapExpandido() {
  if (!minimapExpandedEl) return;
  // La casilla mide un 12% del ancho (120px como mucho), y menos si así no
  // caben todas las columnas a lo ancho o todas las filas más el botón de tema
  // (90px) a lo alto: con 8 de lado, el tamaño de siempre se salía del móvil.
  const hueco = 12, cols = GRID[0]?.length || 1, filas = GRID.length;
  // PRUEBA: en móvil la lista de enlaces va encima del mapa (260px).
  const movil = window.innerWidth <= 768;
  const ancho = window.innerWidth * 0.92;
  const alto  = window.innerHeight - 90 - (movil ? 260 : 0);
  const base   = Math.min(120, window.innerWidth * 0.12,
    (ancho - hueco * (cols - 1)) / cols,
    (alto - hueco * (filas - 1)) / filas * getAspectoViewport());
  const cellW  = Math.max(24, Math.round(base));
  const cellH  = Math.max(14, Math.round(base / getAspectoViewport()));
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
  if (listaEl) listaEl.innerHTML = "";
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
        const ir = () => {
          setPosicion(y, x);
          actualizarVista();
          actualizarMinimapExpandido();
          setTimeout(() => cerrarMinimapExpandido(), 650);
        };
        cell.addEventListener("click", ir);
        // PRUEBA: el mismo destino como enlace de texto, en la lista del menú.
        if (listaEl && nombreCelda) {
          const enlace = document.createElement("button");
          enlace.classList.add("menu-enlace");
          enlace.dataset.y = y;
          enlace.dataset.x = x;
          enlace.textContent = visible;
          enlace.addEventListener("click", ir);
          listaEl.appendChild(enlace);
        }
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

// --- Fondo ---
//
// PRUEBA (19 nov 2026): una trama de puntos a pantalla completa, por detrás de
// todo. Llegó a dibujar el mapa del sitio, casilla a casilla; se quitó: el mapa
// ya está en «menú», y de fondo no decía nada.

function ponerFondo() {
  const fondo = document.createElement("div");
  fondo.classList.add("fondo");
  fondo.setAttribute("aria-hidden", "true");
  document.body.prepend(fondo);
}

export function crearOverlay() {
  overlayEl = document.createElement("div");
  overlayEl.classList.add("minimap-overlay");

  minimapExpandedEl = document.createElement("div");
  minimapExpandedEl.classList.add("minimap-expanded");
  listaEl = document.createElement("nav");
  listaEl.classList.add("menu-lista");
  pintarMinimapExpandido();
  const cuerpo = document.createElement("div");
  cuerpo.classList.add("menu-cuerpo");
  cuerpo.append(listaEl, minimapExpandedEl);
  overlayEl.appendChild(cuerpo);
  overlayEl.addEventListener("click", e => {
    if (e.target === overlayEl || e.target === cuerpo) cerrarMinimapExpandido();
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
  overlayEl.querySelectorAll(".minimap-expanded-cell, .menu-enlace").forEach(cell => {
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
    label.classList.add("nav-label", "nav-ir");
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
    // Con el hash vacío, o un `#buscaminas` de la entrada se queda pegado al
    // volver a la portada (la ruta no cambia) y lo arrastra el cambio de idioma.
    if (normalizar(window.location.pathname) === normalizar(ruta) && !window.location.hash) return;
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
 * de rutas) y después el hash, que sigue funcionando: los enlaces viejos de
 * fuera (`/#portfolio`, `/#contacto`…) no se pueden arreglar.
 */
export function leerURL() {
  // El hash manda cuando lo hay: los hash viejos (`#portfolio`, `#contacto`,
  // `#statement`) siguen llevando a donde fue a parar
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

/**
 * PRUEBA: al cambiar de página, la que llega entra desde el lado hacia el que
 * vas y la que se va sale por el contrario, como moverse por el mapa. El
 * fundido lo sigue haciendo el CSS (.celda / .celda.activa); esto solo añade
 * el desplazamiento, y no deja nada puesto al acabar.
 */
function deslizar(saliente, entrante) {
  if (!saliente || !entrante || saliente === entrante) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const dx = Math.sign(entrante.dataset.x - saliente.dataset.x);
  const dy = Math.sign(entrante.dataset.y - saliente.dataset.y);
  const paso = 56;
  const tiempo = { duration: 700, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" };
  saliente.animate([{ transform: "none" }, { transform: `translate(${-dx * paso}px, ${-dy * paso}px)` }], tiempo);
  entrante.animate([{ transform: `translate(${dx * paso}px, ${dy * paso}px)` }, { transform: "none" }], tiempo);
}

export function actualizarVista({ historial = true } = {}) {
  const saliente = document.querySelector(".celda.activa");
  document.querySelectorAll(".celda").forEach(c => c.classList.remove("activa"));
  const activa = document.querySelector(`.pos_${posY}_${posX}`);
  if (activa) {
    activa.classList.add("activa");
    crearNavLabels(activa);
  }
  deslizar(saliente, activa);
  actualizarHeader();
  pintarVecinosHeader();
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
    overlayEl.querySelectorAll(".minimap-expanded-cell, .menu-enlace").forEach(cell => {
      const nombre = NOMBRES_CELDAS[`${cell.dataset.y}_${cell.dataset.x}`];
      if (!nombre) return;
      const visible = traducirNombre(nombre);
      cell.textContent = visible;
      cell.setAttribute("aria-label", `Ir a ${visible}`);
    });
  }

  const activa = document.querySelector(`.pos_${posY}_${posX}`);
  if (activa) crearNavLabels(activa);
  pintarVecinosHeader();
}
