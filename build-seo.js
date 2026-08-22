// ============================================
// BUILD SEO — genera las variantes por idioma de la home, el pre-render de
// /easy, las páginas de proyecto y el sitemap.
// ============================================
//
// Por qué el pre-render: las páginas llegan con su contenedor vacío y el
// contenido lo pinta JavaScript. Los buscadores (y cualquier bot sin JS) verían
// la página vacía. Este script escribe el mismo HTML que produce el navegador
// entre los marcadores BUILD, para que el texto esté ya en el primer byte.
//
// Por qué las variantes por idioma: el sitio habla es/en/cat, pero servirlos
// todos desde la misma URL cambiando el texto por JS deja a Google viendo solo
// uno (el pre-renderizado). Con /en y /ca cada idioma tiene su URL indexable,
// su <html lang>, sus metadatos y los hreflang que las enlazan entre sí.
//
// Los tres archivos viven en la RAÍZ (index.html, en.html, ca.html) a propósito:
// así las rutas relativas del HTML (style.css, js/, img/, data.json) siguen
// resolviendo igual en las tres. Con /en/index.html habría que reescribirlas.
//
// Uso:   node build-seo.js
// Se ejecuta solo antes de cada commit que toque data.json (hook de pre-commit),
// así el HTML estático nunca se desincroniza de data.json.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  esc, renderBodyHTML, renderHomePrerenderHTML,
} from "./js/easy-template.js";
import {
  enlacesDe, renderIndiceHTML, renderProyectoHTML,
} from "./js/proyecto-template.js";

const ROOT = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(ROOT, "data.json");
const SEO_PATH = join(ROOT, "proyectos-seo.json");
const SITE = "https://meowrhino.studio";

/**
 * Idiomas de la home. `code` es la clave dentro de data.json; `htmlLang` el
 * código BCP-47 que va en <html lang> y en hreflang (catalán se guarda como
 * "cat" pero se declara como "ca"); `file` el archivo generado y `path` su URL
 * pública (Cloudflare sirve en.html en /en).
 */
const IDIOMAS = [
  { code: "es",  htmlLang: "es", ogLocale: "es_ES", file: "index.html", path: "/",
    proyBase: "/proyectos",     proyDir: "proyectos",     proyFile: "proyectos.html" },
  { code: "en",  htmlLang: "en", ogLocale: "en_GB", file: "en.html",    path: "/en",
    proyBase: "/en/projects",   proyDir: "en/projects",   proyFile: "en/projects.html" },
  { code: "cat", htmlLang: "ca", ogLocale: "ca_ES", file: "ca.html",    path: "/ca",
    proyBase: "/ca/projectes",  proyDir: "ca/projectes",  proyFile: "ca/projectes.html" },
];

/** El idioma por defecto: la raíz y el x-default de los hreflang. */
const POR_DEFECTO = IDIOMAS[0];

/** Escoge la variante de idioma de un objeto {es,en,cat}, con fallback a es. */
const pick = (obj, code) => obj?.[code] ?? obj?.es ?? "";

/** URL absoluta de una variante. */
const urlDe = (idioma) => `${SITE}${idioma.path}`;

/** Sustituye el bloque entre los marcadores BUILD:<marker>. */
function reemplazarBloque(html, marker, contenido) {
  const START = `<!-- BUILD:${marker}:start -->`;
  const END = `<!-- BUILD:${marker}:end -->`;

  const startIdx = html.indexOf(START);
  const endIdx = html.indexOf(END);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error(`No encuentro los marcadores ${START} … ${END}`);
  }

  return html.slice(0, startIdx + START.length) +
    `\n${contenido}\n  ` +
    html.slice(endIdx);
}

/**
 * Los <link rel="alternate" hreflang> que se repiten en las tres variantes.
 * Cada página debe listar TODAS las alternativas, incluida ella misma, o Google
 * ignora el grupo entero. x-default marca a dónde mandar a quien no encaje en
 * ninguno de los tres idiomas.
 */
function hreflangHTML() {
  const alternas = IDIOMAS.map(i =>
    `  <link rel="alternate" hreflang="${i.htmlLang}" href="${urlDe(i)}">`
  ).join("\n");
  return `${alternas}\n  <link rel="alternate" hreflang="x-default" href="${urlDe(POR_DEFECTO)}">`;
}

/**
 * Datos estructurados del estudio, en el idioma de la página.
 *
 * Van generados y no fijos en el HTML porque `description` y `url` cambian por
 * idioma: dejarlos estáticos hacía que /en y /ca declarasen la descripción en
 * castellano y se atribuyesen la URL de la raíz.
 */
