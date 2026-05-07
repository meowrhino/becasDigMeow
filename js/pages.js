// ============================================
// PAGES — Renderizado de páginas de contenido
// ============================================
//
// Cada función renderiza una celda/página específica:
// Tools, Welcome, Statement, Metodología, Políticas, Contacto.

import { currentLang, buildLangButtons, attachLangListeners } from "./data.js";
import { setupZoom } from "./zoom.js";
import { setupScrollGradients } from "./scroll-gradients.js";
import { renderWelcomeCupon } from "./welcome-cupon.js";

/** true si el viewport es táctil / móvil. */
export const esMovil = "ontouchstart" in window || navigator.maxTouchPoints > 0;

/**
 * Genera el HTML de un enlace tipo tarjeta.
 * @param {{ nombre: string, url: string }} item
 * @returns {string}
 */
function crearLinkHTML(item) {
  const target = esMovil ? "" : ' target="_blank"';
  return `<a class="tool-link" href="${item.url}"${target} rel="noopener">${item.nombre}</a>`;
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
      <button class="tools-dropdown-btn" data-target="${uid}">
        ${titulo}
        <svg class="tools-dropdown-icon" viewBox="0 0 16 16" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round">
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
    <div class="tools-scroll-wrapper">
      <div class="tools-content">
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
      el.querySelectorAll(".tools-dropdown-btn.active").forEach(b => b.classList.remove("active"));
      target.classList.toggle("open", willOpen);
      btn.classList.toggle("active", willOpen);
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
    const isActive = el.classList.contains("activa");
    if (isActive) {
      content.style.opacity = "0";
      setTimeout(() => {
        content.innerHTML = buildContent(lang);
        applyScale();
        content.style.opacity = "1";
      }, 250);
    } else {
      content.innerHTML = buildContent(lang);
      applyScale();
    }
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
    <div class="metodologia-scroll-wrapper">
      <div class="metodologia-content">${buildContent(currentLang)}</div>
    </div>
    ${buildLangButtons()}
  `;

  const wrapper = el.querySelector(".metodologia-scroll-wrapper");
  const content = el.querySelector(".metodologia-content");
  const checkScroll = setupScrollGradients(wrapper, content);
  const applyScale = setupZoom(el, content, checkScroll);

  attachLangListeners(el, (lang) => {
    const isActive = el.classList.contains("activa");
    if (isActive) {
      content.style.opacity = "0";
      setTimeout(() => {
        content.innerHTML = buildContent(lang);
        applyScale();
        content.style.opacity = "1";
        requestAnimationFrame(checkScroll);
      }, 250);
    } else {
      content.innerHTML = buildContent(lang);
      applyScale();
      requestAnimationFrame(checkScroll);
    }
  });
}

// --- Políticas ---
//
// Hub con N secciones (data.politicas[lang].secciones[]).
// Vista inicial: lista de botones (uno por sección).
// Click en botón → vista de la sección + botón "← volver".
// Click en volver → regresa al hub. El idioma actualiza ambas vistas.

export function renderPoliticas(data) {
  const el = document.querySelector(".celda.politicas");
  if (!el || !data?.politicas) return;

  // Estado: índice de sección activa, o null = hub
  let activeIdx = null;

  // Estado del carrusel de logos (sección "subvencion")
  const LOGO_ROTATION_MS = 5000;
  let logoIdx = 0;
  let logoInterval = null;

  const buildHub = (lang) => {
    const d = data.politicas[lang];
    const secciones = d?.secciones || [];
    return `
      <div class="politicas-hub">
        ${secciones.map((s, i) => `
          <button type="button" class="politicas-hub-btn" data-idx="${i}">${s.label}</button>
        `).join("")}
      </div>
    `;
  };

  const buildSeccion = (lang, idx) => {
    const d = data.politicas[lang];
    const s = d?.secciones?.[idx];
    if (!s) return "";

    let body = "";
    if (s.tipo === "texto") {
      body = (s.parrafos || []).map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
      if (s.nota) body += `<p class="politicas-nota">${s.nota}</p>`;
    } else if (s.tipo === "subvencion") {
      const intro = s.intro ? `<p>${s.intro}</p>` : "";
      const logosArr = s.logos || [];
      const logos = logosArr.length
        ? `<div class="politicas-logos politicas-logos--carrusel">
             ${logosArr.map((l, i) => `
               <div class="politicas-logo-slide${i === 0 ? ' is-active' : ''}" data-idx="${i}">
                 <img src="img/LOGOS/NEGRO/${l.name}.png" alt="${l.alt || ''}" class="politicas-logo politicas-logo--light">
                 <img src="img/LOGOS/BLANCO/${l.name}.png" alt="${l.alt || ''}" class="politicas-logo politicas-logo--dark">
               </div>
             `).join("")}
           </div>
           <div class="politicas-logos-nav">
             ${logosArr.map((l, i) => `
               <button type="button" class="politicas-logo-tab${i === 0 ? ' is-active' : ''}" data-idx="${i}">${l.tab || l.name}</button>
             `).join("")}
           </div>`
        : "";
      const frase = s.frase ? `<p class="politicas-frase">${s.frase}</p>` : "";
      body = intro + logos + frase;
    }

    return `
      <button type="button" class="politicas-back" aria-label="volver">← volver</button>
      <div class="politicas-seccion">${body}</div>
    `;
  };

  const buildContent = (lang) => {
    return activeIdx === null ? buildHub(lang) : buildSeccion(lang, activeIdx);
  };

  el.innerHTML = `
    <div class="politicas-scroll-wrapper">
      <div class="politicas-content">${buildContent(currentLang)}</div>
    </div>
    ${buildLangButtons()}
  `;

  const wrapper = el.querySelector(".politicas-scroll-wrapper");
  const content = el.querySelector(".politicas-content");
  const checkScroll = setupScrollGradients(wrapper, content);
  const applyScale = setupZoom(el, content, checkScroll);

  const stopLogoCarrusel = () => {
    if (logoInterval) {
      clearInterval(logoInterval);
      logoInterval = null;
    }
  };

  const setLogoActive = (idx) => {
    const slides = content.querySelectorAll(".politicas-logo-slide");
    const tabs = content.querySelectorAll(".politicas-logo-tab");
    if (!slides.length) return;
    logoIdx = ((idx % slides.length) + slides.length) % slides.length;
    slides.forEach((s, i) => s.classList.toggle("is-active", i === logoIdx));
    tabs.forEach((t, i) => t.classList.toggle("is-active", i === logoIdx));
  };

  const startLogoCarrusel = () => {
    stopLogoCarrusel();
    const slides = content.querySelectorAll(".politicas-logo-slide");
    if (slides.length < 2) return;
    logoInterval = setInterval(() => setLogoActive(logoIdx + 1), LOGO_ROTATION_MS);
  };

  const setupLogoHoverPause = () => {
    const carrusel = content.querySelector(".politicas-logos--carrusel");
    const nav = content.querySelector(".politicas-logos-nav");
    [carrusel, nav].forEach(node => {
      if (!node) return;
      node.addEventListener("mouseenter", stopLogoCarrusel);
      node.addEventListener("mouseleave", startLogoCarrusel);
    });
  };

  // Re-pinta y re-engancha listeners. Usamos delegación para no perder
  // los handlers cuando el innerHTML se reemplaza.
  const repintar = (lang, withFade = true) => {
    stopLogoCarrusel();
    logoIdx = 0;
    const afterRender = () => {
      content.scrollTop = 0;
      applyScale();
      checkScroll();
      setupLogoHoverPause();
      startLogoCarrusel();
    };
    if (withFade && el.classList.contains("activa")) {
      content.style.opacity = "0";
      setTimeout(() => {
        content.innerHTML = buildContent(lang);
        afterRender();
        content.style.opacity = "1";
      }, 250);
    } else {
      content.innerHTML = buildContent(lang);
      afterRender();
    }
  };

  // Delegación de clicks (hub-btn, back, logo-tab)
  content.addEventListener("click", (e) => {
    const hubBtn = e.target.closest(".politicas-hub-btn");
    if (hubBtn) {
      activeIdx = parseInt(hubBtn.dataset.idx, 10);
      repintar(currentLang);
      return;
    }
    const backBtn = e.target.closest(".politicas-back");
    if (backBtn) {
      activeIdx = null;
      repintar(currentLang);
      return;
    }
    const tabBtn = e.target.closest(".politicas-logo-tab");
    if (tabBtn) {
      stopLogoCarrusel();
      setLogoActive(parseInt(tabBtn.dataset.idx, 10));
      startLogoCarrusel();
    }
  });

  setupLogoHoverPause();
  startLogoCarrusel();

  attachLangListeners(el, (lang) => repintar(lang));
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
