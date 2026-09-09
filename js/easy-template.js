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
 * Como `esc`, pero deja pasar enlaces escritos en markdown: `[texto](url)`.
 *
 * Los textos de data.json son texto plano a propósito —así nadie mete etiquetas
 * sin querer—, pero algún párrafo necesita citar su fuente. En vez de abrir el
 * HTML entero, se escapa todo primero y sólo después se reconstruyen los
 * enlaces, así que lo que no sea esta sintaxis exacta sigue saliendo literal.
 * Sólo se aceptan http(s) y rutas internas: un `javascript:` se queda en texto.
 */
export const escConEnlaces = (s) => esc(s).replace(
  /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g,
  (_, texto, url) => url.startsWith("/")
    ? `<a href="${url}">${texto}</a>`
    : `<a href="${url}" target="_blank" rel="noopener">${texto}</a>`
);

/**
 * Textos de interfaz por idioma: los encabezados de sección y las etiquetas del
 * visor de portfolio.
 *
 * Estaban escritos a pelo en castellano, y como estas plantillas las comparten
 * El pre-renderizado de cada celda servía
 * «metodología», «contacto» y «visitar ↗» en castellano — que es justo el texto
 * que lee Google de la home inglesa y la catalana.
 *
 * `portfolio` se queda igual en los tres a propósito: es de los
 * mismos términos que usan los nombres de celda del grid.
 */
