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
import { renderWelcomeCupon } from "./welcome-cupon.js";
import { repaintWithFade, escapeHTML } from "./utils.js";
import { rutaProyectos, slugify } from "./rutas.js";

/** true si el viewport es táctil / móvil (mismo criterio que portfolio usa para hover/pointer). */
export const esMovil = window.matchMedia("(hover: none) and (pointer: coarse)").matches;

/** Escoge la variante de idioma (con fallback a es) de un objeto {es,en,cat}. */
const pick = (obj, lang) => (obj?.[lang] ?? obj?.es ?? "");

/**
 * Genera el HTML de un enlace tipo tarjeta.
 * @param {{ nombre: string, url: string }} item
 * @returns {string}
 */
function crearLinkHTML(item) {
  const target = esMovil ? "" : ' target="_blank"';
  return `<a class="tool-link" href="${escapeHTML(item.url)}"${target} rel="noopener">${escapeHTML(item.nombre)}</a>`;
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

  const linksHTML = herramientas.map(crearLinkHTML).join("");
  const dropdownsHTML = [
    crearDropdownHTML(pick(labels.experimentos, currentLang), experimentos, "dd_experimentos"),
    crearDropdownHTML("wip", wip, "dd_wip"),
    crearDropdownHTML(pick(labels.formateadores, currentLang), formateadores, "dd_formateadores"),
    crearDropdownHTML(pick(labels.webs, currentLang), websTerminadas, "dd_webs"),
    crearDropdownHTML(pick(labels.varios, currentLang), varios, "dd_varios"),
  ].join("");

  el.innerHTML = `
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
  onLangChange((lang) => {
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
  // El título no enlaza a ninguna parte: un wordmark significa «inicio» o no
  // significa nada, y usarlo de puerta a otra pantalla del mismo sitio era una
  // trampa — nadie pulsa el nombre de un estudio esperando eso. Y debajo
  // había un hint («navega con los botones de los lados») que explicaba la
  // interfaz en vez de enseñar trabajo, llamaba «botones» a unas etiquetas de
  // texto giradas, y era un <button> que nadie sabía que lo era. En su lugar,
  // más portfolio moviéndose: renderWelcomeCard pinta varias tarjetas.
  // El centro de la celda es lo primero que ve alguien que acaba de entrar:
  // el nombre del estudio y qué somos. Nada más. La letra pequeña del precio
  // estuvo aquí un rato y era demasiado concreta demasiado pronto — condiciones
  // de contrato a alguien que todavía no sabe si le interesamos. Se mudó al
  // dorso del cupón, junto a lo que incluye, que es donde alguien ya está
  // preguntando el precio.
  el.innerHTML = `
    <div class="welcome-content">
      <h1 class="welcome-title">${escapeHTML(w.titulo)}</h1>
      <p class="welcome-tagline">${escapeHTML(pick(w.tagline, currentLang))}</p>
    </div>
    ${buildLangButtons()}
  `;

  const taglineEl = el.querySelector(".welcome-tagline");

  // i18n en sitio: reusa el mecanismo de attachLangListeners (mismo patrón
  // que el cupón, que registra el suyo aparte sobre la misma celda).
  attachLangListeners(el, (lang) => {
    if (taglineEl) taglineEl.textContent = pick(w.tagline, lang);
  });

  renderWelcomeCupon(el, w.cupon);
  renderWelcomeCard(el, data.portfolio?.proyectos);
}

// --- Metodología ---

export function renderMetodologia(data) {
  const el = document.querySelector(".celda.metodologia");
  if (!el || !data?.metodologia) return;

  const buildContent = (lang) => {
    const d = data.metodologia[lang];
    if (!d) return "";
    return d.lineas.map(l => `<p>${escapeHTML(l)}</p>`).join("");
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
// Vista única con auto-rotación entre N secciones (data.footer[lang].secciones[]).
// Cada sección define su propio rotateMs. Nav inferior con botones (activo en bold).
// Hover sobre el contenido pausa la rotación; mouseleave la reanuda.

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

  // Estado: índice de sección activa (auto-rota entre las secciones)
  let activeIdx = 0;
  let sectionTimeout = null;

  const buildSeccion = (lang, idx) => {
    const s = data.footer[lang]?.secciones?.[idx];
    if (!s) return "";

    let body = "";
    if (s.tipo === "texto") {
      // `parrafos` lleva markup a propósito (la sección de privacidad trae
      // <strong>/<a>/<em>); NO se escapa. El resto de campos es texto plano.
      body = (s.parrafos || []).map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
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
    <div class="scroll-wrapper footer-scroll-wrapper">
      <div class="scroll-content footer-content">${buildSeccion(currentLang, activeIdx)}</div>
    </div>
    ${buildSectionNav(currentLang)}
    ${buildLangButtons()}
  `;

  const wrapper = el.querySelector(".footer-scroll-wrapper");
  const content = el.querySelector(".footer-content");
  const checkScroll = setupScrollGradients(wrapper, content);
  const applyScale = setupZoom(el, content, checkScroll);

  const stopSectionRotator = () => {
    if (sectionTimeout) {
      clearTimeout(sectionTimeout);
      sectionTimeout = null;
    }
  };

  const scheduleNext = () => {
    stopSectionRotator();
    const secciones = data.footer[currentLang]?.secciones || [];
    const ms = secciones[activeIdx]?.rotateMs;
    if (!ms || secciones.length < 2) return;
    sectionTimeout = setTimeout(() => {
      activeIdx = (activeIdx + 1) % secciones.length;
      repintar(currentLang);
    }, ms);
  };

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
    stopSectionRotator();
    const render = () => { content.innerHTML = buildSeccion(lang, activeIdx); };
    const after = () => {
      content.scrollTop = 0;
      applyScale();
      checkScroll();
      updateNavActive();
      scheduleNext();
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
    } else {
      scheduleNext();
    }
  });

  // Pause on hover sobre el contenido o el nav (mouseover burbujea)
  el.addEventListener("mouseover", (e) => {
    if (e.target.closest(".footer-content, .footer-section-nav")) {
      stopSectionRotator();
    }
  });
  el.addEventListener("mouseout", (e) => {
    const to = e.relatedTarget;
    if (!to || !to.closest?.(".footer-content, .footer-section-nav")) {
      scheduleNext();
    }
  });

  // Pause on touch / scroll: reanudar tras 3 s de inactividad
  const pauseAndResume = () => {
    stopSectionRotator();
    sectionTimeout = setTimeout(scheduleNext, 3000);
  };
  el.addEventListener("touchstart", (e) => {
    if (e.target.closest(".footer-content, .footer-section-nav")) {
      pauseAndResume();
    }
  }, { passive: true });
  wrapper.addEventListener("scroll", pauseAndResume, { passive: true });

  scheduleNext();

  attachLangListeners(el, (lang) => {
    repintarNav(lang);
    repintar(lang);
  });
}

