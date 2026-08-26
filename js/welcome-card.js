// ============================================
// WELCOME CARD — tarjetas de proyecto que rebotan y van cambiando de web.
// ============================================
//
// Las tarjetas rebotantes de la celda welcome, junto al cupón. Cada una enseña
// una captura del portfolio y enlaza a su página de proyecto.
//
// Por qué existen: el welcome era la única pantalla del sitio donde no se veía
// trabajo hecho. Esto convierte la portada en una demo silenciosa del portfolio
// y, de paso, da enlaces internos a las 20 páginas de proyecto, que es lo que
// necesitan para posicionar. Son varias porque el hint de navegación que había
// bajo el título («navega con los botones de los lados») explicaba la interfaz
// en vez de enseñar trabajo; en su lugar hay más portfolio moviéndose.
//
// Cinco decisiones que no son obvias:
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
//
//  - Las tarjetas comparten UN barajado y un registro de qué índices están a la
//    vista. Al avanzar, cada una salta los que ya enseña otra: dos tarjetas con
//    el mismo proyecto a la vez se lee como un fallo, no como una casualidad.
//    No basta con arrancarlas separadas y que avancen a la par — los rebotes
//    hacen avanzar a cada una por su cuenta y el desfase se pierde solo.
//
//  - Los cambios están DESINCRONIZADOS y se mantienen así. No basta con arrancar
//    los temporizadores desfasados: cada rebote adelanta el cambio de una sola
//    tarjeta, así que dos que empiezan separadas acaban coincidiendo solas. Por
//    eso el reloj no es un `setInterval` fijo sino un `setTimeout` que se
//    reprograma en CADA cambio (venga del tiempo o de un choque), y además hay
//    una separación mínima compartida: si la otra tarjeta acaba de cambiar, esta
//    espera. Cambiar las dos a la vez se lee como un corte de página entera en
//    vez de como dos objetos con vida propia.
//
//  - Cada una sale de la esquina más lejana a TODO lo que ya rebota (el cupón y
//    las tarjetas anteriores), no solo del cupón. Y van a velocidades distintas
//    a propósito: a la misma velocidad viajarían en paralelo y se leerían como
//    un bloque en vez de como objetos sueltos.

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
/**
 * Separación mínima entre el cambio de una tarjeta y el de cualquier otra. Si
 * al tocarle el turno la vecina acaba de cambiar, espera lo que falte.
 */
const SEPARACION = 1500;

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
 * Cuántas tarjetas y con qué carácter. El orden importa: la primera se coloca
 * antes, así que la segunda ya la esquiva al buscar su esquina.
 *
 * Velocidades distintas entre sí y distintas del cupón (que va a 90/60). Nada
 * de divisores limpios: dos objetos a 66 y 33 px/s vuelven a coincidir cada dos
 * viajes y se nota el patrón.
 */
const TARJETAS = [
  { velocidad: 66, velocidadMovil: 42, limiteRot: 7 },
  { velocidad: 51, velocidadMovil: 33, limiteRot: 9 },
];

/**
 * Renderiza las tarjetas de proyecto dentro de la celda welcome y las arranca.
 *
 * @param {HTMLElement} celda      elemento .celda.welcome
 * @param {object[]} proyectos     `data.portfolio.proyectos`
 */
export function renderWelcomeCard(celda, proyectos) {
  if (!celda || !Array.isArray(proyectos) || !proyectos.length) return;

  // Se baraja para que no salga siempre el mismo primero: la portada se ve
  // muchas veces y con un orden fijo el efecto cansa. UN solo barajado para
  // todas las tarjetas: es lo que permite repartírselas sin repetir.
  const orden = barajar(proyectos.filter(p => p?.imagen && p?.nombre));
  if (!orden.length) return;

  // Los índices que hay ahora mismo a la vista, compartidos por las tarjetas.
  const enPantalla = new Set();

  // Cuándo cambió por última vez CUALQUIERA de las tarjetas. Es lo que les
  // permite cederse el turno en vez de cambiar a la vez.
  const turno = { ultimo: -Infinity };

  // Con menos proyectos que tarjetas no hay forma de no repetir; en ese caso
  // sale una sola y ya.
  const cuantas = Math.min(TARJETAS.length, orden.length);

  TARJETAS.slice(0, cuantas).forEach((config, k) => {
    // Repartidas por el barajado, no pegadas: si arrancan en 0 y 1 las dos
    // primeras capturas son vecinas del mismo barajado y parecen relacionadas.
    // Y el primer cambio de cada una va desfasado un trozo de CADENCIA, para
    // que el reparto de turnos empiece ya separado y no tenga que corregirse.
    crearTarjeta(celda, orden, enPantalla, turno, config, {
      indice:  Math.floor(k * orden.length / cuantas),
      desfase: Math.round(CADENCIA * (k + 1) / cuantas),
    });
  });
}