export const UI = {
  es:  { portfolio: "portfolio", metodologia: "metodología",
         contacto: "contacto", caso: "ver el caso →", navegar: "seguir navegando",
         volverRejilla: "← volver al portfolio" },
  en:  { portfolio: "portfolio", metodologia: "methodology",
         contacto: "contact", caso: "see the case →", navegar: "keep browsing",
         volverRejilla: "← back to the portfolio" },
  cat: { portfolio: "portfolio", metodologia: "metodologia",
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
  const pasos = (data.metodologia?.[lang] || data.metodologia?.es || {}).pasos || [];
  const items = pasos.map((paso, i) => `
    <li class="easy-step">
      <span class="easy-step-num">${String(i + 1).padStart(2, "0")}</span>
      <div class="easy-step-text">
        <p class="easy-step-titular">${esc(paso.titular)}</p>
        ${(paso.parrafos || []).map(t => `<p>${esc(t)}</p>`).join("")}
      </div>
    </li>`).join("");

  const imp = (data.metodologia?.[lang] || data.metodologia?.es || {}).importante;
  const importante = imp ? `
      <div class="easy-importante">
        <h3 class="easy-h3">${esc(imp.titular)}</h3>
        ${(imp.parrafos || []).map(t => `<p>${esc(t)}</p>`).join("")}
        ${imp.enlace ? `<p><a href="${esc(rutaCelda("condiciones", lang))}">${esc(imp.enlace)}</a></p>` : ""}
      </div>` : "";

  return `
    <section class="easy-section" id="metodologia">
      <h2 class="easy-h">${esc(ui(lang).metodologia)}</h2>
      <ol class="easy-steps">${items}</ol>
      ${importante}
    </section>`;
}



/**
 * El about, pre-renderizado.
 *
 * Es la única versión sin JS de la celda `about`, así que lleva el texto
 * entero: la pregunta, la entrada, los apartados, el cierre y el contacto. El
 * precio se sustituye desde el cupón, que es donde vive el número.
 */
export function aboutHTML(data, lang) {
  const a = data.about || {};
  const d = a[lang] || a.es || {};
  const precio = data.welcome?.cupon?.precio ?? "";
  const co = data.contacto || {};
  const asunto = encodeURIComponent(co.asunto?.[lang] || co.asunto?.es || "");
  const cv = co.cv?.[lang] || co.cv?.es;
  const p = (t) => `<p>${escConEnlaces(t.replace("{precio}", precio))}</p>`;

  return `
    <section class="easy-section easy-about" id="about">
      <h1 class="easy-about-pregunta">${esc(d.pregunta || "")}</h1>
      <div class="easy-about-entrada">${(d.entrada || []).map(p).join("")}</div>
      ${(d.secciones || []).map(sec => `
      <h2 class="easy-h3">${esc(sec.titular)}</h2>
      ${(sec.parrafos || []).map(p).join("")}
      ${sec.imagen ? `<img class="easy-about-foto" src="${esc(sec.imagen.src)}" alt="${esc(sec.imagen.alt || "")}" loading="lazy" decoding="async">` : ""}`).join("")}
      ${d.cierre ? `
      <div class="easy-about-cierre">
        ${(d.cierre.parrafos || []).map(p).join("")}
        <p>${esc((d.cierre.precio || "").replace("{precio}", precio))}
        · <a href="${esc(rutaCelda("metodología", lang))}">${esc(d.cierre.enlace || "")}</a></p>
      </div>` : ""}
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
/**
 * Links: los mismos seis grupos que pinta la celda, en el mismo orden.
 *
 * Iba por su cuenta y se había quedado atrás: listaba cuatro grupos con el
 * reparto viejo, se dejaba fuera los formateadores y las 21 webs de clientes
 * —o sea los enlaces salientes que más valen— y titulaba «herramientas» en
 * inglés, porque ese grupo no tenía label y caía en su propia clave.
 *
 * En la celda, `herramientas` va suelto y sin encabezado, y el resto plegado en
 * desplegables (renderTools, en js/pages.js). Aquí abajo no hay desplegables
 * que abrir, así que todos son secciones con su título; el orden es el mismo.
 * Un enlace con varias urls (`urls`) se imprime como varios: sin JS no hay
 * botón doble que valga.
 */
export function linksHTML(data, lang) {
  const l = data.links || {};
  const etiqueta = (clave, porDefecto) => pickLang(l.labels?.[clave], lang) || porDefecto;

  // Las webs terminadas salen del portfolio, no de `links`: son los mismos 21
  // proyectos, aquí como enlace a la web del cliente y no a su ficha.
  const websTerminadas = (data.portfolio?.proyectos || []).map(p =>
    p.urls ? { urls: p.urls } : { nombre: p.nombre, url: p.url });

  const grupos = [
    { titulo: etiqueta("herramientas", "herramientas"), items: l.herramientas },
    { titulo: etiqueta("experimentos", "experimentos"), items: l.experimentos },
    // "wip" se usa igual en los tres idiomas, como el resto de nombres de celda.
    { titulo: "wip", items: l.wip },
    { titulo: etiqueta("formateadores", "formateadores"), items: data.welcome?.formateadores },
    { titulo: etiqueta("webs", "webs"), items: websTerminadas },
    { titulo: etiqueta("varios", "varios"), items: l.varios },
  ];

  const enlace = (i) => `<li><a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.nombre)}</a></li>`;

  const html = grupos
    .filter(g => Array.isArray(g.items) && g.items.length)
    .map(g => {
      const items = g.items.flatMap(i => (Array.isArray(i.urls) ? i.urls : [i]))
        .filter(i => i?.url)
        .map(enlace).join("");
      return `
      <div class="easy-links-grupo">
        <h2 class="easy-h">${esc(g.titulo)}</h2>
        <ul class="easy-links-lista">${items}</ul>
      </div>`;
    }).join("");

  return `
    <section class="easy-section easy-links" id="links">${html}
    </section>`;
}

/**
 * Mapa: el índice de las secciones del sitio, con sus enlaces.
 *
 * En el navegador esta celda es una rejilla de casillas que puedes recolocar
 * (js/mapa.js), pero recolocar es JavaScript y arrastrar casillas no se le
 * cuenta a nadie sin él. Aquí abajo se convierte en lo que de verdad es por
 * debajo: la lista de las secciones y a dónde va cada una. Un rastreador ve el
 * índice del sitio entero y quien navega sin JS tiene por fin una página que
 * los enlaza todos.
 *
 * El orden es el de RUTA_CELDAS, no el que tenga guardado nadie: lo que se
 * recoloca vive en el navegador de cada visitante y esto es HTML para todos.
 */
export function mapaHTML(data, lang) {
  const t = ui(lang);
  const zone = data.zoneLabels || {};
  const nombre = (celda) => pickLang(zone[celda], lang) || celda;
  const m = MAPA[lang] || MAPA.es;

  const secciones = ["welcome", "about", "metodología", "condiciones", "links"]
    .map(celda => {
      const ruta = rutaCelda(celda, lang);
      return ruta ? `<li><a href="${esc(ruta)}">${esc(nombre(celda))}</a></li>` : "";
    }).join("");

  return `
    <section class="easy-section easy-mapa" id="mapa">
      <p class="easy-eyebrow">${esc(m.eyebrow)}</p>
      <h1 class="easy-h">${esc(nombre("mapa"))}</h1>
      <p>${esc(m.texto)}</p>
      <ul class="easy-links-lista">${secciones}
        <li><a href="${esc(rutaProyectos(lang))}">${esc(t.portfolio)}</a></li>
      </ul>
    </section>`;
}

/** Los textos propios de la celda mapa, por idioma. */
const MAPA = {
  es:  { eyebrow: "estudio de diseño web · barcelona",
         texto: "las secciones de esta web. en el navegador puedes moverlas de sitio y se quedan así para ti: una web es un espacio propio, no un molde prestado." },
  en:  { eyebrow: "web design studio · barcelona",
         texto: "the sections of this website. in the browser you can move them around and they stay that way for you: a website is a place of your own, not a borrowed template." },
  cat: { eyebrow: "estudi de disseny web · barcelona",
         texto: "les seccions d'aquesta web. al navegador les pots moure de lloc i es queden així per a tu: una web és un espai propi, no un motlle prestat." },
};

/**
 * El cuerpo pre-renderizado de UNA celda.
 *
 * Es el cambio de fondo de todo esto: hasta ahora la raíz servía el texto de
 * todas las secciones y /easy servía una copia, así que ningún texto tenía una
 * URL propia por la que competir. Ahora cada celda pre-renderiza LO SUYO y solo
 * lo suyo; lo demás se alcanza por los enlaces del pie.
 *
 * La portada es la excepción y lleva dos cosas: el titular de venta y las cinco
 * líneas de entrada del about, que dejaron de ser una celda aparte.
 */
export function renderCeldaPrerenderHTML(data, lang, celda, enlaces = []) {
  const cuerpo = {
    // La portada lleva el hero Y la rejilla del portfolio. No es decoración:
    // en el HTML crudo de "/" no había NI UN enlace a las 21 fichas. Existían,
    // pero los pintaba JavaScript dentro de la celda portfolio, así que solo
    // los veía quien renderiza (Google sí; Bing a ratos, los rastreadores de IA
    // y los de redes sociales, no) y encima dentro de un contenedor con
    // `visibility:hidden`, que se pondera menos. Con esto, las 21 fichas del
    // idioma que toque están en el primer byte de la portada.
    //
    // No pesa: `html.js #seo-prerender` es `display:none`, así que el navegador
    // nunca descarga estas 21 imágenes. Sin JS sí se cargan, y ahí es justo lo
    // que quieres — es la única versión navegable de la home.
    welcome: () => heroHTML(data, lang) + portfolioHTML(data, lang),
    about: () => aboutHTML(data, lang),
    "metodología": () => metodologiaHTML(data, lang),
    condiciones: () => condicionesHTML(data, lang),
    links: () => linksHTML(data, lang),
    portfolio: () => portfolioHTML(data, lang),
    mapa: () => mapaHTML(data, lang),
  }[celda];

  // La celda `mapa` YA es la lista de secciones con sus enlaces: añadirle el
  // pie de navegación sería imprimir dos veces los mismos seis enlaces, uno
  // debajo del otro.
  const nota = celda === "mapa" ? "" : notaCeldaHTML(enlaces, lang);
  return (cuerpo ? cuerpo() : "") + nota;
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




