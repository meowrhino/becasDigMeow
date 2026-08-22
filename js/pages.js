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
  const tools         = data.links.tools || [];
  const wip           = data.links.wip || [];
  const varios        = data.links.varios || [];
  const formateadores = data.welcome?.formateadores || [];
  const websTerminadas = (data.portfolio?.proyectos || []).map(p =>
    p.urls ? { urls: p.urls } : { nombre: p.nombre, url: p.url }
  );

  // "tools" y "WIP" son términos ya usados igual en los tres idiomas (como el
  // resto de nombres de celda); "formateadores", "webs terminadas" y "varios"
  // sí varían y viven en data.json (links.labels) con el patrón {es,en,cat}.
  const labels = data.links.labels || {};

  const linksHTML = herramientas.map(crearLinkHTML).join("");
  const dropdownsHTML = [
    crearDropdownHTML("tools", tools, "dd_tools"),
    crearDropdownHTML("WIP", wip, "dd_wip"),
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
  const formateadoresLabelEl = el.querySelector('[data-target="dd_formateadores"] .tools-dropdown-label');
  const websLabelEl = el.querySelector('[data-target="dd_webs"] .tools-dropdown-label');
  const variosLabelEl = el.querySelector('[data-target="dd_varios"] .tools-dropdown-label');
  onLangChange((lang) => {
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

  // El título es link al modo fácil; el cupón va detrás (posicionado absoluto).
  // Los lang-btn quedan sobre el cupón (z-index mayor) y `renderWelcomeCupon`
  // engancha los listeners al recorrer los .lang-btn dentro de la celda.
  // Bajo el título: tagline y, debajo, el hint de navegación (fijo) que indica
  // que se navega con los enlaces de los bordes.
  el.innerHTML = `
    <div class="welcome-content">
      <h1 class="welcome-title"><a href="easy.html" class="welcome-title-link" aria-label="${escapeHTML(w.titulo)} — versión en una página">${escapeHTML(w.titulo)}</a></h1>
      <p class="welcome-tagline">${escapeHTML(pick(w.tagline, currentLang))}</p>
      <button type="button" class="welcome-hint">
        <span class="welcome-hint-txt">${escapeHTML(pick(w.hint, currentLang))}</span>
      </button>
    </div>
    ${buildLangButtons()}
  `;

  const taglineEl = el.querySelector(".welcome-tagline");
  const hintTxtEl = el.querySelector(".welcome-hint-txt");

  // i18n en sitio: reusa el mecanismo de attachLangListeners (mismo patrón
  // que el cupón, que registra el suyo aparte sobre la misma celda).
  attachLangListeners(el, (lang) => {
    if (taglineEl) taglineEl.textContent = pick(w.tagline, lang);
    if (hintTxtEl) hintTxtEl.textContent = pick(w.hint, lang);
  });

  // Al pulsar el hint, los nav-labels de los bordes parpadean para señalar por
  // dónde se navega (todos los lados con destino, no solo izq/der). Leemos el
  // DOM en el momento del click: los nav-labels los crea navigation.js en cada
  // actualizarVista, así que ya existen para cuando el usuario pulsa.
  const hintBtn = el.querySelector(".welcome-hint");
  if (hintBtn) {
    hintBtn.addEventListener("click", () => {
      document.querySelectorAll(".celda.activa .nav-label").forEach(label => {
        label.classList.remove("nav-label--destacado");
        void label.offsetWidth;            // reinicia la animación si ya estaba activa
        label.classList.add("nav-label--destacado");
        label.addEventListener("animationend",
          () => label.classList.remove("nav-label--destacado"), { once: true });
      });
    });
  }

  renderWelcomeCupon(el, w.cupon);
  renderWelcomeCard(el, data.portfolio?.proyectos);
}

// --- Statement ---

export function renderStatement(data) {
  const el = document.querySelector(".celda.statement");
  if (!el || !data?.statement) return;

  const buildContent = (lang) => {
    const d = data.statement[lang];
    if (!d) return "";
    return d.lineas.map(l => `<p>${escapeHTML(l)}</p>`).join("");
  };

  el.innerHTML = `
    <div class="statement-content">${buildContent(currentLang)}</div>
    ${buildLangButtons()}
  `;

  const content = el.querySelector(".statement-content");
  const applyScale = setupZoom(el, content);

  attachLangListeners(el, (lang) => {
    repaintWithFade(el, content,
      () => { content.innerHTML = buildContent(lang); },
      applyScale
    );
  });
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

export function renderFooter(data) {
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
            `<img src="img/LOGOS/${tone}/${escapeHTML(l.name)}.webp" alt="${escapeHTML(l.alt || '')}" class="footer-logo" data-logo-name="${escapeHTML(l.name)}" ${logoAttrs}>`
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

export function renderContacto(data) {
  const el = document.querySelector(".celda.contacto");
  if (!el || !data?.contacto) return;

  const { email, instagram, asunto, cv } = data.contacto;

  // asunto y cv pueden ser string (legacy) o objeto por idioma
  const pickLang = (val, lang) => {
    if (val == null) return "";
    if (typeof val === "string") return val;
    return val[lang] || val.es || "";
  };

  const buildMailto = (lang) => {
    const subject = pickLang(asunto, lang);
    const params = new URLSearchParams();
    if (subject) params.set("subject", subject);
    return `mailto:${email}${params.toString() ? `?${params.toString()}` : ""}`;
  };

  const cvHrefInicial = pickLang(cv, currentLang);
  const cvHtml = cvHrefInicial
    ? `<a class="contacto-cv" href="${escapeHTML(cvHrefInicial)}" target="_blank" rel="noopener">CV</a>`
    : "";

  el.innerHTML = `
    <div class="contacto-content">
      <a class="contacto-email" href="${escapeHTML(buildMailto(currentLang))}">${escapeHTML(email)}</a>
      <div class="contacto-row">
        <a class="contacto-instagram" href="${escapeHTML(instagram.url)}"${esMovil ? "" : ' target="_blank"'} rel="noopener">${escapeHTML(instagram.usuario)}</a>
        ${cvHtml}
      </div>
    </div>
    ${buildLangButtons()}
  `;

  const emailEl = el.querySelector(".contacto-email");
  const cvEl = el.querySelector(".contacto-cv");

  attachLangListeners(el, (lang) => {
    if (emailEl) emailEl.href = buildMailto(lang);
    if (cvEl) cvEl.href = pickLang(cv, lang);
  });
}
