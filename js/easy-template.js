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

/** Escoge la variante de idioma de un objeto {es,en,cat}, con fallback a es. */
export const pickLang = (obj, lang) => obj?.[lang] ?? obj?.es ?? "";

export const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

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

// Portfolio: visor grande (imágenes apiladas que se funden por opacidad) + rejilla
// de miniaturas para elegir. El nombre y "visitar" se actualizan al cambiar (ver
// initPortfolio en easy-main.js). Cada proyecto con url es un enlace; sin url, un
// div neutro. El alt describe el proyecto para SEO/accesibilidad: usa el campo
// `alt` de data.json si existe; si no, genera uno con el nombre + estudio + ciudad.
export function portfolioHTML(data) {
  const proyectos = data.portfolio?.proyectos || [];
  const altFor = (p) => p.alt || `${p.nombre} — web diseñada por meowrhino studio, Barcelona`;
  const slides = proyectos.map(p => {
    const href = p.url || p.urls?.[0]?.url || "";
    const open = href
      ? `<a class="easy-pf-slide" href="${esc(href)}" target="_blank" rel="noopener" data-name="${esc(p.nombre)}">`
      : `<div class="easy-pf-slide" data-name="${esc(p.nombre)}">`;
    const close = href ? "</a>" : "</div>";
    return `${open}<img src="${esc(p.imagen)}" alt="${esc(altFor(p))}" loading="lazy" decoding="async">${close}`;
  }).join("");
  const thumbs = proyectos.map((p, i) => `
    <button class="easy-pf-thumb" type="button" data-i="${i}" aria-label="${esc(p.nombre)}">
      <img src="${esc(p.imagen)}" alt="" loading="lazy" decoding="async">
    </button>`).join("");
  return `
    <section class="easy-section easy-portfolio" id="portfolio">
      <h2 class="easy-h">portfolio</h2>
      <div class="easy-pf">
        <div class="easy-pf-viewer">
          <button class="easy-pf-nav easy-pf-prev" type="button" aria-label="proyecto anterior">‹</button>
          <div class="easy-pf-stage" tabindex="0" role="group" aria-label="proyectos">${slides}</div>
          <button class="easy-pf-nav easy-pf-next" type="button" aria-label="proyecto siguiente">›</button>
        </div>
        <p class="easy-pf-caption">
          <span class="easy-pf-name"></span>
          <a class="easy-pf-visitar" target="_blank" rel="noopener" hidden>visitar ↗</a>
        </p>
        <div class="easy-pf-thumbs">${thumbs}</div>
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
      <h2 class="easy-h">metodología</h2>
      <ol class="easy-steps">${pasos}</ol>
    </section>`;
}

export function statementHTML(data, lang) {
  const lineas = (data.statement?.[lang] || data.statement?.es || {}).lineas || [];
  const ls = lineas.map(l => `<p class="easy-statement-line">${esc(l)}</p>`).join("");
  return `
    <section class="easy-section easy-statement" id="statement">
      <h2 class="easy-h">statement</h2>
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
      <h2 class="easy-h">contacto</h2>
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
  return `
    <footer class="easy-footer">
      <a href="index.html">meowrhino.studio</a>
    </footer>`;
}

// Cuerpo completo del modo fácil, en el mismo orden que pinta el navegador.
export function renderBodyHTML(data, lang) {
  return heroHTML(data, lang) +
    portfolioHTML(data) +
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
    portfolioHTML(data) +
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
 * visitante inglés a la versión castellana teniendo la suya.
 */
const RUTA_PROYECTOS = { es: "/proyectos", en: "/en/projects", cat: "/ca/projectes" };

function notaPrerenderHTML(data, lang) {
  const t = data.prerender || {};
  const email = data.contacto?.email || "";
  const li = (href, texto) => `<li><a href="${esc(href)}">${esc(texto)}</a></li>`;

  return `
    <nav class="prerender-nota" aria-label="${esc(pickLang(t.aviso, lang))}">
      <p>${esc(pickLang(t.aviso, lang))}</p>
      <ul>
        ${li("easy.html", pickLang(t.enlaceEasy, lang))}
        ${li(RUTA_PROYECTOS[lang] || RUTA_PROYECTOS.es, pickLang(t.enlaceProyectos, lang))}
        ${li("archive.html", pickLang(t.enlaceArchivo, lang))}
      </ul>
      <p>${esc(pickLang(t.escribeme, lang))}
        <a href="mailto:${esc(email)}">${esc(email)}</a>.</p>
    </nav>`;
}
