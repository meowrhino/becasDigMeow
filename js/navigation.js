// ============================================
// NAVIGATION — Grid, celdas, minimaps, nav labels, hash
// ============================================
//
// Configurable: cada página (studio, archive) pasa su
// propio grid, nombres y callbacks mediante configurarNavegacion().

import { MODOS, modoActual, aplicarModo, nombreModo } from "./theme.js";

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

// --- La constelación: el lienzo como grafo ---
// Las celdas siguen teniendo su casilla (`pos_Y_X`, que es solo un selector),
// pero a dónde se va desde cada una ya no lo decide la rejilla: lo deciden las
// conexiones. De fábrica salen de la rejilla (cada celda con las de al lado), y
// quien visita puede mover las estrellas y unirlas a su gusto en «menú».
let POS = {};        // nombre → [x, y] en unidades de casilla, con decimales
let CONEX = [];      // pares [a, b] de nombres de celda
let FABRICA = null;  // { pos, conex } sin tocar, para «restablecer»
let GUARDADO = null; // clave de sessionStorage; sin ella el mapa no se edita

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
export function configurarNavegacion({ grid, nombres, clasesCss, posInicial, onUpdate, redirects, rutas, editable }) {
  GRID = grid;
  NOMBRES_CELDAS = nombres;
  CLASE_CSS = clasesCss || {};
  REDIRECTS = redirects || {};
  posY = posInicial?.y ?? 0;
  posX = posInicial?.x ?? 0;
  onVistaActualizadaCb = onUpdate || null;
  rutaDe = typeof rutas?.de === "function" ? rutas.de : null;
  celdaDeRutaFn = typeof rutas?.celdaDe === "function" ? rutas.celdaDe : null;
  GUARDADO = editable || null;
  FABRICA = deFabrica();
  ({ pos: POS, conex: CONEX } = leerConstelacion() || structuredClone(FABRICA));

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

/**
 * La constelación que sale de la rejilla: cada celda en su casilla, unida a las
 * de al lado.
 *
 * Cada visita sale un poco distinta: cada estrella se aparta de su casilla
 * hasta un 20%. No más, porque las flechas del teclado buscan la conectada que
 * queda en esa dirección y con más desorden dejarían de acertar.
 */
function deFabrica() {
  const pos = {}, conex = [];
  const baile = () => (Math.random() - 0.5) * 0.4;
  for (const [clave, nombre] of Object.entries(NOMBRES_CELDAS)) {
    const [y, x] = clave.split("_").map(Number);
    pos[nombre] = [x + baile(), y + baile()];
    for (const [dy, dx] of [[0, 1], [1, 0]]) {
      const vecina = NOMBRES_CELDAS[`${y + dy}_${x + dx}`];
      if (vecina) conex.push([nombre, vecina]);
    }
  }
  return { pos, conex };
}

/**
 * Lo que dejó esta pestaña al editar el mapa, si sigue valiendo. En
 * sessionStorage y no en localStorage: un mapa desordenado hace meses, en una
 * visita que no tiene nada que ver, se lee como que el sitio está roto.
 */
function leerConstelacion() {
  if (!GUARDADO) return null;
  try {
    const g = JSON.parse(sessionStorage.getItem(GUARDADO));
    const nombres = Object.values(NOMBRES_CELDAS);
    const vale = g && nombres.every(n => Array.isArray(g.pos?.[n])) &&
      g.conex.every(par => par.every(n => nombres.includes(n)));
    return vale ? g : null;
  } catch { return null; }
}

function guardarConstelacion() {
  try { sessionStorage.setItem(GUARDADO, JSON.stringify({ pos: POS, conex: CONEX })); }
  catch { /* modo privado o sin espacio: se pierde al recargar y ya está */ }
}

/**
 * Las celdas unidas a `nombre`, con hacia dónde cae cada una. En el sentido del
 * reloj empezando por arriba (arriba, derecha, abajo, izquierda): es el orden de
 * la barra. El octavo de vuelta de más es para que «arriba» siga siendo la
 * primera aunque caiga un poco a la izquierda.
 */
function conectadas(nombre = getNombrePagina()) {
  const [x0, y0] = POS[nombre] || [0, 0];
  const giro = ({ dx, dy }) => (Math.atan2(dx, -dy) + Math.PI * 2.25) % (Math.PI * 2);
  return CONEX.filter(par => par.includes(nombre))
    .map(([a, b]) => (a === nombre ? b : a))
    .map(n => ({ nombre: n, dx: POS[n][0] - x0, dy: POS[n][1] - y0 }))
    .sort((p, q) => giro(p) - giro(q));
}

/** Flechas del teclado: a la conectada que cae en esa dirección (a menos de 45°). */
export function irHacia(dx, dy) {
  const mejor = conectadas()
    .map(c => ({ ...c, cos: (c.dx * dx + c.dy * dy) / Math.hypot(c.dx, c.dy) }))
    .sort((a, b) => b.cos - a.cos)[0];
  if (!(mejor?.cos >= 0.7)) return;
  irACeldaLlamada(mejor.nombre);
  actualizarVista();
}

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
 * Es lo que dibuja el minimapa de la esquina, y el marco del mapa de «menú».
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
let menuBtn = null;

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

const TEXTOS = {
  es: { menu: "menú", cerrar: "cerrar", editar: "editar mapa", hecho: "hecho", restablecer: "restablecer",
        ayuda: "arrastra una página para moverla · pulsa dos para unirlas o separarlas" },
  en: { menu: "menu", cerrar: "close", editar: "edit map", hecho: "done", restablecer: "reset",
        ayuda: "drag a page to move it · tap two to join or split them" },
  ca: { menu: "menú", cerrar: "tancar", editar: "editar mapa", hecho: "fet", restablecer: "restablir",
        ayuda: "arrossega una pàgina per moure-la · prem-ne dues per unir-les o separar-les" },
};
const textos = () => TEXTOS[document.documentElement.lang] || TEXTOS.es;

/** Un botón suelto entre los controles de abajo (los del mapa, con «menú» abierto). */
function botonControl(texto, alPulsar) {
  const boton = document.createElement("button");
  boton.type = "button";
  boton.classList.add("menu-btn", "control-btn");
  boton.textContent = texto;
  boton.addEventListener("click", alPulsar);
  controlesEl.appendChild(boton);
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

  // Los controles van aparte, abajo a la derecha, y cada uno despliega lo suyo:
  // vista (solo en el portfolio), zoom (solo en las páginas de texto), modo e idioma.
  controlesEl.innerHTML = "";
  const en = document.documentElement.lang === "en";
  const cat = document.documentElement.lang === "ca";
  const abierto = !!overlayEl?.classList.contains("visible");
  const t = textos();
  if (menuBtn) menuBtn.textContent = abierto ? t.cerrar : t.menu;

  // Con «menú» abierto, lo del mapa va aquí, en la fila de los controles; y
  // vista y zoom se quitan, que son de la página que queda tapada.
  if (abierto && GUARDADO) {
    const cambiar = (hacer) => () => { hacer(); elegida = null; pintarConstelacion(); pintarVecinosHeader(); };
    if (editando) {
      botonControl(t.restablecer, cambiar(() => {
        ({ pos: POS, conex: CONEX } = structuredClone(FABRICA));
        try { sessionStorage.removeItem(GUARDADO); } catch { /* sin storage no había nada guardado */ }
      }));
      botonControl(t.hecho, cambiar(() => { editando = false; }));
    } else {
      botonControl(t.editar, cambiar(() => { editando = true; }));
    }
  }

  // vista(lista): lista o rejilla
  const vistas = abierto ? [] : [...(activa?.querySelectorAll(".pvista-btn") || [])];
  const vistaActiva = vistas.find(v => v.classList.contains("is-active"));
  if (vistaActiva) {
    desplegable(`${en ? "view" : "vista"}(${vistaActiva.textContent})`, vistas.map(orig => ({
      texto: orig.textContent,
      activa: orig === vistaActiva,
      alPulsar: () => { orig.click(); pintarVecinosHeader(); },
    })));
  }

  // zoom(100%): solo en las páginas de texto; despliega el − y el +
  if (!abierto && activa?.querySelector(".footer-bottom-bar")) {
    const cambiar = (paso) => {
      zoomIdx = Math.min(ZOOMS.length - 1, Math.max(0, zoomIdx + paso));
      document.documentElement.style.setProperty("--zoom", ZOOMS[zoomIdx] / 100);
      window.dispatchEvent(new Event("resize"));   // los degradados de scroll se recalculan
      zoom.querySelector("summary").textContent = `zoom(${ZOOMS[zoomIdx]}%)`;
    };
    const zoom = desplegable(`zoom(${ZOOMS[zoomIdx]}%)`, [
      { texto: "−", nombre: en ? "smaller text" : "letra más pequeña", alPulsar: () => cambiar(-1) },
      { texto: "+", nombre: en ? "larger text" : "letra más grande", alPulsar: () => cambiar(1) },
    ]);
  }

  // modo(claro): claro, oscuro y los tintes (js/theme.js). En el mapa, solo
  // claro y oscuro, y de tercero el tinte que llevas, si llevas uno.
  const modo = modoActual();
  const modos = abierto ? [...new Set(["claro", "oscuro", modo])] : Object.keys(MODOS);
  desplegable(`${en || cat ? "mode" : "modo"}(${nombreModo(modo)})`, modos.map(m => ({
    texto: nombreModo(m),
    activa: m === modo,
    alPulsar: () => { aplicarModo(m); pintarVecinosHeader(); },
  })));

  // idioma(es): despliega los tres
  const langActual = document.querySelector(".lang-btn.is-active")?.dataset.lang;
  if (langActual) {
    desplegable(`${langActual === "en" ? "language" : "idioma"}(${langActual})`, IDIOMAS.map(l => ({
      texto: l,
      activa: l === langActual,
      alPulsar: () => document.querySelector(`.lang-btn[data-lang="${l}"]`)?.click(),
    })));
  }

  // Las páginas unidas a esta. Con el mapa abierto sobran: están en el mapa.
  if (abierto) return;
  conectadas().forEach(({ nombre }) => {
    botonBarra(traducirNombre(nombre), "pagina", () => {
      irACeldaLlamada(nombre);
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

/** Rellena el minimapa de la esquina con el rectángulo ocupado. */
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
  // En la esquina, las páginas unidas a esta y «menú», que abre y cierra el
  // mapa. El minimapa pequeño sigue en el DOM pero el CSS lo esconde.
  vecinosEl = document.createElement("nav");
  vecinosEl.classList.add("menu-vecinos");
  headerEl.appendChild(vecinosEl);
  menuBtn = document.createElement("button");
  menuBtn.classList.add("menu-btn");
  menuBtn.textContent = textos().menu;
  menuBtn.addEventListener("click", () =>
    overlayEl?.classList.contains("visible") ? cerrarMinimapExpandido() : abrirMinimapExpandido());
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

// --- El mapa de «menú»: la constelación ---
//
// Cada página es una estrella (un punto y su nombre) y cada conexión una línea.
// Se colocan en porcentajes sobre `.constelacion`, así que redimensionar no
// pide recalcular nada. Con «editar mapa» las estrellas se arrastran y, pulsando
// dos, se unen o se separan; se guarda mientras dure la pestaña.

let overlayEl = null;
let cieloEl = null;
let ayudaEl = null;
let editando = false;
let elegida = null;      // en edición: la estrella pulsada, esperando pareja
let saltarClic = false;  // el clic que llega al soltar un arrastre no cuenta

/** El marco del dibujo, en casillas: lo ocupado más media de aire por lado. */
function marcoCielo() {
  const { y0, y1, x0, x1 } = marcoOcupado();
  return { x0: x0 - 0.5, y0: y0 - 0.5, ancho: x1 - x0 + 1, alto: y1 - y0 + 1 };
}

/**
 * En qué esquina del punto va el nombre: abajo a la derecha si puede, y si no
 * la esquina que menos estorbe. Por orden de gravedad: salirse de la pantalla,
 * pisar un nombre ya puesto (`puestas`), tapar otra estrella (`puntos`) y que
 * le pase por detrás una línea propia. Todo en píxeles de pantalla, que es
 * donde se pisan o no; `cw` y `ch` son lo que mide ahí una casilla.
 */
function ladoEtiqueta(nombre, [px, py], [ancho, alto], [cw, ch], puestas, puntos) {
  const lineas = conectadas(nombre);
  const mejor = [["abajo-der", 1, 1], ["abajo-izq", -1, 1], ["arriba-der", 1, -1], ["arriba-izq", -1, -1]]
    .map(([clase, sx, sy]) => {
      const x0 = sx > 0 ? px + 6 : px - 6 - ancho, y0 = sy > 0 ? py + 4 : py - 4 - alto;
      const caja = { x0, y0, x1: x0 + ancho, y1: y0 + alto };
      const pisa = (c) => c.x0 < caja.x1 && c.x1 > caja.x0 && c.y0 < caja.y1 && c.y1 > caja.y0;
      const coste =
        (x0 < 0 || caja.x1 > window.innerWidth ? 10 : 0) +
        5 * puestas.filter(pisa).length +
        3 * puntos.filter(([x, y]) => pisa({ x0: x - 5, x1: x + 5, y0: y - 5, y1: y + 5 })).length +
        lineas.filter(({ dx, dy }) => {
          const x = dx * cw * sx, y = dy * ch * sy;
          return x > 0 && y > -0.18 * x && y < 2.7 * x;
        }).length;
      return { clase, caja, coste };
    })
    .sort((a, b) => a.coste - b.coste)[0];
  puestas.push(mejor.caja);
  return mejor.clase;
}

export function pintarConstelacion() {
  if (!cieloEl) return;
  const m = marcoCielo();
  const pct = ([x, y]) => [(x - m.x0) / m.ancho * 100, (y - m.y0) / m.alto * 100];
  const actual = getNombrePagina();
  const caja = cieloEl.getBoundingClientRect();
  const casilla = [caja.width / m.ancho || 1, caja.height / m.alto || 1];
  const enPantalla = (nombre) => { const [x, y] = pct(POS[nombre]); return [caja.left + x / 100 * caja.width, caja.top + y / 100 * caja.height]; };
  const puntos = Object.values(NOMBRES_CELDAS).map(enPantalla), puestas = [];
  // Lo que ocupa un nombre, a ojo: basta para saber si pisa algo o se sale.
  const letra = window.innerWidth <= 768 ? 11.2 : 12.5;

  cieloEl.classList.toggle("editando", editando);
  cieloEl.classList.remove("con-foco");
  if (ayudaEl) { ayudaEl.textContent = textos().ayuda; ayudaEl.hidden = !editando; }

  cieloEl.innerHTML = `<svg aria-hidden="true">${CONEX.map(([a, b]) => {
    const [x1, y1] = pct(POS[a]), [x2, y2] = pct(POS[b]);
    const mia = a === actual || b === actual ? ' class="mia"' : "";
    return `<line${mia} data-a="${a}" data-b="${b}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%" pathLength="1"/>`;
  }).join("")}</svg>`;

  for (const nombre of Object.values(NOMBRES_CELDAS)) {
    const [x, y] = pct(POS[nombre]);
    const visible = traducirNombre(nombre);
    const estrella = document.createElement("button");
    estrella.type = "button";
    const medida = [visible.length * letra * 0.62 + 8, letra * 1.5];
    estrella.className = `estrella ${ladoEtiqueta(nombre, enPantalla(nombre), medida, casilla, puestas, puntos)}`;
    estrella.classList.toggle("activa", nombre === actual);
    estrella.classList.toggle("elegida", nombre === elegida);
    estrella.dataset.nombre = nombre;
    estrella.style.left = `${x}%`;
    estrella.style.top = `${y}%`;
    estrella.setAttribute("aria-label", `Ir a ${visible}`);
    estrella.innerHTML = `<span class="estrella-punto"></span><span class="estrella-nombre"></span>`;
    estrella.lastChild.textContent = visible;
    cieloEl.appendChild(estrella);
  }
}

/** Al pasar por una estrella: ella, sus líneas y las que tiene unidas; el resto se apaga. */
function enfocar(nombre) {
  const cerca = new Set(nombre ? [nombre, ...conectadas(nombre).map(c => c.nombre)] : []);
  cieloEl.classList.toggle("con-foco", !!nombre);
  cieloEl.querySelectorAll(".estrella").forEach(e => e.classList.toggle("en-foco", cerca.has(e.dataset.nombre)));
  cieloEl.querySelectorAll("line").forEach(l => l.classList.toggle("en-foco", l.dataset.a === nombre || l.dataset.b === nombre));
}

function alPulsarEstrella(nombre) {
  if (!editando) {
    irACeldaLlamada(nombre);
    actualizarVista();
    setTimeout(cerrarMinimapExpandido, 650);
    return;
  }
  // En edición: la primera se queda elegida; la segunda se une a ella, o se
  // separa si ya lo estaban.
  if (elegida && elegida !== nombre) {
    const i = CONEX.findIndex(par => par.includes(elegida) && par.includes(nombre));
    if (i >= 0) CONEX.splice(i, 1); else CONEX.push([elegida, nombre]);
    guardarConstelacion();
    elegida = null;
  } else {
    elegida = elegida ? null : nombre;
  }
  pintarConstelacion();
}

/** En edición, arrastrar una estrella la mueve; las líneas la siguen. */
function empezarArrastre(e) {
  const estrella = e.target.closest(".estrella");
  if (!editando || !estrella) return;
  const nombre = estrella.dataset.nombre;
  const caja = cieloEl.getBoundingClientRect(), m = marcoCielo();
  let movida = false;

  const mover = (ev) => {
    if (!movida && Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < 5) return;
    movida = true;
    const fx = Math.min(1, Math.max(0, (ev.clientX - caja.left) / caja.width));
    const fy = Math.min(1, Math.max(0, (ev.clientY - caja.top) / caja.height));
    POS[nombre] = [m.x0 + fx * m.ancho, m.y0 + fy * m.alto];
    estrella.style.left = `${fx * 100}%`;
    estrella.style.top = `${fy * 100}%`;
    cieloEl.querySelectorAll("line").forEach(l => {
      if (l.dataset.a === nombre) { l.setAttribute("x1", `${fx * 100}%`); l.setAttribute("y1", `${fy * 100}%`); }
      if (l.dataset.b === nombre) { l.setAttribute("x2", `${fx * 100}%`); l.setAttribute("y2", `${fy * 100}%`); }
    });
  };
  const soltar = () => {
    window.removeEventListener("pointermove", mover);
    window.removeEventListener("pointerup", soltar);
    window.removeEventListener("pointercancel", soltar);
    if (!movida) return;   // fue un toque: lo lleva el `click`
    saltarClic = true;
    setTimeout(() => { saltarClic = false; }, 0);
    guardarConstelacion();
    pintarConstelacion();
  };
  window.addEventListener("pointermove", mover);
  window.addEventListener("pointerup", soltar);
  window.addEventListener("pointercancel", soltar);
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
  cieloEl = document.createElement("div");
  cieloEl.classList.add("constelacion");
  ayudaEl = document.createElement("p");
  ayudaEl.classList.add("constelacion-ayuda");
  ayudaEl.hidden = true;
  overlayEl.append(ayudaEl, cieloEl);

  overlayEl.addEventListener("click", (e) => {
    if (saltarClic) return;
    const estrella = e.target.closest(".estrella");
    if (estrella) alPulsarEstrella(estrella.dataset.nombre);
    else if (editando) { elegida = null; pintarConstelacion(); }
    else cerrarMinimapExpandido();
  });
  cieloEl.addEventListener("pointerdown", empezarArrastre);
  const foco = (e) => enfocar(e.target.closest?.(".estrella")?.dataset.nombre);
  cieloEl.addEventListener("mouseover", foco);
  cieloEl.addEventListener("focusin", foco);
  cieloEl.addEventListener("mouseleave", () => enfocar(null));
  cieloEl.addEventListener("focusout", () => enfocar(null));

  document.body.appendChild(overlayEl);
  pintarConstelacion();
}

function abrirMinimapExpandido() {
  overlayEl.classList.add("visible");
  document.body.classList.add("menu-abierto");
  pintarConstelacion();
  // Al abrir, las líneas se trazan; la clase se quita para que repintar (ir a
  // otra página, editar) no las vuelva a trazar.
  cieloEl.classList.add("abriendo");
  setTimeout(() => cieloEl.classList.remove("abriendo"), 900);
  pintarVecinosHeader();
}

export function cerrarMinimapExpandido() {
  editando = false;
  elegida = null;
  overlayEl.classList.remove("visible");
  document.body.classList.remove("menu-abierto");
  pintarVecinosHeader();
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
  // Hacia dónde cae la que llega, según el mapa. Solo cuenta el eje en el que
  // de verdad te mueves: el desorden de una estrella no es una diagonal.
  const [x0, y0] = POS[saliente.dataset.nombre] || [], [x1, y1] = POS[entrante.dataset.nombre] || [];
  const eje = (d) => (Math.abs(d) > 0.5 ? Math.sign(d) : 0);
  const dx = eje(x1 - x0), dy = eje(y1 - y0);
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
  pintarConstelacion();
  actualizarURL(historial);
  if (onVistaActualizadaCb) onVistaActualizadaCb();
}

/**
 * Re-pinta el TEXTO VISIBLE de las celdas con el traductor actual: zone label,
 * nav labels de la celda activa y los nombres del mapa de «menú». Llamar tras setTraductorNombres() y en cada
 * cambio de idioma. No toca identificadores internos ni el hash.
 */
export function refrescarTextosCeldas() {
  actualizarZoneLabel();

  pintarConstelacion();

  const activa = document.querySelector(`.pos_${posY}_${posX}`);
  if (activa) crearNavLabels(activa);
  pintarVecinosHeader();
}
