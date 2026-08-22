// ============================================
// ARCHIVE PAGES — Renderizado de secciones del archive
// ============================================
//
// renderSeccion() genérico para todas las categorías
// con estilo "shooter" (items aparecen y crecen).
//
// Las funciones que arman HTML son puras (no tocan el DOM) para poder
// compartirlas con build-seo.js, que pre-renderiza el archivo entero dentro de
// archive.html. Igual que easy-template.js hace con la home: así el texto que
// ve Google es el mismo que pinta el navegador, sin una segunda copia que se
// desincronice.

import { escapeHTML } from "./utils.js";

/**
 * Las categorías del archive y el orden en el que se recorren.
 *
 * Vive aquí y no en archive-main.js porque la usan los dos: el navegador para
 * pintar cada celda y el build para pre-renderizarlas todas seguidas.
 */
export const SECCIONES = [
  "tools", "misc", "sidequests", "meowrhino",
  "games", "experiments", "social", "unfinished",
  "texts", "WIP", "hidden",
];

// --- Sección genérica (shooter) ---

function renderItem(item, index) {
  const url = item.url || (item.links?.[0]?.url) || "#";
  const linksHtml = item.links
    ? item.links.map(l =>
        `<a href="${escapeHTML(l.url)}" target="_blank" rel="noopener" class="archive-item-link">${escapeHTML(l.label)}</a>`
      ).join(" ")
    : "";

  return `
    <div class="archive-item" style="--i: ${index}">
      <a href="${escapeHTML(url)}" target="_blank" rel="noopener" class="archive-item-name">${escapeHTML(item.nombre)}</a>
      ${linksHtml ? `<span class="archive-item-links">${linksHtml}</span>` : ""}
    </div>
  `;
}

/** El HTML interior de una sección, sin tocar el DOM. */
export function seccionHTML(items) {
  return `
    <div class="archive-section">
      <div class="archive-section-items">
        ${items.map((item, i) => renderItem(item, i)).join("")}
      </div>
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

  el.innerHTML = seccionHTML(items);
}

/**
 * Cuerpo pre-renderizado del archive (lo que va dentro de #seo-prerender).
 *
 * El archive se monta entero por JS sobre un <main> vacío, así que hasta ahora
 * un rastreador sin JS veía una página en blanco — y eso que /archive sí está
 * en el sitemap. Esto pone las once categorías y sus ~220 enlaces en el primer
 * byte, con un <h2> por categoría para que se entienda de qué va cada bloque.
 *
 * Lleva su propio <h1>: el resto del sitio lo pinta el grid, pero aquí el grid
 * no existe todavía cuando el bot lee la página.
 */
export function renderArchivePrerenderHTML(data) {
  const secciones = SECCIONES
    .filter(key => data[key]?.length)
    .map(key => `
      <section class="archive-prerender-seccion">
        <h2>${escapeHTML(key)}</h2>
        ${seccionHTML(data[key])}
      </section>`)
    .join("");

  return `
    <h1>${escapeHTML(data.welcome?.titulo || "meowrhino archive")}</h1>
    <p>archivo personal de proyectos, experimentos y curiosidades.</p>
    ${secciones}
    <nav class="prerender-nota" aria-label="Esta página usa JavaScript para su navegación interactiva. También puedes ver:">
      <p>Esta página usa JavaScript para su navegación interactiva. También puedes ver:</p>
      <ul>
        <li><a href="/">meowrhino studio</a></li>
        <li><a href="/proyectos">las páginas de cada proyecto</a></li>
      </ul>
      <p>o escríbeme a
        <a href="mailto:hola@meowrhino.studio">hola@meowrhino.studio</a>.</p>
    </nav>`;
}
