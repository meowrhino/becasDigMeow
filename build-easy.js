// ============================================
// BUILD EASY — pre-renderiza el cuerpo de /easy en easy.html (SEO).
// ============================================
//
// Por qué: easy.html llega con <main id="easy"> vacío y el contenido lo pinta
// JavaScript. Los buscadores (y cualquier bot sin JS) verían la página vacía.
// Este script escribe el mismo HTML que produce el navegador entre los
// marcadores BUILD:easy, para que el texto esté ya en el primer byte. El JS lo
// sustituye por la versión interactiva al cargar (mismo contenido, sin duplicar).
//
// Uso:   node build-easy.js
// Se ejecuta solo antes de cada commit que toque data.json (hook de pre-commit),
// así el HTML estático nunca se desincroniza de data.json.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { renderBodyHTML } from "./js/easy-template.js";

const ROOT = dirname(fileURLToPath(import.meta.url));
const HTML_PATH = join(ROOT, "easy.html");
const DATA_PATH = join(ROOT, "data.json");

const START = "<!-- BUILD:easy:start -->";
const END = "<!-- BUILD:easy:end -->";

// Idioma pre-renderizado: castellano (idioma por defecto y mercado objetivo).
// El resto de idiomas siguen sirviéndose vía JS al cambiar de idioma.
const LANG = "es";

function main() {
  const data = JSON.parse(readFileSync(DATA_PATH, "utf8"));
  const html = readFileSync(HTML_PATH, "utf8");

  const startIdx = html.indexOf(START);
  const endIdx = html.indexOf(END);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    console.error(`✗ No encuentro los marcadores ${START} … ${END} en easy.html`);
    process.exit(1);
  }

  const body = renderBodyHTML(data, LANG);
  const before = html.slice(0, startIdx + START.length);
  const after = html.slice(endIdx);
  const next = `${before}\n${body}\n    ${after}`;

  if (next === html) {
    console.log("· easy.html ya estaba al día, nada que hacer.");
    return;
  }

  writeFileSync(HTML_PATH, next);
  const projectos = data.portfolio?.proyectos?.length ?? 0;
  console.log(`✓ easy.html pre-renderizado (${LANG}, ${projectos} proyectos).`);
}

main();