function jsonLdHTML(data, idioma) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "meowrhino studio",
    description: pick(data.meta?.description, idioma.code),
    url: urlDe(idioma),
    email: "hola@meowrhino.studio",
    // El mismo número que publica la ficha de Google Business Profile: si no
    // coinciden, Google los trata como dos negocios distintos.
    telephone: "+34644471997",
    image: `${SITE}/favicon/android-chrome-512x512.png`,
    areaServed: { "@type": "City", name: "Barcelona" },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Barcelona",
      addressCountry: "ES",
    },
    founder: { "@type": "Person", name: "Manuel Latour Fernández" },
    inLanguage: idioma.htmlLang,
    knowsLanguage: IDIOMAS.map(i => i.htmlLang),
    // La ficha de Google Business Profile va en sameAs: es lo que le dice a
    // Google que esta web y esa ficha son el mismo negocio, y sin ese vínculo el
    // schema declaraba un negocio local sin nada que lo respaldara.
    sameAs: [
      "https://instagram.com/meowrhino",
      "https://github.com/meowrhino",
      "https://maps.app.goo.gl/W48ZgTHqYmr4WgYN9",
    ],
    priceRange: "€€",
  };

  // JSON.stringify ya escapa lo necesario; el contenido sale de data.json y no
  // lleva `<`, pero cerramos la puerta a que un futuro texto rompa el <script>.
  const json = JSON.stringify(schema, null, 2)
    .replace(/</g, "\\u003c")
    .split("\n").map(l => `  ${l}`).join("\n");

  return `  <script type="application/ld+json">\n${json}\n  </script>`;
}

/** Bloque <head> que depende del idioma. */
function headHTML(data, idioma) {
  const titulo = pick(data.meta?.title, idioma.code);
  const desc = pick(data.meta?.description, idioma.code);
  const url = urlDe(idioma);

  return [
    `  <meta name="description" content="${esc(desc)}">`,
    `  <title>${esc(titulo)}</title>`,
    `  <link rel="canonical" href="${url}">`,
    hreflangHTML(),
    `  <meta property="og:title" content="${esc(titulo)}">`,
    `  <meta property="og:description" content="${esc(desc)}">`,
    `  <meta property="og:url" content="${url}">`,
    `  <meta property="og:locale" content="${idioma.ogLocale}">`,
    `  <meta name="twitter:title" content="${esc(titulo)}">`,
    `  <meta name="twitter:description" content="${esc(desc)}">`,
    jsonLdHTML(data, idioma),
  ].join("\n");
}

/** Genera el HTML completo de una variante de la home a partir de la plantilla. */
function paginaHome(plantilla, data, idioma) {
  let html = reemplazarBloque(plantilla, "head", headHTML(data, idioma));
  html = reemplazarBloque(html, "home", renderHomePrerenderHTML(data, idioma.code));
  // El <html lang> tiene que coincidir con el contenido pre-renderizado: es la
  // señal que lee data.js al arrancar para saber en qué idioma pintarse.
  html = html.replace(/<html lang="[^"]*"/, `<html lang="${idioma.htmlLang}"`);
  return html;
}

// ============================================
// PÁGINAS DE PROYECTO (/proyectos/<slug>)
// ============================================
//
// Una página por proyecto, cada una atacando una long-tail distinta ("web para
// tatuadores barcelona", "web para diseñadores de portadas de disco"…). Son la
// mayor parte del contenido indexable del sitio: la home compite por "diseño web
// barcelona", que está saturada, y estas por búsquedas que sí podemos ganar.
//
// Van en un directorio y no en la raíz porque son 21 archivos por idioma y
// ensuciarían el árbol. A cambio, sus rutas a assets tienen que ser absolutas
// (ver la nota en js/proyecto-template.js).
//
// Las tres variantes por idioma, con el segmento de ruta traducido:
//   /proyectos/<slug>  ·  /en/projects/<slug>  ·  /ca/projectes/<slug>
// El slug NO se traduce: sale del nombre del proyecto, que es un nombre propio.
// Los índices salen de un archivo suelto (proyectos.html, en/projects.html…) y
// no de un index.html dentro del directorio, porque Cloudflare trata el índice
// de un directorio como /proyectos/ y redirige /proyectos ahí con un 307.

