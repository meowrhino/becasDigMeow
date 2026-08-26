// ============================================
// EASY TEMPLATE — plantillas HTML del "modo fácil" (sin DOM).
// ============================================
//
// Funciones puras que devuelven strings de HTML a partir de data.json. Al no
// tocar el DOM ni depender del navegador, se comparten entre:
//   - easy-main.js (navegador: pinta el cuerpo y le engancha los inits vivos)
//   - build-seo.js (Node: pre-renderiza el contenido en easy.html y en la home)
// Así el texto que ve Google es EXACTAMENTE el que ve el visitante, sin copias
// que se desincronicen. Fuente única de contenido: data.json.

import { rutaProyectos, slugify } from "./rutas.js";

/** Escoge la variante de idioma de un objeto {es,en,cat}, con fallback a es. */
export const pickLang = (obj, lang) => obj?.[lang] ?? obj?.es ?? "";

export const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

/**
 * Textos de interfaz por idioma: los encabezados de sección y las etiquetas del
 * visor de portfolio.
 *
 * Estaban escritos a pelo en castellano, y como estas plantillas las comparten
 * /easy Y el pre-renderizado de la home, `en.html` y `ca.html` servían
 * «metodología», «contacto» y «visitar ↗» en castellano — que es justo el texto
 * que lee Google de la home inglesa y la catalana.
 *
 * `portfolio` y `statement` se quedan igual en los tres a propósito: son los
 * mismos términos que usan los nombres de celda del grid.
 */
export const UI = {
  es:  { portfolio: "portfolio", statement: "statement", metodologia: "metodología",
         contacto: "contacto", caso: "ver el caso →" },
  en:  { portfolio: "portfolio", statement: "statement", metodologia: "methodology",
         contacto: "contact", caso: "see the case →" },
  cat: { portfolio: "portfolio", statement: "statement", metodologia: "metodologia",
         contacto: "contacte", caso: "veure el cas →" },
};

/** Los textos de interfaz del idioma pedido, con fallback a castellano. */
export const ui = (lang) => UI[lang] || UI.es;

// Titular de venta por idioma (el wordmark ya vive en el header).
export const HERO = {
  es:  { eyebrow: "estudio de diseño web · barcelona", titular: "diseño web en barcelona: tu web en un mes, sin cuotas." },
  en:  { eyebrow: "web design studio · barcelona",     titular: "web design in barcelona: your website in a month, no monthly fees." },
  cat: { eyebrow: "estudi de disseny web · barcelona", titular: "disseny web a barcelona: la teva web en un mes, sense quotes." },
};

export function heroHTML(data, lang) {
  const c = data.welcome.cupon;
  const t = c[lang] || c.es || {};
  const h = HERO[lang] || HERO.es;
  const subject = encodeURIComponent(t.subject || "");
  const mailto = `mailto:${c.email}?subject=${subject}`;
  return `
    <section class="easy-hero" id="top">
      <p class="easy-eyebrow">${esc(h.eyebrow)}</p>
      <h1 class="easy-hero-title">${esc(h.titular)}</h1>
      <div class="easy-ticket">
        <p class="easy-ticket-hazte">${esc(t.hazte)}</p>
        <p class="easy-ticket-precio">${esc(c.precio)}</p>
        ${t.iva ? `<p class="easy-ticket-iva">${esc(t.iva)}</p>` : ""}
        ${t.caduca ? `<p class="easy-ticket-caduca">${esc(t.caduca)}</p>` : ""}
      </div>
      ${t.incluye ? `<p class="easy-hero-incluye">${esc(t.incluye)}</p>` : ""}
      <div class="easy-hero-cta">
        <a class="easy-btn" href="${mailto}">${esc(t.cta || "escríbeme")}</a>
        ${t.primera ? `<span class="easy-hero-primera">${esc(t.primera)}</span>` : ""}
      </div>
    </section>`;
}

