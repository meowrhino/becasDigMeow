// ============================================
// PAGES — Renderizado de páginas de contenido
// ============================================
//
// Cada función renderiza una celda/página específica:
// Tools, Welcome, Statement, Metodología, Footer, Contacto.

import { currentLang, buildLangButtons, attachLangListeners, onLangChange } from "./data.js";
import { setupZoom } from "./zoom.js";
import { setupScrollGradients } from "./scroll-gradients.js";
import { renderWelcomeCard } from "./welcome-card.js";
// Cupón desactivado de momento (recuperable para una promoción): descomentar
// este import (con comillas dobles) y la llamada en renderWelcome. Con comillas
// simples el build no lo ve como import y quita el modulepreload.
// import { renderWelcomeCupon } from './welcome-cupon.js';
import { repaintWithFade, escapeHTML } from "./utils.js";
import { rutaProyectos, rutaCelda, slugify, flechaHacia, textoConFlecha } from "./rutas.js";
// Ciclo con mapa.js (que importa celdaHeadingHTML de aquí): inocuo, leerMapa
// solo se llama en tiempo de ejecución.
import { leerMapa } from "./mapa.js";
import { escConEnlaces } from "./easy-template.js";
import { bordeCelda } from "./navigation.js";

/** true si el viewport es táctil / móvil (mismo criterio que portfolio usa para hover/pointer). */
export const esMovil = window.matchMedia("(hover: none) and (pointer: coarse)").matches;

/**
 * Encabezado de sección de una celda: un <h2> real, oculto visualmente.
 *
 * El texto ya se ve en pantalla — es el zone label gigante del fondo — pero ese
 * vive en un <div> decorativo FUERA de la celda, así que ni un lector de
 * pantalla ni un buscador tenían forma de saber dónde empieza cada sección.
 * De las ocho celdas del lienzo, cinco no tenían ningún encabezado: links,
 * condiciones, portfolio, mapa y buscaminas. Esto se lo pone sin tocar el
 * diseño (ver `.celda-h` en style.css).
 *
 * El texto sale de `data.zoneLabels`, la misma fuente que el zone label y el
 * minimapa, así que no puede desincronizarse. Las celdas cuyo nombre es igual
 * en los tres idiomas no están listadas ahí y se devuelven tal cual.
 */
export const tituloCelda = (data, nombre, lang) => {
  const t = data?.zoneLabels?.[nombre];
  return t ? (t[lang] ?? t.es ?? nombre) : nombre;
};

export const celdaHeadingHTML = (data, nombre, lang) =>
  `<h2 class="celda-h">${escapeHTML(tituloCelda(data, nombre, lang))}</h2>`;

/** Escoge la variante de idioma (con fallback a es) de un objeto {es,en,cat}. */
const pick = (obj, lang) => (obj?.[lang] ?? obj?.es ?? "");

/**
 * Genera el HTML de un enlace tipo tarjeta.
 *
 * Si el item trae `desc`, lleva debajo del nombre una línea con el resumen de
 * para qué sirve. Solo lo llevan las herramientas sueltas. Fue un globo que
 * salía al pasar por encima; no se leía bien y en móvil no existía.
 *
 * @param {{ nombre: string, url: string, desc?: Object }} item
 * @param {number} [idx] posición en su lista, para re-traducir el globo
 * @returns {string}
 */
function crearLinkHTML(item, idx) {
  const target = esMovil ? "" : ' target="_blank"';
  const desc = item.desc
    ? `<span class="tool-link-desc" data-desc="${idx}">${escConEnlaces(pick(item.desc, currentLang))}</span>`
    : "";
  return `<a class="tool-link" href="${escapeHTML(item.url)}"${target} rel="noopener">${escapeHTML(item.nombre)}${desc}</a>`;
}

/**
 * Genera el HTML de un par de enlaces duales (mismo proyecto, varias urls).
 * @param {{ urls: { nombre: string, url: string }[] }} item
 * @returns {string}
 */
function crearDualLinkHTML(item) {
  const target = esMovil ? "" : ' target="_blank"';
  return `<div class="tool-link-dual">${item.urls.map(u =>
    `<a class="tool-link" href="${escapeHTML(u.url)}"${target} rel="noopener">${escapeHTML(u.nombre)}</a>`
  ).join("")}</div>`;
}