/** Une cada proyecto de data.json con su copia en proyectos-seo.json. */
function fichasDeProyecto(data, seoDoc) {
  const proyectos = data.portfolio?.proyectos ?? [];
  const porNombre = new Map(proyectos.map(p => [p.nombre, p]));

  return seoDoc.proyectos.map(seo => {
    const proyecto = porNombre.get(seo.nombre);
    if (!proyecto) {
      throw new Error(
        `proyectos-seo.json habla de "${seo.nombre}", que no existe en ` +
        `data.json. Los nombres tienen que coincidir exactamente.`
      );
    }
    return { proyecto, seo };
  });
}

/**
 * hreflang de una página de proyecto: enlaza sus tres variantes de idioma.
 * `sufijo` es "" para el índice y "/<slug>" para una página concreta.
 */
function hreflangProyectoHTML(sufijo) {
  const alternas = IDIOMAS.map(i =>
    `  <link rel="alternate" hreflang="${i.htmlLang}" href="${SITE}${i.proyBase}${sufijo}">`
  ).join("\n");
  return `${alternas}\n  <link rel="alternate" hreflang="x-default" href="${SITE}${POR_DEFECTO.proyBase}${sufijo}">`;
}

/** Datos estructurados de una página de proyecto. */
function jsonLdProyecto(proyecto, seo, idioma) {
  const enlaces = enlacesDe(proyecto);
  const schema = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: proyecto.nombre,
    headline: pick(seo.title, idioma.code),
    description: pick(seo.description, idioma.code),
    url: `${SITE}${idioma.proyBase}/${seo.slug}`,
    image: `${SITE}/${proyecto.imagen}`,
    inLanguage: idioma.htmlLang,
    creator: {
      "@type": "ProfessionalService",
      name: "meowrhino studio",
      url: SITE,
      areaServed: { "@type": "City", name: "Barcelona" },
    },
    isPartOf: { "@type": "CollectionPage", url: `${SITE}${idioma.proyBase}` },
  };
  // `about` solo si el proyecto tiene web pública: es la obra de la que habla
  // la página, y sin URL no hay entidad que señalar.
  if (enlaces.length) {
    schema.about = enlaces.map(e => ({
      "@type": "WebSite", name: e.nombre, url: e.url,
    }));
  }
  return scriptLdHTML(schema);
}

/** Serializa un schema a <script type="application/ld+json">, ya escapado. */
function scriptLdHTML(schema) {
  const json = JSON.stringify(schema, null, 2)
    .replace(/</g, "\\u003c")
    .split("\n").map(l => `  ${l}`).join("\n");
  return `  <script type="application/ld+json">\n${json}\n  </script>`;
}

/**
 * Esqueleto común de las páginas de /proyectos.
 *
 * Reutiliza el CSS del modo fácil (html.easy + body.easy-mode): son páginas de
 * scroll lineal, igual que /easy, así que heredan tipografía, ritmo vertical y
 * botones sin duplicar reglas. Lo propio vive en la sección 18 de style.css.
 */
function paginaProyectoHTML({ title, description, url, imagen, jsonLd, cuerpo, idioma, hreflang }) {
  return `<!DOCTYPE html>
<html lang="${idioma.htmlLang}" class="easy">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- Generado por build-seo.js a partir de proyectos-seo.json. No editar a mano. -->
  <meta name="description" content="${esc(description)}">
  <title>${esc(title)}</title>
  <link rel="canonical" href="${url}">
${hreflang}
  <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#121212" media="(prefers-color-scheme: dark)">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="meowrhino studio">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:locale" content="${idioma.ogLocale}">
  <meta property="og:image" content="${imagen}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${imagen}">
  <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16x16.png">
  <link rel="icon" href="/favicon/favicon.ico">
  <link rel="preload" href="/fonts/inknut-400-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/style.css">
${jsonLd}
  <script>
    (function() {
      var t = localStorage.getItem("meowrhino-theme");
      if (!t && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) t = "dark";
      if (t === "dark") document.documentElement.setAttribute("data-theme", "dark");
    })();
  </script>
</head>
<body class="easy-mode">
  <main id="easy" role="main">
${cuerpo}
  </main>
</body>
</html>
`;
}

/** Página de un proyecto, en un idioma. */
function paginaProyecto({ proyecto, seo }, idioma) {
  const rutas = { indice: idioma.proyBase, home: idioma.path };
  return paginaProyectoHTML({
    idioma,
    title: pick(seo.title, idioma.code),
    description: pick(seo.description, idioma.code),
    url: `${SITE}${idioma.proyBase}/${seo.slug}`,
    imagen: `${SITE}/${proyecto.imagen}`,
    hreflang: hreflangProyectoHTML(`/${seo.slug}`),
    jsonLd: jsonLdProyecto(proyecto, seo, idioma),
    cuerpo: renderProyectoHTML(proyecto, seo, idioma.code, rutas),
  });
}

