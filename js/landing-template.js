// ============================================
// LANDING TEMPLATE — las páginas long-tail (/web-para-artistas,
// /web-sin-cuotas-mensuales y sus variantes /en y /ca). Sin DOM.
// ============================================
//
// La portada compite por «diseño web barcelona», que está saturada; estas
// páginas atacan búsquedas que sí se pueden ganar y que la portada no puede
// contestar con detalle. Son páginas lineales como las fichas de proyecto:
// mismo esqueleto (html.easy + body.easy-mode), la maqueta del about y una rejilla
// de proyectos relacionados con las tarjetas del portfolio. El texto sale de
// landings.json; los proyectos, de proyectos.json.

import { esc, escConEnlaces, pickLang } from "./easy-template.js";
import { tarjetaProyectoHTML } from "./proyecto-template.js";

/** Textos de interfaz propios de estas páginas, por idioma. */
const UI_LANDING = {
  es:  { verPortfolio: "ver todas las webs" },
  en:  { verPortfolio: "see all the websites" },
  cat: { verPortfolio: "veure totes les webs" },
};

/**
 * Cuerpo de una landing.
 *
 * `fichas` son los proyectos a enseñar, ya resueltos por quien llama:
 * `{ porApartado: [[{proyecto, seo}…]…], cierre: [{proyecto, seo}…] }`. `rutas`: { portfolio, home, idiomas[], otras[] } — `otras` son
 * los enlaces del pie a las demás landings.
 */
export function renderLandingHTML(landing, fichas, lang = "es", rutas = {}, medirImagen = null) {
  const tl = UI_LANDING[lang] || UI_LANDING.es;
  const p = (txt, clase = "proy-texto") => `<p class="${clase}">${escConEnlaces(txt)}</p>`;
  const tarjetas = (lista) => lista.map(f => tarjetaProyectoHTML(f, lang, rutas.portfolio, medirImagen)).join("");
  // Dos webs debajo de cada apartado, en vez de todas amontonadas al final: el
  // texto dice «la web de erika navega en cruz» y la captura está justo debajo.
  const rejillaInline = (lista = []) => lista.length
    ? `
      <ul class="proy-grid proy-grid-inline">${tarjetas(lista)}
      </ul>` : "";

  // La misma maqueta que el about (pages.js): entrada y apartados con su
  // titular, cada uno con la línea fina encima y el texto en su columna.
  const seccion = (titular, cuerpo) => `
        <section class="about-seccion">
          <h2 class="about-seccion-titular">${esc(titular)}</h2>${cuerpo}
        </section>`;

  const secciones = (pickLang(landing.secciones, lang) || []).map((sec, i) => seccion(sec.titular, `
          ${(sec.parrafos || []).map(x => p(x)).join("\n          ")}${rejillaInline(fichas.porApartado?.[i])}`)).join("");

  const intro = (pickLang(landing.intro, lang) || []).map(x => p(x)).join("\n        ");

  const cierre = fichas.cierre?.length
    ? seccion(pickLang(landing.rejillaTitular, lang), rejillaInline(fichas.cierre)) : "";

  // Al final, en texto como los del about: escribirnos, todo el portfolio y
  // las demás landings (la otra búsqueda que puede estar haciendo quien llega).
  const otras = (rutas.otras || []).map(o => `
        <a href="${esc(o.href)}">${esc(o.texto)}</a>`).join("");

  return `
    <article class="proy proy-ficha landing about-content">
      <h1 class="proy-title about-pregunta">${esc(pickLang(landing.h1, lang))}</h1>
      <p class="proy-resumen">${esc(pickLang(landing.eyebrow, lang))}</p>
      <div class="about-entrada">
        ${intro}
      </div>
      <div class="about-texto">${secciones}${cierre}
      </div>
      <p class="about-enlaces">
        <a href="mailto:hola@meowrhino.studio?subject=${encodeURIComponent(pickLang(landing.asunto, lang))}">${esc(pickLang(landing.cta, lang))}</a>
        <a href="${esc(rutas.portfolio || "/portfolio")}">${esc(tl.verPortfolio)}</a>${otras}
      </p>
    </article>`;
}
