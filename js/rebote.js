// ============================================
// REBOTE — bucle de animación estilo DVD, compartido.
// ============================================
//
// Mueve un elemento en diagonales de 45º dentro de su contenedor, rebotando
// contra los bordes y acumulando un golpe de rotación en cada choque.
//
// Vive aparte porque lo usan dos cosas distintas de la celda welcome: el cupón
// (welcome-cupon.js) y la card de proyectos (welcome-card.js). Estaba escrito
// dentro del cupón; extraerlo evita mantener dos copias del mismo bucle.
//
// Sigue animando solo cuando tiene sentido: celda activa y elemento visible en
// pantalla (IntersectionObserver). Con `prefers-reduced-motion` no se para: se
// frena (ver FRENO_REDUCIDO).

/**
 * Cuánto se frena el rebote cuando el sistema pide menos movimiento.
 *
 * El ajuste se llama «reducir movimiento», no «eliminarlo». Antes el bloque que
 * mueve no llegaba a ejecutarse y el elemento se quedaba congelado en el punto
 * al azar donde le tocara nacer: en un iPhone con «Reducir movimiento» puesto
 * —que lo respetan por igual Safari, Brave y el navegador de Instagram— la
 * portada no se leía como calmada sino como rota, con las tarjetas amontonadas
 * en una esquina y quietas.
 *
 * A la cuarta parte la deriva queda en unos 10 px/s: cruzar la pantalla lleva
 * más de medio minuto, así que se nota si te quedas mirando y no arrastra la
 * vista de quien ha pedido que nada se mueva solo. El mismo freno se aplica al
 * golpe de rotación de cada choque, que es la parte brusca del efecto: de 8-22º
 * de golpe pasa a 2-5,5º.
 */
const FRENO_REDUCIDO = 0.25;

/**
 * Arranca el rebote de `elemento` dentro de `celda`.
 *
 * @param {HTMLElement} celda      contenedor que marca los límites
 * @param {HTMLElement} elemento   el que se mueve (position:absolute)
 * @param {object}  [opciones]
 * @param {number}  [opciones.velocidad=90]   px/s
 * @param {number}  [opciones.limiteRot=10]   grados máximos de inclinación
 * @param {number}  [opciones.rotInicial=3]   dispersión de la rotación de salida
 * @param {() => boolean} [opciones.pausar]   si devuelve true, el frame no avanza
 * @param {() => void}    [opciones.alChocar] se llama en cada rebote
 * @param {(b: {minX:number,minY:number,maxX:number,maxY:number}) => {x:number,y:number}} [opciones.inicio]
 *        de dónde sale, en coordenadas de `translate`. Por defecto, un punto al
 *        azar dentro de los límites. La card de proyecto lo usa para no nacer
 *        encima del cupón, que comparte celda con ella.
 * @returns {{ detener: () => void }} para poder pararlo (tests, cleanup)
 */
