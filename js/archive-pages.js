// ============================================
// ARCHIVE PAGES — Renderizado de secciones del archive
// ============================================

// --- Hub ---

export function renderHub(data) {
  const el = document.querySelector(".celda.archive-hub");
  if (!el) return;

  el.innerHTML = `
    <div class="archive-hub-content">
      <h1 class="archive-hub-title">${data.hub.titulo}</h1>
      <a class="archive-hub-studio-link" href="${data.hub.studioUrl}">meowrhino.studio</a>
    </div>
  `;
}

// --- Proyectos ---

function agruparPorCategoria(proyectos) {
  const grupos = {};
  proyectos.forEach(p => {
    const cat = p.categoria || "otros";
    if (!grupos[cat]) grupos[cat] = [];
    grupos[cat].push(p);
  });
  return grupos;
}

function renderProyectoItem(p) {
  const url = p.url || (p.links?.[0]?.url) || "#";
  const linksHtml = p.links
    ? p.links.map(l => `<a href="${l.url}" target="_blank" rel="noopener" class="archive-project-sublink">${l.label}</a>`).join(" ")
    : "";

  return `
    <div class="archive-project-item">
      <a href="${url}" target="_blank" rel="noopener" class="archive-project-name">${p.nombre}</a>
      ${linksHtml ? `<span class="archive-project-sublinks">${linksHtml}</span>` : ""}
      ${p.descripcion ? `<span class="archive-project-desc">${p.descripcion}</span>` : ""}
    </div>
  `;
}

export function renderProyectos(data) {
  const el = document.querySelector(".celda.archive-proyectos");
  if (!el || !data.proyectos) return;

  const grupos = agruparPorCategoria(data.proyectos);
  const orden = ["arte", "juegos", "experimentos", "apps", "personajes"];
  const categoriasOrdenadas = orden.filter(c => grupos[c]);
  // Añadir categorías extra que no estén en el orden
  Object.keys(grupos).forEach(c => {
    if (!categoriasOrdenadas.includes(c)) categoriasOrdenadas.push(c);
  });

  let html = "";
  categoriasOrdenadas.forEach(cat => {
    html += `<div class="archive-project-group">`;
    html += `<h2 class="archive-project-category">${cat}</h2>`;
    grupos[cat].forEach(p => { html += renderProyectoItem(p); });
    html += `</div>`;
  });

  el.innerHTML = `
    <div class="archive-scroll-wrapper">
      <div class="archive-scroll-content" id="archive-proyectos-content">
        ${html}
      </div>
    </div>
  `;

  setupScrollGradients(el, "archive-proyectos-content");
}

// --- Textos ---

export function renderTextos(data) {
  const el = document.querySelector(".celda.archive-textos");
  if (!el || !data.textos) return;

  let html = "";
  data.textos.forEach(t => {
    const linksHtml = t.links
      ? t.links.map(l => `<a href="${l.url}" target="_blank" rel="noopener" class="archive-text-sublink">${l.label}</a>`).join(" ")
      : "";
    const mainLink = t.url
      ? `<a href="${t.url}" target="_blank" rel="noopener" class="archive-text-name">${t.nombre}</a>`
      : `<span class="archive-text-name">${t.nombre}</span>`;

    html += `
      <div class="archive-text-item">
        ${mainLink}
        ${linksHtml ? `<span class="archive-text-sublinks">${linksHtml}</span>` : ""}
        ${t.descripcion ? `<span class="archive-text-desc">${t.descripcion}</span>` : ""}
      </div>
    `;
  });

  el.innerHTML = `
    <div class="archive-scroll-wrapper">
      <div class="archive-scroll-content" id="archive-textos-content">
        ${html}
      </div>
    </div>
  `;

  setupScrollGradients(el, "archive-textos-content");
}

// --- Facts ---

export function renderFacts(data) {
  const el = document.querySelector(".celda.archive-facts");
  if (!el || !data.facts?.length) return;

  const idx = Math.floor(Math.random() * data.facts.length);

  el.innerHTML = `
    <div class="archive-facts-content">
      <span class="archive-facts-number">fun fact #${idx + 1}</span>
      <p class="archive-facts-text">${data.facts[idx]}</p>
      <button class="archive-facts-btn">another one</button>
    </div>
  `;

  el.querySelector(".archive-facts-btn").addEventListener("click", () => {
    const newIdx = Math.floor(Math.random() * data.facts.length);
    el.querySelector(".archive-facts-number").textContent = `fun fact #${newIdx + 1}`;
    el.querySelector(".archive-facts-text").textContent = data.facts[newIdx];
  });
}

// --- Personajes ---

export function renderPersonajes(data) {
  const el = document.querySelector(".celda.archive-personajes");
  if (!el || !data.personajes) return;

  const items = Object.entries(data.personajes);

  let html = "";
  items.forEach(([key, p]) => {
    html += `
      <div class="archive-personaje-item">
        <a href="${p.url}" target="_blank" rel="noopener" class="archive-personaje-name">${key}</a>
        <span class="archive-personaje-desc">${p.descripcion}</span>
      </div>
    `;
  });

  el.innerHTML = `
    <div class="archive-personajes-content">
      ${html}
    </div>
  `;
}

// --- Scroll gradients (reutilizado) ---

function setupScrollGradients(celda, contentId) {
  const content = document.getElementById(contentId);
  if (!content) return;

  const wrapper = content.closest(".archive-scroll-wrapper");
  if (!wrapper) return;

  function update() {
    const { scrollTop, scrollHeight, clientHeight } = content;
    wrapper.classList.toggle("can-scroll-up", scrollTop > 2);
    wrapper.classList.toggle("can-scroll-down", scrollTop + clientHeight < scrollHeight - 2);
  }

  content.addEventListener("scroll", update, { passive: true });
  // Primer check tras render
  requestAnimationFrame(update);
}
