// ============================================
// BUSCAMINAS — la celda de debajo del mapa
// ============================================
//
// Por qué está aquí: el about dice que una web no solo cuenta lo que haces,
// también lo cuenta cómo lo enseña, y pone de ejemplo un buscaminas. Tenerlo
// escrito y no tenerlo puesto era justo lo que el párrafo critica. Así que la
// casilla de debajo del mapa, que estaba vacía, es el ejemplo funcionando.
//
// La lógica (Cell, Board, primera casilla siempre segura, flood fill, el ciclo
// bandera → interrogante → nada) viene de github.com/meowrhino/minesweeperV2 y
// está portada casi tal cual. Lo que cambia es todo lo de fuera:
//
//  - No hay pantalla de logo, ni marca, ni menú de inicio: esto ya está DENTRO
//    del sitio, y al entrar ya hay una partida fácil empezada.
//  - No hay puntos. En la versión suelta el marcador daba una razón para
//    volver; dentro de una celda solo era un número más peleando por el poco
//    sitio que hay. Queda el tiempo, que es lo que de verdad se compara, y el
//    mejor de cada nivel guardado en este navegador (igual que el mapa guarda
//    dónde has puesto cada sección).
//  - El tablero se mide contra la celda, no contra la ventana: aquí dentro hay
//    padding de 10dvh/10dvw y dos bordes ocupados que también cuentan.
//  - Los controles van en los bordes de la celda, como en el resto del lienzo.
//  - Los textos van por idioma, como el resto del lienzo.
//
// La celda NO tiene ruta propia, igual que `portfolio`: se entra por el lienzo
// o por `/#buscaminas`. Un buscaminas no es una página que un buscador pueda
// leer, y darle URL solo serviría para generar un html vacío en tres idiomas.

import { currentLang, buildLangButtons, attachLangListeners } from "./data.js";
import { bordeCelda } from "./navigation.js";

/**
 * Las densidades del minesweeper de toda la vida, que es lo que de verdad
 * define la dificultad: 12,5% en principiante, 15,6% en intermedio y 20,6% en
 * experto. El tamaño del tablero es solo cuánto rato dura la partida.
 *
 * Los dos primeros niveles llevan su tablero escrito porque es el clásico y no
 * hay nada que decidir. El difícil NO: el experto original es 30×16, apaisado,
 * y aquí la celda es alta y estrecha en un móvil. En vez de encoger el 30×16
 * hasta que no se pueda tocar, se mide el hueco, se saca el tablero más grande
 * que cabe con casillas cómodas y se calculan las minas para clavar la misma
 * densidad. Así la partida es igual de difícil en un móvil que en un portátil,
 * que es lo que la densidad significa.
 *
 * `minasPara` está suelta a propósito: el día que haya un nivel a medida, esto
 * ya es la fórmula.
 */
const DENSIDADES = { principiante: 0.125, intermedio: 0.156, experto: 0.206 };

/** Las minas que le tocan a un tablero de w×h para una densidad dada. */
export const minasPara = (w, h, densidad) =>
  Math.max(1, Math.min(w * h - 1, Math.round(w * h * densidad)));

const NIVELES = {
  easy:   { w: 8,  h: 8,  minas: 8 },    // 12,5%, el principiante clásico
  medium: { w: 16, h: 16, minas: 40 },   // 15,6%, el intermedio clásico tal cual
  hard:   { densidad: DENSIDADES.experto },
};

/** Casilla cómoda de tocar. Es el objetivo del tablero que se calcula, no un
 *  mínimo: si no cabe, ladoCasilla() lo aprieta luego hasta donde haga falta. */
const LADO_COMODO = 24;

/** Límites del tablero calculado: ni un pañuelo ni una hoja de cálculo. */
const LADOS = { min: 10, max: 30 };

/**
 * Los textos, por idioma. Van aquí y no en data.json a propósito: data.json es
 * el contenido del estudio (lo que se dice y se traduce), y esto son etiquetas
 * de interfaz de un juego, como las de easy-template.js.
 */
