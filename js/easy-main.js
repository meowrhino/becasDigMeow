// ============================================
// EASY MAIN — "modo fácil": misma data.json que el grid, en scroll lineal.
// ============================================
//
// Reutiliza la carga de datos, el sistema de idioma y el toggle de tema del
// sitio. El header es persistente; solo se re-renderiza el cuerpo al cambiar
// de idioma (así no se acumulan listeners ni se reconstruye el toggle).
//
// Las plantillas HTML (hero, portfolio, statement…) viven en easy-template.js
// para compartirse con build-seo.js, que pre-renderiza el mismo cuerpo en el
// HTML estático (SEO). Aquí quedan la carga, el header y los inits interactivos.

import {
  cargarDatos, obtenerDatos, currentLang,
  buildLangButtons, attachLangListeners,
} from "./data.js";
import { crearThemeToggle } from "./theme.js";
import { renderBodyHTML } from "./easy-template.js";

const root = document.getElementById("easy");

// Estos inits crean observers globales y se rehacen en cada render por idioma;
// guardamos una función de limpieza para pararlos antes de re-crearlos (si no,
// se acumularían listeners). El portfolio ya no necesita una: desde que es la
// rejilla de la home, sus listeners son `{ once: true }` sobre elementos que el
// propio render sustituye.
let stmtCleanup = null;
let mtdCleanup = null;

// --- Inits interactivos (progressive enhancement sobre el cuerpo ya pintado) ---

// Portfolio: la misma rejilla que la home, ya pintada por easy-template.js. Lo
// único que necesita del navegador es apagar el skeleton de cada captura cuando
// su imagen termina de cargar — el shimmer de `.pgrid-thumb::before` solo se
// funde con la clase `.loaded`, y sin JS se quedaría encima de la imagen para
// siempre. En error también se quita: mejor un hueco que un shimmer eterno.
//
// Aquí estaba el visor grande con miniaturas: 55 líneas de carrusel (autoplay,
// flechas, teclado, pausa en hover/foco/pestaña oculta) para un patrón que no
// existía en ninguna otra pantalla del sitio.
function initPortfolio() {
  root.querySelectorAll(".pgrid-thumb").forEach(thumb => {
    const img = thumb.querySelector("img");
    if (!img) return;
    if (img.complete) { thumb.classList.add("loaded"); return; }   // ya estaba en caché
    const listo = () => thumb.classList.add("loaded");
    img.addEventListener("load", listo, { once: true });
    img.addEventListener("error", listo, { once: true });
  });
}

// Statement "karaoke": resalta la línea que cruza el centro de la pantalla.
// El rootMargin reduce la raíz a una línea horizontal en el centro del viewport,
// así solo intersecta la frase que está justo ahí. Progressive enhancement: sin
// JS las líneas se ven a opacidad plena; con reduce-motion no se atenúan.
function initStatement() {
  if (stmtCleanup) { stmtCleanup(); stmtCleanup = null; }
  const section = root.querySelector(".easy-statement");
  if (!section) return;
  const lines = [...section.querySelectorAll(".easy-statement-line")];
  if (!lines.length) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  section.classList.add("is-scrolly");
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) lines.forEach(l => l.classList.toggle("is-active", l === e.target));
    });
  }, { rootMargin: "-50% 0px -50% 0px", threshold: 0 });
  lines.forEach(l => io.observe(l));
  stmtCleanup = () => io.disconnect();
}

// Metodología: stepper de progreso. Según scrolleas, los pasos se "encienden"
// acumulativamente (insignia rellena) y la línea del raíl se llena hasta el paso
// que cruza el centro de la pantalla. Mismo truco de center-line que el statement.
function initMetodologia() {
  if (mtdCleanup) { mtdCleanup(); mtdCleanup = null; }
  const steps = root.querySelector(".easy-steps");
  if (!steps) return;
  const items = [...steps.querySelectorAll(".easy-step")];
  if (!items.length) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  steps.classList.add("is-scrolly");

  const setActive = (active) => {
    items.forEach((s, i) => {
      s.classList.toggle("is-on", i <= active);     // nº encendido (insignia rellena)
      s.classList.toggle("link-on", i < active);    // conector i→i+1 encendido
    });
  };

  // El paso que cruza el centro marca la frontera; todo lo anterior queda encendido.
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) setActive(items.indexOf(e.target)); });
  }, { rootMargin: "-50% 0px -50% 0px", threshold: 0 });
  items.forEach(s => io.observe(s));
  mtdCleanup = () => io.disconnect();
}

function renderBody(data, lang) {
  document.getElementById("easy-body").innerHTML = renderBodyHTML(data, lang);
  initPortfolio();
  initStatement();
  initMetodologia();
}

// --- Cabecera persistente + arranque ---

function construirHeader(data) {
  // El HTML llega con el cuerpo pre-renderizado (SEO). Lo limpiamos antes de
  // montar la versión viva para no duplicar contenido.
  root.innerHTML = "";

  const header = document.createElement("header");
  header.className = "easy-header";
  header.innerHTML = `
    <div class="easy-header-id">
      <a class="easy-logo" href="#top">meowrhino studio</a>
      ${buildLangButtons()}
    </div>`;
  root.appendChild(header);

  // Toggle de tema a la derecha del bloque logo + idiomas.
  crearThemeToggle(header);

  const body = document.createElement("div");
  body.id = "easy-body";
  root.appendChild(body);

  // Un único listener: al cambiar idioma, re-renderiza solo el cuerpo.
  attachLangListeners(header, (lang) => renderBody(data, lang));
}

async function init() {
  await cargarDatos();
  const data = obtenerDatos();
  if (!data) {
    root.innerHTML = `
      <div style="max-width:38rem;margin:12vh auto;padding:0 1.5rem;text-align:center;line-height:1.6;">
        <h1>meowrhino studio</h1>
        <p>No se ha podido cargar el contenido. Recarga la página o escríbeme a
           <a href="mailto:hola@meowrhino.studio">hola@meowrhino.studio</a>.</p>
      </div>`;
    return;
  }
  construirHeader(data);
  renderBody(data, currentLang);

  // Deep-link a una sección (#contacto, etc.): como el cuerpo se pinta por JS,
  // el scroll por hash del navegador llega antes de que exista el destino. Lo
  // repetimos una vez maquetado.
  if (location.hash) {
    const target = document.querySelector(location.hash);
    if (target) requestAnimationFrame(() => target.scrollIntoView());
  }
}

init();
