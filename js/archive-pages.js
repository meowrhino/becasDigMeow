// ============================================
// ARCHIVE PAGES — Renderizado de secciones del archive
// ============================================
//
// renderSeccion() genérico para todas las categorías: el nombre grande y la
// lista de los links, una fila por cosa.
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

// --- Sección: el título y la lista, como los links ---

function renderItem(item) {
  // Un item con `links` y sin `url` enlazaba dos veces al mismo sitio: el
  // nombre se llevaba links[0] y la lista lo repetía justo al lado. Ahora el
  // nombre solo enlaza si tiene destino propio, y los links se pintan enteros;
  // cuando no hay `url`, el nombre es el rótulo de su fila de enlaces.
  // La fila es un <div> y no un <a> como en links: dentro van otros enlaces.
  const linksHtml = (item.links || []).map(l =>
    `<a href="${escapeHTML(l.url)}" target="_blank" rel="noopener">${escapeHTML(l.label)}</a>`
  ).join(" ");

  const nombre = item.url
    ? `<a href="${escapeHTML(item.url)}" target="_blank" rel="noopener">${escapeHTML(item.nombre)}</a>`
    : `<span>${escapeHTML(item.nombre)}</span>`;

  return `
          <div class="plista-fila">${nombre}<span>${linksHtml}</span></div>`;
}

/**
 * El HTML interior de una sección, sin tocar el DOM: el nombre de la categoría
 * grande, como el título de las páginas de texto, y sus cosas en la lista de
 * los links (.plista), una fila por cosa.
 */
export function seccionHTML(key, items) {
  return `
    <div class="scroll-wrapper archive-scroll-wrapper">
      <div class="scroll-content archive-content">
        <h2 class="about-pregunta archive-titulo">${escapeHTML(key)}</h2>
        <div class="plista plista-archive">${items.map(renderItem).join("")}
        </div>
      </div>
    </div>
  `;
}

/**
 * Pinta una sección en su celda.
 * @param {string} key — nombre de la categoría
 * @param {Array} items — array de proyectos/items
 */
export function renderSeccion(key, items) {
  const cssKey = key.toLowerCase();
  const el = document.querySelector(`.celda.archive-${cssKey}`);
  if (!el || !items?.length) return;

  el.innerHTML = seccionHTML(key, items);
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
      <section class="archive-prerender-seccion">${seccionHTML(key, data[key])}
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
        <li><a href="/portfolio">las páginas de cada proyecto</a></li>
      </ul>
      <p>o escríbeme a
        <a href="mailto:hola@meowrhino.studio">hola@meowrhino.studio</a>.</p>
    </nav>`;
}