const T = {
  es: {
    ayuda: "clic para abrir · clic derecho para marcar",
    niveles: { easy: "fácil", medium: "medio", hard: "difícil" },
    minas: "minas", tiempo: "tiempo", mejor: "mejor",
    revelar: "abrir", marcar: "marcar",
    gano: "despejado", perdio: "boom",
    otra: "otra vez",
  },
  en: {
    ayuda: "click to open · right click to flag",
    niveles: { easy: "easy", medium: "medium", hard: "hard" },
    minas: "mines", tiempo: "time", mejor: "best",
    revelar: "open", marcar: "flag",
    gano: "cleared", perdio: "boom",
    otra: "again",
  },
  cat: {
    ayuda: "clic per obrir · clic dret per marcar",
    niveles: { easy: "fàcil", medium: "mitjà", hard: "difícil" },
    minas: "mines", tiempo: "temps", mejor: "millor",
    revelar: "obrir", marcar: "marcar",
    gano: "netejat", perdio: "boom",
    otra: "un altre cop",
  },
};

const t = (lang) => T[lang] ?? T.es;

// --- El mejor tiempo de cada nivel, en este navegador ---

const GUARDADO = "meowrhino-buscaminas";

function leerMejores() {
  try { return JSON.parse(localStorage.getItem(GUARDADO)) || {}; }
  catch { return {}; }
}

/** Guarda el tiempo si mejora el que había. Devuelve si era récord. */
function guardarMejor(nivel, segundos) {
  const mejores = leerMejores();
  if (mejores[nivel] != null && mejores[nivel] <= segundos) return false;
  mejores[nivel] = segundos;
  try { localStorage.setItem(GUARDADO, JSON.stringify(mejores)); }
  catch { /* modo privado: se juega igual, solo no se recuerda */ }
  return true;
}

// ============================================
// La casilla
// ============================================

class Casilla {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.mina = false;
    this.abierta = false;
    this.bandera = false;
    this.duda = false;
    this.marcaFinal = null;   // 'acierto' | 'fallo', al acabar la partida
    this.vecinas = 0;
    this.el = null;
  }

  crearEl(lado) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "bm-casilla";
    el.style.width = `${lado}px`;
    el.style.height = `${lado}px`;
    el.style.fontSize = `${Math.max(8, lado * 0.62)}px`;
    el.dataset.x = this.x;
    el.dataset.y = this.y;
    el.tabIndex = -1;   // se juega con el ratón o el dedo: 400 tabstops no ayudan
    this.el = el;
    this.pintar();
    return el;
  }

  /** Vuelca el estado de la casilla en su elemento. */
  pintar() {
    const el = this.el;
    if (!el) return;
    el.className = "bm-casilla";
    el.textContent = "";
    delete el.dataset.n;

    if (this.abierta) {
      el.classList.add("abierta");
      if (this.mina) { el.classList.add("mina"); el.textContent = "✱"; return; }
      if (this.vecinas > 0) { el.textContent = this.vecinas; el.dataset.n = this.vecinas; }
      return;
    }

    if (this.marcaFinal) {
      el.classList.add(this.bandera ? "bandera" : "duda", this.marcaFinal);
      el.textContent = this.bandera ? "⚑" : "?";
      return;
    }

    if (this.bandera) { el.classList.add("bandera"); el.textContent = "⚑"; return; }
    if (this.duda)    { el.classList.add("duda");    el.textContent = "?"; }
  }

  abrir() {
    if (this.abierta || this.bandera) return false;
    this.duda = false;
    this.abierta = true;
    this.pintar();
    return this.mina ? "mina" : "libre";
  }

  /** bandera → interrogante → nada. Devuelve cuánto cambia el contador. */
  ciclarMarca() {
    if (this.abierta) return 0;
    let delta = 0;
    if (!this.bandera && !this.duda)      { this.bandera = true; delta = 1; }
    else if (this.bandera)                { this.bandera = false; this.duda = true; delta = -1; }
    else                                  { this.duda = false; }
    this.pintar();
    return delta;
  }
}

// ============================================
// El tablero
// ============================================

