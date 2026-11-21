// ============================================
// MAIN — Inicialización y event listeners
// ============================================
//
// Orquesta la carga de todos los módulos del studio.

import { cargarDatos, obtenerDatos, currentLang, onLangChange, actualizarEnlacesIdioma } from "./data.js";
import {
  configurarNavegacion,
  crearCeldas,
  crearZoneLabel,
  crearHeader,
  crearOverlay,
  leerURL,
  actualizarVista,
  actualizarTamanoMinimapInline,
  pintarConstelacion,
  cerrarMinimapExpandido,
  setTraductorNombres,
  refrescarTextosCeldas,
  getOverlayEl,
  irHacia,
  getNombrePagina,
} from "./navigation.js";
import {
  renderTools,
  renderWelcome,
  renderMetodologia,
  renderCondiciones,
  renderAbout,
  renderStatement,
  renderResena,
} from "./pages.js";
import { renderPortfolio } from "./portfolio.js";
import { rutaCelda, celdaDeRuta, ORIGEN } from "./rutas.js";
import { cabeceraCelda } from "./easy-template.js";
import { setupKeyboardNav, setupResizeDebounce } from "./shell.js";

// ============================================
// Orquestador de renderizado
// ============================================

async function renderizarContenido() {
  await cargarDatos();
  const data = obtenerDatos();
  if (!data) {
    const cont = document.getElementById("content");
    if (cont) {
      cont.innerHTML = `
        <div style="max-width:38rem;margin:12vh auto;padding:0 1.5rem;text-align:center;line-height:1.6;">
          <h1>meowrhino studio</h1>
          <p>No se ha podido cargar el contenido. Recarga la página o escríbeme a
             <a href="mailto:hola@meowrhino.studio">hola@meowrhino.studio</a>.</p>
        </div>`;
    }
    return;
  }

  renderTools(data);
  renderWelcome(data);
  renderMetodologia(data);
  renderCondiciones(data);
  renderPortfolio(data);
  renderAbout(data);
  renderStatement(data);
  renderResena(data);
}

// El buscaminas es la celda que menos se visita y la que más pesa, así que su
// módulo no viaja con cada página: se pide al entrar en ella, o al llegar
// directo a /buscaminas.
let buscaminasPedido = false;
function cargarBuscaminas() {
  if (buscaminasPedido || getNombrePagina() !== "buscaminas") return;
  buscaminasPedido = true;
  import("./buscaminas.js").then(m => m.renderBuscaminas());
}

/**
 * Pone en el <head> el title y la description de la celda activa.
 *
 * Cada celda es una URL con su propio HTML, pero al deslizar no se recarga:
 * sin esto la pestaña seguía con el title de la página por la que entraste
 * (estabas en el portfolio y ponía el de la portada). Los textos salen de
 * cabeceraCelda, la misma función que usa build-seo.js para el HTML servido.
 *
 * Antes de que llegue data.json no hace nada: el HTML ya trae los de la celda
 * de entrada.
 */
function sincronizarCabecera() {
  const data = obtenerDatos();
  const celda = getNombrePagina();
  if (!data || !celda) return;
  const { titulo, descripcion } = cabeceraCelda(data, celda, currentLang);
  if (titulo) document.title = titulo;
  const meta = document.querySelector('meta[name="description"]');
  if (meta && descripcion) meta.setAttribute("content", descripcion);
}

// ============================================
// Event Listeners (shell compartido)
// ============================================

setupKeyboardNav({
  getOverlayEl, cerrarMinimapExpandido,
  irHacia,
});
setupResizeDebounce({
  actualizarTamanoMinimapInline,
  pintarConstelacion,
});

// ============================================
// Inicialización
// ============================================

// El HTML llega con el contenido pre-renderizado dentro de #content (SEO, ver
// build-seo.js). Ya está oculto por CSS desde el primer pintado, pero lo
// sacamos del DOM antes de montar el grid: crearCeldas() hace appendChild
// sobre #content, así que si no, el bloque quedaría ahí de por vida.
//
// Su <h1> SÍ se queda, oculto. Cada URL del lienzo trae en su HTML el titular
// que le toca —la raíz el de la keyword, /about «¿quieres una web?»—,
// y al borrar el bloque entero desaparecía justo antes de que Google
// renderizara la página. Lo que quedaba eran los titulares de las celdas
// welcome y about, iguales en las ocho URLs: /condiciones anunciaba que era
// una página sobre «meowrhino studio». Rescatarlo cuesta tres líneas y deja el
// HTML crudo y el renderizado diciendo lo mismo.
const prerender = document.getElementById("seo-prerender");
if (prerender) {
  const titular = prerender.querySelector("h1");
  if (titular) {
    titular.classList.add("celda-h");   // oculto visualmente, no para lectores
    prerender.before(titular);
  }
  prerender.remove();
}