/**
 * Genera el HTML de un grupo desplegable (dropdown).
 * @param {string} titulo
 * @param {{ nombre: string, url: string }[]} items
 * @param {string} uid
 * @returns {string}
 */
function crearDropdownHTML(titulo, items, uid) {
  const linksHTML = items.map(i => i.urls ? crearDualLinkHTML(i) : crearLinkHTML(i)).join("");
  return `
    <div class="tools-dropdown-group">
      <button class="tools-dropdown-btn" data-target="${uid}" aria-expanded="false">
        <span class="tools-dropdown-label">${escapeHTML(titulo)}</span>
        <svg class="tools-dropdown-icon" viewBox="0 0 16 16" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <polyline points="4,6 8,10 12,6"/>
        </svg>
      </button>
      <div class="tools-dropdown-content" id="${uid}">
        <div class="tools-dropdown-inner">${linksHTML}</div>
      </div>
    </div>
  `;
}

// --- Tools ---

export function renderTools(data) {
  const el = document.querySelector(".celda.tools");
  if (!el || !data?.links) return;

  const herramientas  = data.links.herramientas || [];
  const experimentos  = data.links.experimentos || [];
  const wip           = data.links.wip || [];
  const varios        = data.links.varios || [];
  const formateadores = data.welcome?.formateadores || [];
  const websTerminadas = (data.portfolio?.proyectos || []).map(p =>
    p.urls ? { urls: p.urls } : { nombre: p.nombre, url: p.url }
  );

  // "wip" es un término ya usado igual en los tres idiomas (como el resto de
  // nombres de celda); "experimentos", "formateadores", "webs terminadas" y
  // "varios" sí varían y viven en data.json (links.labels) con {es,en,cat}.
  //
  // El corte de los grupos es por PARA QUÉ SIRVE cada cosa, no por qué es.
  // Antes había un grupo "herramientas" y otro "tools" —la misma palabra en
  // dos idiomas— y los dos llevaban utilidades de verdad, así que el
  // generador de facturas y la calculadora de impuestos, que son argumento de
  // venta puro, estaban escondidos en un desplegable debajo de un generador
  // de poporings. Ahora las que le sirven a alguien hoy van sueltas y
  // siempre visibles, y lo demás va plegado.
  const labels = data.links.labels || {};

  const linksHTML = herramientas.map((h, i) => crearLinkHTML(h, i)).join("");
  const dropdownsHTML = [
    crearDropdownHTML(pick(labels.experimentos, currentLang), experimentos, "dd_experimentos"),
    crearDropdownHTML("wip", wip, "dd_wip"),
    crearDropdownHTML(pick(labels.formateadores, currentLang), formateadores, "dd_formateadores"),
    crearDropdownHTML(pick(labels.webs, currentLang), websTerminadas, "dd_webs"),
    crearDropdownHTML(pick(labels.varios, currentLang), varios, "dd_varios"),
  ].join("");

  el.innerHTML = `
    ${celdaHeadingHTML(data, "links", currentLang)}
    <div class="scroll-wrapper tools-scroll-wrapper">
      <div class="scroll-content tools-content">
        <div class="tools-list">${linksHTML}${dropdownsHTML}</div>
      </div>
    </div>
  `;

  // Lógica de abrir/cerrar desplegables (accordion)
  const toolsList = el.querySelector(".tools-list");
  const lastDropdown = el.querySelector(".tools-dropdown-group:last-child .tools-dropdown-content");
  el.querySelectorAll(".tools-dropdown-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.target);
      if (!target) return;
      const willOpen = !target.classList.contains("open");
      el.querySelectorAll(".tools-dropdown-content.open").forEach(d => d.classList.remove("open"));
      el.querySelectorAll(".tools-dropdown-btn.active").forEach(b => {
        b.classList.remove("active");
        b.setAttribute("aria-expanded", "false");
      });
      target.classList.toggle("open", willOpen);
      btn.classList.toggle("active", willOpen);
      btn.setAttribute("aria-expanded", String(willOpen));
      toolsList?.classList.toggle("has-open-last-dropdown", willOpen && target === lastDropdown);
    });
  });

  // Gradientes de scroll
  const wrapper = el.querySelector(".tools-scroll-wrapper");
  const content = el.querySelector(".tools-content");
  if (content && wrapper) {
    const list = el.querySelector(".tools-list");
    setupScrollGradients(wrapper, content, {
      bottomMargin: () => list ? parseFloat(getComputedStyle(list).paddingBottom) || 0 : 0,
    });
  }

  // Re-traduce los labels que varían por idioma al cambiar de
  // idioma. La celda tools no tiene botones .lang-btn propios (el cambio de
  // idioma se dispara desde otra celda), así que usamos el callback global
  // onLangChange (mismo mecanismo que theme.js para su aria-label).
  const experimentosLabelEl = el.querySelector('[data-target="dd_experimentos"] .tools-dropdown-label');
  const formateadoresLabelEl = el.querySelector('[data-target="dd_formateadores"] .tools-dropdown-label');
  const websLabelEl = el.querySelector('[data-target="dd_webs"] .tools-dropdown-label');
  const variosLabelEl = el.querySelector('[data-target="dd_varios"] .tools-dropdown-label');
  const descEls = el.querySelectorAll(".tool-link-desc");
  onLangChange((lang) => {
    descEls.forEach(span => {
      const item = herramientas[+span.dataset.desc];
      if (item?.desc) span.innerHTML = escConEnlaces(pick(item.desc, lang));
    });
    if (experimentosLabelEl) experimentosLabelEl.textContent = pick(labels.experimentos, lang);
    if (formateadoresLabelEl) formateadoresLabelEl.textContent = pick(labels.formateadores, lang);
    if (websLabelEl) websLabelEl.textContent = pick(labels.webs, lang);
    if (variosLabelEl) variosLabelEl.textContent = pick(labels.varios, lang);
  });
}

