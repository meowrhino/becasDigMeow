// ============================================
// BUILD SEO — genera las páginas de celda por idioma (con su pre-render), el
// de /archive, las fichas de proyecto y el sitemap.
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
// Todo se escribe en dist/, que no se guarda en git: lo construye Cloudflare al
// publicar (wrangler.jsonc → build) y es lo único que se sirve. index.html y
// archive.html, en la raíz, son solo las plantillas. Las portadas de idioma
// salen sueltas (dist/index.html, dist/en.html, dist/ca.html) y no como
// en/index.html: Cloudflare sirve en.html en /en sin redirigir a /en/.
//
// Uso:   node build-seo.js
// Corre también antes de cada commit (.githooks/pre-commit): si falla, el
// commit no sale, y lastmod.json queda al día.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  esc, renderCeldaPrerenderHTML, cabeceraCelda,
} from "./js/easy-template.js";
import {
  enlacesDe, renderIndiceHTML, renderProyectoHTML,
} from "./js/proyecto-template.js";
import { slugify, RUTA_CELDAS } from "./js/rutas.js";
import { renderArchivePrerenderHTML } from "./js/archive-pages.js";
import { renderLandingHTML } from "./js/landing-template.js";
import { MODOS, NOMBRES_MODO } from "./js/modos.js";

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, "dist");
const LASTMOD_PATH = join(ROOT, "lastmod.json");
const SITE = "https://meowrhino.studio";

// ============================================
// MODULEPRELOAD
// ============================================
//
// js/ son módulos ES sueltos y el navegador los descubre leyendo los `import`
// de cada uno. Desde main.js el grafo tiene SEIS niveles de profundidad
// (main → pages → welcome-card → rebote…), así que sin ayuda el navegador hace
// seis viajes en serie antes de tener el último módulo: no puede ni pedir
// rebote.js hasta que ha descargado y parseado welcome-card.js.
//
// Un `<link rel="modulepreload">` por módulo le da la lista entera de golpe y
// los pide todos en paralelo: la cascada de seis niveles pasa a uno. No es un
// bundler — no hay dependencias nuevas, js/ se queda tal cual y sigue siendo
// legible — y la lista la calcula el build, así que no puede quedarse vieja
// cuando alguien añada un import.

/** Cierre transitivo de imports de un módulo de js/, en orden de descubrimiento. */
function grafoDeModulos(entrada) {
  const vistos = new Set();
  const orden = [];
  const cola = [entrada];
  while (cola.length) {
    const actual = cola.shift();
    if (vistos.has(actual)) continue;
    vistos.add(actual);
    orden.push(actual);
    let src;
    try {
      src = readFileSync(join(ROOT, "js", actual), "utf8");
    } catch {
      throw new Error(`modulepreload: js/${actual} no existe (lo importa otro módulo).`);
    }
    for (const m of src.matchAll(/from\s+"\.\/([\w.-]+\.js)"/g)) cola.push(m[1]);
  }
  return orden;
}

/** Los <link rel="modulepreload"> de un punto de entrada, ya indentados. */
function modulepreloadHTML(entrada) {
  return grafoDeModulos(entrada)
    .map(m => `  <link rel="modulepreload" href="/js/${m}">`)
    .join("\n");
}

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
].map(i => ({
  ...i,
  // Las fichas cuelgan de la celda portfolio (/portfolio/<slug>…): la base sale
  // de la tabla de rutas y no se escribe dos veces.
  proyBase: RUTA_CELDAS[i.code].portfolio,
  proyDir: RUTA_CELDAS[i.code].portfolio.slice(1),
}));

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


// ============================================
// PÁGINAS DE CELDA (una URL por celda del lienzo)
// ============================================
//
// El lienzo era una sola URL con la celda en el hash: para un buscador, UNA
// página con el texto de todas las secciones dentro, y /easy sirviendo una
// copia entera con canonical a la raíz. Ahora cada celda tiene su HTML, su
// title, su description y su canonical, y el JS coloca el lienzo en la celda
// que dice la URL (ver RUTA_CELDAS en js/rutas.js).
//
// Todas se generan de la MISMA plantilla que la home (index.html): son la misma
// aplicación. Lo único que cambia es la cabecera y el bloque pre-renderizado.

/** De una ruta al archivo que Cloudflare sirve en ella: /en/about → en/about.html */
const archivoDeRuta = (ruta) => (ruta === "/" ? "index.html" : `${ruta.slice(1)}.html`);

