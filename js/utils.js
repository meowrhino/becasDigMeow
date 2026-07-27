// ============================================
// UTILS — Helpers compartidos
// ============================================

/**
 * Re-pinta el contenido de una celda con fade de opacidad si la celda
 * está activa (visible). Si no, re-pinta sin fade.
 *
 * Patrón usado en cada cambio de idioma para statement/metodologia/footer.
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
 * Escapa los cinco caracteres con significado en HTML para que un string de
 * texto plano se pinte tal cual (sin interpretarse como markup) al interpolarlo
 * en un template de innerHTML. Cubre también el contexto de atributo entre
 * comillas dobles: al escapar `"` no se puede romper un `href="…"`/`src="…"`.
 *
 * Uso: SOLO sobre valores de data.json que sean texto plano (títulos, nombres,
 * urls, labels…). NO usarlo sobre campos que llevan markup a propósito, como
 * `footer.*.secciones[].parrafos` (traen <strong>/<a>/<em>): escaparlos los
 * rompería. La meta es defensiva: que un futuro editor de data.json no pueda
 * inyectar un <script> por accidente en un campo de texto plano.
 *
 * @param {*} str
 * @returns {string}
 */
export function escapeHTML(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Fetch JSON con captura de error y log. Devuelve null si falla.
 *
 * El chequeo de `res.ok` es importante: sin él, un 404 intenta parsear la
 * página de error como JSON y el fallo llega como un SyntaxError críptico
 * en vez de decir claramente qué pasó.
 *
 * @param {string} url
 * @returns {Promise<Object|null>}
 */
export async function fetchJson(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`Error cargando ${url}:`, err);
    return null;
  }
}
