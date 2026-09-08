// ============================================
// BUILD SEO — genera las variantes por idioma de la home, el pre-render de
// /easy y de /archive, las páginas de proyecto y el sitemap.
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
  esc, renderCeldaPrerenderHTML,
} from "./js/easy-template.js";
import {
  enlacesDe, renderIndiceHTML, renderProyectoHTML,
} from "./js/proyecto-template.js";
import { slugify, RUTA_CELDAS } from "./js/rutas.js";
import { renderArchivePrerenderHTML } from "./js/archive-pages.js";

const ROOT = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(ROOT, "data.json");
const SEO_PATH = join(ROOT, "proyectos-seo.json");
const ARCHIVE_PATH = join(ROOT, "archive-data.json");
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

  const otras = Object.entries(tabla)
    .filter(([c]) => c !== celdaActual)
    .map(([c, ruta]) => ({ href: ruta, texto: nombreVisible(c) }));

  // El índice de proyectos ya no es una celda, así que no sale de la tabla de
  // arriba: se añade a mano. Es la página con más contenido del sitio y la que
  // enlaza las 21 fichas — dejarla fuera de este pie la convertiría en huérfana,
  // que es la forma más rápida de que un buscador deje de visitarla.
  otras.push({ href: idioma.proyBase, texto: pick(data.zoneLabels?.proyectos, idioma.code) || "proyectos" });
  return otras;
}

/** Cabecera de una página de celda: su title, su description y su canonical. */
function headCeldaHTML(data, idioma, celda, url) {
  // La portada sigue usando `meta`, que es el title por el que compite el sitio
  // entero; las demás celdas tienen el suyo en `seoCeldas`.
  const fuente = celda === "welcome" ? data.meta : data.seoCeldas?.[celda];
  const titulo = pick(fuente?.title, idioma.code);
  const desc = pick(fuente?.description, idioma.code);

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
  ].filter(Boolean).join("\n");
}