/** Las páginas de celda de un idioma, sacadas de la tabla de rutas. */
function celdasDe(idioma) {
  const tabla = RUTA_CELDAS[idioma.code] || {};
  return Object.entries(tabla).map(([celda, ruta]) => ({
    celda, ruta, archivo: archivoDeRuta(ruta), url: `${SITE}${ruta}`,
  }));
}

/** Las alternativas de idioma de una celda, para el <link hreflang>. */
function hreflangCeldaHTML(celda) {
  const filas = IDIOMAS.map(i => {
    const ruta = RUTA_CELDAS[i.code]?.[celda];
    return ruta ? `  <link rel="alternate" hreflang="${i.htmlLang}" href="${SITE}${ruta}">` : null;
  }).filter(Boolean);
  const porDefecto = RUTA_CELDAS[POR_DEFECTO.code]?.[celda];
  if (porDefecto) {
    filas.push(`  <link rel="alternate" hreflang="x-default" href="${SITE}${porDefecto}">`);
  }
  return filas.join("\n");
}

/**
 * Los enlaces a las demás celdas, para el pie del bloque pre-renderizado.
 *
 * Sin JavaScript, cada página de celda sería un callejón sin salida: el lienzo
 * las une deslizando, pero deslizar es JavaScript. Estos enlaces son el camino
 * que recorre un rastreador, y también la salida real de quien navega sin JS.
 */
function enlacesEntreCeldas(data, idioma, celdaActual) {
  const tabla = RUTA_CELDAS[idioma.code] || {};
  const zone = data.zoneLabels || {};
  const nombreVisible = (c) => pick(zone[c], idioma.code) || c;

  // El portfolio sale de la tabla como las demás: es la página que enlaza las
  // 21 fichas, y estar en este pie es lo que evita que quede huérfana.
  return Object.entries(tabla)
    .filter(([c]) => c !== celdaActual)
    .map(([c, ruta]) => ({ href: ruta, texto: nombreVisible(c) }));
}

/**
 * Los enlaces a las páginas long-tail en un idioma, con su h1 como texto. Van
 * en el pie sin JS de cada celda, bajo la intro del índice del portfolio y en
 * el pie de cada ficha: es lo que las conecta con el resto del sitio.
 */
function enlacesLandings(landingsDoc, idioma) {
  return landingsDoc.landings.map(l => ({
    href: pick(l.ruta, idioma.code), texto: pick(l.h1, idioma.code),
  }));
}

/** Cabecera de una página de celda: su title, su description y su canonical. */
function headCeldaHTML(data, idioma, celda, url) {
  const { titulo, descripcion: desc } = cabeceraCelda(data, celda, idioma.code);

  return [
    `  <meta name="description" content="${esc(desc)}">`,
    `  <title>${esc(titulo)}</title>`,
    `  <link rel="canonical" href="${url}">`,
    hreflangCeldaHTML(celda),
    `  <meta property="og:title" content="${esc(titulo)}">`,
    `  <meta property="og:description" content="${esc(desc)}">`,
    `  <meta property="og:url" content="${url}">`,
    `  <meta property="og:locale" content="${idioma.ogLocale}">`,
    `  <meta name="twitter:title" content="${esc(titulo)}">`,
    `  <meta name="twitter:description" content="${esc(desc)}">`,
    // El JSON-LD del estudio solo tiene sentido una vez, en la portada de cada
    // idioma: repetirlo en cinco URLs sería declarar cinco veces el mismo
    // negocio.
    celda === "welcome" ? jsonLdHTML(data, idioma) : "",
    // Las fichas declaran `isPartOf` apuntando aquí: esta es su colección.
    celda === "portfolio" ? scriptLdHTML({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "portfolio — meowrhino studio",
      description: desc,
      url,
      inLanguage: idioma.htmlLang,
    }) : "",
  ].filter(Boolean).join("\n");
}

/**
 * El pre-render de la celda portfolio es el índice que antes vivía suelto en
 * /proyectos: las 21 con su resumen y enlazadas a su ficha. Es lo que lee un
 * buscador y lo único navegable sin JS; con JS se ve la rejilla de capturas.
 */
const cuerpoPortfolio = (fichas, idioma, landings) =>
  renderIndiceHTML(fichas, idioma.code, { base: idioma.proyBase, landings }, medidasDe);