// --- Welcome ---

export function renderWelcome(data) {
  const el = document.querySelector(".celda.welcome");
  if (!el || !data?.welcome) return;

  const w = data.welcome;

  // Solo wordmark y tagline. El cupón va detrás (posicionado absoluto) y los
  // lang-btn por encima (z-index mayor); `renderWelcomeCupon` engancha sus
  // listeners al recorrer los .lang-btn dentro de la celda.
  //
  // Debajo hubo un hint («navega con los botones de los lados») que explicaba
  // la interfaz en vez de enseñar trabajo; en su lugar, más portfolio
  // moviéndose: renderWelcomeCard pinta varias tarjetas. La letra pequeña
  // también estuvo aquí y era demasiado concreta demasiado pronto; se mudó al
  // dorso del cupón, que es donde alguien ya está interesado.
  //
  // El nombre y la tagline enlazan los dos al about: «estudio de diseño web en
  // barcelona» es la frase que alguien que acaba de llegar quiere ampliar, y
  // el nombre del estudio es lo primero que se pulsa buscando quién hay detrás.
  const hrefAbout = (lang) => escapeHTML(rutaCelda("about", lang));
  el.innerHTML = `
    <div class="welcome-content">
      <a class="welcome-title" href="${hrefAbout(currentLang)}">${escapeHTML(w.titulo)}</a>
      <a class="welcome-tagline" href="${hrefAbout(currentLang)}">${escapeHTML(pick(w.tagline, currentLang))}</a>
    </div>
    ${buildLangButtons()}
  `;

  const titleEl = el.querySelector(".welcome-title");
  const taglineEl = el.querySelector(".welcome-tagline");

  // i18n en sitio: reusa el mecanismo de attachLangListeners (mismo patrón
  // que el cupón, que registra el suyo aparte sobre la misma celda).
  attachLangListeners(el, (lang) => {
    titleEl.href = rutaCelda("about", lang);
    if (taglineEl) {
      taglineEl.textContent = pick(w.tagline, lang);
      taglineEl.href = rutaCelda("about", lang);
    }
  });

  // renderWelcomeCupon(el, w.cupon);
  renderWelcomeCard(el, data.portfolio?.proyectos);
}

// --- Metodología ---