/** Una tarjeta: la pinta, la traduce, la hace rotar de proyecto y rebotar. */
function crearTarjeta(celda, orden, enPantalla, turno, config, arranque) {
  celda.insertAdjacentHTML("beforeend", `
    <a class="welcome-card" href="#">
      <img class="welcome-card-img" alt="" decoding="async">
      <span class="welcome-card-pie">
        <span class="welcome-card-nombre"></span>
        <span class="welcome-card-cta"></span>
      </span>
    </a>
  `);

  const cardEl   = celda.lastElementChild;
  const imgEl    = cardEl.querySelector(".welcome-card-img");
  const nombreEl = cardEl.querySelector(".welcome-card-nombre");
  const ctaEl    = cardEl.querySelector(".welcome-card-cta");

  let i = arranque.indice;
  let ultimoCambio = 0;
  let reloj = null;
  enPantalla.add(i);

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
    const siguiente = orden[proximoIndice(i, orden.length, enPantalla)];
    if (siguiente) new Image().src = siguiente.imagen;
  };

  const avanzar = () => {
    enPantalla.delete(i);
    i = proximoIndice(i, orden.length, enPantalla);
    enPantalla.add(i);
    turno.ultimo = performance.now();
    programar();
    // El fundido lo hace el CSS al quitar la clase; con movimiento reducido la
    // transición está anulada y el cambio es directo.
    cardEl.classList.add("cambiando");
    setTimeout(() => { pintar(); cardEl.classList.remove("cambiando"); }, 180);
  };

  /** Deja el próximo cambio a `ms` de ahora, pisando el que hubiera pendiente. */
  function programar(ms = CADENCIA) {
    clearTimeout(reloj);
    reloj = setTimeout(tocaCambiar, ms);
  }

  /**
   * Le toca cambiar. Tres motivos para no hacerlo todavía, y en los tres se
   * reprograma en vez de saltarse el turno:
   *
   *  - La celda no está activa: fuera de la welcome la tarjeta no se ve y
   *    cambiarla es trabajo (y descargas) para nadie.
   *  - El puntero está encima: quien está leyendo el nombre para hacer clic no
   *    quiere que la tarjeta se le convierta en otra.
   *  - La vecina acaba de cambiar: espera lo que falte de SEPARACION.
   */
  function tocaCambiar() {
    if (!celda.classList.contains("activa") || cardEl.matches(":hover")) return programar();

    const desdeElOtro = performance.now() - turno.ultimo;
    if (desdeElOtro < SEPARACION) return programar(SEPARACION - desdeElOtro);

    avanzar();
  }

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
  programar(arranque.desfase);

  iniciarRebote(celda, cardEl, {
    velocidad: esMovil ? config.velocidadMovil : config.velocidad,
    limiteRot: config.limiteRot,
    inicio: (b) => esquinaMasLibre(celda, b, cardEl),
    // El choque no llama a `avanzar` directo: pasa por el mismo turno que el
    // reloj, así un rebote tampoco puede caer encima del cambio de la vecina.
    alChocar: () => {
      if (performance.now() - ultimoCambio > DWELL_MIN) tocaCambiar();
    },
  });
}

/**
 * El siguiente índice del barajado que no esté ya en otra tarjeta.
 *
 * Avanza de uno en uno y salta los ocupados. Con 20 proyectos y 2 tarjetas da
 * como mucho un salto; el bucle está acotado a una vuelta entera para que no
 * pueda colgarse si algún día hay tantas tarjetas como proyectos.
 */
function proximoIndice(actual, total, enPantalla) {
  for (let salto = 1; salto <= total; salto++) {
    const cand = (actual + salto) % total;
    if (!enPantalla.has(cand)) return cand;
  }
  return (actual + 1) % total;
}

/**
 * La esquina más lejana a todo lo que ya rebota en la celda.
 *
 * Las tarjetas se colocaban al azar y a menudo nacían superpuestas, que es lo
 * que peor se ve: parece un fallo de maquetación en el primer segundo de la
 * portada. Que se crucen luego, en movimiento, no molesta — para eso van por
 * debajo del cupón (--z-card < --z-cupon) y la oferta nunca queda tapada.
 *
 * Se mide contra el cupón Y contra las demás tarjetas (`excluir` es la que se
 * está colocando ahora, que ya está en el DOM). El criterio es maximizar la
 * distancia al vecino MÁS CERCANO: una esquina lejísimos del cupón pero pegada
 * a la otra tarjeta no sirve de nada.
 */
function esquinaMasLibre(celda, b, excluir) {
  const esquinas = [
    { x: b.minX, y: b.minY }, { x: b.maxX, y: b.minY },
    { x: b.minX, y: b.maxY }, { x: b.maxX, y: b.maxY },
  ];

  const rc = celda.getBoundingClientRect();
  // getBoundingClientRect ya incluye el transform del rebote, que es justo la
  // posición que nos importa.
  const centros = [...celda.querySelectorAll("#welcomeCupon, .welcome-card")]
    .filter(el => el !== excluir)
    .map(el => {
      const r = el.getBoundingClientRect();
      return { x: r.left - rc.left + r.width / 2, y: r.top - rc.top + r.height / 2 };
    });

  if (!centros.length) return esquinas[Math.floor(Math.random() * esquinas.length)];

  return esquinas.reduce((mejor, e) => {
    const d = Math.min(...centros.map(c => (e.x - c.x) ** 2 + (e.y - c.y) ** 2));
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