/** El HTML de una página de celda, a partir de la plantilla de la home. */
function paginaCelda(plantilla, data, idioma, { celda, url }, fichas, landingsDoc) {
  const landings = enlacesLandings(landingsDoc, idioma);
  const enlaces = enlacesEntreCeldas(data, idioma, celda).concat(landings);
  const cuerpo = renderCeldaPrerenderHTML(data, idioma.code, celda, enlaces,
    celda === "portfolio" ? cuerpoPortfolio(fichas, idioma, landings) : null);
  let html = reemplazarBloque(plantilla, "head", headCeldaHTML(data, idioma, celda, url));
  html = reemplazarBloque(html, "preload", modulepreloadHTML("main.js"));
  html = reemplazarBloque(html, "home", cuerpo);
  html = html.replace(/<html lang="[^"]*"/, `<html lang="${idioma.htmlLang}"`);
  return html;
}


// ============================================
// PÁGINAS DE PROYECTO (/portfolio/<slug>)
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
// Las tres variantes por idioma cuelgan de la celda portfolio:
//   /portfolio/<slug>  ·  /en/portfolio/<slug>  ·  /ca/portfolio/<slug>
// El slug NO se traduce: sale del nombre del proyecto, que es un nombre propio.
// Hasta septiembre de 2026 vivían en /proyectos, /en/projects y /ca/projectes,
// que ahora responden 301 (ver _redirects).
//
// El índice es la propia celda (portfolio.html, en/portfolio.html…), un archivo
// suelto al lado del directorio y no un index.html dentro: Cloudflare trataría
// este último como /portfolio/ y redirigiría /portfolio ahí con un 307.

// --- Medidas de las capturas ---
//
// Las <img> de la galería salían sin width/height y sin aspect-ratio en el CSS,
// así que el navegador no podía reservarles sitio: cada captura empujaba el
// texto hacia abajo al cargar. Eso es CLS, y Google lo mide. La rejilla del
// índice no lo sufría porque su CSS sí fija `aspect-ratio: 3/2`; aquí no vale
// un ratio fijo porque las capturas van de 4:3 a 3:2 según la pantalla en la
// que se hicieran.
//
// Se leen del propio archivo en tiempo de build: es la única fuente que no
// puede desincronizarse de la imagen que se sirve.

/**
 * Ancho y alto de un .webp leyendo su cabecera, sin dependencias.
 *
 * Un webp es un contenedor RIFF cuyo primer chunk dice de qué variante se
 * trata, y cada una guarda las medidas en un sitio distinto:
 *   VP8  (con pérdida)  → tras el start code 0x9d 0x01 0x2a, dos uint16 de los
 *                         que solo valen los 14 bits bajos (los 2 altos son la
 *                         escala, que aquí no se usa).
 *   VP8L (sin pérdida)  → un uint32 empaquetado: 14 bits de ancho-1 y 14 de alto-1.
 *   VP8X (extendido)    → ancho-1 y alto-1 como enteros de 24 bits.
 */
function medidasWebp(buf) {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") return null;

  switch (buf.toString("ascii", 12, 16)) {
    case "VP8 ":
      if (buf[23] !== 0x9d || buf[24] !== 0x01 || buf[25] !== 0x2a) return null;
      return { ancho: buf.readUInt16LE(26) & 0x3fff, alto: buf.readUInt16LE(28) & 0x3fff };
    case "VP8L": {
      if (buf[20] !== 0x2f) return null;
      const bits = buf.readUInt32LE(21);
      return { ancho: (bits & 0x3fff) + 1, alto: ((bits >> 14) & 0x3fff) + 1 };
    }
    case "VP8X":
      return { ancho: buf.readUIntLE(24, 3) + 1, alto: buf.readUIntLE(27, 3) + 1 };
    default:
      return null;
  }
}

/**
 * Medidas de una imagen del sitio, cacheadas por ruta relativa.
 *
 * Devuelve null si el archivo no existe o no se puede leer la cabecera: en ese
 * caso la plantilla no escribe los atributos y todo sigue como antes. Una
 * captura sin medidas no debe tumbar el build entero.
 */
const cacheMedidas = new Map();
function medidasDe(rutaRelativa) {
  if (cacheMedidas.has(rutaRelativa)) return cacheMedidas.get(rutaRelativa);
  let medidas = null;
  try { medidas = medidasWebp(readFileSync(join(ROOT, rutaRelativa))); } catch { /* sin medidas */ }
  if (!medidas) console.warn(`· sin medidas para ${rutaRelativa}: la <img> irá sin width/height.`);
  cacheMedidas.set(rutaRelativa, medidas);
  return medidas;
}