/** El HTML de una página de celda, a partir de la plantilla de la home. */
function paginaCelda(plantilla, data, idioma, { celda, url }) {
  const enlaces = enlacesEntreCeldas(data, idioma, celda);
  const cuerpo = renderCeldaPrerenderHTML(data, idioma.code, celda, enlaces);
  let html = reemplazarBloque(plantilla, "head", headCeldaHTML(data, idioma, celda, url));
  html = reemplazarBloque(html, "preload", modulepreloadHTML("main.js"));
  html = reemplazarBloque(html, "home", cuerpo);
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
    // El slug se calcula DOS veces: aquí sale de proyectos-seo.json (es el
    // nombre del archivo que se escribe y la URL canónica) y en el navegador
    // sale de slugify(nombre) — la card del welcome y la rejilla del portfolio
    // enlazan con eso, no con este JSON. Mientras coincidan no pasa nada; el
    // día que dejen de coincidir, esos enlaces darían 404 sin que se entere
    // nadie. Que reviente el build es mucho más barato que descubrirlo en
    // producción.
    const calculado = slugify(seo.nombre);
    if (calculado !== seo.slug) {
      throw new Error(
        `El slug de "${seo.nombre}" no cuadra: proyectos-seo.json dice ` +
        `"${seo.slug}" y slugify() calcula "${calculado}". Los enlaces del ` +
        `welcome y del portfolio usan slugify(), así que apuntarían a un 404.`
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
function paginaProyectoHTML({ title, description, url, imagen, jsonLd, cuerpo, idioma, hreflang,
                             ogType = "article" }) {
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
function paginaProyecto({ proyecto, seo }, idioma, vecinos = {}) {
  const rutas = {
    // La vuelta de una ficha es la REJILLA del portfolio, no el índice suelto.
    // Estas páginas son puro visual —seis capturas a pantalla completa— y salir
    // de ellas a una lista de nombres era caer en seco: pierdes de golpe lo
    // único por lo que alguien mira un portfolio. `/#portfolio` lo resuelve
    // leerHash() en navigation.js, que coloca el lienzo en esa celda al cargar.
    indice: `${idioma.path}#portfolio`,
    home: idioma.path,
    rejilla: `${idioma.path}#portfolio`,
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
  });
}


/**
 * Metadatos del índice, por idioma.
 *
 * El número de proyectos NO se escribe a mano: se recibe como argumento y sale
 * de `fichas.length`. Estaba repetido en seis cadenas ("20 webs…") y cada vez
 * que entraba un proyecto nuevo había que acordarse de tocarlas todas — al
 * añadir la 21 se quedaron diciendo 20 en los tres idiomas.
 */
const INDICE = (n) => ({
  es: {
    schemaName: "proyectos — meowrhino studio",
    title: `proyectos — ${n} webs a medida hechas en barcelona · meowrhino studio`,
    description: `${n} webs diseñadas a medida en Barcelona para artistas, fotógrafos, ` +
      "músicos y pequeños negocios. Cada proyecto cuenta cómo se hizo y por qué acabó siendo así.",
  },
  en: {
    schemaName: "projects — meowrhino studio",
    title: `projects — ${n} custom websites made in barcelona · meowrhino studio`,
    description: `${n} websites custom-built in Barcelona for artists, photographers, ` +
      "musicians and small businesses. Each project tells how it was made and why it ended up like this.",
  },
  cat: {
    schemaName: "projectes — meowrhino studio",
    title: `projectes — ${n} webs a mida fetes a barcelona · meowrhino studio`,
    description: `${n} webs dissenyades a mida a Barcelona per a artistes, fotògrafs, ` +
      "músics i petits negocis. Cada projecte explica com es va fer i per què va acabar sent així.",
  },
});

/**
 * El índice suelto de proyectos (/proyectos, /en/projects, /ca/projectes).
 *
 * Es una página lineal, no una celda del lienzo: se sirve con el mismo esqueleto
 * que las 63 fichas y NO carga la aplicación del lienzo. Fue celda durante un
 * día y volvió aquí — la lista de nombres al lado de la rejilla de capturas era
 * la versión pobre de lo mismo (ver la nota en js/rutas.js).
 *
 * Que siga existiendo no es nostalgia: es la única página que enlaza las 21
 * fichas de un idioma en un solo documento, y por eso está en el sitemap y en el
 * pie de todas las celdas. Lo que se fue del mapa es la celda, no la página.
 */
function paginaIndice(fichas, idioma) {
  const meta = INDICE(fichas.length)[idioma.code] || INDICE(fichas.length).es;
  const url = `${SITE}${idioma.proyBase}`;
  return paginaProyectoHTML({
    idioma,
    ogType: "website",
    title: meta.title,
    description: meta.description,
    url,
    imagen: `${SITE}/favicon/og-image.png`,
    hreflang: hreflangProyectoHTML(""),
    jsonLd: scriptLdHTML({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: meta.schemaName,
      description: meta.description,
      url,
      inLanguage: idioma.htmlLang,
    }),
    cuerpo: renderIndiceHTML(fichas, idioma.code, {
      base: idioma.proyBase,
      home: idioma.path,
      rejilla: `${idioma.path}#portfolio`,
    }, medidasDe),
  });
}

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
    <lastmod>${fechaDe(url, archivo)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${celda === "welcome" ? "1.0" : "0.8"}</priority>
  </url>`)).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generado por build-seo.js. No editar a mano. -->
<!-- Solo URLs canónicas. /easy ya no existe: servía una copia del sitio
     entero y ahora responde 301 a /metodologia (ver _redirects). -->
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

    // Una página por celda y por idioma. La portada (index.html, en.html,
    // ca.html) es la celda `welcome` y sale de aquí como las demás: antes se
    // generaba aparte y era la única del lienzo con URL.
    for (const idioma of IDIOMAS) {
      for (const pagina of celdasDe(idioma)) {
        const dir = dirname(join(ROOT, pagina.archivo));
        mkdirSync(dir, { recursive: true });
        generar(pagina.archivo, paginaCelda(plantillaHome, data, idioma, pagina));
      }
    }


    // /archive está en el sitemap pero se montaba entero por JS sobre un <main>
    // vacío: un rastreador sin JS veía la página en blanco. Era la única página
    // indexable sin pre-render.
    const archiveData = JSON.parse(readFileSync(ARCHIVE_PATH, "utf8"));
    const archive = readFileSync(join(ROOT, "archive.html"), "utf8");
    generar("archive.html", reemplazarBloque(
      reemplazarBloque(archive, "preload", modulepreloadHTML("archive-main.js")),
      "archive", renderArchivePrerenderHTML(archiveData)));

    // Cada idioma tiene su índice suelto (proyectos.html, en/projects.html…) y
    // su directorio de fichas. El índice NO va como index.html dentro del
    // directorio: Cloudflare lo trataría como /proyectos/ y redirigiría
    // /proyectos ahí con un 307, dejando el canonical apuntando a una URL que
    // redirige. Así se sirve en /proyectos sin salto, igual que /archive.
    for (const idioma of IDIOMAS) {
      mkdirSync(join(ROOT, idioma.proyDir), { recursive: true });
      generar(idioma.proyFile, paginaIndice(fichas, idioma));
      // Los vecinos salen del orden de proyectos-seo.json, que es el mismo que
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
