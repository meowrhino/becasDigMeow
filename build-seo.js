// ============================================
// BUILD SEO — pre-renderiza el contenido de index.html y easy.html.
// ============================================
//
// Por qué: las dos páginas llegan con su contenedor vacío y el contenido lo
// pinta JavaScript. Los buscadores (y cualquier bot sin JS) verían la página
// vacía. Este script escribe el mismo HTML que produce el navegador entre los
// marcadores BUILD, para que el texto esté ya en el primer byte. El JS lo
// sustituye por la versión interactiva al cargar (mismo contenido, sin duplicar).
//
// En index.html el bloque va oculto por CSS en cuanto hay JS (`html.js`), así
// que el visitante nunca ve un destello del contenido estático antes del grid;
// sin JS queda visible como fallback real.
//
// Uso:   node build-seo.js
// Se ejecuta solo antes de cada commit que toque data.json (hook de pre-commit),
// así el HTML estático nunca se desincroniza de data.json.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { renderBodyHTML, renderHomePrerenderHTML } from "./js/easy-template.js";

const ROOT = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(ROOT, "data.json");

// Idioma pre-renderizado: castellano (idioma por defecto y mercado objetivo).
// El resto de idiomas siguen sirviéndose vía JS al cambiar de idioma.
const LANG = "es";

/** Páginas a pre-renderizar: archivo, marcador y generador del cuerpo. */
const TARGETS = [
  { file: "index.html", marker: "home", render: renderHomePrerenderHTML },
  { file: "easy.html",  marker: "easy", render: renderBodyHTML },
];

/** Sustituye el bloque entre los marcadores. Devuelve el HTML nuevo. */
function reemplazarBloque(html, marker, body) {
  const START = `<!-- BUILD:${marker}:start -->`;
  const END = `<!-- BUILD:${marker}:end -->`;

  const startIdx = html.indexOf(START);
  const endIdx = html.indexOf(END);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error(`No encuentro los marcadores ${START} … ${END}`);
  }

  const before = html.slice(0, startIdx + START.length);
  const after = html.slice(endIdx);
  return `${before}\n${body}\n    ${after}`;
}

function main() {
  const data = JSON.parse(readFileSync(DATA_PATH, "utf8"));
  const proyectos = data.portfolio?.proyectos?.length ?? 0;

  for (const { file, marker, render } of TARGETS) {
    const path = join(ROOT, file);
    const html = readFileSync(path, "utf8");

    let next;
    try {
      next = reemplazarBloque(html, marker, render(data, LANG));
    } catch (err) {
      console.error(`✗ ${file}: ${err.message}`);
      process.exit(1);
    }

    if (next === html) {
      console.log(`· ${file} ya estaba al día, nada que hacer.`);
      continue;
    }

    writeFileSync(path, next);
    console.log(`✓ ${file} pre-renderizado (${LANG}, ${proyectos} proyectos).`);
  }
}

main();