export function iniciarRebote(celda, elemento, opciones = {}) {
  const {
    velocidad = 90,
    limiteRot = 10,
    rotInicial = 3,
    pausar = () => false,
    alChocar = () => {},
    inicio = null,
  } = opciones;

  const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const freno = reducirMovimiento ? FRENO_REDUCIDO : 1;
  const velocidadReal = velocidad * freno;
  const diag = Math.SQRT1_2;   // componente x,y de un vector unitario a 45º

  let vx = (Math.random() < 0.5 ? -1 : 1) * diag;
  let vy = (Math.random() < 0.5 ? -1 : 1) * diag;
  let x = 0, y = 0;
  let rotacion = Math.random() * rotInicial * 2 - rotInicial;
  let hoverPausa = false;
  let lastTs = 0;
  let running = true;
  let visible = true;
  let detenido = false;
  let colocado = false;

  /** El ángulo máximo, en radianes: de ahí sale el margen de los límites. */
  const RAD = limiteRot * Math.PI / 180;

  /**
   * Los límites del movimiento, en las mismas coordenadas que el `translate`.
   *
   * El elemento se pinta ROTADO, así que su caja real es más grande que
   * offsetWidth/Height: un rectángulo w×h girado θ ocupa
   *   W' = w·cos θ + h·sin θ        H' = w·sin θ + h·cos θ
   * y, como gira sobre su centro, sobresale (W'−w)/2 por cada lado. Midiendo
   * sin rotar, el elemento llegaba al borde de la celda con la caja pequeña y
   * las esquinas se salían: `.celda` es overflow:hidden, así que se recortaban
   * (en la card del welcome eran hasta 48px comidos por el borde inferior).
   *
   * El margen se calcula con el ángulo MÁXIMO, no con el actual: así es
   * constante y los rebotes siguen siendo estables, que era justo el motivo por
   * el que originalmente se medía sin rotar. Recalcularlo con la rotación viva
   * movería el punto de rebote en cada choque.
   */
  const bounds = () => {
    const w = elemento.offsetWidth;
    const h = elemento.offsetHeight;
    const margenX = (w * Math.cos(RAD) + h * Math.sin(RAD) - w) / 2;
    const margenY = (w * Math.sin(RAD) + h * Math.cos(RAD) - h) / 2;
    return {
      minX: margenX,
      minY: margenY,
      maxX: celda.clientWidth - w - margenX,
      maxY: celda.clientHeight - h - margenY,
    };
  };

  // Cada choque suma un golpe de rotación de golpe (sin easing): 8..22º, o el
  // cuarto de eso con movimiento reducido.
  // El ángulo queda acotado a ±limiteRot: si un lado se pasa, el golpe va hacia
  // el otro, así nunca queda "pegado" al tope.
  const golpearRotacion = () => {
    const delta = (Math.random() * 14 + 8) * freno;
    const cabeSubir = rotacion + delta <= limiteRot;
    const cabeBajar = rotacion - delta >= -limiteRot;
    let signo;
    if (cabeSubir && cabeBajar) signo = Math.random() < 0.5 ? -1 : 1;
    else if (cabeSubir) signo = 1;
    else if (cabeBajar) signo = -1;
    else signo = rotacion > 0 ? -1 : 1;
    rotacion = Math.max(-limiteRot, Math.min(limiteRot, rotacion + delta * signo));
  };

  const render = () => {
    elemento.style.transform = `translate(${x}px, ${y}px) rotate(${rotacion}deg)`;
  };

  /**
   * Coloca el elemento en su punto de salida. Devuelve si lo ha conseguido.
   *
   * Puede fallar: cuando resuelve `document.fonts.ready` la celda todavía puede
   * no tener tamaño (el grid no ha maquetado), y entonces los límites salen
   * negativos y todo aterriza en la esquina 0,0. Por eso el tick reintenta
   * hasta que la celda mide de verdad.
   */
  const colocarInicial = () => {
    const b = bounds();
    if (b.maxX <= b.minX || b.maxY <= b.minY) return false;
    const p = inicio
      ? inicio(b)
      : {
          x: b.minX + Math.random() * (b.maxX - b.minX),
          y: b.minY + Math.random() * (b.maxY - b.minY),
        };
    x = Math.min(Math.max(b.minX, p.x), b.maxX);
    y = Math.min(Math.max(b.minY, p.y), b.maxY);
    render();
    return true;
  };

  const tick = (ts) => {
    if (detenido) { running = false; return; }
    const dt = Math.min(50, ts - lastTs) / 1000;
    lastTs = ts;

    if (!colocado) colocado = colocarInicial();

    if (celda.classList.contains("activa") && !hoverPausa && !pausar()) {
      const b = bounds();
      x += vx * velocidadReal * dt;
      y += vy * velocidadReal * dt;

      let boto = false;
      if (x <= b.minX)      { x = b.minX; vx = -vx; boto = true; }
      else if (x >= b.maxX) { x = b.maxX; vx = -vx; boto = true; }
      if (y <= b.minY)      { y = b.minY; vy = -vy; boto = true; }
      else if (y >= b.maxY) { y = b.maxY; vy = -vy; boto = true; }
      if (boto) { golpearRotacion(); alChocar(); }

      render();
    }
    if (visible) requestAnimationFrame(tick);
    else running = false;
  };

  elemento.addEventListener("mouseenter", () => { hoverPausa = true; });
  elemento.addEventListener("mouseleave", () => { hoverPausa = false; });

  /**
   * Devuelve el elemento a los límites de ahora, y lo repinta.
   *
   * El repintado no es opcional: sin él la corrección solo se ve en el
   * siguiente frame del tick, y con movimiento reducido ese frame puede tardar
   * —el elemento avanza tan poco que el recorte del tick no se aprecia—, así
   * que el elemento se quedaría visualmente fuera aunque sus coordenadas ya
   * estuvieran bien.
   */
  const ajustar = () => {
    if (!colocado) return;
    const b = bounds();
    x = Math.min(Math.max(b.minX, x), b.maxX);
    y = Math.min(Math.max(b.minY, y), b.maxY);
    render();
  };

  window.addEventListener("resize", ajustar);

  // El elemento puede CRECER después de haberse colocado. La card del welcome
  // mide 23px de alto mientras su captura descarga (el <img> no reserva sitio:
  // no lleva width/height ni aspect-ratio, y su proporción real no se sabe
  // hasta que llega) y 152 cuando la imagen aparece. Si se colocó pegada al
  // borde de abajo —que es lo normal: sale de la esquina más lejana al cupón—
  // los 129px que crece se salen de la celda.
  //
  // El tick ya recorta la posición cada frame, pero solo dentro del `if` que
  // exige la celda activa y sin pausa, así que no siempre llega a tiempo. Y no
  // basta con esperar a la primera imagen: la card cambia de proyecto cada 4,5s
  // y cada `src` nuevo la vuelve a colapsar a 23px mientras descarga.
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(ajustar).observe(elemento);
  }

  if (typeof IntersectionObserver !== "undefined") {
    const obs = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !running && !detenido) {
        running = true;
        lastTs = performance.now();
        requestAnimationFrame(tick);
      }
    });
    obs.observe(celda);
  }

  // Se espera a las fuentes porque el tamaño del elemento —y con él los
  // límites del rebote— depende de cómo mida el texto con la letra ya cargada.
  // Si la celda aún no está maquetada, colocarInicial falla y el tick reintenta.
  document.fonts.ready.then(() => {
    if (detenido) return;
    colocado = colocarInicial();
    lastTs = performance.now();
    requestAnimationFrame(tick);
  });

  return { detener: () => { detenido = true; } };
}
