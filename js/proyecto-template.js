// ============================================
// PROYECTO TEMPLATE — plantillas de las páginas /proyectos/<slug> (sin DOM).
// ============================================
//
// Funciones puras que devuelven strings de HTML. Igual que easy-template.js, no
// tocan el DOM ni dependen del navegador; de momento solo las usa build-seo.js,
// pero se mantienen puras para poder reutilizarlas desde el cliente si algún día
// estas páginas dejan de ser estáticas.
//
// Contenido: la copia (title, description, texto) sale de proyectos-seo.json y
// las imágenes y enlaces de data.json. Se unen por el campo `nombre`.
//
// OJO con las rutas: estas páginas se sirven en /proyectos/<slug>, un nivel por
// debajo de la raíz, así que TODAS las rutas a assets van absolutas (/style.css,
// /img/…). Con rutas relativas el navegador las buscaría en /proyectos/.

import { esc, pickLang } from "./easy-template.js";

/**
 * Textos de interfaz de estas páginas, por idioma. Van aquí y no en data.json
 * porque solo los usan estas plantillas; data.json es el contenido del sitio.
 */
export const UI = {
  es:  { eyebrow: "proyecto", visitar: "visitar", todos: "← todos los proyectos",
         indiceTitulo: "proyectos", indiceEyebrow: "estudio de diseño web · barcelona",
         ctaTexto: "¿quieres una web así? la primera reunión es gratis.", ctaBoton: "escríbeme",
         asunto: "quiero una web!", detalle: "detalle", disenada: "web diseñada por meowrhino studio, Barcelona",
         intro: (n) => `${n} webs hechas a medida, desde cero y sin plantillas, para artistas, fotógrafos, músicos y pequeños negocios. cada una cuenta cómo se hizo y por qué acabó siendo así.`,
         navegar: "seguir navegando" },
  en:  { eyebrow: "project", visitar: "visit", todos: "← all projects",
         indiceTitulo: "projects", indiceEyebrow: "web design studio · barcelona",
         ctaTexto: "want a website like this? the first meeting is free.", ctaBoton: "write to me",
         asunto: "i want a website!", detalle: "detail", disenada: "website designed by meowrhino studio, Barcelona",
         intro: (n) => `${n} websites built from scratch, custom-made and without templates, for artists, photographers, musicians and small businesses. each one tells how it was made and why it ended up like this.`,
         navegar: "keep browsing" },
  cat: { eyebrow: "projecte", visitar: "visitar", todos: "← tots els projectes",
         indiceTitulo: "projectes", indiceEyebrow: "estudi de disseny web · barcelona",
         ctaTexto: "vols una web així? la primera reunió és gratis.", ctaBoton: "escriu-me",
         asunto: "vull una web!", detalle: "detall", disenada: "web dissenyada per meowrhino studio, Barcelona",
         intro: (n) => `${n} webs fetes a mida, des de zero i sense plantilles, per a artistes, fotògrafs, músics i petits negocis. cadascuna explica com es va fer i per què va acabar sent així.`,
         navegar: "seguir navegant" },
};

/**
 * Convierte el `nombre` de data.json en slug de URL.
 * Parte el camelCase antes de bajar a minúsculas (mokakopaTwins →
 * mokakopa-twins) y quita los acentos, que en una URL sobran.
 */
export const slugify = (s) => String(s ?? "")
  .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
  .toLowerCase()
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

/** Carpeta de imágenes del proyecto, deducida de `imagen` en data.json. */
const carpetaDe = (proyecto) => proyecto.imagen?.replace(/\/[^/]+$/, "") ?? "";

/**
 * Todas las imágenes de un proyecto: la principal más las secundarias, que en
 * data.json se declaran como un CONTADOR (`imagenesSecundarias`) y en disco son
 * 2.webp, 3.webp… correlativas a partir de la principal (1.webp).
 */
export function imagenesDe(proyecto) {
  const carpeta = carpetaDe(proyecto);
  const extra = Number(proyecto.imagenesSecundarias) || 0;
  const secundarias = Array.from({ length: extra }, (_, i) => `${carpeta}/${i + 2}.webp`);
  return [proyecto.imagen, ...secundarias].filter(Boolean);
}

/** Los enlaces externos del proyecto, normalizados: `url` suelta o `urls[]`. */
export function enlacesDe(proyecto) {
  if (Array.isArray(proyecto.urls) && proyecto.urls.length) {
    return proyecto.urls.map(u => ({ nombre: u.nombre, url: u.url }));
  }
  if (proyecto.url) {
    return [{ nombre: proyecto.urlLabel || dominioDe(proyecto.url), url: proyecto.url }];
  }
  return [];
}

