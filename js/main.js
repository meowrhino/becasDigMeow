// ============================================
// MAIN — Inicialización y event listeners
// ============================================
//
// Orquesta la carga de todos los módulos del studio.

import { cargarDatos, obtenerDatos, currentLang, onLangChange } from "./data.js";
import {
  configurarNavegacion,
  crearCeldas,
  crearZoneLabel,
  crearHeader,
  crearOverlay,
  leerURL,
  actualizarVista,
  actualizarTamanoMinimapInline,
  actualizarTamanoMinimapExpandido,
  cerrarMinimapExpandido,
  setTraductorNombres,
  refrescarTextosCeldas,
  getOverlayEl,
  getGrid,
  getPosicion,
  setPosicion,
} from "./navigation.js";
import {
  renderTools,
  renderWelcome,
  renderMetodologia,
  renderCondiciones,
  renderAbout,
} from "./pages.js";
import { renderPlano, leerPlano, aGrid } from "./plano.js";
import { renderPortfolio } from "./portfolio.js";
import { rutaCelda, celdaDeRuta } from "./rutas.js";
import { crearThemeToggle } from "./theme.js";
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
  renderPlano(data);
  renderAbout(data);
}

// ============================================
// Event Listeners (shell compartido)
// ============================================

setupKeyboardNav({
  getOverlayEl, cerrarMinimapExpandido,
  getGrid, getPosicion, setPosicion, actualizarVista,
});
setupResizeDebounce({
  actualizarTamanoMinimapInline,
  actualizarTamanoMinimapExpandido,
});

// ============================================
// Inicialización
// ============================================

// El HTML llega con el contenido pre-renderizado dentro de #content (SEO, ver
// build-seo.js). Ya está oculto por CSS desde el primer pintado, pero lo
// sacamos del DOM antes de montar el grid: crearCeldas() hace appendChild
// sobre #content, así que si no, el bloque quedaría ahí de por vida.
document.getElementById("seo-prerender")?.remove();

// La rejilla del lienzo. Cada celda es ahora una PÁGINA con su URL (ver
// RUTA_CELDAS en rutas.js): el texto de cada una vive en un solo sitio y puede
// competir por su búsqueda, en vez de amontonarse todo en la raíz.
//
// Cambios respecto a la rejilla anterior:
//   · `statement` desaparece como celda: sus líneas son ahora la entrada del
//     about, que es donde se explica qué es esto. Como pantalla aparte eran un
//     cartel de cinco frases.
//   · `contacto` se convierte en `about`: cuatro datos de contacto no sostienen
//     una página, pero quién eres y por qué haces esto sí, y el email sigue ahí.
//   · `footer` pasa a llamarse `condiciones`, que es lo que de verdad contiene.
//     Conserva la clase css `footer` para no reescribir su hoja de estilos.
//
// `proyectos` llegó a estar aquí, a la derecha del portfolio, y duró un día: era
// la lista de las 21 al lado de la rejilla de capturas, o sea lo mismo contado
// sin lo único que convence, que son las imágenes. El índice no se ha perdido —
// vive en `/proyectos` como página lineal, que es donde le sirve a un buscador—
// pero ya no ocupa una casilla del mapa.
//
// La rejilla ya no se escribe aquí: sale del reparto que tenga guardado este
// navegador (js/plano.js), que de fábrica es el de siempre —links arriba, la
// fila central, portfolio abajo— colocado en un terreno de 5×5 y con `plano` a
// la derecha del portfolio. Quien no haya tocado nada ve exactamente lo mismo
// que antes: los minimapas dibujan solo el rectángulo ocupado, no las 25
// casillas del terreno.
const reparto = leerPlano();

configurarNavegacion({
  ...aGrid(reparto),
  clasesCss: {
    "links": "tools",
    "about": "about",
    "metodología": "metodologia",
    "welcome": "welcome",
    "condiciones": "footer",
    "portfolio": "portfolio",
    "plano": "plano",
  },
  redirects: {
    "links": ["tools"],
    // Los hash viejos siguen llevando a alguna parte: `#contacto` es ahora el
    // about, y `#footer` y `#statement` no existen pero apuntan a lo más
    // parecido. Hay 66 fichas de proyecto enlazando a `/#portfolio`.
    "about": ["contacto"],
    "condiciones": ["footer"],
    "welcome": ["statement"],
  },
  // La portada, esté donde esté: con el reparto de fábrica es 2_2, pero si
  // alguien la ha mudado, entrar sigue siendo entrar por la portada.
  posInicial: (() => {
    const [y, x] = (Object.entries(reparto).find(([, n]) => n === "welcome")?.[0] ?? "2_2")
      .split("_").map(Number);
    return { y, x };
  })(),
  rutas: {
    de: (nombre) => rutaCelda(nombre, currentLang),
    celdaDe: (pathname) => celdaDeRuta(pathname)?.nombre ?? null,
  },
});

crearCeldas();
crearZoneLabel();
crearHeader();
crearOverlay();
crearThemeToggle(getOverlayEl());
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
});
