// ============================================
// PLANO — el mapa del lienzo, y lo puedes recolocar
// ============================================
//
// La celda a la derecha del portfolio. Enseña las secciones del sitio como
// casillas y te deja mudarlas donde quieras; se guarda en tu navegador.
//
// Por qué existe: el argumento de todo esto es que una web es un espacio
// propio, no un molde que te prestan. Escrito en el about es una frase; aquí
// se toca. Y de paso llena la casilla que dejó vacía la celda `proyectos`, que
// era el índice del portfolio contado sin las imágenes.
//
// Tres decisiones que no son obvias:
//
//  - El terreno es de 5×5 SIEMPRE. Antes crecía y encogía según lo que
//    ocupabas, y se sentía roto: al mudar una sección cambiaban solos los
//    sitios a los que podías llevar la siguiente. Los minimapas sí se ajustan
//    a lo ocupado (marcoOcupado, en navigation.js), que es donde importa que
//    no haya casillas vacías de más.
//
//  - NO se prohíbe dejar una sección sin vecinas. La primera versión lo vetaba
//    —deslizar solo ofrece las casillas ocupadas de al lado— y con esa regla
//    una sección que hiciera de puente entre dos grupos no podía moverse a
//    ningún sitio: el mapa se bloqueaba sin que se entendiera por qué. Y la
//    regla sobraba, porque clicar en el minimapa llama a setPosicion()
//    directamente, sin pedir vecindad: a una celda aislada se llega igual. Lo
//    único que pierde es que no se llegue deslizando, y eso se avisa con el
//    borde de puntos en vez de impedirse.
//
//  - Recolocar no repinta ninguna celda. `pos_Y_X` es un selector, no una
//    posición: las celdas están apiladas y solo se ve la `.activa`. Por eso
//    reconfigurarGrid() re-etiqueta divs en vez de destruirlos, y el portfolio
//    no reinicia sus ciclos de imagen al mudar nada.

import { currentLang, buildLangButtons, attachLangListeners } from "./data.js";
import { reconfigurarGrid } from "./navigation.js";

/** Lado del terreno. Cuadrado y fijo. */
const LADO = 5;

/**
 * El reparto de fábrica, centrado en el terreno.
 *
 * `welcome` cae en 2_2, que es el centro exacto del 5×5: la portada en medio,
 * como en el lienzo de siempre. Las cuatro columnas de la fila central no
 * pueden centrarse en cinco sin partir una casilla, así que la fila queda
 * pegada a la derecha y la columna libre es la 0.
 */
export const ORIGEN = Object.freeze({
  "1_2": "links",
  "2_1": "about", "2_2": "welcome", "2_3": "metodología", "2_4": "condiciones",
  "3_2": "portfolio", "3_3": "plano",
});

const GUARDADO = "meowrhino-plano";

/** El reparto guardado en este navegador, o el de fábrica. */
export function leerPlano() {
  try {
    const v = localStorage.getItem(GUARDADO);
    if (!v) return { ...ORIGEN };
    const m = JSON.parse(v);
    // Un reparto guardado con OTRA versión del sitio (una sección que ya no
    // existe, o una nueva que aún no estaba) dejaría celdas sin casilla o
    // casillas sin celda. Ante la duda, el de fábrica: es recuperable, y un
    // lienzo al que le falta una sección no lo es.
    const mismas = (a, b) => JSON.stringify(Object.values(a).sort()) === JSON.stringify(Object.values(b).sort());
    return mismas(m, ORIGEN) ? m : { ...ORIGEN };
  } catch { return { ...ORIGEN }; }
}

function guardarPlano(mapa) {
  try {
    if (esDeFabrica(mapa)) localStorage.removeItem(GUARDADO);
    else localStorage.setItem(GUARDADO, JSON.stringify(mapa));
  } catch { /* modo privado, o sin espacio: se pierde al recargar y ya está */ }
}

const esDeFabrica = (mapa) =>
  JSON.stringify(Object.entries(mapa).sort()) === JSON.stringify(Object.entries(ORIGEN).sort());

/** Del reparto al par {grid, nombres} que entiende navigation.js. */
export function aGrid(mapa) {
  const grid = Array.from({ length: LADO }, () => Array(LADO).fill(0));
  for (const clave of Object.keys(mapa)) {
    const [y, x] = clave.split("_").map(Number);
    if (grid[y] && x < LADO) grid[y][x] = 1;
  }
  return { grid, nombres: { ...mapa } };
}

