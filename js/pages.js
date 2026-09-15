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
import { rutaProyectos, rutaCelda, slugify } from "./rutas.js";
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
 * Si el item trae `desc`, se le cuelga dentro un globo con el resumen de para
 * qué sirve, que sale al pasar por encima. Solo lo llevan las herramientas
 * sueltas: dentro de un desplegable el globo taparía la lista entera. Va
 * DENTRO del `<a>` para que el hover sea el del propio enlace, sin JS.
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
      <p class="welcome-title">${escapeHTML(w.titulo)}</p>
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

  const { email, instagram, linkedin, asunto, cv, archivo } = data.contacto || {};
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

    const cvHref = pick(cv, lang);
    // `escConEnlaces` y no `escapeHTML`: algunos párrafos citan su fuente con un
    // enlace en markdown (`[texto](url)`). El pre-render ya los pintaba; aquí
    // salían literales, con los corchetes y el paréntesis a la vista.
    const p = (t) => `<p>${escConEnlaces(t.replace("{precio}", precio))}</p>`;

    // La foto va SIN `loading="lazy"`: las celdas del lienzo viven todas apiladas
    // en el mismo hueco y el navegador nunca las da por visibles, así que una
    // imagen diferida se queda sin cargar aunque la tengas delante. En el
    // pre-render (easy-template.js), que es un documento normal, sí es lazy.
    //
    // El about pasó de ser un chorro de párrafos a tener apartados con titular:
    // quién está detrás, internet puede ser otra cosa, tu web es tuya. El
    // manifiesto y la persona dejaron de estar mezclados en el mismo bloque.
    const secciones = (d.secciones || []).map(sec => `
      <section class="about-seccion">
        <h2 class="about-seccion-titular">${escapeHTML(sec.titular)}</h2>
        ${(sec.parrafos || []).map(p).join("")}
        ${sec.imagen ? `<img class="about-foto" src="${escapeHTML(sec.imagen.src)}"
             alt="${escapeHTML(sec.imagen.alt || "")}" decoding="async">` : ""}
      </section>`).join("");

    // Ya no hay bloque de cierre. «cómo trabajamos» es un apartado más y lleva
    // su enlace a metodología dentro del texto; el precio vive en el cupón de
    // la portada. El about acaba en jardines digitales y de ahí al contacto.
    return `
      <h2 class="about-pregunta">${escapeHTML(d.pregunta)}</h2>
      <div class="about-entrada">${(d.entrada || []).map(p).join("")}</div>
      <div class="about-texto">${secciones}</div>
      <div class="about-contacto">
        <a class="contacto-email" href="${escapeHTML(buildMailto(lang))}">${escapeHTML(email)}</a>
        <div class="contacto-row">
          <a class="contacto-link" href="${escapeHTML(instagram.url)}"${esMovil ? "" : ' target="_blank"'} rel="noopener">${escapeHTML(instagram.usuario)}</a>
          ${linkedin ? `<a class="contacto-link" href="${escapeHTML(linkedin.url)}" target="_blank" rel="noopener">${escapeHTML(linkedin.usuario)}</a>` : ""}
          ${cvHref ? `<a class="contacto-link" href="/${escapeHTML(cvHref)}" target="_blank" rel="noopener">cv</a>` : ""}
        </div>
        ${(archivo || []).length ? `<div class="contacto-row">
          ${archivo.map(a => {
            // /archive es nuestro y se abre en la misma pestaña; neocities es
            // de fuera y se va a la suya.
            const externo = !a.url.startsWith("/");
            return `<a class="contacto-link${externo ? "" : " contacto-archive"}" href="${escapeHTML(a.url)}"${externo ? ' target="_blank" rel="noopener"' : ""}>${escapeHTML(a.nombre)}</a>`;
          }).join("")}
        </div>` : ""}
      </div>`;
  };

  el.innerHTML = `
    <div class="scroll-wrapper about-scroll-wrapper">
      <div class="scroll-content about-content">${buildContent(currentLang)}</div>
    </div>
    ${buildLangButtons()}
  `;

  const wrapper = el.querySelector(".about-scroll-wrapper");
  const content = el.querySelector(".about-content");
  const checkScroll = setupScrollGradients(wrapper, content);
  const applyScale = setupZoom(el, content, checkScroll);

  // El archivo se siente oscuro por defecto: fija el tema destino en vez de
  // invertir el actual, como hacía el enlace que vivía en el borde del
  // portfolio. Delegado en la celda porque el contenido se repinta al cambiar
  // de idioma y un listener sobre el propio enlace se perdería.
  el.addEventListener("click", (e) => {
    if (e.target.closest(".contacto-archive")) {
      localStorage.setItem("meowrhino-theme", "dark");
    }
  });

  attachLangListeners(el, (lang) => {
    repaintWithFade(el, content,
      () => { content.innerHTML = buildContent(lang); },
      () => { applyScale(); requestAnimationFrame(checkScroll); }
    );
  });
}
