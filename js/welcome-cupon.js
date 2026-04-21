// ============================================
// WELCOME CUPÓN — Tarjeta rebotando estilo DVD + flip al hacer click
// ============================================
//
// Renderiza el cupón de la celda welcome. Rebota en diagonales de 45º
// dentro de la celda y, al hacer click en cualquier parte (excepto el CTA),
// gira la tarjeta mostrando el dorso con lo que incluye + un CTA mailto.
//
// Estructura DOM:
//  .welcome-cupon-wrapper   ← recibe translate/rotate del rebote
//    .welcome-cupon-inner   ← recibe rotateY(180deg) en `.flipped`
//      .welcome-cupon-face.welcome-cupon-front  (sello con precio)
//      .welcome-cupon-face.welcome-cupon-back   (incluye + CTA)
//
// Puntos clave:
//  - Solo anima cuando la celda está activa, sin hover y sin flip.
//  - Respeta `prefers-reduced-motion`.
//  - Bounds contra offsetWidth/Height (sin rotar) para rebotes estables.
//  - Click en el CTA → mailto (no toggle); click en el resto del cupón → flip.

import { currentLang, attachLangListeners } from "./data.js";
import { esMovil } from "./pages.js";

/**
 * Renderiza el cupón dentro de la celda welcome y arranca la animación.
 * @param {HTMLElement} celda – elemento .celda.welcome (ya contiene el title)
 * @param {object} cuponData – `data.welcome.cupon` con precio, email y textos i18n
 */
export function renderWelcomeCupon(celda, cuponData) {
  if (!celda || !cuponData) return;

  celda.insertAdjacentHTML("beforeend", `
    <div class="welcome-cupon-wrapper" id="welcomeCupon">
      <div class="welcome-cupon-inner">
        <div class="welcome-cupon-face welcome-cupon-front">
          <span class="welcome-cupon-hazte"></span>
          <span class="welcome-cupon-precio">${cuponData.precio}</span>
          <span class="welcome-cupon-iva"></span>
          <span class="welcome-cupon-caduca"></span>
        </div>
        <div class="welcome-cupon-face welcome-cupon-back">
          <p class="welcome-cupon-incluye"></p>
          <span class="welcome-cupon-primera"></span>
          <a class="welcome-cupon-cta" href="#" rel="noopener"></a>
        </div>
      </div>
    </div>
  `);

  const wrapperEl = celda.querySelector("#welcomeCupon");
  const hazteEl   = wrapperEl.querySelector(".welcome-cupon-hazte");
  const ivaEl     = wrapperEl.querySelector(".welcome-cupon-iva");
  const caducaEl  = wrapperEl.querySelector(".welcome-cupon-caduca");
  const incluyeEl = wrapperEl.querySelector(".welcome-cupon-incluye");
  const primeraEl = wrapperEl.querySelector(".welcome-cupon-primera");
  const ctaEl     = wrapperEl.querySelector(".welcome-cupon-cta");
  const email = cuponData.email || "hola@meowrhino.studio";

  // --- i18n: al cambiar idioma, re-pinta todo (front + back + mailto) ---
  const applyLang = (lang) => {
    const t = cuponData[lang] || cuponData.es || {};
    hazteEl.textContent   = t.hazte   || "";
    ivaEl.textContent     = t.iva     || "";
    caducaEl.textContent  = t.caduca  || "";
    primeraEl.textContent = t.primera || "";
    ctaEl.textContent     = t.cta     || "";
    incluyeEl.textContent = t.incluye || "";
    ctaEl.href = `mailto:${email}?subject=${encodeURIComponent(t.subject || "")}`;
  };
  applyLang(currentLang);
  attachLangListeners(celda, applyLang);

  // Click en el cupón → flip. Excepto si el click es en el CTA (deja que el
  // mailto siga su curso sin toggle). El stopPropagation tampoco hace falta:
  // basta con early-return al detectar que el target está dentro del CTA.
  wrapperEl.addEventListener("click", (e) => {
    if (e.target.closest(".welcome-cupon-cta")) return;
    wrapperEl.classList.toggle("flipped");
  });

  iniciarRebote(celda, wrapperEl);
}

/**
 * Bucle de animación estilo DVD: mueve el cupón en diagonales de 45º
 * rebotando contra los bordes de la celda y acumulando rotación.
 */
function iniciarRebote(celda, cupon) {
  const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const velocidad = esMovil ? 60 : 90;   // px/s
  const diag = Math.SQRT1_2;             // componente x,y de un vector unitario a 45º

  let vx = (Math.random() < 0.5 ? -1 : 1) * diag;
  let vy = (Math.random() < 0.5 ? -1 : 1) * diag;
  let x = 0, y = 0;
  let rotacion = Math.random() * 6 - 3;
  let hoverPausa = false;
  let lastTs = 0;

  const bounds = () => ({
    w: celda.clientWidth - cupon.offsetWidth,
    h: celda.clientHeight - cupon.offsetHeight,
  });

  // Cada choque suma un golpe de rotación de golpe (sin easing): 8..22º.
  // El ángulo queda acotado a ±LIMITE_ROT: si un lado se pasa, el golpe
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
    else signo = rotacion > 0 ? -1 : 1;
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
    const dt = Math.min(50, ts - lastTs) / 1000;
    lastTs = ts;

    const girado = cupon.classList.contains("flipped");
    if (celda.classList.contains("activa") && !hoverPausa && !reducirMovimiento && !girado) {
      const b = bounds();
      x += vx * velocidad * dt;
      y += vy * velocidad * dt;

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

  cupon.addEventListener("mouseenter", () => { hoverPausa = true; });
  cupon.addEventListener("mouseleave", () => { hoverPausa = false; });

  window.addEventListener("resize", () => {
    const b = bounds();
    x = Math.min(Math.max(0, x), b.w);
    y = Math.min(Math.max(0, y), b.h);
  });

  document.fonts.ready.then(() => {
    colocarInicial();
    lastTs = performance.now();
    requestAnimationFrame(tick);
  });
}