/** Las fotos de más de un proyecto: 2.webp, 3.webp… seguidas, junto a su portada. */
function contarSecundarias(imagen) {
  const carpeta = dirname(join(ROOT, imagen));
  let n = 0;
  while (existsSync(join(carpeta, `${n + 2}.webp`))) n++;
  return n;
}

/**
 * Los proyectos de proyectos.json, cada uno partido en dos: `proyecto`, lo que
 * pintan la rejilla, la lista y la portada (lo único que viaja al navegador,
 * dentro de data.json), y `seo`, el bloque entero con los textos de su ficha.
 */
function fichasDeProyecto(doc) {
  return doc.proyectos.map(seo => {
    // El slug se calcula DOS veces: aquí sale de proyectos.json (es el nombre
    // del archivo que se escribe y la URL canónica) y en el navegador sale de
    // slugify(nombre) — la portada y la rejilla del portfolio enlazan con eso.
    // Mientras coincidan no pasa nada; el día que dejen de coincidir, esos
    // enlaces darían 404 sin que se entere nadie. Que reviente el build es
    // mucho más barato que descubrirlo en producción.
    const calculado = slugify(seo.nombre);
    if (calculado !== seo.slug) {
      throw new Error(
        `proyectos.json: el slug de "${seo.nombre}" no cuadra. Dice ` +
        `"${seo.slug}" y de su nombre sale "${calculado}", que es con el que ` +
        `enlazan la portada y el portfolio: apuntarían a un 404.`
      );
    }
    if (!seo.imagen || !existsSync(join(ROOT, seo.imagen))) {
      throw new Error(`proyectos.json: "${seo.nombre}" no tiene su portada ` +
        `(${seo.imagen ?? "falta el campo imagen"}).`);
    }
    const { slug, keyword, title, description, resumen, texto, ...proyecto } = seo;
    // Las fotos de más no se apuntan en el JSON: se cuentan en la carpeta.
    proyecto.imagenesSecundarias = contarSecundarias(seo.imagen);
    return { proyecto, seo };
  });
}

/**
 * hreflang de una ficha de proyecto: enlaza sus tres variantes de idioma.
 * `sufijo` es "/<slug>". (El índice es la celda portfolio y lleva los suyos.)
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
 * Esqueleto común de las fichas de proyecto (/portfolio/<slug>).
 *
 * Reutiliza el CSS del modo fácil (html.easy + body.easy-mode): son páginas de
 * scroll lineal, igual que /easy, así que heredan tipografía, ritmo vertical y
 * botones sin duplicar reglas. Lo propio vive en la sección 18 de style.css.
 *
 * Lleva la misma barra que el lienzo, escrita aquí en HTML: arriba a la derecha
 * las páginas a las que se va desde esta (`barra`), abajo a la derecha modo e
 * idioma, y la trama de puntos de fondo. Los modos los mueve js/ficha.js.
 */
function paginaProyectoHTML({ title, description, url, imagen, jsonLd, cuerpo, idioma, hreflang,
                             ogType = "article", barra = [], idiomas = [], noindex = false }) {
  return `<!DOCTYPE html>
<html lang="${idioma.htmlLang}" class="easy">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- Generado por build-seo.js a partir de proyectos.json. -->
  <meta name="description" content="${esc(description)}">
  <title>${esc(title)}</title>
  <link rel="canonical" href="${url}">${noindex ? `
  <meta name="robots" content="noindex">` : ""}
${hreflang}
  <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#121212" media="(prefers-color-scheme: dark)">
  <meta property="og:type" content="${ogType}">
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
      var c = localStorage.getItem("meowrhino-tinte");
      if (c) document.documentElement.setAttribute("data-tinte", c);
    })();
  </script>
</head>
<body class="easy-mode">
  <div class="fondo" aria-hidden="true"></div>
  <div class="header-topright">
    <nav class="menu-vecinos">${barra.map(b =>
      `<a class="menu-btn barra-pagina" href="${esc(b.href)}"${b.rel ? ` rel="${b.rel}"` : ""}>${esc(b.texto)}</a>`).join("")}</nav>
  </div>
  <main id="easy" role="main">
${cuerpo}
  </main>
${controlesHTML(idioma, idiomas)}
  <script type="module" src="/js/ficha.js"></script>
</body>
</html>
`;
}

/**
 * Abajo a la derecha, como en el lienzo (navigation.js, pintarVecinosHeader):
 * `modo(…)` con todos los modos e `idioma(…)` con las tres versiones de esta
 * página. Mismos <details> y mismas clases, así que se ven igual.
 */
