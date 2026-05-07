// ============================================
// UTILS — Helpers compartidos
// ============================================

/**
 * Re-pinta el contenido de una celda con fade de opacidad si la celda
 * está activa (visible). Si no, re-pinta sin fade.
 *
 * Patrón usado en cada cambio de idioma para statement/metodologia/politicas.
 *
 * @param {HTMLElement} cellEl     — la .celda
 * @param {HTMLElement} contentEl  — el contenedor scrollable interior
 * @param {Function}    render     — efecto sin retorno: actualiza contentEl.innerHTML
 * @param {Function}    [after]    — efecto opcional tras el render (applyScale, checkScroll, etc.)
 * @param {number}      [fadeMs]   — duración del fade (default 250)
 */
export function repaintWithFade(cellEl, contentEl, render, after, fadeMs = 250) {
  const isActive = cellEl.classList.contains("activa");
  if (isActive) {
    contentEl.style.opacity = "0";
    setTimeout(() => {
      render();
      after?.();
      contentEl.style.opacity = "1";
    }, fadeMs);
  } else {
    render();
    after?.();
  }
}

/**
 * Fetch JSON con captura de error y log. Devuelve null si falla.
 *
 * @param {string} url
 * @returns {Promise<Object|null>}
 */
export async function fetchJson(url) {
  try {
    const res = await fetch(url);
    return await res.json();
  } catch (err) {
    console.error(`Error cargando ${url}:`, err);
    return null;
  }
}
