// ============================================
// FILA — las webs en fila de lado, sin fin, con la ola
// ============================================
//
// La de la portada (pages.js, renderWelcome) y la galería de cada ficha
// (proyecto-template.js + ficha.js). `filaHTML` es pura (la usa también el
// build); `montarFila` le da vida en el navegador.

/**
 * El HTML de la fila: tres copias iguales de las piezas; la buena es la del
 * medio, las otras son decorado para el bucle. `pieza(i, copia, primera)`
 * devuelve una pieza con la clase `wp` (y `visible` si es `primera`).
 */
export function filaHTML(n, pieza) {
  const piezas = [0, 1, 2].map(c =>
    Array.from({ length: n }, (_, i) => pieza(i, c, c === 1 && !i)).join("")).join("");
  return `
    <div class="welcome-proyectos">
      <div class="wp-escena">${piezas}
      </div>
    </div>`;
}

/**
 * Mueve la fila: arriba o abajo a suertes, la del centro entera, el bucle, la
 * ola bajo el ratón y, si nadie la toca en tres segundos, avanza sola.
 *
 * @param {HTMLElement} pista  — el .welcome-proyectos
 * @param {Object} o
 * @param {() => boolean} [o.activa] — si se está viendo (la portada es una celda)
 * @param {boolean} [o.rueda] — la rueda vertical mueve la fila; no en una página
 *   con scroll, donde atraparía la rueda al pasar por encima
 */
export function montarFila(pista, { activa = () => true, rueda = true } = {}) {
  const webs = [...pista.querySelectorAll(".wp")];
  const n = webs.length / 3;
  if (!n) return;

  // El orden es el de la lista; arriba o abajo, a suertes en cada visita: zigzag
  // que empieza por un lado cualquiera, cada una a una distancia distinta.
  const lado0 = Math.random() < 0.5 ? -1 : 1;
  const lados = Array.from({ length: n }, (_, i) => ((i % 2 ? -lado0 : lado0) * (0.15 + Math.random() * 0.85)).toFixed(2));
  webs.forEach((a, k) => a.style.setProperty("--dx", lados[k % n]));

  // Se empieza en la copia del medio y, al pasar media copia hacia un lado, se
  // salta una copia entera al otro; como son iguales, no se ve.
  let copia = 0, paso = 0, pos = 0;   // `pos` guarda los decimales que scrollLeft redondea
  const centrar = (a) => { pista.scrollLeft = pos = a.offsetLeft + a.offsetWidth / 2 - pista.clientWidth / 2; };
  // Las medidas, al tener tamaño (la celda puede estar oculta al pintarse) y a cada cambio.
  new ResizeObserver(() => {
    copia = webs[n].offsetLeft - webs[0].offsetLeft;
    paso = n > 1 ? webs[1].offsetLeft - webs[0].offsetLeft : 0;
    if (copia) centrar(pista.querySelector(".wp.visible") || webs[n]);
  }).observe(pista);
  // La web que está en el centro es la que se ve entera.
  pista.addEventListener("scroll", () => {
    if (!copia || !paso) return;
    if (pista.scrollLeft < copia / 2) pista.scrollLeft += copia;
    else if (pista.scrollLeft > copia * 1.5) pista.scrollLeft -= copia;
    const centro = pista.scrollLeft + pista.clientWidth / 2 - webs[0].offsetLeft - webs[0].offsetWidth / 2;
    const i = Math.min(webs.length - 1, Math.max(0, Math.round(centro / paso)));
    webs.forEach((a, k) => a.classList.toggle("visible", k === i));
  }, { passive: true });
  // Con ratón la rueda baja: aquí mueve la fila (el trackpad ya la mueve de lado).
  if (rueda) {
    pista.addEventListener("wheel", (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      pista.scrollLeft += e.deltaY * (e.deltaMode === 1 ? 40 : 1);
    }, { passive: false });
  }
  // Si nadie la toca en tres segundos, la fila avanza sola, despacio. Pasar el
  // ratón no cuenta: así las webs pasan por debajo de él haciendo la ola.
  let tocada = 0, antes = 0;
  ["wheel", "pointerdown", "touchstart", "keydown"].forEach(t =>
    pista.addEventListener(t, () => { tocada = performance.now(); }, { passive: true }));
  // La ola: las webs que pasan bajo el ratón (o el dedo) se levantan, crecen y
  // se encienden, y al irte se quedan bailando un poco: un muelle por web, con
  // poco freno. La del centro no pasa de su 1,15; las demás crecen hasta ahí.
  let hx = null;   // dónde está el ratón, en px de la pantalla
  pista.addEventListener("pointermove", (e) => { hx = e.clientX; }, { passive: true });
  pista.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") hx = null; });
  pista.addEventListener("touchmove", (e) => { hx = e.touches[0].clientX; }, { passive: true });
  pista.addEventListener("touchend", () => { hx = null; }, { passive: true });
  const ola = webs.map(() => ({ y: 0, vy: 0, s: 1, vs: 0 }));
  const muelle = (x, v, meta, k, z, dt) => {
    v += (k * (meta - x) - 2 * z * Math.sqrt(k) * v) * dt;
    return [x + v * dt, v];
  };
  const mecer = (dt) => {
    const izq = pista.scrollLeft, ancho = webs[0]?.offsetWidth || 0, alto = pista.clientHeight;
    webs.forEach((a, i) => {
      const o = ola[i];
      const cx = a.offsetLeft + ancho / 2 - izq;
      const quieta = !o.y && !o.vy && o.s === 1 && !o.vs;
      if (quieta && (hx == null || Math.abs(cx - hx) > ancho * 1.5)) return;
      const g = hx == null ? 0 : Math.exp(-(((cx - hx) / (ancho * 0.55)) ** 2));
      const base = a.classList.contains("visible") ? 1.15 : 0.78;
      [o.y, o.vy] = muelle(o.y, o.vy, -g * alto * 0.16, 70, 0.22, dt);
      [o.s, o.vs] = muelle(o.s, o.vs, Math.max(base, 0.78 + g * 0.37) / base, 220, 0.5, dt);
      if (!g && Math.abs(o.y) < 0.2 && Math.abs(o.vy) < 0.2 && Math.abs(o.s - 1) < 0.002 && Math.abs(o.vs) < 0.002) {
        o.y = o.vy = o.vs = 0; o.s = 1;
      }
      a.style.transform = o.y || o.s !== 1 ? `translateY(${o.y.toFixed(1)}px) scale(${o.s.toFixed(3)})` : "";
      a.style.opacity = g > 0.05 && base < 1 ? (0.25 + 0.75 * g).toFixed(2) : "";
      // La que está bajo el ratón pasa delante de sus vecinas (y de la del centro).
      a.style.zIndex = g > 0.05 ? String(1 + Math.round(g * 10)) : "";
    });
  };
  const avanzar = (t) => {
    const dt = Math.min(100, t - antes);
    antes = t;
    if (copia && t - tocada > 3000 && activa()) {
      if (Math.abs(pista.scrollLeft - pos) > 2) pos = pista.scrollLeft;   // la movió alguien, o el salto del bucle
      pos += dt * 0.03;   // 30 px por segundo
      pista.scrollLeft = pos;
    }
    if (copia && activa()) mecer(Math.min(0.033, dt / 1000));
    requestAnimationFrame(avanzar);
  };
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) requestAnimationFrame(avanzar);
}