// La rejilla del lienzo. Cada celda es ahora una PÁGINA con su URL (ver
// RUTA_CELDAS en rutas.js): el texto de cada una vive en un solo sitio y puede
// competir por su búsqueda, en vez de amontonarse todo en la raíz.
//
// Cambios respecto a la rejilla anterior:
//   · `statement` volvió como celda en octubre de 2026: el about se quedó en
//     tres párrafos y un contacto (es la página a la que se llega para decidir
//     si escribirnos), y lo que pensamos —internet puede ser otra cosa, tu web
//     es tuya, jardines digitales— tiene su propia URL en vez de alargar esa.
//   · `contacto` se convierte en `about`: cuatro datos de contacto no sostienen
//     una página, pero quién eres y por qué haces esto sí, y el email sigue ahí.
//   · `footer` pasa a llamarse `condiciones`, que es lo que de verdad contiene.
//     Conserva la clase css `footer` para no reescribir su hoja de estilos.
//
// `proyectos` llegó a estar aquí, a la derecha del portfolio, y duró un día: era
// la lista de las 21 al lado de la rejilla de capturas, o sea lo mismo contado
// sin lo único que convence, que son las imágenes. El índice no se ha perdido:
// es el pre-render de la celda portfolio, en `/portfolio`, que es donde le sirve
// a un buscador.
//
// La rejilla sale del reparto fijo de rutas.js (ORIGEN: casilla `y_x` → celda),
// sobre un terreno de 8×8. Los minimapas dibujan solo el rectángulo ocupado.
const grid = Array.from({ length: 8 }, () => Array(8).fill(0));
for (const k of Object.keys(ORIGEN)) { const [y, x] = k.split("_"); grid[y][x] = 1; }

// El mapa de «menú» es Orión, con cada estrella donde está en el cielo
// (ascensión recta y declinación; una unidad son 1,5°, el este a la izquierda).
// Las páginas siguen a quien llega: se entra por el centro del cinturón, con la
// obra y quién la hace a un paso; encima de cada una, lo que la explica (lo que
// dicen de la obra, lo que pensamos); en la cabeza, lo de fuera; en los pies,
// el trato; y colgando del cinturón, en la espada, el juego. Saiph–Rigel no es
// del dibujo de siempre: une metodología con condiciones, que van seguidas.
const ORION = {
  pos: {
    "welcome": [0, 0],              // Alnilam, el centro del cinturón
    "portfolio": [-0.75, 0.49],     // Alnitak
    "about": [0.71, -0.6],          // Mintaka
    "reseña": [-3.15, -5.74],       // Betelgeuse, el hombro sobre portfolio
    "statement": [1.85, -5.03],     // Bellatrix, el hombro sobre about
    "links": [0.19, -7.42],         // Meissa, la cabeza
    "condiciones": [-1.92, 5.65],   // Saiph
    "metodología": [3.62, 4.67],    // Rigel
    "buscaminas": [0.16, 2.79],     // M42, la nebulosa de la espada
  },
  conex: [
    ["welcome", "portfolio"], ["welcome", "about"], ["welcome", "buscaminas"],
    ["portfolio", "reseña"], ["about", "statement"],
    ["reseña", "links"], ["statement", "links"],
    ["portfolio", "condiciones"], ["about", "metodología"], ["metodología", "condiciones"],
  ],
};

configurarNavegacion({
  grid,
  nombres: { ...ORIGEN },
  clasesCss: {
    "links": "tools",
    "about": "about",
    "statement": "statement",
    "reseña": "resena",
    "metodología": "metodologia",
    "welcome": "welcome",
    "condiciones": "footer",
    "portfolio": "portfolio",
    "buscaminas": "buscaminas",
  },
  redirects: {
    "links": ["tools"],
    // Los hash viejos siguen llevando a alguna parte: `#contacto` es ahora el
    // about y `#footer` no existe pero apunta a lo más parecido. `/#portfolio`
    // también, que fue la entrada al portfolio antes de que tuviera ruta y
    // está en enlaces de fuera.
    "about": ["contacto"],
    "condiciones": ["footer"],
  },
  posInicial: { y: 3, x: 3 },   // welcome
  editable: "meowrhino-constelacion",
  constelacion: ORION,
  onUpdate: () => { sincronizarCabecera(); actualizarEnlacesIdioma(); cargarBuscaminas(); },
  rutas: {
    de: (nombre) => rutaCelda(nombre, currentLang),
    celdaDe: (pathname) => celdaDeRuta(pathname)?.nombre ?? null,
  },
});

crearCeldas();
crearZoneLabel();
crearHeader();
crearOverlay();
leerURL();
renderizarContenido().then(() => {
  // Zone labels traducibles: los identificadores de celda (hash, clase css)
  // NO cambian; solo el texto visible. Los que faltan en `zoneLabels` (o los 3
  // idiomas iguales: portfolio, tools, links…) se muestran con su identificador.
  const data = obtenerDatos();
  const zoneLabels = data?.zoneLabels || {};
  setTraductorNombres((nombre) => {
    const t = zoneLabels[nombre];
    return t ? (t[currentLang] ?? t.es ?? nombre) : nombre;
  });
  actualizarVista();
  refrescarTextosCeldas();       // aplica traducción al minimapa expandido
  onLangChange(refrescarTextosCeldas);
  onLangChange(sincronizarCabecera);
});
