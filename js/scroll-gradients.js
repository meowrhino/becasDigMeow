// scroll-gradients.js — gradientes de scroll reutilizables
//
// Añade clases can-scroll-up / can-scroll-down al wrapper
// según la posición de scroll del contenido.

/**
 * @param {HTMLElement} wrapper — elemento con los gradientes CSS
 * @param {HTMLElement} content — elemento scrollable (hijo del wrapper)
 * @param {object} [opts] — opciones adicionales
 * @param {number|function} [opts.bottomMargin] — píxeles (o función que los devuelve) a restar del fondo
 * @returns {function} checkScroll — para invocar manualmente tras cambios de contenido
 */
export function setupScrollGradients(wrapper, content, opts) {
  const checkScroll = () => {
    if (!content || !wrapper) return;
    const raw = opts?.bottomMargin;
    const margin = typeof raw === "function" ? raw() : (typeof raw === "number" ? raw : 0);
    const atTop = content.scrollTop <= 10;
    const atBottom = content.scrollTop + content.clientHeight >= content.scrollHeight - 10 - margin;
    const noScroll = content.scrollHeight - margin <= content.clientHeight;
    wrapper.classList.toggle("can-scroll-up", !atTop && !noScroll);
    wrapper.classList.toggle("can-scroll-down", !atBottom && !noScroll);
  };

  content.addEventListener("scroll", checkScroll);
  checkScroll();
  new ResizeObserver(() => checkScroll()).observe(content);

  return checkScroll;
}
