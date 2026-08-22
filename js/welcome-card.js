// ============================================
// WELCOME CARD — tarjeta de proyecto que rebota y va cambiando de web.
// ============================================
//
// Segunda tarjeta rebotante de la celda welcome, junto al cupón. Enseña una
// captura del portfolio y enlaza a su página de proyecto (/proyectos/<slug>).
//
// Por qué existe: el welcome era la única pantalla del sitio donde no se veía
// trabajo hecho. Esto convierte la portada en una demo silenciosa del portfolio
// y, de paso, da enlaces internos a las 20 páginas de proyecto, que es lo que
// necesitan para posicionar.
//
// Dos decisiones que no son obvias:
//
//  - El proyecto cambia por TIEMPO (cada CADENCIA ms), no solo al rebotar. Si
//    dependiera del choque, en una pantalla ancha la tarjeta tardaría muchos
//    segundos en llegar a un borde y casi nadie vería más de dos proyectos. El
//    rebote también lo cambia, pero solo si ya lleva DWELL_MIN visible, para
//    que dos choques seguidos no provoquen un parpadeo.
//
//  - Con `prefers-reduced-motion` la tarjeta no rebota (de eso se encarga
//    rebote.js) pero SÍ sigue rotando de proyecto: quien pide menos movimiento
//    quiere que no se muevan las cosas por la pantalla, no quedarse sin ver el
//    portfolio. El cambio en ese caso es un corte seco, sin fundido.

import { currentLang, attachLangListeners } from "./data.js";
import { esMovil } from "./pages.js";
import { slugify } from "./proyecto-template.js";
import { iniciarRebote } from "./rebote.js";
import { escapeHTML } from "./utils.js";

/** Cada cuánto cambia de proyecto. */
const CADENCIA = 4500;
/** Tiempo mínimo que un proyecto permanece antes de que un rebote lo cambie. */
const DWELL_MIN = 1800;

const ETIQUETA = {
  es:  "ver el proyecto",
  en:  "see the project",
  cat: "veure el projecte",
};

/**
 * Renderiza la tarjeta de proyecto dentro de la celda welcome y la arranca.
 *
 * @param {HTMLElement} celda      elemento .celda.welcome
 * @param {object[]} proyectos     `data.portfolio.proyectos`
 */
export function renderWelcomeCard(celda, proyectos) {
  if (!celda || !Array.isArray(proyectos) || !proyectos.length) return;

  // Se baraja para que no salga siempre el mismo primero: la portada se ve
  // muchas veces y con un orden fijo el efecto cansa.
  const orden = barajar(proyectos.filter(p => p?.imagen && p?.nombre));
  if (!orden.length) return;

  celda.insertAdjacentHTML("beforeend", `
    <a class="welcome-card" id="welcomeCard" href="#" aria-live="polite">
      <img class="welcome-card-img" alt="" decoding="async">
      <span class="welcome-card-pie">
        <span class="welcome-card-nombre"></span>
        <span class="welcome-card-cta"></span>
      </span>
    </a>
  `);

  const cardEl   = celda.querySelector("#welcomeCard");
  const imgEl    = cardEl.querySelector(".welcome-card-img");
  const nombreEl = cardEl.querySelector(".welcome-card-nombre");
  const ctaEl    = cardEl.querySelector(".welcome-card-cta");

  let i = 0;
  let ultimoCambio = 0;

  const pintar = () => {
    const p = orden[i];
    const slug = slugify(p.nombre);

    imgEl.src = p.imagen;
    imgEl.alt = `${p.nombre} — web diseñada por meowrhino studio`;
    nombreEl.textContent = p.nombre;
    cardEl.href = `/proyectos/${slug}`;
    ultimoCambio = performance.now();

    // La siguiente se precarga fuera del DOM: cuando toque, ya está en caché y
    // el cambio no enseña un hueco. Solo una — precargar las 20 en la portada
    // sería tirar ancho de banda del visitante.
    const siguiente = orden[(i + 1) % orden.length];
    if (siguiente) new Image().src = siguiente.imagen;
  };

  const avanzar = () => {
    i = (i + 1) % orden.length;
    // El fundido lo hace el CSS al quitar la clase; con movimiento reducido la
    // transición está anulada y el cambio es directo.
    cardEl.classList.add("cambiando");
    setTimeout(() => { pintar(); cardEl.classList.remove("cambiando"); }, 180);
  };

  const aplicarLang = (lang) => { ctaEl.textContent = ETIQUETA[lang] || ETIQUETA.es; };
  aplicarLang(currentLang);
  attachLangListeners(celda, aplicarLang);

  pintar();

  // El temporizador solo corre con la celda activa: fuera de la welcome, la
  // tarjeta no se ve y cambiarla sería trabajo (y descargas) para nadie.
  setInterval(() => {
    if (celda.classList.contains("activa") && !cardEl.matches(":hover")) avanzar();
  }, CADENCIA);

  iniciarRebote(celda, cardEl, {
    // Más lenta que el cupón: si fueran iguales viajarían en paralelo y darían
    // sensación de bloque en vez de dos objetos sueltos.
    velocidad: esMovil ? 42 : 66,
    limiteRot: 7,
    inicio: (b) => esquinaLejosDelCupon(celda, b),
    alChocar: () => {
      if (performance.now() - ultimoCambio > DWELL_MIN) avanzar();
    },
  });
}

/**
 * La esquina más lejana al cupón.
 *
 * Las dos tarjetas se colocaban al azar y a menudo nacían superpuestas, que es
 * lo que peor se ve: parece un fallo de maquetación en el primer segundo de la
 * portada. Que se crucen luego, en movimiento, no molesta — para eso la card va
 * por debajo (--z-card < --z-cupon) y la oferta nunca queda tapada.
 */
function esquinaLejosDelCupon(celda, b) {
  const esquinas = [{ x: 0, y: 0 }, { x: b.w, y: 0 }, { x: 0, y: b.h }, { x: b.w, y: b.h }];
  const cupon = celda.querySelector("#welcomeCupon");
  if (!cupon) return esquinas[Math.floor(Math.random() * esquinas.length)];

  // Centro del cupón en coordenadas de la celda (getBoundingClientRect ya
  // incluye el transform del rebote, que es justo la posición que nos importa).
  const rc = celda.getBoundingClientRect();
  const rk = cupon.getBoundingClientRect();
  const cx = rk.left - rc.left + rk.width / 2;
  const cy = rk.top - rc.top + rk.height / 2;

  return esquinas.reduce((mejor, e) => {
    const d = (e.x - cx) ** 2 + (e.y - cy) ** 2;
    return d > mejor.d ? { ...e, d } : mejor;
  }, { ...esquinas[0], d: -1 });
}

/** Fisher-Yates sobre una copia; no toca el array de data.json. */
function barajar(xs) {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