/** El dominio de una URL, para usarlo como etiqueta legible del enlace. */
export function dominioDe(url) {
  return String(url ?? "").replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

/**
 * Cuerpo de una página de proyecto.
 *
 * `seo.texto` es un párrafo único a propósito: son 400-800 caracteres y partirlo
 * en secciones con subtítulos inventados solo añadiría ruido. El h1 lleva el
 * nombre del proyecto porque es lo que la gente busca; la keyword va en el
 * <title> y en el primer párrafo, no forzada en el titular.
 */
export function renderProyectoHTML(proyecto, seo, lang = "es", rutas = {}) {
  const t = UI[lang] || UI.es;
  const imagenes = imagenesDe(proyecto);
  const enlaces = enlacesDe(proyecto);

  const galeria = imagenes.map((src, i) => `
        <img class="proy-img" src="/${esc(src)}" alt="${esc(altDe(proyecto, i, t))}"
             loading="${i === 0 ? "eager" : "lazy"}" decoding="async">`).join("");

  const visitar = enlaces.length
    ? `
      <p class="proy-visitar">
        ${enlaces.map(e =>
          `<a class="easy-btn" href="${esc(e.url)}" target="_blank" rel="noopener">${esc(t.visitar)} ${esc(e.nombre)} ↗</a>`
        ).join("\n        ")}
      </p>`
    : "";

  return `
    <article class="proy">
      <p class="easy-eyebrow">${esc(t.eyebrow)} · ${esc(pickLang(seo.resumen, lang))}</p>
      <h1 class="proy-title">${esc(proyecto.nombre)}</h1>
      <p class="proy-texto">${esc(pickLang(seo.texto, lang))}</p>${visitar}
      <div class="proy-galeria">${galeria}
      </div>
      <nav class="proy-pie" aria-label="${esc(t.navegar)}">
        <a href="${esc(rutas.indice || "/proyectos")}">${esc(t.todos)}</a>
        <a href="${esc(rutas.home || "/")}">meowrhino studio</a>
      </nav>
      <aside class="proy-cta">
        <p>${esc(t.ctaTexto)}</p>
        <a class="easy-btn" href="mailto:hola@meowrhino.studio?subject=${encodeURIComponent(t.asunto)}">${esc(t.ctaBoton)}</a>
      </aside>
    </article>`;
}

/** Alt de cada imagen: descriptivo y distinto entre sí, sin repetir keyword. */
function altDe(proyecto, i, t) {
  return i === 0
    ? `${proyecto.nombre} — ${t.disenada}`
    : `${proyecto.nombre} — ${t.detalle} ${i + 1}`;
}

/**
 * Índice de /proyectos: la rejilla con los 20, cada uno a su página.
 *
 * Bajo el nombre va `resumen`, no `keyword`: la keyword está escrita en plural
 * y en genérico («web para músicos barcelona») porque su sitio es el <title> y
 * la etiqueta <meta>, donde compite en una búsqueda. En una rejilla de veinte
 * suena a catálogo repetido; el resumen habla de ESE proyecto en concreto
 * («un portfolio que es una disquetera»).
 */
export function renderIndiceHTML(fichas, lang = "es", rutas = {}) {
  const t = UI[lang] || UI.es;
  const base = rutas.base || "/proyectos";
  const items = fichas.map(({ proyecto, seo }) => `
        <li class="proy-card">
          <a href="${esc(base)}/${esc(seo.slug)}">
            <img src="/${esc(proyecto.imagen)}" alt="" loading="lazy" decoding="async">
            <span class="proy-card-nombre">${esc(proyecto.nombre)}</span>
            <span class="proy-card-kw">${esc(pickLang(seo.resumen, lang))}</span>
          </a>
        </li>`).join("");

  return `
    <section class="proy-indice">
      <p class="easy-eyebrow">${esc(t.indiceEyebrow)}</p>
      <h1 class="proy-title">${esc(t.indiceTitulo)}</h1>
      <p class="proy-texto">${esc(t.intro(fichas.length))}</p>
      <ul class="proy-grid">${items}
      </ul>
      <nav class="proy-pie" aria-label="${esc(t.navegar)}">
        <a href="${esc(rutas.home || "/")}">meowrhino studio</a>
      </nav>
    </section>`;
}
