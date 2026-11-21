// ============================================
// MODOS — la lista de modos de color y sus nombres (sin DOM)
// ============================================
//
// Aparte de theme.js porque theme.js arrastra data.js (localStorage, location):
// así build-seo.js puede pintar el desplegable `modo(…)` de las fichas
// estáticas con la misma lista que la barra del lienzo.

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

export const NOMBRES_MODO = {
  es:  { claro: "claro", oscuro: "oscuro", papel: "papel", chicle: "chicle", cianotipo: "cianotipo", fosforo: "fósforo" },
  en:  { claro: "light", oscuro: "dark",   papel: "paper", chicle: "bubblegum", cianotipo: "cyanotype", fosforo: "phosphor" },
  cat: { claro: "clar",  oscuro: "fosc",   papel: "paper", chicle: "xiclet", cianotipo: "cianotip", fosforo: "fòsfor" },
};