/**
 * Portfolio: la MISMA rejilla que la celda portfolio de la home.
 *
 * Antes era un visor grande con veinte miniaturas de 60px debajo. Dos motivos
 * para cambiarlo: a ese tamaño, veinte capturas de web son veinte rectángulos
 * grises que no se distinguen entre sí; y era un patrón que no existía en
 * ninguna otra pantalla del sitio, así que /easy se leía como una web aparte.
 *
 * Reutiliza las clases .portfolio-grid/.pgrid-* de la home, no unas propias:
 * el objetivo era que encajara con el resto, y compartir las reglas es la única
 * forma de que siga encajando cuando se toquen. Cero CSS nuevo.
 *
 * Lo único que no se copia es el crossfade entre las imágenes de cada proyecto,
 * que en la home lo mueve JS: aquí se sirve la captura principal y ya. /easy es
 * la versión que se lee del tirón, no la que se mira.
 *
 * Cada ficha lleva los dos destinos de la home: la captura y la url van a la
 * web del cliente, y «ver el caso» a /proyectos/<slug> en el idioma de la
 * página. El alt sale del campo `alt` de data.json si existe.
 */
export function portfolioHTML(data, lang) {
  const t = ui(lang);
  const proyectos = data.portfolio?.proyectos || [];
  const altFor = (p) => p.alt || `${p.nombre} — web diseñada por meowrhino studio, Barcelona`;
  const limpia = (u) => String(u ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "");

  const fichas = proyectos.map(p => {
    const urls = Array.isArray(p.urls) && p.urls.length
      ? p.urls
      : (p.url ? [{ url: p.url, nombre: p.urlLabel }] : []);

    // Con dos urls la captura no puede ser un enlace (¿a cuál de las dos?), así
    // que es un div y los enlaces quedan solo debajo. Mismo criterio que la home.
    const thumb = urls.length === 1
      ? `<a class="pgrid-thumb" href="${esc(urls[0].url)}" target="_blank" rel="noopener">`
      : `<div class="pgrid-thumb">`;
    const cierra = urls.length === 1 ? "</a>" : "</div>";

    const enlaces = urls.map(u =>
      `<a class="pgrid-url" href="${esc(u.url)}" target="_blank" rel="noopener">${esc(u.nombre || limpia(u.url))}</a>`
    ).join("");

    return `
        <div class="pgrid-item">
          ${thumb}<img class="pgrid-img pgrid-img-a" src="${esc(p.imagen)}"
                 alt="${esc(altFor(p))}" width="800" height="600"
                 loading="lazy" decoding="async">${cierra}
          <div class="pgrid-meta">
            ${enlaces}
            <a class="pgrid-caso" href="${esc(rutaProyectos(lang))}/${esc(slugify(p.nombre))}">${esc(t.caso)}</a>
          </div>
        </div>`;
  }).join("");

  return `
    <section class="easy-section easy-portfolio" id="portfolio">
      <h2 class="easy-h">${esc(t.portfolio)}</h2>
      <div class="portfolio-grid">${fichas}
      </div>
    </section>`;
}

export function metodologiaHTML(data, lang) {
  const lineas = (data.metodologia?.[lang] || data.metodologia?.es || {}).lineas || [];
  const pasos = lineas.map((l, i) => `
    <li class="easy-step">
      <span class="easy-step-num">${String(i + 1).padStart(2, "0")}</span>
      <p class="easy-step-text">${esc(l)}</p>
    </li>`).join("");
  return `
    <section class="easy-section" id="metodologia">
      <h2 class="easy-h">${esc(ui(lang).metodologia)}</h2>
      <ol class="easy-steps">${pasos}</ol>
    </section>`;
}

export function statementHTML(data, lang) {
  const lineas = (data.statement?.[lang] || data.statement?.es || {}).lineas || [];
  const ls = lineas.map(l => `<p class="easy-statement-line">${esc(l)}</p>`).join("");
  return `
    <section class="easy-section easy-statement" id="statement">
      <h2 class="easy-h">${esc(ui(lang).statement)}</h2>
      ${ls}
    </section>`;
}