class Tablero {
  constructor({ w, h, minas }) {
    this.w = w;
    this.h = h;
    this.minas = minas;
    this.primera = true;
    this.abiertas = 0;
    this.banderas = 0;
    this.casillas = Array.from({ length: h }, (_, y) =>
      Array.from({ length: w }, (_, x) => new Casilla(x, y)));
  }

  /**
   * Reparte las minas evitando la casilla que acaban de abrir.
   *
   * Se hace en el primer clic, no al empezar: así la primera nunca es una mina
   * y la partida siempre arranca abriendo algo.
   */
  sembrar(evitaX, evitaY) {
    const puestas = new Set();
    while (puestas.size < this.minas) {
      const x = Math.floor(Math.random() * this.w);
      const y = Math.floor(Math.random() * this.h);
      if (x === evitaX && y === evitaY) continue;
      puestas.add(`${x},${y}`);
    }
    for (const k of puestas) {
      const [x, y] = k.split(",").map(Number);
      this.casillas[y][x].mina = true;
    }
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = this.casillas[y][x];
        if (!c.mina) c.vecinas = this.vecinasDe(x, y).filter(v => v.mina).length;
      }
    }
  }

  vecinasDe(x, y) {
    const out = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < this.w && ny >= 0 && ny < this.h) out.push(this.casillas[ny][nx]);
      }
    }
    return out;
  }

  /** 'nada' | 'mina' | 'gana' | 'sigue' */
  abrir(x, y) {
    if (this.primera) { this.sembrar(x, y); this.primera = false; }

    const c = this.casillas[y][x];
    const r = c.abrir();
    if (r === false) return "nada";
    if (r === "mina") return "mina";

    this.abiertas++;
    if (c.vecinas === 0) this.expandir(x, y);

    return this.abiertas >= this.w * this.h - this.minas ? "gana" : "sigue";
  }

  /** Abre en cadena todo lo que rodea a una casilla sin minas alrededor. */
  expandir(x0, y0) {
    const cola = [[x0, y0]];
    const vistas = new Set();
    while (cola.length) {
      const [x, y] = cola.shift();
      const k = `${x},${y}`;
      if (vistas.has(k)) continue;
      vistas.add(k);
      for (const v of this.vecinasDe(x, y)) {
        if (v.abierta || v.bandera || v.mina) continue;
        v.abrir();
        this.abiertas++;
        if (v.vecinas === 0) cola.push([v.x, v.y]);
      }
    }
  }

  marcar(x, y) {
    this.banderas += this.casillas[y][x].ciclarMarca();
    return this.banderas;
  }

  /**
   * Al acabar: enseña qué marcas eran buenas y cuáles no, y destapa las minas
   * que quedaban si la partida se ha perdido. Perder sin ver dónde estaban no
   * enseña nada.
   */
  revelar(destaparMinas) {
    for (const fila of this.casillas) {
      for (const c of fila) {
        if (c.abierta) continue;
        if ((c.bandera || c.duda) && !c.mina) { c.marcaFinal = "fallo"; c.pintar(); continue; }
        if (!c.mina) continue;
        if (c.bandera || c.duda) { c.marcaFinal = "acierto"; c.pintar(); }
        else if (destaparMinas) c.abrir();
      }
    }
  }

  pintarEn(contenedor, lado) {
    contenedor.innerHTML = "";
    contenedor.style.gridTemplateColumns = `repeat(${this.w}, ${lado}px)`;
    contenedor.style.gridTemplateRows = `repeat(${this.h}, ${lado}px)`;
    for (const fila of this.casillas) {
      for (const c of fila) contenedor.appendChild(c.crearEl(lado));
    }
  }
}

