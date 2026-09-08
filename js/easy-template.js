// ============================================
// EASY TEMPLATE — plantillas HTML del "modo fácil" (sin DOM).
// ============================================
//
// Funciones puras que devuelven strings de HTML a partir de data.json. Al no
// tocar el DOM ni depender del navegador, se comparten entre:
//   - build-seo.js (Node: pre-renderiza el contenido de cada celda en su HTML)
// Así el texto que ve Google es EXACTAMENTE el que ve el visitante, sin copias
// que se desincronicen. Fuente única de contenido: data.json.

import { rutaProyectos, rutaCelda, slugify } from "./rutas.js";

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
 * El pre-renderizado de cada celda servía
 * «metodología», «contacto» y «visitar ↗» en castellano — que es justo el texto
 * que lee Google de la home inglesa y la catalana.
 *
 * `portfolio` y `statement` se quedan igual en los tres a propósito: son los
 * mismos términos que usan los nombres de celda del grid.
 */
export const UI = {
  es:  { portfolio: "portfolio", statement: "statement", metodologia: "metodología",
         contacto: "contacto", caso: "ver el caso →", navegar: "seguir navegando",
         volverRejilla: "← volver al portfolio" },
  en:  { portfolio: "portfolio", statement: "statement", metodologia: "methodology",
         contacto: "contact", caso: "see the case →", navegar: "keep browsing",
         volverRejilla: "← back to the portfolio" },
  cat: { portfolio: "portfolio", statement: "statement", metodologia: "metodologia",
         contacto: "contacte", caso: "veure el cas →",
         volverRejilla: "← tornar al portfolio", navegar: "seguir navegant" },
};

/** Los textos de interfaz del idioma pedido, con fallback a castellano. */
export const ui = (lang) => UI[lang] || UI.es;

// Titular de venta por idioma (el wordmark vive en el pie).
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
      ${t.condiciones ? `<p class="easy-hero-condiciones">${esc(t.condiciones)}</p>` : ""}
      <div class="easy-hero-cta">
        <a class="easy-btn" href="${mailto}">${esc(t.cta || "escríbeme")}</a>
      </div>
    </section>`;
}

/**
 * Portfolio: la MISMA rejilla que la celda portfolio de la home.
 *
 * Antes era un visor grande con veinte miniaturas de 60px debajo. Dos motivos
 * para cambiarlo: a ese tamaño, veinte capturas de web son veinte rectángulos
 * grises que no se distinguen entre sí; y era un patrón que no existía en
 * ninguna otra pantalla del sitio.
 *
 * Reutiliza las clases .portfolio-grid/.pgrid-* de la home, no unas propias:
 * el objetivo era que encajara con el resto, y compartir las reglas es la única
 * forma de que siga encajando cuando se toquen. Cero CSS nuevo.
 *
 * Lo único que no se copia es el crossfade entre las imágenes de cada proyecto,
 * que en la home lo mueve JS: aquí se sirve la captura principal y ya. Es
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

  const fichas = proyectos.map(p => {
    // La captura va a la ficha del proyecto, no a la web del cliente: ver la
    // nota larga en js/portfolio.js. Como ya no depende de la url, el caso de
    // las dos urls (mokakopaTwins) deja de ser especial y la captura es un
    // enlace normal como las demás.
    const href = `${rutaProyectos(lang)}/${slugify(p.nombre)}`;

    return `
        <div class="pgrid-item">
          <a class="pgrid-thumb" href="${esc(href)}"><img class="pgrid-img pgrid-img-a" src="/${esc(p.imagen)}"
                 alt="${esc(altFor(p))}" width="1600" height="1049"
                 loading="lazy" decoding="async"></a>
          <div class="pgrid-meta">
            <a class="pgrid-nombre" href="${esc(href)}">${esc(p.nombre)}</a>
            <a class="pgrid-caso" href="${esc(href)}">${esc(t.caso)}</a>
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
  const m = data.metodologia?.[lang] || data.metodologia?.es || {};
  const lineas = m.lineas || [];
  const pasos = lineas.map((l, i) => `
    <li class="easy-step">
      <span class="easy-step-num">${String(i + 1).padStart(2, "0")}</span>
      <p class="easy-step-text">${esc(l)}</p>
    </li>`).join("");
  const suelto = (ls, clase) => (ls || [])
    .map(l => `<p class="${clase}">${esc(l)}</p>`).join("");

  return `
    <section class="easy-section" id="metodologia">
      <h2 class="easy-h">${esc(ui(lang).metodologia)}</h2>
      ${suelto(m.intro, "easy-metodologia-intro")}
      <ol class="easy-steps">${pasos}</ol>
      ${suelto(m.cierre, "easy-metodologia-cierre")}
    </section>`;
}



/**
 * El about, pre-renderizado.
 *
 * Es la única versión sin JS de la celda `about`, así que lleva el texto
 * entero: la pregunta, la foto, los cinco apartados y el contacto. El precio
 * se sustituye desde el cupón, que es donde vive el número.
 */
