// ============================================
// ARCHIVE PAGES — Renderizado de secciones del archive
// ============================================
//
// renderSeccion() genérico para todas las categorías
// con estilo "shooter" (items aparecen y crecen).

// --- Sección genérica (shooter) ---

function renderItem(item, index) {
  const url = item.url || (item.links?.[0]?.url) || "#";
  const linksHtml = item.links
    ? item.links.map(l =>
        `<a href="${l.url}" target="_blank" rel="noopener" class="archive-item-link">${l.label}</a>`
      ).join(" ")
    : "";

  return `
    <div class="archive-item" style="--i: ${index}">
      <a href="${url}" target="_blank" rel="noopener" class="archive-item-name">${item.nombre}</a>
      ${linksHtml ? `<span class="archive-item-links">${linksHtml}</span>` : ""}
    </div>
  `;
}

/**
 * Renderiza una sección genérica con estilo shooter.
 * @param {string} key — nombre de la categoría
 * @param {Array} items — array de proyectos/items
 */
export function renderSeccion(key, items) {
  const cssKey = key.toLowerCase();
  const el = document.querySelector(`.celda.archive-${cssKey}`);
  if (!el || !items?.length) return;

  const itemsHtml = items.map((item, i) => renderItem(item, i)).join("");

  el.innerHTML = `
    <div class="archive-section">
      <div class="archive-section-items">
        ${itemsHtml}
      </div>
    </div>
  `;
}