/** Índice de proyectos de un idioma: la puerta de entrada a las 20 páginas. */
function paginaIndice(fichas, idioma) {
  const t = INDICE[idioma.code] || INDICE.es;
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: t.schemaName,
    description: t.description,
    url: `${SITE}${idioma.proyBase}`,
    inLanguage: idioma.htmlLang,
    isPartOf: { "@type": "WebSite", name: "meowrhino studio", url: SITE },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: fichas.length,
      itemListElement: fichas.map(({ proyecto, seo }, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: proyecto.nombre,
        url: `${SITE}${idioma.proyBase}/${seo.slug}`,
      })),
    },
  };

  return paginaProyectoHTML({
    idioma,
    title: t.title,
    description: t.description,
    url: `${SITE}${idioma.proyBase}`,
    imagen: `${SITE}/favicon/og-image.png`,
    hreflang: hreflangProyectoHTML(""),
    jsonLd: scriptLdHTML(schema),
    cuerpo: renderIndiceHTML(fichas, idioma.code, { base: idioma.proyBase, home: idioma.path }),
  });
}

/** Metadatos del índice, por idioma. */
const INDICE = {
  es: {
    schemaName: "proyectos — meowrhino studio",
    title: "proyectos — 20 webs a medida hechas en barcelona · meowrhino studio",
    description: "20 webs diseñadas a medida en Barcelona para artistas, fotógrafos, " +
      "músicos y pequeños negocios. Cada proyecto cuenta cómo se hizo y por qué acabó siendo así.",
  },
  en: {
    schemaName: "projects — meowrhino studio",
    title: "projects — 20 custom websites made in barcelona · meowrhino studio",
    description: "20 websites custom-built in Barcelona for artists, photographers, " +
      "musicians and small businesses. Each project tells how it was made and why it ended up like this.",
  },
  cat: {
    schemaName: "projectes — meowrhino studio",
    title: "projectes — 20 webs a mida fetes a barcelona · meowrhino studio",
    description: "20 webs dissenyades a mida a Barcelona per a artistes, fotògrafs, " +
      "músics i petits negocis. Cada projecte explica com es va fer i per què va acabar sent així.",
  },
};

/**
 * Los `lastmod` del sitemap anterior, indexados por URL.
 *
 * Se releen para poder CONSERVARLOS: `lastmod` significa "cuándo cambió esta
 * página", no "cuándo se ejecutó el build". Sellarlo con la fecha de hoy en cada
 * ejecución ensuciaba git con 25 líneas que no querían decir nada, y además le
 * mentía a Google — que usa la fecha para decidir qué merece la pena reindexar.
 */
function lastmodsPrevios() {
  let xml = "";
  try { xml = readFileSync(join(ROOT, "sitemap.xml"), "utf8"); } catch { return new Map(); }

  const previos = new Map();
  const bloque = /<loc>([^<]+)<\/loc>[\s\S]*?<lastmod>([^<]+)<\/lastmod>/g;
  for (const [, loc, lastmod] of xml.matchAll(bloque)) previos.set(loc, lastmod);
  return previos;
}

/**
 * Sitemap con las tres variantes de la home, el archivo y las de proyecto.
 *
 * `cambiadas` son las rutas que este build ha reescrito de verdad; solo esas
 * estrenan fecha. Las demás heredan la que ya tenían.
 */
