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
// Sigue animando solo cuando tiene sentido: celda activa, elemento visible en
// pantalla (IntersectionObserver) y sin que el usuario haya pedido menos
// movimiento (`prefers-reduced-motion`).

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
 * @param {(b: {w:number,h:number}) => {x:number,y:number}} [opciones.inicio]
 *        de dónde sale. Por defecto, un punto al azar. La card de proyecto lo
 *        usa para no nacer encima del cupón, que comparte celda con ella.
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

  const bounds = () => ({
    w: celda.clientWidth - elemento.offsetWidth,
    h: celda.clientHeight - elemento.offsetHeight,
  });

  // Cada choque suma un golpe de rotación de golpe (sin easing): 8..22º.
  // El ángulo queda acotado a ±limiteRot: si un lado se pasa, el golpe va hacia
  // el otro, así nunca queda "pegado" al tope.
  const golpearRotacion = () => {
    const delta = Math.random() * 14 + 8;
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
    if (b.w <= 0 || b.h <= 0) return false;
    const p = inicio
      ? inicio(b)
      : { x: Math.random() * b.w, y: Math.random() * b.h };
    x = Math.min(Math.max(0, p.x), b.w);
    y = Math.min(Math.max(0, p.y), b.h);
    render();
    return true;
  };

  const tick = (ts) => {
    if (detenido) { running = false; return; }
    const dt = Math.min(50, ts - lastTs) / 1000;
    lastTs = ts;

    if (!colocado) colocado = colocarInicial();

    if (celda.classList.contains("activa") && !hoverPausa && !reducirMovimiento && !pausar()) {
      const b = bounds();
      x += vx * velocidad * dt;
      y += vy * velocidad * dt;

      let boto = false;
      if (x <= 0)        { x = 0;   vx = -vx; boto = true; }
      else if (x >= b.w) { x = b.w; vx = -vx; boto = true; }
      if (y <= 0)        { y = 0;   vy = -vy; boto = true; }
      else if (y >= b.h) { y = b.h; vy = -vy; boto = true; }
      if (boto) { golpearRotacion(); alChocar(); }

      render();
    }
    if (visible) requestAnimationFrame(tick);
    else running = false;
  };

  elemento.addEventListener("mouseenter", () => { hoverPausa = true; });
  elemento.addEventListener("mouseleave", () => { hoverPausa = false; });

  window.addEventListener("resize", () => {
    const b = bounds();
    x = Math.min(Math.max(0, x), b.w);
    y = Math.min(Math.max(0, y), b.h);
  });

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