export function renderMetodologia(data) {
  const el = document.querySelector(".celda.metodologia");
  if (!el || !data?.metodologia) return;

  // Cada paso es un titular con lo que pasa y debajo el detalle. Antes era un
  // párrafo por paso, y los seis se leían como un muro: lo importante de cada
  // uno quedaba enterrado en mitad de la frase.
  const buildContent = (lang) => {
    const pasos = (data.metodologia[lang] || data.metodologia.es)?.pasos || [];
    const lista = pasos.map((paso, i) => `
      <div class="metodologia-paso">
        <span class="metodologia-num">${String(i + 1).padStart(2, "0")}</span>
        <p class="metodologia-titular">${escapeHTML(paso.titular)}</p>
        ${(paso.parrafos || []).map(t => `<p>${escapeHTML(t)}</p>`).join("")}
      </div>`).join("");

    // Los plazos, el dinero y lo que pasa si algo se para. Iba repartido entre
    // los pasos y convertía el segundo en una advertencia; aquí abajo es lo que
    // es: la información que necesitas para decidir, junta y sin tono de aviso.
    const imp = (data.metodologia[lang] || data.metodologia.es)?.importante;
    const importante = imp ? `
      <div class="metodologia-importante">
        <h2 class="metodologia-importante-titular">${escapeHTML(imp.titular)}</h2>
        ${(imp.parrafos || []).map(t => `<p>${escapeHTML(t)}</p>`).join("")}
        ${imp.enlace ? `<a class="metodologia-enlace" href="${escapeHTML(rutaCelda("condiciones", lang))}">${escapeHTML(imp.enlace)}</a>` : ""}
      </div>` : "";

    return lista + importante;
  };

  el.innerHTML = `
    <div class="scroll-wrapper metodologia-scroll-wrapper">
      <div class="scroll-content metodologia-content">${buildContent(currentLang)}</div>
    </div>
    ${buildLangButtons()}
  `;

  const wrapper = el.querySelector(".metodologia-scroll-wrapper");
  const content = el.querySelector(".metodologia-content");
  const checkScroll = setupScrollGradients(wrapper, content);
  const applyScale = setupZoom(el, content, checkScroll);

  attachLangListeners(el, (lang) => {
    repaintWithFade(el, content,
      () => { content.innerHTML = buildContent(lang); },
      () => { applyScale(); requestAnimationFrame(checkScroll); }
    );
  });

}

// --- Footer ---
//
// Una sección a la vez (data.footer[lang].secciones[]), con pestañas abajo.
// Rotaba sola cada pocos segundos; se quitó en octubre de 2026: con diez
// apartados en «trabajo» nadie acababa de leerlos, y privacidad y financiación
// están ahí a propósito sin llamar la atención.

/**
 * La celda de la letra pequeña: condiciones, privacidad y financiación.
 *
 * Se llamaba `footer` y ahora se llama `condiciones`, que es lo que contiene:
 * un pie de página es lo que va al final de TODAS las páginas, y esto era una
 * pantalla más del lienzo. Conserva la clase css `.celda.footer` para no mover
 * su hoja de estilos, que es larga y no ha cambiado.
 */