// ============================================
// La celda
// ============================================
//
// Los controles viven en los BORDES, como los de cualquier otra celda:
//
//   arriba → la navegación a `mapa`, y debajo las minas y el tiempo
//   abajo  → los tres niveles, igual que `archive` en el portfolio
//
// Se cuelgan de `bordeCelda(el, lado)`: el borde es un sitio compartido, la
// navegación se queda pegada al canto y lo de la celda se aparta hacia dentro.
// Con el reparto de fábrica el de arriba ya viene compartido —`mapa` está
// justo encima—, así que el caso raro es el caso normal y se ve siempre.
//
// No hay menú de inicio: al entrar ya hay una partida fácil empezada. Un menú
// era una pantalla intermedia para elegir algo que se puede cambiar en
// cualquier momento desde el borde de abajo.

export function renderBuscaminas() {
  const el = document.querySelector(".celda.buscaminas");
  if (!el) return;

  let lang = currentLang;
  let estado = "jugando";   // 'jugando' | 'fin'
  let nivel = "easy";
  let tablero = null;
  let segundos = 0;
  let reloj = null;
  let modo = "abrir";       // en táctil: 'abrir' | 'marcar'
  let gano = false;
  let record = false;

  el.innerHTML = `
    <div class="bm-juego">
      <div class="bm-tablero" role="grid"></div>
      <div class="bm-pie">
        <p class="bm-ayuda"></p>
        <div class="bm-modos">
          <button type="button" class="bm-modo activo" data-modo="abrir"></button>
          <button type="button" class="bm-modo" data-modo="marcar"></button>
        </div>
      </div>
      <div class="bm-fin" hidden>
        <p class="bm-fin-titulo"></p>
        <p class="bm-fin-tiempo"></p>
        <button type="button" class="bm-otra"></button>
      </div>
    </div>
    ${buildLangButtons()}
  `;

  // Los controles, a sus bordes. No llevan `data-permanent` porque no son
  // `.nav-label`: crearNavLabels() solo barre etiquetas de navegación, y esto
  // no lo es aunque se le parezca.
  bordeCelda(el, "top").insertAdjacentHTML("beforeend", `
    <div class="bm-marcador">
      <span class="bm-dato"><i class="bm-dato-label"></i> <b class="bm-minas">0</b></span>
      <span class="bm-dato"><i class="bm-dato-label"></i> <b class="bm-tiempo">0</b></span>
    </div>`);

  bordeCelda(el, "bottom").insertAdjacentHTML("beforeend", `
    <div class="bm-niveles">
      <button type="button" class="bm-nivel" data-nivel="easy"></button>
      <button type="button" class="bm-nivel" data-nivel="medium"></button>
      <button type="button" class="bm-nivel" data-nivel="hard"></button>
    </div>`);

  const $ = (sel) => el.querySelector(sel);
  const tableroEl = $(".bm-tablero");
  const finEl     = $(".bm-fin");

  const tactil = () => window.matchMedia("(hover: none)").matches;

  // --- medidas ---
  //
  // El tablero se mide contra el hueco REAL de la celda. `clientWidth` incluye
  // el padding (10dvh/10dvw, ver `.celda` en style.css), así que hay que
  // restarlo: sin eso la partida difícil en un móvil creía tener 375px cuando
  // tenía 300 y se salía por la derecha.
  //
  // A lo alto hay que dejar libres los dos bordes ocupados —la navegación
  // arriba y los niveles abajo, los dos a 3dvh— y el pie de debajo del tablero.
  // Los huecos de 1px entre casillas también ocupan: sin descontarlos el nivel
  // medio se pasaba de largo por los 15 que tiene.
  //
  // El mínimo de 13px es deliberado: por debajo la casilla no se puede tocar
  // con el dedo. Si aun así no cabe, el tablero se desplaza (overflow auto en
  // `.bm-tablero`), que es peor que verlo entero pero mucho mejor que verlo y
  // no poder jugar.
  /**
   * El rectángulo de píxeles que le queda al tablero dentro de la celda.
   *
   * Los bordes de arriba y de abajo se MIDEN, no se estiman: desde que son
   * elementos de verdad (`.nav-slot`), da igual si llevan una fila o dos, si el
   * idioma alarga el texto o si el móvil encoge la fuente. Antes esto era un
   * 26 multiplicado por las filas que pareciera haber.
   */
  function hueco() {
    const cs = getComputedStyle(el);
    const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const padY = parseFloat(cs.paddingTop)  + parseFloat(cs.paddingBottom);
    const alto = el.clientHeight || window.innerHeight;
    const mide = (sel) => el.querySelector(`:scope > ${sel}`)?.offsetHeight ?? 0;
    const bordes = mide(".nav-slot.top") + mide(".nav-slot.bottom") + 2 * alto * 0.03 + 16;
    const pie = tactil() ? 44 : 30;                 // abrir/marcar, o la línea de ayuda
    return {
      ancho: (el.clientWidth || window.innerWidth) - padX - 8,
      alto:  alto - padY - bordes - pie,
    };
  }

  /**
   * El tablero de un nivel. Los fijos se devuelven tal cual; el que va por
   * densidad se calcula contra el hueco de AHORA.
   *
   * Se recalcula solo al empezar partida, no al girar el móvil: cambiar el
   * tablero a mitad de partida es perderla.
   */
  function tableroDe(n) {
    const def = NIVELES[n];
    if (!def.densidad) return def;
    const { ancho, alto } = hueco();
    const paso = LADO_COMODO + 1;   // la casilla más el hueco de 1px
    const cabe = (px) => Math.max(LADOS.min, Math.min(LADOS.max, Math.floor((px + 1) / paso)));
    const w = cabe(ancho), h = cabe(alto);
    return { w, h, minas: minasPara(w, h, def.densidad) };
  }

  function ladoCasilla(w, h) {
    const { ancho, alto } = hueco();
    return Math.max(13, Math.min(34,
      Math.floor(Math.min((ancho - (w - 1)) / w, (alto - (h - 1)) / h))));
  }

  // --- textos ---

  function textos() {
    const s = t(lang);
    el.querySelectorAll(".bm-nivel").forEach(b => {
      b.textContent = s.niveles[b.dataset.nivel];
    });
    el.querySelectorAll(".bm-modo").forEach(b => {
      b.textContent = b.dataset.modo === "abrir" ? s.revelar : s.marcar;
    });
    const labels = el.querySelectorAll(".bm-dato-label");
    labels[0].textContent = s.minas;
    labels[1].textContent = s.tiempo;
    $(".bm-ayuda").textContent = s.ayuda;
    $(".bm-otra").textContent = s.otra;
    if (estado === "fin") pintarFin();
  }

  // --- marcador ---

  function pintarMarcador() {
    if (!tablero) return;
    $(".bm-minas").textContent = tablero.minas - tablero.banderas;
    $(".bm-tiempo").textContent = segundos;
  }

  function pintarFin() {
    const s = t(lang);
    $(".bm-fin-titulo").textContent = gano ? s.gano : s.perdio;
    const mejor = leerMejores()[nivel];
    $(".bm-fin-tiempo").textContent = gano
      ? `${segundos}s${record ? " · " + s.mejor : (mejor != null ? ` · ${s.mejor} ${mejor}s` : "")}`
      : "";
  }

  function sincronizarNiveles() {
    el.querySelectorAll(".bm-nivel").forEach(b => {
      const suyo = b.dataset.nivel === nivel;
      b.classList.toggle("activo", suyo);
      b.setAttribute("aria-pressed", suyo ? "true" : "false");
    });
  }

  // --- partidas ---

  function empezar(n) {
    nivel = n;
    tablero = new Tablero(tableroDe(n));
    estado = "jugando";
    segundos = 0;
    gano = false;
    record = false;
    modo = "abrir";
    sincronizarModos();
    sincronizarNiveles();

    finEl.hidden = true;
    $(".bm-modos").hidden = !tactil();
    $(".bm-ayuda").hidden = tactil();

    tablero.pintarEn(tableroEl, ladoCasilla(tablero.w, tablero.h));
    pintarMarcador();
    pararReloj();   // el reloj arranca en el primer clic, no al repartir
  }

  function arrancarReloj() {
    if (reloj) return;
    reloj = setInterval(() => {
      segundos++;
      $(".bm-tiempo").textContent = segundos;
    }, 1000);
  }

  function pararReloj() {
    if (reloj) clearInterval(reloj);
    reloj = null;
  }

  function acabar(haGanado) {
    estado = "fin";
    gano = haGanado;
    pararReloj();
    record = haGanado ? guardarMejor(nivel, segundos) : false;
    tablero.revelar(!haGanado);
    pintarMarcador();
    // El tablero final se ve antes que el cartel: al perder hay que dejar
    // tiempo a mirar dónde estaban las minas, y al ganar a ver el tablero
    // limpio. El cartel tapa las dos cosas.
    setTimeout(() => {
      if (estado !== "fin") return;   // ha empezado otra partida mientras tanto
      pintarFin();
      finEl.hidden = false;
    }, haGanado ? 500 : 1200);
  }

  function sincronizarModos() {
    el.querySelectorAll(".bm-modo").forEach(b => {
      b.classList.toggle("activo", b.dataset.modo === modo);
    });
  }

  // --- eventos ---

  el.querySelectorAll(".bm-nivel").forEach(b => {
    b.addEventListener("click", () => empezar(b.dataset.nivel));
  });

  $(".bm-otra").addEventListener("click", () => empezar(nivel));

  el.querySelectorAll(".bm-modo").forEach(b => {
    b.addEventListener("click", () => { modo = b.dataset.modo; sincronizarModos(); });
  });

  tableroEl.addEventListener("click", (e) => {
    const c = e.target.closest(".bm-casilla");
    if (!c || estado !== "jugando") return;
    const x = +c.dataset.x, y = +c.dataset.y;
    if (tactil() && modo === "marcar") { tablero.marcar(x, y); pintarMarcador(); return; }
    arrancarReloj();
    const r = tablero.abrir(x, y);
    if (r === "mina") acabar(false);
    else if (r === "gana") acabar(true);
    else pintarMarcador();
  });

  tableroEl.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    const c = e.target.closest(".bm-casilla");
    if (!c || estado !== "jugando") return;
    tablero.marcar(+c.dataset.x, +c.dataset.y);
    pintarMarcador();
  });

  // Un tablero a medio jugar no se puede repintar desde cero sin perder la
  // partida, así que aquí solo se reajusta el lado de las casillas: los
  // elementos y su estado siguen donde estaban.
  function reajustar() {
    if (!tablero) return;
    const lado = ladoCasilla(tablero.w, tablero.h);
    tableroEl.style.gridTemplateColumns = `repeat(${tablero.w}, ${lado}px)`;
    tableroEl.style.gridTemplateRows    = `repeat(${tablero.h}, ${lado}px)`;
    tableroEl.querySelectorAll(".bm-casilla").forEach(c => {
      c.style.width = `${lado}px`;
      c.style.height = `${lado}px`;
      c.style.fontSize = `${Math.max(8, lado * 0.62)}px`;
    });
    $(".bm-modos").hidden = !tactil();
    $(".bm-ayuda").hidden = tactil();
    textos();
  }

  let ajuste;
  const reajustarPronto = () => {
    clearTimeout(ajuste);
    ajuste = setTimeout(reajustar, 120);
  };

  window.addEventListener("resize", reajustarPronto);

  // Los nav-label los pone navigation.js DESPUÉS de este render, y cambian
  // cuando recolocas las secciones en el mapa: si el borde de arriba o el de
  // abajo pasa a tener dos filas, al tablero le sobra alto del que creía tener.
  // Observar la celda es la forma de enterarse sin que navigation.js tenga que
  // saber que el buscaminas existe. Solo mira los hijos directos, y reajustar()
  // no toca ninguno, así que no se muerde la cola.
  new MutationObserver(reajustarPronto).observe(el, { childList: true });

  // Basta con registrarlo una vez: data.js dispara TODOS los callbacks al
  // cambiar de idioma, se haya pulsado el botón de la celda que se haya
  // pulsado. Registrarlo también en onLangChange solo repintaba dos veces.
  attachLangListeners(el, (l) => { lang = l; textos(); });

  textos();
  empezar("easy");
}
