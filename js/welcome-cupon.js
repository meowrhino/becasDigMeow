// ============================================
// WELCOME CUPÓN — Tarjeta rebotando estilo DVD
// ============================================
//
// Renderiza el cupón de la celda welcome y lo anima rebotando en
// diagonales de 45º dentro de los límites de la celda. Cada choque
// añade un giro acumulado (easing suave hacia un target rotatorio).
//
// Puntos clave:
//  - Solo anima cuando la celda está activa y no hay hover (para clicar)
//  - Respeta `prefers-reduced-motion`
//  - Los rebotes se calculan contra offsetWidth/Height (tamaño sin rotar)
//    para que la rotación no desplace los bordes de colisión
//  - El mailto se genera con el subject traducido según idioma actual
//
// Entrada: la celda .welcome y el objeto `data.welcome.cupon` de data.json

import { currentLang, attachLangListeners } from "./data.js";
import { esMovil } from "./pages.js";

/**
 * Renderiza el cupón dentro de la celda welcome y arranca la animación.
 * @param {HTMLElement} celda – elemento .celda.welcome (ya contiene el title)
 * @param {object} cuponData – `data.welcome.cupon` con precio, email y textos i18n
 */
export function renderWelcomeCupon(celda, cuponData) {
  if (!celda || !cuponData) return;

  // --- DOM del cupón (sello postal) ---
  celda.insertAdjacentHTML("beforeend", `
    <a class="welcome-cupon" id="welcomeCupon" href="#" rel="noopener">
      <span class="welcome-cupon-hazte"></span>
      <span class="welcome-cupon-precio">${cuponData.precio}</span>
      <span class="welcome-cupon-iva"></span>
      <span class="welcome-cupon-caduca"></span>
    </a>
  `);

  const cuponEl = celda.querySelector("#welcomeCupon");
  const hazteEl = cuponEl.querySelector(".welcome-cupon-hazte");
  const ivaEl   = cuponEl.querySelector(".welcome-cupon-iva");
  const caducaEl = cuponEl.querySelector(".welcome-cupon-caduca");
  const email = cuponData.email || "hola@meowrhino.studio";

  // --- i18n: al cambiar idioma, re-pinta textos y mailto ---
  const applyLang = (lang) => {
    const t = cuponData[lang] || cuponData.es || {};
    hazteEl.textContent = t.hazte || "";
    ivaEl.textContent = t.iva || "";
    caducaEl.textContent = t.caduca || "";
    cuponEl.href = `mailto:${email}?subject=${encodeURIComponent(t.subject || "")}`;
  };
  applyLang(currentLang);
  attachLangListeners(celda, applyLang);

  iniciarRebote(celda, cuponEl);
}

/**
 * Bucle de animación estilo DVD: mueve el cupón en diagonales de 45º
 * rebotando contra los bordes de la celda y acumulando rotación.
 */
function iniciarRebote(celda, cupon) {
  const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const velocidad = esMovil ? 60 : 90;   // px/s
  const diag = Math.SQRT1_2;             // componente x,y de un vector unitario a 45º

  // Estado de la animación
  let vx = (Math.random() < 0.5 ? -1 : 1) * diag;
  let vy = (Math.random() < 0.5 ? -1 : 1) * diag;
  let x = 0, y = 0;
  let rotacion = Math.random() * 6 - 3;  // giro inicial leve (-3º..+3º)
  let hoverPausa = false;
  let lastTs = 0;

  // Usamos offsetWidth/Height (sin rotar) para que los rebotes sean
  // estables. getBoundingClientRect devolvería la AABB rotada y botaría
  // antes a ciertos ángulos.
  const bounds = () => ({
    w: celda.clientWidth - cupon.offsetWidth,
    h: celda.clientHeight - cupon.offsetHeight,
  });

  // Cada choque suma un golpe de rotación de golpe (sin easing): 8..22º.
  // Entre choques el ángulo se queda quieto — así cada impacto "se nota".
  // El ángulo total queda acotado a ±LIMITE_ROT: si un lado se pasa, el golpe
  // va hacia el otro, así nunca queda "pegado" al tope.
  const LIMITE_ROT = 10;
  const golpearRotacion = () => {
    const delta = Math.random() * 14 + 8;
    const cabeSubir = rotacion + delta <= LIMITE_ROT;
    const cabeBajar = rotacion - delta >= -LIMITE_ROT;
    let signo;
    if (cabeSubir && cabeBajar) signo = Math.random() < 0.5 ? -1 : 1;
    else if (cabeSubir) signo = 1;
    else if (cabeBajar) signo = -1;
    else signo = rotacion > 0 ? -1 : 1;   // ninguno cabe: tira hacia el centro
    rotacion = Math.max(-LIMITE_ROT, Math.min(LIMITE_ROT, rotacion + delta * signo));
  };

  const render = () => {
    cupon.style.transform = `translate(${x}px, ${y}px) rotate(${rotacion}deg)`;
  };

  const colocarInicial = () => {
    const b = bounds();
    x = b.w > 0 ? Math.random() * b.w : 0;
    y = b.h > 0 ? Math.random() * b.h : 0;
    render();
  };

  const tick = (ts) => {
    // dt clampeado a 50ms para tabs en background / frames largos
    const dt = Math.min(50, ts - lastTs) / 1000;
    lastTs = ts;

    if (celda.classList.contains("activa") && !hoverPausa && !reducirMovimiento) {
      const b = bounds();
      x += vx * velocidad * dt;
      y += vy * velocidad * dt;

      // Colisión contra los 4 bordes — invierte la componente y marca rebote
      let boto = false;
      if (x <= 0)        { x = 0;   vx = -vx; boto = true; }
      else if (x >= b.w) { x = b.w; vx = -vx; boto = true; }
      if (y <= 0)        { y = 0;   vy = -vy; boto = true; }
      else if (y >= b.h) { y = b.h; vy = -vy; boto = true; }
      if (boto) golpearRotacion();

      render();
    }
    requestAnimationFrame(tick);
  };

  // Hover pausa el bucle para que el cupón se pueda clicar
  cupon.addEventListener("mouseenter", () => { hoverPausa = true; });
  cupon.addEventListener("mouseleave", () => { hoverPausa = false; });

  // En resize recolocamos dentro de los nuevos límites (no resetea rotación)
  window.addEventListener("resize", () => {
    const b = bounds();
    x = Math.min(Math.max(0, x), b.w);
    y = Math.min(Math.max(0, y), b.h);
  });

  // Esperamos a que las fuentes carguen para medir el cupón con su tamaño final
  document.fonts.ready.then(() => {
    colocarInicial();
    lastTs = performance.now();
    requestAnimationFrame(tick);
  });
}