function controlesHTML(idioma, idiomas) {
  const nombres = NOMBRES_MODO[idioma.code] || NOMBRES_MODO.es;
  const modos = Object.entries(MODOS).map(([m, { base, tinte }]) =>
    `<button type="button" class="menu-btn" data-modo="${m}" data-modo-base="${base}"${tinte ? ` data-modo-tinte="${tinte}"` : ""}>${nombres[m] || m}</button>`
  ).join("");
  const langs = idiomas.map(i =>
    `<a class="menu-btn${i.activo ? " is-active" : ""}" href="${esc(i.href)}" hreflang="${esc(i.htmlLang)}"${i.activo ? ' aria-current="true"' : ""}>${esc(i.etiqueta)}</a>`
  ).join("");
  const etiquetaModo = idioma.code === "es" ? "modo" : "mode";
  const etiquetaIdioma = idioma.code === "en" ? "language" : "idioma";
  return `  <div class="controles">
    <details class="desplegable" name="controles"><summary class="menu-btn">${etiquetaModo}(${nombres.claro})</summary><div class="desplegable-opciones">${modos}</div></details>${langs ? `
    <details class="desplegable" name="controles"><summary class="menu-btn">${etiquetaIdioma}(${esc(idioma.code)})</summary><div class="desplegable-opciones">${langs}</div></details>` : ""}
  </div>`;
}

/**
 * La 404, con la barra y la maqueta de las demás. Una sola para los tres
 * idiomas: quien llega a una ruta que no existe no tiene idioma todavía.
 */
function pagina404() {
  const idioma = IDIOMAS[0];
  return paginaProyectoHTML({
    idioma,
    title: "esta página no existe · meowrhino studio",
    description: "esta página no existe.",
    url: `${SITE}/404`,
    imagen: `${SITE}/favicon/og-image.png`,
    hreflang: "",
    jsonLd: "",
    ogType: "website",
    noindex: true,
    barra: [{ texto: "portfolio", href: idioma.proyBase }],
    cuerpo: `
    <article class="proy proy-ficha about-content">
      <h1 class="proy-title about-pregunta">404</h1>
      <div class="about-entrada">
        <p>esta página no existe, o se ha movido.</p>
        <p lang="en">this page doesn't exist, or it has moved.</p>
        <p lang="ca">aquesta pàgina no existeix, o s'ha mogut.</p>
      </div>
      <p class="about-enlaces"><a href="/">meowrhino studio</a><a href="${idioma.proyBase}">portfolio</a></p>
    </article>`,
  });
}

/** Página de un proyecto, en un idioma. */
function paginaProyecto({ proyecto, seo }, idioma, vecinos = {}) {
  const rutas = {
    // La vuelta de una ficha es la REJILLA del portfolio: estas páginas son
    // puro visual y salir de ellas a una lista de nombres era caer en seco.
    // Desde que la celda tiene ruta, /portfolio ES la rejilla.
    indice: idioma.proyBase,
    home: idioma.path,
    // El selector de idioma de ESTA ficha: las mismas tres URLs que ya declara
    // el hreflang, pero clicables. La etiqueta es el código corto porque es lo
    // que usa la home ("es en cat") y así las dos pantallas se leen igual.
    idiomas: IDIOMAS.map(i => ({
      etiqueta: i.code,
      htmlLang: i.htmlLang,
      href: `${i.proyBase}/${seo.slug}`,
      activo: i.code === idioma.code,
    })),
    anterior: vecinos.anterior && {
      nombre: vecinos.anterior.proyecto.nombre,
      href: `${idioma.proyBase}/${vecinos.anterior.seo.slug}`,
    },
    siguiente: vecinos.siguiente && {
      nombre: vecinos.siguiente.proyecto.nombre,
      href: `${idioma.proyBase}/${vecinos.siguiente.seo.slug}`,
    },
  };
  return paginaProyectoHTML({
    idioma,
    title: pick(seo.title, idioma.code),
    description: pick(seo.description, idioma.code),
    url: `${SITE}${idioma.proyBase}/${seo.slug}`,
    imagen: `${SITE}/${proyecto.imagen}`,
    hreflang: hreflangProyectoHTML(`/${seo.slug}`),
    jsonLd: jsonLdProyecto(proyecto, seo, idioma),
    cuerpo: renderProyectoHTML(proyecto, seo, idioma.code, rutas, medidasDe),
    idiomas: rutas.idiomas,
    // La lista es circular, así que siempre hay anterior y siguiente.
    barra: [
      rutas.anterior && { texto: rutas.anterior.nombre, href: rutas.anterior.href, rel: "prev" },
      rutas.siguiente && { texto: rutas.siguiente.nombre, href: rutas.siguiente.href, rel: "next" },
      { texto: "portfolio", href: idioma.proyBase },
    ].filter(Boolean),
  });
}




