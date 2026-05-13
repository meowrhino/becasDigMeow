// ============================================
// PAGES — Renderizado de páginas de contenido
// ============================================
//
// Cada función renderiza una celda/página específica:
// Tools, Welcome, Statement, Metodología, Footer, Contacto.

import { currentLang, buildLangButtons, attachLangListeners } from "./data.js";
import { setupZoom } from "./zoom.js";
import { setupScrollGradients } from "./scroll-gradients.js";
import { renderWelcomeCupon } from "./welcome-cupon.js";
import { repaintWithFade } from "./utils.js";

/** true si el viewport es táctil / móvil. */
export const esMovil = "ontouchstart" in window || navigator.maxTouchPoints > 0;

/**
 * Genera el HTML de un enlace tipo tarjeta.
 * @param {{ nombre: string, url: string, wip?: boolean }} item
 * @returns {string}
 */
function crearLinkHTML(item) {
  const target = esMovil ? "" : ' target="_blank"';
  const wipBadge = item.wip ? '<sup class="tool-wip">WIP</sup>' : '';
  const wipClass = item.wip ? ' is-wip' : '';
  return `<a class="tool-link${wipClass}" href="${item.url}"${target} rel="noopener">${item.nombre}${wipBadge}</a>`;
}

/**
 * Genera el HTML de un grupo desplegable (dropdown).
 * @param {string} titulo
 * @param {{ nombre: string, url: string }[]} items
 * @param {string} uid
 * @returns {string}
 */
function crearDualLinkHTML(item) {
  const target = esMovil ? "" : ' target="_blank"';
  return `<div class="tool-link-dual">${item.urls.map(u =>
    `<a class="tool-link" href="${u.url}"${target} rel="noopener">${u.nombre}</a>`
  ).join("")}</div>`;
}

function crearDropdownHTML(titulo, items, uid) {
  const linksHTML = items.map(i => i.urls ? crearDualLinkHTML(i) : crearLinkHTML(i)).join("");
  return `
    <div class="tools-dropdown-group">
      <button class="tools-dropdown-btn" data-target="${uid}" aria-expanded="false">
        ${titulo}
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
  if (!el || !data?.tools) return;

  const herramientas  = data.tools.herramientas || [];
  const conversores   = data.tools.conversores || [];
  const formateadores = data.welcome?.formateadores || [];
  const websTerminadas = (data.portfolio?.proyectos || []).map(p =>
    p.urls ? { urls: p.urls } : { nombre: p.nombre, url: p.url }
  );

  const linksHTML = herramientas.map(crearLinkHTML).join("");
  const dropdownsHTML = [
    crearDropdownHTML("conversores", conversores, "dd_conversores"),
    crearDropdownHTML("formateadores", formateadores, "dd_formateadores"),
    crearDropdownHTML("webs terminadas", websTerminadas, "dd_webs"),
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
}

// --- Welcome ---

export function renderWelcome(data) {
  const el = document.querySelector(".celda.welcome");
  if (!el || !data?.welcome) return;

  // El título siempre se pinta; el cupón va detrás (posicionado absoluto).
  // Los lang-btn quedan sobre el cupón (z-index mayor) y `renderWelcomeCupon`
  // engancha los listeners al recorrer los .lang-btn dentro de la celda.
  el.innerHTML = `
    <div class="welcome-content">
      <h1 class="welcome-title">${data.welcome.titulo}</h1>
    </div>
    ${buildLangButtons()}
  `;

  renderWelcomeCupon(el, data.welcome.cupon);
}

// --- Statement ---

export function renderStatement(data) {
  const el = document.querySelector(".celda.statement");
  if (!el || !data?.statement) return;

  const buildContent = (lang) => {
    const d = data.statement[lang];
    if (!d) return "";
    return d.lineas.map(l => `<p>${l}</p>`).join("");
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
    return d.lineas.map(l => `<p>${l}</p>`).join("");
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
      body = (s.parrafos || []).map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
      if (s.nota) body += `<p class="footer-nota">${s.nota}</p>`;
    } else if (s.tipo === "subvencion") {
      const intro = s.intro ? `<p>${s.intro}</p>` : "";
      const logoAttrs = `loading="lazy" decoding="async"`;
      const tone = document.documentElement.getAttribute("data-theme") === "dark" ? "BLANCO" : "NEGRO";
      const logos = (s.logos || []).length
        ? `<div class="footer-logos">${s.logos.map(l =>
            `<img src="img/LOGOS/${tone}/${l.name}.webp" alt="${l.alt || ''}" class="footer-logo" data-logo-name="${l.name}" ${logoAttrs}>`
          ).join("")}</div>`
        : "";
      const frase = s.frase ? `<p class="footer-frase">${s.frase}</p>` : "";
      body = intro + logos + frase;
    }
    return `<div class="footer-seccion">${body}</div>`;
  };

  const buildSectionNav = (lang) => {
    const secciones = data.footer[lang]?.secciones || [];
    if (secciones.length < 2) return "";
    return `<div class="footer-section-nav">${secciones.map((s, i) =>
      `<button type="button" class="footer-section-tab${i === activeIdx ? ' is-active' : ''}" data-idx="${i}">${s.label}</button>`
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

  const { email, instagram, asunto, cuerpo, cv } = data.contacto;

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
    if (cuerpo) params.set("body", pickLang(cuerpo, lang));
    return `mailto:${email}${params.toString() ? `?${params.toString()}` : ""}`;
  };

  const cvHrefInicial = pickLang(cv, currentLang);
  const cvHtml = cvHrefInicial
    ? `<a class="contacto-cv" href="${cvHrefInicial}" target="_blank" rel="noopener">CV</a>`
    : "";

  el.innerHTML = `
    <div class="contacto-content">
      <a class="contacto-email" href="${buildMailto(currentLang)}">${email}</a>
      <div class="contacto-row">
        <a class="contacto-instagram" href="${instagram.url}"${esMovil ? "" : ' target="_blank"'} rel="noopener">${instagram.usuario}</a>
        ${cvHtml}
      </div>
    </div>
  `;

  const emailEl = el.querySelector(".contacto-email");
  const cvEl = el.querySelector(".contacto-cv");

  attachLangListeners(el, (lang) => {
    if (emailEl) emailEl.href = buildMailto(lang);
    if (cvEl) cvEl.href = pickLang(cv, lang);
  });
}