export function renderCondiciones(data) {
  const el = document.querySelector(".celda.footer");
  if (!el || !data?.footer) return;

  let activeIdx = 0;

  const buildSeccion = (lang, idx) => {
    const s = data.footer[lang]?.secciones?.[idx];
    if (!s) return "";

    let body = "";
    if (s.tipo === "texto") {
      // `parrafos` lleva markup a propósito (la sección de privacidad trae
      // <strong>/<a>/<em>); NO se escapa. El resto de campos es texto plano.
      // `apartados` es la de trabajo: diez condiciones, cada una con su título,
      // en vez de once párrafos seguidos.
      const parrafos = (ps) => (ps || []).map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
      body = s.apartados
        ? s.apartados.map(a => `<h3 class="footer-apartado-titular">${escapeHTML(a.titulo)}</h3>${parrafos(a.parrafos)}`).join("")
        : parrafos(s.parrafos);
      if (s.nota) body += `<p class="footer-nota">${escapeHTML(s.nota)}</p>`;
    } else if (s.tipo === "subvencion") {
      const intro = s.intro ? `<p>${escapeHTML(s.intro)}</p>` : "";
      const logoAttrs = `loading="lazy" decoding="async"`;
      const tone = document.documentElement.getAttribute("data-theme") === "dark" ? "BLANCO" : "NEGRO";
      const logos = (s.logos || []).length
        ? `<div class="footer-logos">${s.logos.map(l =>
            `<img src="/img/LOGOS/${tone}/${escapeHTML(l.name)}.webp" alt="${escapeHTML(l.alt || '')}" class="footer-logo" data-logo-name="${escapeHTML(l.name)}" ${logoAttrs}>`
          ).join("")}</div>`
        : "";
      const frase = s.frase ? `<p class="footer-frase">${escapeHTML(s.frase)}</p>` : "";
      body = intro + logos + frase;
    }
    return `<div class="footer-seccion">${body}</div>`;
  };

  const buildSectionNav = (lang) => {
    const secciones = data.footer[lang]?.secciones || [];
    if (secciones.length < 2) return "";
    return `<div class="footer-section-nav">${secciones.map((s, i) =>
      `<button type="button" class="footer-section-tab${i === activeIdx ? ' is-active' : ''}" data-idx="${i}">${escapeHTML(s.label)}</button>`
    ).join("")}</div>`;
  };

  el.innerHTML = `
    ${celdaHeadingHTML(data, "condiciones", currentLang)}
    <div class="scroll-wrapper footer-scroll-wrapper">
      <div class="scroll-content footer-content">${buildSeccion(currentLang, activeIdx)}</div>
    </div>
    ${buildLangButtons()}
  `;

  // Las pestañas van DENTRO del borde de abajo, no sueltas encima de él. Antes
  // eran un absolute con las mismas coordenadas que `.nav-slot.bottom`, así que
  // si movías una sección debajo de esta celda su etiqueta de navegación caía
  // justo encima de la pestaña del medio y se la comía: ilegibles las dos e
  // inclicable la pestaña. Compartiendo slot, la navegación se queda pegada al
  // canto y las pestañas se apartan hacia dentro (ver bordeCelda).
  bordeCelda(el, "bottom").insertAdjacentHTML("beforeend", buildSectionNav(currentLang));

  const wrapper = el.querySelector(".footer-scroll-wrapper");
  const content = el.querySelector(".footer-content");
  const checkScroll = setupScrollGradients(wrapper, content);
  const applyScale = setupZoom(el, content, checkScroll);


  const updateNavActive = () => {
    el.querySelectorAll(".footer-section-tab").forEach((tab, i) =>
      tab.classList.toggle("is-active", i === activeIdx)
    );
  };

  const repintarNav = (lang) => {
    const oldNav = el.querySelector(".footer-section-nav");
    const tmp = document.createElement("div");
    tmp.innerHTML = buildSectionNav(lang);
    const newNav = tmp.firstElementChild;
    if (oldNav && newNav) oldNav.replaceWith(newNav);
  };

  const repintar = (lang, withFade = true) => {
    const render = () => { content.innerHTML = buildSeccion(lang, activeIdx); };
    const after = () => {
      content.scrollTop = 0;
      applyScale();
      checkScroll();
      updateNavActive();
    };
    if (withFade) {
      repaintWithFade(el, content, render, after);
    } else {
      render();
      after();
    }
  };

  // Click delegation: tabs del nav (que está fuera del content)
  el.addEventListener("click", (e) => {
    const tabBtn = e.target.closest(".footer-section-tab");
    if (!tabBtn) return;
    const idx = parseInt(tabBtn.dataset.idx, 10);
    if (idx !== activeIdx) {
      activeIdx = idx;
      repintar(currentLang);
    }
  });

  attachLangListeners(el, (lang) => {
    repintarNav(lang);
    repintar(lang);
  });
}

// --- About y statement ---

/**
 * La caja de texto con scroll que comparten about y statement: pinta el
 * contenido, engancha los degradados de scroll y el zoom, y lo repinta con
 * fundido al cambiar de idioma. Es el mismo montaje que lleva metodología.
 */
function montarCeldaTexto(el, prefijo, buildContent) {
  el.innerHTML = `
    <div class="scroll-wrapper ${prefijo}-scroll-wrapper">
      <div class="scroll-content ${prefijo}-content">${buildContent(currentLang)}</div>
    </div>
    ${buildLangButtons()}
  `;
  const wrapper = el.querySelector(`.${prefijo}-scroll-wrapper`);
  const content = el.querySelector(`.${prefijo}-content`);
  const checkScroll = setupScrollGradients(wrapper, content);
  const applyScale = setupZoom(el, content, checkScroll);
  attachLangListeners(el, (lang) => {
    repaintWithFade(el, content,
      () => { content.innerHTML = buildContent(lang); },
      () => { applyScale(); requestAnimationFrame(checkScroll); }
    );
  });
}

// `escConEnlaces` y no `escapeHTML`: algunos párrafos citan su fuente con un
// enlace en markdown (`[texto](url)`). El pre-render ya los pintaba; aquí
// salían literales, con los corchetes y el paréntesis a la vista.
const parrafo = (t) => `<p>${escConEnlaces(t)}</p>`;