// --- Contacto ---

/**
 * La celda `about`: quién es manu, por qué hace esto y cómo trabaja.
 *
 * Era la celda `contacto`, que tenía cuatro datos —email, instagram y el cv— y
 * como página propia no se sostenía. El contacto sigue aquí, al final, que es
 * donde se busca cuando ya has leído a quién estás escribiendo.
 *
 * El precio no se escribe en el texto: se lee del cupón de la portada, que es
 * la única fuente. En la copia va como `{precio}` y se sustituye aquí, para
 * que subirlo siga siendo cambiar un número en un sitio.
 */
/**
 * La celda `proyectos`: el índice de las 21 fichas, en lista.
 *
 * Al lado del portfolio y contando lo mismo de otra manera: el portfolio son
 * las capturas moviéndose y esta es la lista, que se lee de un vistazo y se
 * puede recorrer con el teclado. Hasta ahora ese índice era una página lineal
 * suelta (/proyectos) a la que no se llegaba desde el lienzo.
 */
export function renderProyectos(data) {
  const el = document.querySelector(".celda.proyectos");
  const proyectos = data?.portfolio?.proyectos || [];
  if (!el || !proyectos.length) return;

  const buildContent = (lang) => `
    <ol class="proyectos-lista">
      ${proyectos.map(p => `
        <li><a href="${escapeHTML(rutaProyectos(lang))}/${escapeHTML(slugify(p.nombre))}">${escapeHTML(p.nombre)}</a></li>`).join("")}
    </ol>`;

  el.innerHTML = `
    <div class="proyectos-content">${buildContent(currentLang)}</div>
    ${buildLangButtons()}
  `;

  const content = el.querySelector(".proyectos-content");
  const applyScale = setupZoom(el, content);

  attachLangListeners(el, (lang) => {
    repaintWithFade(el, content,
      () => { content.innerHTML = buildContent(lang); },
      applyScale
    );
  });
}

