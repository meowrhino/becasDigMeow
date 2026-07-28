// ============================================
// BUILD SEO — genera las variantes por idioma de la home, el pre-render de
// /easy y el sitemap.
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

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  esc, renderBodyHTML, renderHomePrerenderHTML,
} from "./js/easy-template.js";

const ROOT = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(ROOT, "data.json");
const SITE = "https://meowrhino.studio";

/**
 * Idiomas de la home. `code` es la clave dentro de data.json; `htmlLang` el
 * código BCP-47 que va en <html lang> y en hreflang (catalán se guarda como
 * "cat" pero se declara como "ca"); `file` el archivo generado y `path` su URL
 * pública (Cloudflare sirve en.html en /en).
 */
const IDIOMAS = [
  { code: "es",  htmlLang: "es", ogLocale: "es_ES", file: "index.html", path: "/" },
  { code: "en",  htmlLang: "en", ogLocale: "en_GB", file: "en.html",    path: "/en" },
  { code: "cat", htmlLang: "ca", ogLocale: "ca_ES", file: "ca.html",    path: "/ca" },
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
    sameAs: [
      "https://instagram.com/meowrhino",
      "https://github.com/meowrhino",
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

/** Sitemap con las tres variantes de la home más el archivo. */
function sitemapXML() {
  const hoy = new Date().toISOString().slice(0, 10);

  // Cada variante declara sus alternativas también aquí: es la forma que
  // recomienda Google para que no dependa solo de las etiquetas del HTML.
  const alternas = IDIOMAS.map(i =>
    `    <xhtml:link rel="alternate" hreflang="${i.htmlLang}" href="${urlDe(i)}"/>`
  ).join("\n") +
    `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${urlDe(POR_DEFECTO)}"/>`;

  const homes = IDIOMAS.map(i => `  <url>
    <loc>${urlDe(i)}</loc>
${alternas}
    <lastmod>${hoy}</lastmod>
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
    <lastmod>${hoy}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>
`;
}

/** Escribe solo si cambió, para que el build sea idempotente y no ensucie git. */
function escribirSiCambia(nombre, contenido) {
  const path = join(ROOT, nombre);
  let actual = null;
  try { actual = readFileSync(path, "utf8"); } catch { /* no existía */ }

  if (actual === contenido) {
    console.log(`· ${nombre} ya estaba al día.`);
    return;
  }
  writeFileSync(path, contenido);
  console.log(`✓ ${nombre} ${actual === null ? "creado" : "actualizado"}.`);
}

function main() {
  const data = JSON.parse(readFileSync(DATA_PATH, "utf8"));

  // La plantilla se lee UNA vez, antes de escribir nada: index.html es a la vez
  // plantilla y salida, y si se releyera por idioma arrastraría lo ya escrito.
  const plantillaHome = readFileSync(join(ROOT, "index.html"), "utf8");

  try {
    for (const idioma of IDIOMAS) {
      escribirSiCambia(idioma.file, paginaHome(plantillaHome, data, idioma));
    }

    const easy = readFileSync(join(ROOT, "easy.html"), "utf8");
    escribirSiCambia("easy.html", reemplazarBloque(easy, "easy", renderBodyHTML(data, "es")));

    escribirSiCambia("sitemap.xml", sitemapXML());
  } catch (err) {
    console.error(`✗ ${err.message}`);
    process.exit(1);
  }

  const proyectos = data.portfolio?.proyectos?.length ?? 0;
  console.log(`\n${IDIOMAS.length} idiomas · ${proyectos} proyectos.`);
}

main();