/**
 * La celda `about`: quién somos en tres párrafos, una foto y cómo escribirnos.
 *
 * Fue la celda `contacto` (cuatro datos que no sostenían una página) y luego
 * el about largo, con el manifiesto dentro. En octubre de 2026 se partió: lo
 * que pensamos se fue a `statement` y aquí queda lo que necesita alguien que
 * está decidiendo si escribirnos. El contacto sigue al final, que es donde se
 * busca cuando ya has leído a quién estás escribiendo.
 */
export function renderAbout(data) {
  const el = document.querySelector(".celda.about");
  if (!el || !data?.about) return;

  const { email, asunto, redes } = data.contacto || {};

  const buildMailto = (lang) => {
    const subject = pick(asunto, lang);
    const params = new URLSearchParams();
    if (subject) params.set("subject", subject);
    return `mailto:${email}${params.toString() ? `?${params.toString()}` : ""}`;
  };

  // Las flechas señalan a la celda de verdad según el reparto del mapa, y se
  // repintan solas cuando alguien lo recoloca.
  const enlaces = (lang, mapa = leerMapa()) => {
    const cta = (data.about[lang] || data.about.es)?.cta || {};
    const enlace = (celda, texto) => `<a href="${escapeHTML(rutaCelda(celda, lang))}">${escapeHTML(textoConFlecha(texto, flechaHacia(mapa, "about", celda)))}</a>`;
    return enlace("portfolio", cta.portfolio || "portfolio") + (cta.statement ? enlace("statement", cta.statement) : "");
  };
  window.addEventListener("mapa-cambiado", (e) => {
    const p = el.querySelector(".about-enlaces");
    if (p) p.innerHTML = enlaces(currentLang, e.detail);
  });

  const buildContent = (lang) => {
    const d = data.about[lang] || data.about.es;
    if (!d) return "";

    return `
      <h2 class="about-pregunta">${escapeHTML(d.pregunta)}</h2>
      <div class="about-entrada">${(d.entrada || []).map(parrafo).join("")}</div>
      <p class="about-enlaces">${enlaces(lang)}</p>
      <div class="about-contacto">
        <a class="contacto-email" href="${escapeHTML(buildMailto(lang))}">${escapeHTML(email)}</a>
        <div class="contacto-row">
          ${(redes || []).map(a => {
            // /archive es nuestro y se abre en la misma pestaña; el resto es
            // de fuera y se va a la suya (en móvil, a la misma: ver esMovil).
            const externo = !a.url.startsWith("/");
            const blank = externo && !esMovil ? ' target="_blank"' : "";
            return `<a class="contacto-link${externo ? "" : " contacto-archive"}" href="${escapeHTML(a.url)}"${blank} rel="noopener">${escapeHTML(a.nombre)}</a>`;
          }).join("")}
        </div>
      </div>`;
  };

  montarCeldaTexto(el, "about", buildContent);

  // El archivo se siente oscuro por defecto: fija el tema destino en vez de
  // invertir el actual, como hacía el enlace que vivía en el borde del
  // portfolio. Delegado en la celda porque el contenido se repinta al cambiar
  // de idioma y un listener sobre el propio enlace se perdería.
  el.addEventListener("click", (e) => {
    if (e.target.closest(".contacto-archive")) {
      localStorage.setItem("meowrhino-theme", "dark");
    }
  });
}

/**
 * La celda `statement`: lo que pensamos. Un titular, una entrada y apartados
 * con titular (tu web es tuya, por qué lo hacemos, jardines digitales). Es el
 * texto que vivía dentro del about y lo hacía una página de treinta párrafos.
 * Comparte la caja y las clases del about: es el mismo tipo de página.
 */
export function renderStatement(data) {
  const el = document.querySelector(".celda.statement");
  if (!el || !data?.statement) return;

  const buildContent = (lang) => {
    const d = data.statement[lang] || data.statement.es;
    if (!d) return "";
    const secciones = (d.secciones || []).map(sec => `
      <section class="about-seccion">
        <h2 class="about-seccion-titular">${escapeHTML(sec.titular)}</h2>
        ${(sec.parrafos || []).map(parrafo).join("")}
      </section>`).join("");
    return `
      <h2 class="about-pregunta">${escapeHTML(d.titulo)}</h2>
      <div class="about-entrada">${(d.entrada || []).map(parrafo).join("")}</div>
      <div class="about-texto">${secciones}</div>`;
  };

  montarCeldaTexto(el, "about", buildContent);
}
