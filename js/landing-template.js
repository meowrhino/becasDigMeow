// ============================================
// LANDING TEMPLATE — las páginas long-tail (/web-para-artistas,
// /web-sin-cuotas-mensuales y sus variantes /en y /ca). Sin DOM.
// ============================================
//
// La portada compite por «diseño web barcelona», que está saturada; estas
// páginas atacan búsquedas que sí se pueden ganar y que la portada no puede
// contestar con detalle. Son páginas lineales como las fichas de proyecto:
// mismo esqueleto (html.easy + body.easy-mode), mismo CSS (.proy) y una rejilla
// de proyectos relacionados con las tarjetas del portfolio. El texto sale de
// landings.json; los proyectos, de data.json + proyectos-seo.json.

import { esc, escConEnlaces, pickLang } from "./easy-template.js";
import { UI, tarjetaProyectoHTML } from "./proyecto-template.js";

/** Textos de interfaz propios de estas páginas, por idioma. */
const UI_LANDING = {
  es:  { verPortfolio: "ver todas las webs →" },
  en:  { verPortfolio: "see all the websites →" },
  cat: { verPortfolio: "veure totes les webs →" },
};

/**
 * Cuerpo de una landing.
 *
 * `fichas` son los proyectos a enseñar ({proyecto, seo}), ya resueltos por
 * quien llama. `rutas`: { portfolio, home, idiomas[], otras[] } — `otras` son
 * los enlaces del pie a las demás landings.
 */
export function renderLandingHTML(landing, fichas, lang = "es", rutas = {}, medirImagen = null) {
  const t = UI[lang] || UI.es;
  const tl = UI_LANDING[lang] || UI_LANDING.es;
  const p = (txt) => `<p class="proy-texto">${escConEnlaces(txt)}</p>`;

  const idiomas = (rutas.idiomas || []).map(i =>
    i.activo
      ? `<span class="proy-lang-actual" aria-current="true">${esc(i.etiqueta)}</span>`
      : `<a class="proy-lang" href="${esc(i.href)}" hreflang="${esc(i.htmlLang)}">${esc(i.etiqueta)}</a>`
  ).join("");

  const secciones = (pickLang(landing.secciones, lang) || []).map(sec => `
      <h2 class="proy-h2">${esc(sec.titular)}</h2>
      ${(sec.parrafos || []).map(p).join("\n      ")}`).join("");

  const tarjetas = fichas.map(f => tarjetaProyectoHTML(f, lang, rutas.portfolio, medirImagen)).join("");

  const otras = (rutas.otras || []).map(o => `<a href="${esc(o.href)}">${esc(o.texto)}</a>`).join("");

  return `
    <article class="proy landing">
      <div class="proy-lang-switch" role="group" aria-label="${esc(t.idiomas)}">${idiomas}</div>
      <span class="proy-borde-etiqueta" aria-hidden="true">${esc(pickLang(landing.etiqueta, lang))}</span>
      <p class="easy-eyebrow">${esc(pickLang(landing.eyebrow, lang))}</p>
      <h1 class="proy-title">${esc(pickLang(landing.h1, lang))}</h1>
      ${(pickLang(landing.intro, lang) || []).map(p).join("\n      ")}${secciones}
      <h2 class="proy-h2">${esc(pickLang(landing.rejillaTitular, lang))}</h2>
      <ul class="proy-grid">${tarjetas}
      </ul>
      <p class="proy-acciones">
        <a class="easy-btn" href="mailto:hola@meowrhino.studio?subject=${encodeURIComponent(pickLang(landing.asunto, lang))}">${esc(pickLang(landing.cta, lang))}</a>
        <a class="easy-btn easy-btn-secundario" href="${esc(rutas.portfolio || "/portfolio")}">${esc(tl.verPortfolio)}</a>
      </p>
      <nav class="proy-pie" aria-label="${esc(t.navegar)}">
        <a href="${esc(rutas.home || "/")}">meowrhino studio</a>
        ${otras}
      </nav>
    </article>`;
}