/**
 * La celda `about`: quién es manu, por qué hace esto y cómo trabaja.
 *
 * Era la celda `contacto`, que tenía cuatro datos —email, instagram y el cv— y
 * como página propia no se sostenía. El contacto sigue aquí, al final, que es
 * donde se busca cuando ya has leído a quién estás escribiendo.
 *
 * El precio no se escribe en el texto: se lee del cupón de la portada, que es
 * la única fuente. En la copia va como `{precio}` y se sustituye aquí, para
 * que subirlo siga siendo cambiar un número en un sitio.
 */
export function renderAbout(data) {
  const el = document.querySelector(".celda.about");
  if (!el || !data?.about) return;

  const { email, instagram, asunto, cv } = data.contacto || {};
  const precio = data.welcome?.cupon?.precio ?? "";

  const buildMailto = (lang) => {
    const subject = pick(asunto, lang);
    const params = new URLSearchParams();
    if (subject) params.set("subject", subject);
    return `mailto:${email}${params.toString() ? `?${params.toString()}` : ""}`;
  };

  const buildContent = (lang) => {
    const d = data.about[lang] || data.about.es;
    if (!d) return "";

    // Un párrafo que en data.json sea un array se pinta como lista: lo pide el
    // texto una sola vez (las tres entregas de "cómo trabajo") y no compensa
    // inventarse un campo aparte que habría que mantener en tres idiomas.
    const parrafo = (t) => Array.isArray(t)
      ? `<ol class="about-lista">${t.map(i => `<li>${escapeHTML(i)}</li>`).join("")}</ol>`
      : `<p>${escapeHTML(t.replace("{precio}", precio))}</p>`;

    const secciones = d.secciones.map(sec => `
      <section class="about-seccion">
        <h2 class="about-h">${escapeHTML(sec.titulo)}</h2>
        ${sec.parrafos.map(parrafo).join("")}
      </section>`).join("");

    // Las cinco frases del statement abren la página: dicen qué es el estudio
    // en una respiración, y todo lo que viene detrás las desarrolla. Estuvieron
    // un rato en la portada y ahí sobraban — la portada es el nombre y ya.
    const statement = (data.statement?.[lang] || data.statement?.es || {}).lineas || [];

    const cvHref = pick(cv, lang);
    return `
      <p class="about-pregunta">${escapeHTML(d.pregunta)}</p>
      <div class="about-statement">${statement.map(l => `<p>${escapeHTML(l)}</p>`).join("")}</div>
      ${secciones}
      <div class="about-contacto">
        <a class="contacto-email" href="${escapeHTML(buildMailto(lang))}">${escapeHTML(email)}</a>
        <div class="contacto-row">
          <a class="contacto-instagram" href="${escapeHTML(instagram.url)}"${esMovil ? "" : ' target="_blank"'} rel="noopener">${escapeHTML(instagram.usuario)}</a>
          ${cvHref ? `<a class="contacto-cv" href="/${escapeHTML(cvHref)}" target="_blank" rel="noopener">cv</a>` : ""}
        </div>
      </div>`;
  };

  el.innerHTML = `
    <div class="about-content">${buildContent(currentLang)}</div>
    ${buildLangButtons()}
  `;

  const content = el.querySelector(".about-content");
  const applyScale = setupZoom(el, content);

  attachLangListeners(el, (lang) => {
    repaintWithFade(el, content,
      () => { content.innerHTML = buildContent(lang); },
      applyScale
    );
  });
}
