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
// `slugify` se mudó a rutas.js (lo necesita también easy-template.js, y tenerlo
// aquí montaba un import circular). Se re-exporta para no romper a quien lo pida.
export { slugify } from "./rutas.js";

/**
 * Textos de interfaz de estas páginas, por idioma. Van aquí y no en data.json
 * porque solo los usan estas plantillas; data.json es el contenido del sitio.
 */
export const UI = {
  es:  { eyebrow: "proyecto", visitar: "visitar", indiceTitulo: "proyectos", indiceEyebrow: "estudio de diseño web · barcelona",
         ctaBoton: "¿quieres una web así?",
         asunto: "quiero una web!", detalle: "detalle", disenada: "web diseñada por meowrhino studio, Barcelona",
         anterior: "anterior", siguiente: "siguiente", idiomas: "idioma",
         volverRejilla: "← volver al portfolio",
         intro: (n) => `${n} webs hechas a medida, desde cero y sin plantillas, para artistas, fotógrafos, músicos y pequeños negocios. cada una cuenta cómo se hizo y por qué acabó siendo así.`,
         navegar: "seguir navegando" },
  en:  { eyebrow: "project", visitar: "visit", indiceTitulo: "projects", indiceEyebrow: "web design studio · barcelona",
         ctaBoton: "want a website like this?",
         asunto: "i want a website!", detalle: "detail", disenada: "website designed by meowrhino studio, Barcelona",
         anterior: "previous", siguiente: "next", idiomas: "language",
         volverRejilla: "← back to the portfolio",
         intro: (n) => `${n} websites built from scratch, custom-made and without templates, for artists, photographers, musicians and small businesses. each one tells how it was made and why it ended up like this.`,
         navegar: "keep browsing" },
  cat: { eyebrow: "projecte", visitar: "visitar", indiceTitulo: "projectes", indiceEyebrow: "estudi de disseny web · barcelona",
         ctaBoton: "vols una web així?",
         asunto: "vull una web!", detalle: "detall", disenada: "web dissenyada per meowrhino studio, Barcelona",
         anterior: "anterior", siguiente: "següent", idiomas: "idioma",
         volverRejilla: "← tornar al portfolio",
         intro: (n) => `${n} webs fetes a mida, des de zero i sense plantilles, per a artistes, fotògrafs, músics i petits negocis. cadascuna explica com es va fer i per què va acabar sent així.`,
         navegar: "seguir navegant" },
};

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
export function renderProyectoHTML(proyecto, seo, lang = "es", rutas = {}, medirImagen = null) {
  const t = UI[lang] || UI.es;
  const imagenes = imagenesDe(proyecto);
  const enlaces = enlacesDe(proyecto);

  // width/height reales para que el navegador reserve el hueco antes de
  // descargar la captura y el texto no pegue el salto. Quien llama decide de
  // dónde salen (build-seo.js las lee del .webp); sin `medirImagen` la <img>
  // sale como antes, sin atributos, y esta función sigue siendo pura.
  const galeria = imagenes.map((src, i) => {
    const m = medirImagen?.(src);
    const tamano = m ? ` width="${m.ancho}" height="${m.alto}"` : "";
    return `
        <img class="proy-img" src="/${esc(src)}" alt="${esc(altDe(proyecto, i, t))}"${tamano}
             loading="${i === 0 ? "eager" : "lazy"}" decoding="async">`;
  }).join("");

  // Los dos botones van juntos y DESPUÉS de la galería: antes, «visitar» salía
  // encima de las capturas (te echaba de la página antes de enseñártela) y la
  // llamada a escribir quedaba en un cartel aparte al final. Puestos en fila al
  // salir de las imágenes, se leen como lo que son: ver esa web, o pedir la tuya.
  const acciones = `
      <p class="proy-acciones">${enlaces.map(e => `
        <a class="easy-btn" href="${esc(e.url)}" target="_blank" rel="noopener">${esc(t.visitar)} ${esc(e.nombre)} ↗</a>`
        ).join("")}
        <a class="easy-btn easy-btn-secundario" href="mailto:hola@meowrhino.studio?subject=${encodeURIComponent(t.asunto)}">${esc(t.ctaBoton)}</a>
      </p>`;

  // Las tres variantes de idioma de ESTA ficha. Existían ya como <link
  // hreflang> para los buscadores, pero una persona que caía aquí desde Google
  // en el idioma equivocado no tenía forma de cambiarlo: la ficha solo llevaba
  // cuatro enlaces y ninguno era el selector.
  const idiomas = (rutas.idiomas || []).map(i =>
    i.activo
      ? `<span class="proy-lang-actual" aria-current="true">${esc(i.etiqueta)}</span>`
      : `<a class="proy-lang" href="${esc(i.href)}" hreflang="${esc(i.htmlLang)}">${esc(i.etiqueta)}</a>`
  ).join("");

  const cabecera = idiomas
    ? `
      <div class="proy-lang-switch" role="group" aria-label="${esc(t.idiomas)}">${idiomas}</div>`
    : "";

  // Anterior y siguiente van en los BORDES, girados, como las etiquetas de las
  // celdas vecinas del lienzo de la home: la ficha se lee como una celda que
  // has abierto, no como una página suelta. En móvil el CSS los baja al pie,
  // donde sí hay sitio.
  const vecino = (v, clase) => v
    ? `
      <a class="proy-vecino ${clase}" href="${esc(v.href)}" rel="${clase === "proy-vecino-prev" ? "prev" : "next"}">
        <span class="proy-vecino-nombre">${esc(v.nombre)}</span>
      </a>`
    : "";

  const vecinos = vecino(rutas.anterior, "proy-vecino-prev") +
    vecino(rutas.siguiente, "proy-vecino-next");

  return `
    <article class="proy">${cabecera}
      <span class="proy-borde-etiqueta" aria-hidden="true">${esc(t.eyebrow)}</span>${vecinos}
      <p class="easy-eyebrow">${esc(pickLang(seo.resumen, lang))}</p>
      <h1 class="proy-title">${esc(proyecto.nombre)}</h1>
      <p class="proy-texto">${esc(pickLang(seo.texto, lang))}</p>
      <div class="proy-galeria">${galeria}
      </div>${acciones}
      <nav class="proy-pie" aria-label="${esc(t.navegar)}">
        <a href="${esc(rutas.indice || "/#portfolio")}">${esc(t.volverRejilla)}</a>
        <a href="${esc(rutas.home || "/")}">meowrhino studio</a>
      </nav>
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
export function renderIndiceHTML(fichas, lang = "es", rutas = {}, medirImagen = null) {
  const t = UI[lang] || UI.es;
  const base = rutas.base || "/proyectos";
  const items = fichas.map(({ proyecto, seo }) => {
    // Las 21 capturas van `lazy` y sin medidas no reservaban sitio: al entrar,
    // la página saltaba entera cada vez que llegaba una. Las fichas ya medían
    // sus imágenes (medidasDe, en build-seo.js); el índice no, y era justo la
    // página donde más se notaba porque hay veintiuna a la vez.
    const m = medirImagen?.(proyecto.imagen);
    const tamano = m ? ` width="${m.ancho}" height="${m.alto}"` : "";
    return `
        <li class="proy-card">
          <a href="${esc(base)}/${esc(seo.slug)}">
            <img src="/${esc(proyecto.imagen)}" alt=""${tamano} loading="lazy" decoding="async">
            <span class="proy-card-nombre">${esc(proyecto.nombre)}</span>
            <span class="proy-card-kw">${esc(pickLang(seo.resumen, lang))}</span>
          </a>
        </li>`;
  }).join("");

  return `
    <section class="proy-indice">
      <p class="easy-eyebrow">${esc(t.indiceEyebrow)}</p>
      <h1 class="proy-title">${esc(t.indiceTitulo)}</h1>
      <p class="proy-texto">${esc(t.intro(fichas.length))}</p>
      <ul class="proy-grid">${items}
      </ul>
      <nav class="proy-pie" aria-label="${esc(t.navegar)}">
        <a href="${esc(rutas.rejilla || "/#portfolio")}">${esc(t.volverRejilla)}</a>
        <a href="${esc(rutas.home || "/")}">meowrhino studio</a>
      </nav>
    </section>`;
}
