// ============================================
// ARCHIVE PAGES — Renderizado de secciones del archive
// ============================================
//
// Dos funciones: renderWelcome() para el hub central,
// y renderSeccion() genérico para todas las categorías
// con estilo "shooter" (items aparecen y crecen).

// --- Welcome ---

export function renderWelcome(data) {
  const el = document.querySelector(".celda.archive-welcome");
  if (!el) return;

  // Fun fact aleatorio
  const facts = data.facts || [];
  const idx = facts.length ? Math.floor(Math.random() * facts.length) : -1;
  const factHtml = idx >= 0
    ? `<p class="archive-welcome-fact">${facts[idx]}</p>`
    : "";

  el.innerHTML = `
    <div class="archive-welcome-content">
      <h1 class="archive-welcome-title">${data.welcome.titulo}</h1>
      ${factHtml}
    </div>
  `;

  // Click en fact → otro aleatorio
  if (idx >= 0) {
    const factEl = el.querySelector(".archive-welcome-fact");
    factEl.addEventListener("click", () => {
      const newIdx = Math.floor(Math.random() * facts.length);
      factEl.textContent = facts[newIdx];
    });
  }

  // Nav-label "studio" permanente abajo
  const studioLabel = document.createElement("a");
  studioLabel.href = data.welcome.studioUrl;
  studioLabel.classList.add("nav-label", "bottom");
  studioLabel.dataset.permanent = "true";
  studioLabel.textContent = "studio";
  studioLabel.addEventListener("click", () => {
    const current = localStorage.getItem("meowrhino-theme") || "dark";
    localStorage.setItem("meowrhino-theme", current === "dark" ? "light" : "dark");
  });
  el.appendChild(studioLabel);
}

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