// ============================================
// PÁGINAS LONG-TAIL (landings.json)
// ============================================
//
// Una página por idioma y por búsqueda que la portada no puede ganar («web
// para músicos barcelona», «web sin cuotas mensuales»). Mismo esqueleto que
// las fichas; su rejilla enseña los proyectos que landings.json nombra.

/** Las landings de un idioma: su ruta, el archivo que la sirve y su URL. */
function landingsDe(landingsDoc, idioma) {
  return landingsDoc.landings.map(landing => {
    const ruta = pick(landing.ruta, idioma.code);
    return { landing, ruta, archivo: archivoDeRuta(ruta), url: `${SITE}${ruta}` };
  });
}

/** hreflang de una landing: sus tres rutas, que landings.json declara. */
function hreflangLandingHTML(landing) {
  const alternas = IDIOMAS.map(i =>
    `  <link rel="alternate" hreflang="${i.htmlLang}" href="${SITE}${pick(landing.ruta, i.code)}">`
  ).join("\n");
  return `${alternas}\n  <link rel="alternate" hreflang="x-default" href="${SITE}${pick(landing.ruta, POR_DEFECTO.code)}">`;
}

/**
 * Los proyectos que enseña una landing, resueltos contra las fichas: los de
 * cada apartado (`proyectosPorApartado`, una lista por apartado) y los del
 * cierre (`proyectos`).
 */
function fichasDeLanding(landing, fichas) {
  const porNombre = new Map(fichas.map(f => [f.proyecto.nombre, f]));
  const resolver = (nombres = []) => nombres.map(nombre => {
    const f = porNombre.get(nombre);
    if (!f) {
      throw new Error(`landings.json (${landing.id}) habla de "${nombre}", que no ` +
        `existe en data.json. Los nombres tienen que coincidir exactamente.`);
    }
    return f;
  });
  const apartados = landing.secciones?.es?.length ?? 0;
  if ((landing.proyectosPorApartado || []).length > apartados) {
    throw new Error(`landings.json (${landing.id}): proyectosPorApartado tiene más ` +
      `listas (${landing.proyectosPorApartado.length}) que apartados (${apartados}).`);
  }
  return {
    porApartado: (landing.proyectosPorApartado || []).map(resolver),
    cierre: resolver(landing.proyectos),
  };
}

/** Página long-tail en un idioma. */
function paginaLanding({ landing, url }, idioma, fichas, landingsDoc) {
  const propias = fichasDeLanding(landing, fichas);
  const title = pick(landing.title, idioma.code);
  const description = pick(landing.description, idioma.code);
  const rutas = {
    portfolio: idioma.proyBase,
    home: idioma.path,
    idiomas: IDIOMAS.map(i => ({
      etiqueta: i.code, htmlLang: i.htmlLang,
      href: pick(landing.ruta, i.code), activo: i.code === idioma.code,
    })),
    // El pie enlaza las DEMÁS landings: la otra búsqueda que puede estar
    // haciendo quien ha llegado aquí.
    otras: enlacesLandings(landingsDoc, idioma).filter(o => o.href !== pick(landing.ruta, idioma.code)),
  };
  return paginaProyectoHTML({
    idioma, title, description, url,
    ogType: "website",
    imagen: `${SITE}/favicon/og-image.png`,
    hreflang: hreflangLandingHTML(landing),
    jsonLd: scriptLdHTML({
      "@context": "https://schema.org",
      "@type": "Service",
      name: pick(landing.h1, idioma.code),
      description,
      url,
      inLanguage: idioma.htmlLang,
      serviceType: "diseño web",
      areaServed: { "@type": "City", name: "Barcelona" },
      provider: { "@type": "ProfessionalService", name: "meowrhino studio", url: SITE },
    }),
    cuerpo: renderLandingHTML(landing, propias, idioma.code, rutas, medidasDe),
    idiomas: rutas.idiomas,
    barra: [{ texto: "portfolio", href: idioma.proyBase }],
  });
}


