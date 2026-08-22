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
// Tres decisiones que no son obvias:
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
//
//  - NO lleva `aria-live`. Lo llevaba, y con un cambio cada 4,5 s convertía a
//    la tarjeta en un altavoz que interrumpía al lector de pantalla para
//    siempre. Es un escaparate decorativo, no un aviso de estado: quien navegue
//    con lector la encuentra como un enlace más cuando le toque.

import { currentLang, attachLangListeners } from "./data.js";
import { esMovil } from "./pages.js";
import { slugify } from "./proyecto-template.js";
import { iniciarRebote } from "./rebote.js";
import { rutaProyectos } from "./rutas.js";
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

/** Alt de la captura, por idioma. */
const ALT = {
  es:  (n) => `${n} — web diseñada por meowrhino studio`,
  en:  (n) => `${n} — website designed by meowrhino studio`,
  cat: (n) => `${n} — web dissenyada per meowrhino studio`,
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
    <a class="welcome-card" id="welcomeCard" href="#">
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

    imgEl.src = p.imagen;
    nombreEl.textContent = p.nombre;
    // El destino y los textos dependen del idioma: en /en y /ca la card
    // enlazaba a la página castellana, que es mandar al visitante inglés a la
    // versión que no es teniendo la suya.
    aplicarLang(currentLang);
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

  // Repinta todo lo que depende del idioma sobre el proyecto que se ve AHORA:
  // el destino, el pie y el alt. Lo llaman `pintar` (al cambiar de proyecto) y
  // el listener de idioma (al cambiar de idioma sin cambiar de proyecto).
  function aplicarLang(lang) {
    const p = orden[i];
    ctaEl.textContent = ETIQUETA[lang] || ETIQUETA.es;
    imgEl.alt = (ALT[lang] || ALT.es)(p.nombre);
    cardEl.href = `${rutaProyectos(lang)}/${slugify(p.nombre)}`;
  }
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
  const esquinas = [
    { x: b.minX, y: b.minY }, { x: b.maxX, y: b.minY },
    { x: b.minX, y: b.maxY }, { x: b.maxX, y: b.maxY },
  ];
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
