// ============================================
// CONTROLES — lo que comparten los desplegables de abajo (sin data.js)
// ============================================
//
// Los pintan dos sitios: la barra del lienzo (js/navigation.js, en caliente) y
// build-seo.js en el HTML de las fichas, las landings y la 404 (con vida en
// js/ficha.js). Aquí van la lista de modos, sus nombres, los pasos del zoom,
// las etiquetas y cómo se pone un modo, para que los dos se vean y se porten
// igual. Sin imports a propósito: build-seo.js lo lee en node, y la ficha no
// puede traer data.js (le cambiaría el <html lang>). Lo que toca el DOM solo
// se ejecuta al llamarlo.

/**
 * Los modos de color. Los dos de siempre son el tema (`data-theme`); los
 * demás son un tinte (`data-tinte`, sus colores están en style.css) puesto
 * encima de uno de los dos, del que heredan lo que no cambian.
 */
export const MODOS = {
  claro:     { base: "light" },
  oscuro:    { base: "dark" },
  papel:     { base: "light", tinte: "papel" },
  chicle:    { base: "light", tinte: "chicle" },
  cianotipo: { base: "dark",  tinte: "cianotipo" },
  fosforo:   { base: "dark",  tinte: "fosforo" },
  ada:       { base: "light", tinte: "ada" },
};

// «ada» se dice igual en los tres idiomas.
export const NOMBRES_MODO = {
  es:  { claro: "claro", oscuro: "oscuro", papel: "papel", chicle: "chicle", cianotipo: "cianotipo", fosforo: "fósforo", ada: "ada" },
  en:  { claro: "light", oscuro: "dark",   papel: "paper", chicle: "bubblegum", cianotipo: "cyanotype", fosforo: "phosphor", ada: "ada" },
  cat: { claro: "clar",  oscuro: "fosc",   papel: "paper", chicle: "xiclet", cianotipo: "cianotip", fosforo: "fòsfor", ada: "ada" },
};

/** Los pasos de `zoom(…)`, en %. La letra la escala `--zoom` (style.css). */
export const ZOOMS = [85, 100, 115, 130];

// Las etiquetas. `lang` puede venir como código de data.json ("cat") o de
// <html lang> ("ca"): solo importa si es "es" o "en".
export const etiquetaModo = (lang) => (lang === "es" ? "modo" : "mode");
export const etiquetaIdioma = (lang) => (lang === "en" ? "language" : "idioma");
export const etiquetaVista = (lang) => (lang === "en" ? "view" : "vista");
/** Los aria-label del − y el + del zoom. */
export const textosZoom = (lang) => (lang === "en" ? ["smaller text", "larger text"] : ["letra más pequeña", "letra más grande"]);

const TEMA = "meowrhino-theme";
const TINTE = "meowrhino-tinte";

/** El modo que se está viendo. */
export function modoActual() {
  const raiz = document.documentElement;
  return raiz.dataset.tinte || (raiz.getAttribute("data-theme") === "dark" ? "oscuro" : "claro");
}

/** Pone un modo y lo recuerda: su tinte, si lo tiene, y el tema del que cuelga. */
export function ponerModo(modo) {
  const raiz = document.documentElement;
  const { base, tinte } = MODOS[modo] || MODOS.claro;
  if (tinte) {
    raiz.dataset.tinte = tinte;
    localStorage.setItem(TINTE, tinte);
  } else {
    delete raiz.dataset.tinte;
    localStorage.removeItem(TINTE);
  }
  raiz.setAttribute("data-theme", base);
  localStorage.setItem(TEMA, base);
}

/** Un clic fuera cierra el desplegable que esté abierto. */
export function cerrarAlClicarFuera() {
  document.addEventListener("click", (e) => {
    document.querySelectorAll(".controles details[open]").forEach(d => { if (!d.contains(e.target)) d.open = false; });
  });
}
