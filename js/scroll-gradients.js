// scroll-gradients.js — gradientes de scroll reutilizables
//
// Añade clases can-scroll-up / can-scroll-down al wrapper
// según la posición de scroll del contenido.

// Contenedor → observer activo. Si se vuelve a llamar sobre el mismo `content`
// (p.ej. tras recrear el DOM de una celda) desconectamos el observer anterior
// en vez de dejarlo huérfano observando un nodo que ya no se usa.
const observersPorContenido = new WeakMap();

/**
 * @param {HTMLElement} wrapper — elemento con los gradientes CSS
 * @param {HTMLElement} content — elemento scrollable (hijo del wrapper)
 * @param {object} [opts] — opciones adicionales
 * @param {number|function} [opts.bottomMargin] — píxeles (o función que los devuelve) a restar del fondo
 * @returns {function} checkScroll — para invocar manualmente tras cambios de contenido;
 *   incluye `checkScroll.dispose()` para desconectar observer y listener a mano.
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
    wrapper.classList.toggle("is-short", noScroll);
  };

  content.addEventListener("scroll", checkScroll);
  checkScroll();

  observersPorContenido.get(content)?.disconnect();
  const ro = new ResizeObserver(() => checkScroll());
  ro.observe(content);
  observersPorContenido.set(content, ro);

  checkScroll.dispose = () => {
    ro.disconnect();
    content.removeEventListener("scroll", checkScroll);
  };

  return checkScroll;
}
