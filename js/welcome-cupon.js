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
//
// El bucle del rebote vive en rebote.js: lo comparte con la card de proyectos.

import { currentLang, attachLangListeners } from "./data.js";
import { esMovil } from "./pages.js";
import { iniciarRebote } from "./rebote.js";
import { escapeHTML } from "./utils.js";

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
          <span class="welcome-cupon-precio">${escapeHTML(cuponData.precio)}</span>
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
    ivaEl.style.display   = t.iva ? "" : "none";   // aparcado en data.json (_iva)
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

  // Mientras está girado se queda quieto: leer el dorso con la tarjeta
  // moviéndose es incómodo.
  iniciarRebote(celda, wrapperEl, {
    velocidad: esMovil ? 60 : 90,
    pausar: () => wrapperEl.classList.contains("flipped"),
  });
}