/**
 * ¿Mudar `origen` a `destino` dejaría esa sección sin ninguna vecina?
 *
 * No lo impide: lo dibuja. Un intercambio nunca aísla a nadie, así que solo se
 * comprueba cuando el destino está vacío.
 */
function quedaSuelta(mapa, origen, destino) {
  if (mapa[destino]) return false;
  const tras = { ...mapa };
  delete tras[origen];
  const [y, x] = destino.split("_").map(Number);
  return ![[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dy, dx]) => tras[`${y + dy}_${x + dx}`]);
}

export function renderPlano(data) {
  const el = document.querySelector(".celda.plano");
  if (!el) return;

  const zone = data?.zoneLabels || {};
  const etiqueta = (nombre, lang) => zone[nombre]?.[lang] ?? zone[nombre]?.es ?? nombre;

  let mapa = leerPlano();
  let cogida = null;

  el.innerHTML = `
    <div class="plano-terreno" role="group" aria-label="mapa del sitio"></div>
    <button class="plano-reset" type="button" aria-label="volver al orden original">↺</button>
    ${buildLangButtons()}
  `;
  const terreno = el.querySelector(".plano-terreno");
  const reset   = el.querySelector(".plano-reset");

  // La casilla lleva la proporción de la pantalla, igual que los minimapas: el
  // mapa se parece a lo que estás mirando. Cabe a lo ancho y a lo alto, y de
  // las dos medidas manda la que apriete más.
  function medidas() {
    const gap = 10, sobra = gap * (LADO - 1);
    const proporcion = window.innerHeight > 0 ? window.innerWidth / window.innerHeight : 1;
    const porAncho = (window.innerWidth  * 0.74 - sobra) / LADO;
    const porAlto  = (window.innerHeight * 0.60 - sobra) / LADO * proporcion;
    const ancho = Math.max(26, Math.min(porAncho, porAlto));
    return { ancho, alto: ancho / proporcion };
  }

  function pintar(lang = currentLang) {
    const { ancho, alto } = medidas();
    terreno.style.gridTemplateColumns = `repeat(${LADO}, ${ancho}px)`;
    terreno.style.gridTemplateRows    = `repeat(${LADO}, ${alto}px)`;
    terreno.classList.toggle("eligiendo", cogida !== null);
    terreno.innerHTML = "";

    for (let y = 0; y < LADO; y++) {
      for (let x = 0; x < LADO; x++) {
        const k = `${y}_${x}`;
        const casilla = document.createElement("button");
        casilla.type = "button";
        casilla.dataset.k = k;
        if (mapa[k]) {
          casilla.className = "plano-seccion" + (k === cogida ? " cogida" : "");
          casilla.textContent = etiqueta(mapa[k], lang);
        } else if (cogida) {
          casilla.className = "plano-libre" + (quedaSuelta(mapa, cogida, k) ? " suelta" : "");
        } else {
          casilla.className = "plano-vacio";
          casilla.tabIndex = -1;
          casilla.setAttribute("aria-hidden", "true");
        }
        terreno.appendChild(casilla);
      }
    }
    reset.classList.toggle("visible", !esDeFabrica(mapa));
  }

  function aplicar() {
    guardarPlano(mapa);
    reconfigurarGrid(aGrid(mapa));
    pintar();
  }

  terreno.addEventListener("click", (e) => {
    const casilla = e.target.closest("[data-k]");
    if (!casilla) return;
    // El lienzo no debe ver este clic: para cuando le llegara, pintar() ya
    // habría rehecho la rejilla y el elemento pulsado estaría fuera del DOM.
    e.stopPropagation();
    const k = casilla.dataset.k;

    if (!cogida) {
      if (mapa[k]) { cogida = k; pintar(); }
    } else if (k === cogida) {
      cogida = null; pintar();
    } else if (mapa[k]) {
      const t = mapa[k]; mapa[k] = mapa[cogida]; mapa[cogida] = t;
      cogida = null; aplicar();
    } else {
      mapa[k] = mapa[cogida]; delete mapa[cogida];
      cogida = null; aplicar();
    }
  });

  reset.addEventListener("click", (e) => {
    e.stopPropagation();
    mapa = { ...ORIGEN };
    cogida = null;
    aplicar();
  });

  window.addEventListener("resize", () => pintar());
  attachLangListeners(el, (lang) => pintar(lang));
  pintar();
}