/**
 * Las fechas del sitemap, apuntadas en lastmod.json: de cada página, la huella
 * de su HTML y el día en que cambió por última vez.
 *
 * `lastmod` significa "cuándo cambió esta página", no "cuándo se ejecutó el
 * build": Google usa la fecha para decidir qué merece la pena reindexar. Como
 * dist/ se construye de cero cada vez, no se puede mirar qué archivos se han
 * reescrito: se compara la huella de cada página con la apuntada, y solo la que
 * difiere estrena fecha. El archivo lo guarda el hook de pre-commit; si un
 * commit sale sin él, la página cambiada lleva la fecha de cada publicación
 * hasta que se vuelva a guardar.
 */
function leerLastmod() {
  try { return JSON.parse(readFileSync(LASTMOD_PATH, "utf8")); } catch { return {}; }
}

/**
 * Sitemap con las tres variantes de la home, el archivo y las de proyecto.
 * `lastmod` trae la fecha de cada página generada, por nombre de archivo.
 */
function sitemapXML(fichas = [], lastmod = {}, landingsDoc = { landings: [] }) {
  const fechaDe = (archivo) => lastmod[archivo].fecha;

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

  // Una entrada por celda y por idioma. La portada mantiene prioridad 1.0; las
  // demás celdas son páginas de contenido, no la puerta del sitio.
  const alternasCelda = (celda) =>
    IDIOMAS.map(i => {
      const r = RUTA_CELDAS[i.code]?.[celda];
      return r ? `    <xhtml:link rel="alternate" hreflang="${i.htmlLang}" href="${SITE}${r}"/>` : null;
    }).filter(Boolean).join("\n") +
    (RUTA_CELDAS[POR_DEFECTO.code]?.[celda]
      ? `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${RUTA_CELDAS[POR_DEFECTO.code][celda]}"/>`
      : "");

  const homes = IDIOMAS.flatMap(i => celdasDe(i).map(({ celda, url, archivo }) => `  <url>
    <loc>${url}</loc>
${alternasCelda(celda)}
    <lastmod>${fechaDe(archivo)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${celda === "welcome" ? "1.0" : celda === "buscaminas" ? "0.3" : "0.8"}</priority>
  </url>`)).join("\n");

  // Las landings, con sus alternativas: son páginas de contenido, como las
  // celdas, así que llevan su misma prioridad.
  const landings = IDIOMAS.flatMap(i => landingsDe(landingsDoc, i).map(({ landing, url, archivo }) => `  <url>
    <loc>${url}</loc>
${IDIOMAS.map(j => `    <xhtml:link rel="alternate" hreflang="${j.htmlLang}" href="${SITE}${pick(landing.ruta, j.code)}"/>`).join("\n")}
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${pick(landing.ruta, POR_DEFECTO.code)}"/>
    <lastmod>${fechaDe(archivo)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`)).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generado por build-seo.js. No editar a mano. -->
<!-- Solo URLs canónicas. /easy ya no existe: servía una copia del sitio
     entero y ahora responde 301 a /metodologia (ver _redirects). -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${homes}
${landings}
  <url>
    <loc>${SITE}/archive</loc>
    <lastmod>${fechaDe("archive.html")}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
${fichas.flatMap(({ seo }) => IDIOMAS.map(i => `  <url>
    <loc>${SITE}${i.proyBase}/${seo.slug}</loc>
${alternasProy(`/${seo.slug}`)}
    <lastmod>${fechaDe(`${i.proyDir}/${seo.slug}.html`)}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.6</priority>
  </url>`)).join("\n")}
</urlset>
`;
}

/** Escribe un archivo de dist/, creando su carpeta. */
function escribir(nombre, contenido) {
  const path = join(DIST, nombre);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contenido);
}

/** Lee un JSON de la raíz; si está roto, dice cuál y dónde. */
function leerJSON(nombre) {
  try { return JSON.parse(readFileSync(join(ROOT, nombre), "utf8")); }
  catch (err) { throw new Error(`${nombre} no se puede leer: ${err.message}`); }
}

/**
 * Lo que se publica tal cual, además de los cv en pdf. dist/ lleva solo esto y
 * lo generado: lo que no esté aquí no llega al dominio (las notas, este script).
 */
const ESTATICOS = ["style.css", "js", "img", "fonts", "favicon", "robots.txt",
  "_redirects", "_headers", "archive-data.json"];

function copiarEstaticos() {
  const pdfs = readdirSync(ROOT).filter(f => f.endsWith(".pdf"));
  for (const nombre of [...ESTATICOS, ...pdfs]) {
    cpSync(join(ROOT, nombre), join(DIST, nombre), {
      recursive: true,
      filter: (origen) => !/\/\.(DS_Store|gitkeep)$/.test(origen),
    });
  }
}

function main() {
  try {
    const data = leerJSON("data.json");
    const proyectosDoc = leerJSON("proyectos.json");
    const landingsDoc = leerJSON("landings.json");
    const archiveData = leerJSON("archive-data.json");
    const plantillaHome = readFileSync(join(ROOT, "index.html"), "utf8");
    const plantillaArchive = readFileSync(join(ROOT, "archive.html"), "utf8");

    // Se resuelve ANTES de escribir nada: si a un proyecto le falta algo,
    // mejor fallar con el dist/ anterior intacto que a medio generar.
    const fichas = fichasDeProyecto(proyectosDoc);
    data.portfolio = { proyectos: fichas.map(f => f.proyecto) };

    // Fecha LOCAL, no UTC: `toISOString()` convierte a UTC, así que un build
    // lanzado de madrugada en Barcelona (00:30 CEST = 22:30 UTC del día
    // anterior) sellaba el sitemap con la fecha de ayer. "sv" formatea como
    // YYYY-MM-DD, que es justo lo que pide <lastmod>.
    const hoy = new Date().toLocaleDateString("sv");
    const previo = leerLastmod();
    const lastmod = {};
    const generar = (nombre, contenido) => {
      const huella = createHash("sha1").update(contenido).digest("hex").slice(0, 12);
      // Una página sin huella apuntada es nueva: hoy es su fecha de publicación.
      lastmod[nombre] = { huella, fecha: previo[nombre]?.huella === huella ? previo[nombre].fecha : hoy };
      escribir(nombre, contenido);
    };

    rmSync(DIST, { recursive: true, force: true });

    // Una página por celda y por idioma. La portada (index.html, en.html,
    // ca.html) es la celda `welcome` y sale de aquí como las demás.
    for (const idioma of IDIOMAS) {
      for (const pagina of celdasDe(idioma)) {
        generar(pagina.archivo, paginaCelda(plantillaHome, data, idioma, pagina, fichas, landingsDoc));
      }
    }

    // Las páginas long-tail, una por idioma, al lado de las celdas de su idioma.
    for (const idioma of IDIOMAS) {
      for (const pagina of landingsDe(landingsDoc, idioma)) {
        generar(pagina.archivo, paginaLanding(pagina, idioma, fichas, landingsDoc));
      }
    }

    // /archive está en el sitemap pero se monta entero por JS sobre un <main>
    // vacío: sin pre-render, un rastreador sin JS vería la página en blanco.
    generar("archive.html", reemplazarBloque(
      reemplazarBloque(plantillaArchive, "preload", modulepreloadHTML("archive-main.js")),
      "archive", renderArchivePrerenderHTML(archiveData)));

    // Las fichas de cada idioma, en el directorio de su celda portfolio. El
    // índice ya ha salido arriba: es la propia celda.
    for (const idioma of IDIOMAS) {
      // Los vecinos salen del orden de proyectos.json, que es el mismo que
      // el de la rejilla. La lista es circular a propósito: desde el último,
      // "siguiente" vuelve al primero. Un cul-de-sac al final de una lista de
      // 21 es peor que dar la vuelta.
      fichas.forEach((ficha, i) => {
        const vecinos = {
          anterior: fichas[(i - 1 + fichas.length) % fichas.length],
          siguiente: fichas[(i + 1) % fichas.length],
        };
        generar(`${idioma.proyDir}/${ficha.seo.slug}.html`,
          paginaProyecto(ficha, idioma, vecinos));
      });
    }

    // La página de «no existe»: Cloudflare la sirve con un 404 en cualquier
    // ruta que no encuentre (wrangler.jsonc, not_found_handling). Fuera del
    // sitemap y de lastmod: no es una página que se busque.
    escribir("404.html", pagina404());

    escribir("sitemap.xml", sitemapXML(fichas, lastmod, landingsDoc));
    // El data.json que baja el navegador: el de la raíz más los proyectos, sin
    // sus textos de ficha ni las notas `_comment`, y en una línea.
    escribir("data.json", JSON.stringify(data, (clave, valor) => (clave === "_comment" ? undefined : valor)));
    copiarEstaticos();

    const apuntado = JSON.stringify(lastmod, null, 2) + "\n";
    if (apuntado !== JSON.stringify(previo, null, 2) + "\n") writeFileSync(LASTMOD_PATH, apuntado);

    console.log(`✓ dist/: ${Object.keys(lastmod).length} páginas · ${IDIOMAS.length} idiomas · ` +
      `${fichas.length} proyectos · ${landingsDoc.landings.length} páginas long-tail.`);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    process.exit(1);
  }
}

main();