function sitemapXML(fichas = [], cambiadas = new Set()) {
  const hoy = new Date().toISOString().slice(0, 10);
  const previos = lastmodsPrevios();

  // Una URL sin fecha previa es nueva: hoy es su fecha real de publicación.
  const fechaDe = (loc, archivo) =>
    cambiadas.has(archivo) ? hoy : (previos.get(loc) ?? hoy);

  /** Alternativas hreflang de una página de proyecto, para el sitemap. */
  const alternasProy = (sufijo) =>
    IDIOMAS.map(i =>
      `    <xhtml:link rel="alternate" hreflang="${i.htmlLang}" href="${SITE}${i.proyBase}${sufijo}"/>`
    ).join("\n") +
    `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${POR_DEFECTO.proyBase}${sufijo}"/>`;

  // Cada variante declara sus alternativas también aquí: es la forma que
  // recomienda Google para que no dependa solo de las etiquetas del HTML.
  const alternas = IDIOMAS.map(i =>
    `    <xhtml:link rel="alternate" hreflang="${i.htmlLang}" href="${urlDe(i)}"/>`
  ).join("\n") +
    `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${urlDe(POR_DEFECTO)}"/>`;

  const homes = IDIOMAS.map(i => `  <url>
    <loc>${urlDe(i)}</loc>
${alternas}
    <lastmod>${fechaDe(urlDe(i), i.file)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generado por build-seo.js. No editar a mano. -->
<!-- Solo URLs canónicas: /easy sirve el mismo contenido que la raíz y su
     canonical apunta ahí, así que listarlo mandaría señales cruzadas. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${homes}
  <url>
    <loc>${SITE}/archive</loc>
    <lastmod>${fechaDe(`${SITE}/archive`, "archive.html")}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
${IDIOMAS.map(i => `  <url>
    <loc>${SITE}${i.proyBase}</loc>
${alternasProy("")}
    <lastmod>${fechaDe(`${SITE}${i.proyBase}`, i.proyFile)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`).join("\n")}
${fichas.flatMap(({ seo }) => IDIOMAS.map(i => `  <url>
    <loc>${SITE}${i.proyBase}/${seo.slug}</loc>
${alternasProy(`/${seo.slug}`)}
    <lastmod>${fechaDe(`${SITE}${i.proyBase}/${seo.slug}`, `${i.proyDir}/${seo.slug}.html`)}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.6</priority>
  </url>`)).join("\n")}
</urlset>
`;
}

/**
 * Escribe solo si cambió, para que el build sea idempotente y no ensucie git.
 * Devuelve si ha escrito: el sitemap lo usa para saber a qué URLs les toca
 * `lastmod` nuevo y a cuáles hay que conservarles el que ya tenían.
 */
function escribirSiCambia(nombre, contenido) {
  const path = join(ROOT, nombre);
  let actual = null;
  try { actual = readFileSync(path, "utf8"); } catch { /* no existía */ }

  if (actual === contenido) {
    console.log(`· ${nombre} ya estaba al día.`);
    return false;
  }
  writeFileSync(path, contenido);
  console.log(`✓ ${nombre} ${actual === null ? "creado" : "actualizado"}.`);
  return true;
}

function main() {
  const data = JSON.parse(readFileSync(DATA_PATH, "utf8"));
  const seoDoc = JSON.parse(readFileSync(SEO_PATH, "utf8"));

  // La plantilla se lee UNA vez, antes de escribir nada: index.html es a la vez
  // plantilla y salida, y si se releyera por idioma arrastraría lo ya escrito.
  const plantillaHome = readFileSync(join(ROOT, "index.html"), "utf8");

  try {
    // Se resuelve ANTES de escribir nada: si un nombre no casa entre los dos
    // JSON, mejor fallar con el árbol intacto que a medio generar.
    const fichas = fichasDeProyecto(data, seoDoc);

    // Qué páginas ha reescrito este build: de ahí salen los `lastmod` nuevos.
    const cambiadas = new Set();
    const generar = (nombre, contenido) => {
      if (escribirSiCambia(nombre, contenido)) cambiadas.add(nombre);
    };

    for (const idioma of IDIOMAS) {
      generar(idioma.file, paginaHome(plantillaHome, data, idioma));
    }

    const easy = readFileSync(join(ROOT, "easy.html"), "utf8");
    generar("easy.html", reemplazarBloque(easy, "easy", renderBodyHTML(data, "es")));

    // Cada idioma tiene su índice suelto (proyectos.html, en/projects.html…) y
    // su directorio de fichas. El índice NO va como index.html dentro del
    // directorio: Cloudflare lo trataría como /proyectos/ y redirigiría
    // /proyectos ahí con un 307, dejando el canonical apuntando a una URL que
    // redirige. Así se sirve en /proyectos sin salto, igual que /archive.
    for (const idioma of IDIOMAS) {
      mkdirSync(join(ROOT, idioma.proyDir), { recursive: true });
      generar(idioma.proyFile, paginaIndice(fichas, idioma));
      for (const ficha of fichas) {
        generar(`${idioma.proyDir}/${ficha.seo.slug}.html`, paginaProyecto(ficha, idioma));
      }
    }

    // El sitemap va el último: necesita saber qué se ha reescrito antes.
    escribirSiCambia("sitemap.xml", sitemapXML(fichas, cambiadas));

    console.log(`\n${IDIOMAS.length} idiomas · ${fichas.length} proyectos ` +
      `· ${IDIOMAS.length * (fichas.length + 1)} páginas de proyecto.`);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    process.exit(1);
  }
}

main();