export function aboutHTML(data, lang) {
  const a = data.about || {};
  const d = a[lang] || a.es || {};
  const precio = data.welcome?.cupon?.precio ?? "";
  const co = data.contacto || {};
  const asunto = encodeURIComponent(co.asunto?.[lang] || co.asunto?.es || "");
  const cv = co.cv?.[lang] || co.cv?.es;

  // Ver la nota en pages.js: un párrafo que sea un array es una lista.
  const parrafo = (t) => Array.isArray(t)
    ? `<ol class="easy-about-lista">${t.map(i => `<li>${esc(i)}</li>`).join("")}</ol>`
    : `<p>${esc(t.replace("{precio}", precio))}</p>`;

  const enlace = (e) => e
    ? `<p class="easy-about-enlace"><a href="${esc(rutaCelda(e.celda, lang) || "/")}">${esc(e.texto)}</a></p>`
    : "";

  const secciones = (d.secciones || []).map(sec => `
      <div class="easy-about-bloque">
        <h2 class="easy-h">${esc(sec.titulo)}</h2>
        ${(sec.parrafos || []).map(parrafo).join("")}${enlace(sec.enlace)}
      </div>`).join("");

  const lineas = (data.statement?.[lang] || data.statement?.es || {}).lineas || [];
  const statement = lineas.map(l => `<p class="easy-statement-line">${esc(l)}</p>`).join("");

  return `
    <section class="easy-section easy-about" id="about">
      <h1 class="easy-about-pregunta">${esc(d.pregunta || "")}</h1>
      ${statement}${secciones}
      <p class="easy-about-contacto">
        <a href="mailto:${esc(co.email)}?subject=${asunto}">${esc(co.email)}</a>
        ${co.instagram ? `<a href="${esc(co.instagram.url)}" target="_blank" rel="noopener">${esc(co.instagram.usuario)}</a>` : ""}
        ${cv ? `<a href="/${esc(cv)}" target="_blank" rel="noopener">cv</a>` : ""}
      </p>
    </section>`;
}

/**
 * Condiciones, privacidad y financiación: la letra pequeña del estudio.
 *
 * Los párrafos de privacidad traen etiquetas dentro (negritas y enlaces a la
 * lssi y a cloudflare), así que van SIN escapar; son texto nuestro de
 * data.json, no entrada de nadie. Los logos van con ruta absoluta porque esta
 * misma función pinta /condiciones y /en/terms, que están a distinta
 * profundidad.
 */
export function condicionesHTML(data, lang) {
  const secciones = (data.footer?.[lang] || data.footer?.es || {}).secciones || [];

  const bloques = secciones.map(sec => {
    if (sec.tipo === "subvencion") {
      const logos = (sec.logos || []).map(l =>
        `<img class="easy-logo" src="/img/LOGOS/light/${esc(l.name)}.webp" alt="${esc(l.alt || "")}"
              loading="lazy" decoding="async">`).join("");
      return `
      <div class="easy-legal-bloque" id="financiacion">
        <h2 class="easy-h">${esc(sec.label)}</h2>
        <p>${esc(sec.intro || "")}</p>
        <div class="easy-logos">${logos}</div>
        <p class="easy-legal-frase">${esc(sec.frase || "")}</p>
      </div>`;
    }
    return `
      <div class="easy-legal-bloque">
        <h2 class="easy-h">${esc(sec.label)}</h2>
        ${(sec.parrafos || []).map(t => `<p>${t}</p>`).join("")}
        ${sec.nota ? `<p class="easy-legal-nota">${esc(sec.nota)}</p>` : ""}
      </div>`;
  }).join("");

  return `
    <section class="easy-section easy-legal" id="condiciones">${bloques}
    </section>`;
}

/**
 * La celda de links: las herramientas y los experimentos que hay publicados.
 *
 * Son enlaces salientes a otros dominios; el valor de esta página es la lista
 * en sí, así que va entera en el HTML crudo.
 */
export function linksHTML(data, lang) {
  const l = data.links || {};
  const grupos = ["herramientas", "experimentos", "wip", "varios"]
    .filter(k => Array.isArray(l[k]) && l[k].length)
    .map(k => {
      const titulo = pickLang(l.labels?.[k], lang) || k;
      const items = l[k].map(i =>
        `<li><a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.nombre)}</a></li>`
      ).join("");
      return `
      <div class="easy-links-grupo">
        <h2 class="easy-h">${esc(titulo)}</h2>
        <ul class="easy-links-lista">${items}</ul>
      </div>`;
    }).join("");

  return `
    <section class="easy-section easy-links" id="links">${grupos}
    </section>`;
}

/**
 * El cuerpo pre-renderizado de UNA celda.
 *
 * Es el cambio de fondo de todo esto: hasta ahora la raíz servía el texto de
 * todas las secciones y /easy servía una copia, así que ningún texto tenía una
 * URL propia por la que competir. Ahora cada celda pre-renderiza LO SUYO y solo
 * lo suyo; lo demás se alcanza por los enlaces del pie.
 *
 * La portada es la excepción y lleva dos cosas: el titular de venta y las cinco
 * frases del statement, que dejaron de ser celda y son el claim del estudio.
 */
export function renderCeldaPrerenderHTML(data, lang, celda, enlaces = []) {
  const cuerpo = {
    welcome: () => heroHTML(data, lang),
    about: () => aboutHTML(data, lang),
    "metodología": () => metodologiaHTML(data, lang),
    condiciones: () => condicionesHTML(data, lang),
    links: () => linksHTML(data, lang),
    portfolio: () => portfolioHTML(data, lang),
  }[celda];

  return (cuerpo ? cuerpo() : "") + notaCeldaHTML(enlaces, lang);
}

/**
 * El pie del bloque pre-renderizado: las otras celdas, en enlaces de verdad.
 *
 * Sin esto, un rastreador que no ejecuta JS vería seis páginas sueltas sin
 * ningún camino entre ellas — el lienzo las une, pero el lienzo es JavaScript.
 */
function notaCeldaHTML(enlaces, lang) {
  if (!enlaces.length) return "";
  const items = enlaces.map(e =>
    `<li><a href="${esc(e.href)}">${esc(e.texto)}</a></li>`).join("");
  return `
    <nav class="prerender-nota" aria-label="${esc(ui(lang).navegar)}">
      <ul>${items}</ul>
    </nav>`;
}




