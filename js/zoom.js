// zoom.js — botones +/− de tamaño de texto reutilizables

/**
 * Inyecta botones +/− y vincula el zoom al elemento de contenido.
 * @param {HTMLElement} container — celda donde insertar los botones
 * @param {HTMLElement} contentEl — elemento cuyo fontSize se modifica
 * @param {function} [onResize] — callback opcional tras cada cambio (p.ej. checkScroll)
 */
export function setupZoom(container, contentEl, onResize) {
  const bar = document.createElement("div");
  bar.className = "politicas-bottom-bar";
  bar.innerHTML = `
    <button class="politicas-font-btn" data-action="increase">+</button>
    <button class="politicas-font-btn" data-action="decrease">\u2212</button>
  `;
  container.appendChild(bar);

  let fontScale = 1;

  bar.querySelectorAll(".politicas-font-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const step = btn.dataset.action === "increase" ? 0.1 : -0.1;
      fontScale = Math.max(0.7, Math.min(1.5, fontScale + step));
      contentEl.style.fontSize = `calc(0.88rem * ${fontScale})`;
      if (onResize) requestAnimationFrame(onResize);
    });
  });

  /** Reaplica el fontSize actual (útil tras cambio de idioma). */
  return function applyScale() {
    contentEl.style.fontSize = `calc(0.88rem * ${fontScale})`;
  };
}