export function contactoHTML(data, lang) {
  const co = data.contacto || {};
  const asunto = encodeURIComponent(co.asunto?.[lang] || co.asunto?.es || "");
  const mailto = `mailto:${co.email}?subject=${asunto}`;
  const ig = co.instagram;
  const cv = co.cv?.[lang] || co.cv?.es;
  const cta = (data.welcome.cupon[lang] || data.welcome.cupon.es || {}).cta || "escríbeme";
  return `
    <section class="easy-section easy-contacto" id="contacto">
      <h2 class="easy-h">${esc(ui(lang).contacto)}</h2>
      <a class="easy-email" href="${mailto}">${esc(co.email)}</a>
      <div class="easy-contacto-cta">
        <a class="easy-btn" href="${mailto}">${esc(cta)}</a>
      </div>
      <div class="easy-contacto-links">
        ${ig ? `<a href="${esc(ig.url)}" target="_blank" rel="noopener">${esc(ig.usuario)}</a>` : ""}
        ${cv ? `<a href="${esc(cv)}" target="_blank" rel="noopener">cv</a>` : ""}
      </div>
    </section>`;
}

export function footerHTML() {
  // Solo el wordmark, centrado. Enlaza al grid (única puerta de vuelta).
  // Va a "/" y no a "index.html" porque Cloudflare responde 307 al segundo:
  // enlazar a la forma que redirige gasta un salto en cada visita y en cada
  // rastreo. Misma razón en la nota del pre-render, más abajo.
  return `
    <footer class="easy-footer">
      <a href="/">meowrhino.studio</a>
    </footer>`;
}

// Cuerpo completo del modo fácil, en el mismo orden que pinta el navegador.
export function renderBodyHTML(data, lang) {
  return heroHTML(data, lang) +
    portfolioHTML(data, lang) +
    statementHTML(data, lang) +
    metodologiaHTML(data, lang) +
    contactoHTML(data, lang) +
    footerHTML();
}

/**
 * Cuerpo pre-renderizado para la HOME (index.html).
 *
 * El grid de index.html se monta por JS, así que su HTML llegaba sin una sola
 * línea de texto: un rastreador que no ejecuta JS (o que aún no ha hecho la
 * segunda pasada de render) veía la página vacía. Esto pone el mismo contenido
 * que pintan las celdas ya en el primer byte.
 *
 * Es el cuerpo de /easy sin el footer: ahí el footer es un enlace de vuelta a
 * index.html, que desde la propia home sería un enlace a sí misma.
 */
export function renderHomePrerenderHTML(data, lang) {
  return heroHTML(data, lang) +
    portfolioHTML(data, lang) +
    statementHTML(data, lang) +
    metodologiaHTML(data, lang) +
    contactoHTML(data, lang) +
    notaPrerenderHTML(data, lang);
}

/**
 * Nota al pie del bloque pre-renderizado: qué es esta versión y a dónde ir.
 *
 * Va aquí y no fija en index.html por dos motivos: se traduce con el resto (si
 * no, /en y /ca la servirían en castellano), y es el único enlace a /archive y
 * a /proyectos que existe en el HTML crudo — sin él esas páginas quedaban
 * huérfanas, alcanzables solo por el sitemap y por los enlaces que pinta el JS.
 *
 * El índice de proyectos va en absoluto (y no "proyectos/index.html") porque es
 * la URL canónica que declaran esas páginas; enlazar a otra forma repartiría
 * señales. Y cada idioma enlaza al SUYO: mandar /en a /proyectos sería enviar al
 * visitante inglés a la versión castellana teniendo la suya. La tabla de rutas
 * vive en rutas.js para que el grid y la card del welcome usen la misma.
 *
 * /easy y /archive van sin extensión por lo mismo: Cloudflare responde 307 a
 * easy.html y archive.html, y estos tres son los únicos enlaces a esas páginas
 * que existen en el HTML crudo. No merece la pena que el rastreador gaste un
 * salto para llegar a ellas.
 */
function notaPrerenderHTML(data, lang) {
  const t = data.prerender || {};
  const email = data.contacto?.email || "";
  const li = (href, texto) => `<li><a href="${esc(href)}">${esc(texto)}</a></li>`;

  return `
    <nav class="prerender-nota" aria-label="${esc(pickLang(t.aviso, lang))}">
      <p>${esc(pickLang(t.aviso, lang))}</p>
      <ul>
        ${li("/easy", pickLang(t.enlaceEasy, lang))}
        ${li(rutaProyectos(lang), pickLang(t.enlaceProyectos, lang))}
        ${li("/archive", pickLang(t.enlaceArchivo, lang))}
      </ul>
      <p>${esc(pickLang(t.escribeme, lang))}
        <a href="mailto:${esc(email)}">${esc(email)}</a>.</p>
    </nav>`;
}
