// ============================================
// PAGES — Renderizado de páginas de contenido
// ============================================
//
// Cada función renderiza una celda/página específica:
// Tools, Welcome, Statement, Metodología, Políticas, Contacto.

import { currentLang, buildLangButtons, attachLangListeners } from "./data.js";
import { setupZoom } from "./zoom.js";
import { setupScrollGradients } from "./scroll-gradients.js";

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
  if (!el || !data) return;

  el.innerHTML = `
    <div class="welcome-content">
      <h1 class="welcome-title">${data.welcome.titulo}</h1>
    </div>
  `;
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

export function renderPoliticas(data) {
  const el = document.querySelector(".celda.politicas");
  if (!el || !data?.politicas) return;

  const buildContent = (lang) => {
    const d = data.politicas[lang];
    if (!d) return "";
    const html = d.parrafos.map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
    const nota = d.nota ? `<p class="politicas-nota">${d.nota}</p>` : "";
    return html + nota;
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

  attachLangListeners(el, (lang) => {
    const isActive = el.classList.contains("activa");
    if (isActive) {
      content.style.opacity = "0";
      setTimeout(() => {
        content.innerHTML = buildContent(lang);
        content.scrollTop = 0;
        applyScale();
        checkScroll();
        content.style.opacity = "1";
      }, 250);
    } else {
      content.innerHTML = buildContent(lang);
      content.scrollTop = 0;
      applyScale();
      checkScroll();
    }
  });
}

// --- Contacto ---

export function renderContacto(data) {
  const el = document.querySelector(".celda.contacto");
  if (!el || !data?.contacto) return;

  const { email, instagram, asunto, cuerpo } = data.contacto;
  const params = new URLSearchParams();
  if (asunto) params.set("subject", asunto);
  if (cuerpo) params.set("body", cuerpo);
  const mailtoHref = `mailto:${email}${params.toString() ? `?${params.toString()}` : ""}`;

  const cvHtml = data.contacto.cv
    ? `<a class="contacto-cv" href="${data.contacto.cv}" target="_blank" rel="noopener">CV</a>`
    : "";

  el.innerHTML = `
    <div class="contacto-content">
      <a class="contacto-email" href="${mailtoHref}">${email}</a>
      <div class="contacto-row">
        <a class="contacto-instagram" href="${instagram.url}"${esMovil ? "" : ' target="_blank"'} rel="noopener">${instagram.usuario}</a>
        ${cvHtml}
      </div>
    </div>
  `;
}
