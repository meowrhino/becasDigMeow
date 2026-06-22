// ============================================
// EASY MAIN — "modo fácil": misma data.json que el grid, en scroll lineal.
// ============================================
//
// Reutiliza la carga de datos, el sistema de idioma y el toggle de tema del
// sitio. El header es persistente; solo se re-renderiza el cuerpo al cambiar
// de idioma (así no se acumulan listeners ni se reconstruye el toggle).

import {
  cargarDatos, obtenerDatos, currentLang,
  buildLangButtons, attachLangListeners,
} from "./data.js";
import { crearThemeToggle } from "./theme.js";

const root = document.getElementById("easy");

const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

// Estos inits crean timers/observers globales y se rehacen en cada render por
// idioma; guardamos una función de limpieza para pararlos antes de re-crearlos
// (si no, el setInterval del autoplay seguiría vivo y se acumularían listeners).
let pfCleanup = null;
let stmtCleanup = null;

// --- Secciones (cuerpo) ---

// Titular de venta por idioma (el wordmark ya vive en el header).
const HERO = {
  es:  { eyebrow: "estudio de diseño web · barcelona", titular: "tu web en un mes, con código abierto y sin cuotas." },
  en:  { eyebrow: "web design studio · barcelona",     titular: "your website in a month — open source, no monthly fees." },
  cat: { eyebrow: "estudi de disseny web · barcelona", titular: "la teva web en un mes, amb codi obert i sense quotes." },
};

function heroHTML(data, lang) {
  const c = data.welcome.cupon;
  const t = c[lang] || c.es || {};
  const h = HERO[lang] || HERO.es;
  const subject = encodeURIComponent(t.subject || "");
  const mailto = `mailto:${c.email}?subject=${subject}`;
  return `
    <section class="easy-hero" id="top">
      <p class="easy-eyebrow">${esc(h.eyebrow)}</p>
      <h1 class="easy-hero-title">${esc(h.titular)}</h1>
      <div class="easy-ticket">
        <p class="easy-ticket-hazte">${esc(t.hazte)}</p>
        <p class="easy-ticket-precio">${esc(c.precio)}</p>
        ${t.iva ? `<p class="easy-ticket-iva">${esc(t.iva)}</p>` : ""}
        <p class="easy-ticket-caduca">${esc(t.caduca)}</p>
      </div>
      ${t.incluye ? `<p class="easy-hero-incluye">${esc(t.incluye)}</p>` : ""}
      <div class="easy-hero-cta">
        <a class="easy-btn" href="${mailto}">${esc(t.cta || "escríbeme")}</a>
        ${t.primera ? `<span class="easy-hero-primera">${esc(t.primera)}</span>` : ""}
      </div>
    </section>`;
}

// Portfolio: visor grande tipo carrusel (scroll-snap horizontal + flechas) con
// una rejilla de miniaturas debajo para saltar a un proyecto concreto. El
// nombre y el enlace "visitar" se actualizan según la imagen centrada (ver
// initPortfolio). Cada proyecto con url es un enlace; sin url, un div neutro.
function portfolioHTML(data) {
  const proyectos = data.portfolio?.proyectos || [];
  const slides = proyectos.map(p => {
    const href = p.url || p.urls?.[0]?.url || "";
    const open = href
      ? `<a class="easy-pf-slide" href="${esc(href)}" target="_blank" rel="noopener" data-name="${esc(p.nombre)}">`
      : `<div class="easy-pf-slide" data-name="${esc(p.nombre)}">`;
    const close = href ? "</a>" : "</div>";
    return `${open}<img src="${esc(p.imagen)}" alt="${esc(p.nombre)}" loading="lazy" decoding="async">${close}`;
  }).join("");
  const thumbs = proyectos.map((p, i) => `
    <button class="easy-pf-thumb" type="button" data-i="${i}" aria-label="${esc(p.nombre)}">
      <img src="${esc(p.imagen)}" alt="" loading="lazy" decoding="async">
    </button>`).join("");
  return `
    <section class="easy-section easy-portfolio" id="portfolio">
      <h2 class="easy-h">portfolio</h2>
      <div class="easy-pf">
        <div class="easy-pf-viewer">
          <button class="easy-pf-nav easy-pf-prev" type="button" aria-label="proyecto anterior">‹</button>
          <div class="easy-pf-stage" tabindex="0" role="group" aria-label="proyectos">${slides}</div>
          <button class="easy-pf-nav easy-pf-next" type="button" aria-label="proyecto siguiente">›</button>
        </div>
        <p class="easy-pf-caption">
          <span class="easy-pf-name"></span>
          <a class="easy-pf-visitar" target="_blank" rel="noopener" hidden>visitar ↗</a>
        </p>
        <div class="easy-pf-thumbs">${thumbs}</div>
      </div>
    </section>`;
}

// Cablea el carrusel del portfolio tras inyectar el HTML. Se re-llama en cada
// render (también al cambiar de idioma): por eso primero paramos el autoplay y
// los observers del render anterior (pfCleanup), o el setInterval seguiría vivo.
function initPortfolio() {
  if (pfCleanup) { pfCleanup(); pfCleanup = null; }
  const pf = root.querySelector(".easy-pf");
  if (!pf) return;
  const stage = pf.querySelector(".easy-pf-stage");
  const slides = [...stage.querySelectorAll(".easy-pf-slide")];
  const thumbs = [...pf.querySelectorAll(".easy-pf-thumb")];
  const nameEl = pf.querySelector(".easy-pf-name");
  const visitarEl = pf.querySelector(".easy-pf-visitar");
  const total = slides.length;
  if (!total) return;

  // Clon de la 1ª diapositiva al final: el autoplay "dobla la esquina" de la
  // última a la primera deslizando hacia el clon y luego salta sin animación a
  // la real → bucle infinito sin rebobinado visible.
  const clone = slides[0].cloneNode(true);
  clone.setAttribute("aria-hidden", "true");
  clone.tabIndex = -1;
  stage.appendChild(clone);

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let current = 0;
  let navigating = false;
  let navTimer, wrapTimer, autoTimer;

  const centerLeft = (el) => el.offsetLeft - (stage.clientWidth - el.clientWidth) / 2;
  const scrollToLeft = (left, smooth = true) => {
    stage.style.scrollBehavior = smooth ? "smooth" : "auto";
    stage.scrollTo({ left });
  };

  const setActive = (i) => {
    current = i;
    thumbs.forEach((t, j) => t.classList.toggle("is-active", j === i));
    const s = slides[i];
    nameEl.textContent = s.dataset.name || "";
    const url = s.getAttribute("href");
    if (url) { visitarEl.hidden = false; visitarEl.href = url; }
    else { visitarEl.hidden = true; }
  };

  // Durante la navegación por código silenciamos el observer para que no pelee.
  const armNav = (ms) => {
    navigating = true;
    clearTimeout(navTimer);
    navTimer = setTimeout(() => { navigating = false; }, ms);
  };

  const goTo = (i) => { setActive(i); armNav(700); scrollToLeft(centerLeft(slides[i])); };

  const goNext = () => {
    if (current >= total - 1) {
      armNav(950);
      scrollToLeft(centerLeft(clone));                 // desliza hacia el clon...
      clearTimeout(wrapTimer);
      wrapTimer = setTimeout(() => {                    // ...y salta a la real sin animar
        scrollToLeft(centerLeft(slides[0]), false);
        setActive(0);
      }, 650);
    } else {
      goTo(current + 1);
    }
  };
  const goPrev = () => { goTo(current <= 0 ? total - 1 : current - 1); };

  // Scroll manual: la diapositiva más centrada manda (ignorado al navegar).
  const ratios = new Map();
  const io = new IntersectionObserver((entries) => {
    if (navigating) return;
    entries.forEach(e => ratios.set(e.target, e.intersectionRatio));
    let best = -1, bi = current;
    slides.forEach((s, i) => { const r = ratios.get(s) || 0; if (r > best) { best = r; bi = i; } });
    if (bi !== current) setActive(bi);
  }, { root: stage, threshold: [0, 0.25, 0.5, 0.75, 1] });
  slides.forEach(s => io.observe(s));

  // Autoplay (salvo reduce-motion); pausa en hover, foco y pestaña oculta.
  const startAuto = () => { if (!reduce && !autoTimer) autoTimer = setInterval(goNext, 4500); };
  const stopAuto = () => { clearInterval(autoTimer); autoTimer = null; };
  const kickAuto = () => { stopAuto(); startAuto(); };   // reinicia el contador tras interacción
  const onVis = () => { if (document.hidden) stopAuto(); else startAuto(); };

  thumbs.forEach((t, i) => t.addEventListener("click", () => { goTo(i); kickAuto(); }));
  pf.querySelector(".easy-pf-prev").addEventListener("click", () => { goPrev(); kickAuto(); });
  pf.querySelector(".easy-pf-next").addEventListener("click", () => { goNext(); kickAuto(); });
  stage.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); goNext(); kickAuto(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); kickAuto(); }
  });
  pf.addEventListener("mouseenter", stopAuto);
  pf.addEventListener("mouseleave", startAuto);
  pf.addEventListener("focusin", stopAuto);
  pf.addEventListener("focusout", startAuto);
  document.addEventListener("visibilitychange", onVis);

  pfCleanup = () => {
    stopAuto();
    io.disconnect();
    document.removeEventListener("visibilitychange", onVis);
    clearTimeout(navTimer);
    clearTimeout(wrapTimer);
  };

  setActive(0);
  startAuto();
}

// Statement "karaoke": resalta la línea que cruza el centro de la pantalla.
// El rootMargin reduce la raíz a una línea horizontal en el centro del viewport,
// así solo intersecta la frase que está justo ahí. Progressive enhancement: sin
// JS las líneas se ven a opacidad plena; con reduce-motion no se atenúan.
function initStatement() {
  if (stmtCleanup) { stmtCleanup(); stmtCleanup = null; }
  const section = root.querySelector(".easy-statement");
  if (!section) return;
  const lines = [...section.querySelectorAll(".easy-statement-line")];
  if (!lines.length) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  section.classList.add("is-scrolly");
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) lines.forEach(l => l.classList.toggle("is-active", l === e.target));
    });
  }, { rootMargin: "-50% 0px -50% 0px", threshold: 0 });
  lines.forEach(l => io.observe(l));
  stmtCleanup = () => io.disconnect();
}

function metodologiaHTML(data, lang) {
  const lineas = (data.metodologia?.[lang] || data.metodologia?.es || {}).lineas || [];
  const pasos = lineas.map((l, i) => `
    <li class="easy-step">
      <span class="easy-step-num">${String(i + 1).padStart(2, "0")}</span>
      <p class="easy-step-text">${esc(l)}</p>
    </li>`).join("");
  return `
    <section class="easy-section" id="metodologia">
      <h2 class="easy-h">metodología</h2>
      <ol class="easy-steps">${pasos}</ol>
    </section>`;
}

function statementHTML(data, lang) {
  const lineas = (data.statement?.[lang] || data.statement?.es || {}).lineas || [];
  const ls = lineas.map(l => `<p class="easy-statement-line">${esc(l)}</p>`).join("");
  return `
    <section class="easy-section easy-statement" id="statement">
      <h2 class="easy-h">statement</h2>
      ${ls}
    </section>`;
}

function contactoHTML(data, lang) {
  const co = data.contacto || {};
  const asunto = encodeURIComponent(co.asunto?.[lang] || co.asunto?.es || "");
  const mailto = `mailto:${co.email}?subject=${asunto}`;
  const ig = co.instagram;
  const cv = co.cv?.[lang] || co.cv?.es;
  const cta = (data.welcome.cupon[lang] || data.welcome.cupon.es || {}).cta || "escríbeme";
  return `
    <section class="easy-section easy-contacto" id="contacto">
      <h2 class="easy-h">contacto</h2>
      <a class="easy-email" href="${mailto}">${esc(co.email)}</a>
      <div class="easy-contacto-cta">
        <a class="easy-btn" href="${mailto}">${esc(cta)}</a>
      </div>
      <div class="easy-contacto-links">
        ${ig ? `<a href="${esc(ig.url)}" target="_blank" rel="noopener">${esc(ig.usuario)}</a>` : ""}
        ${cv ? `<a href="${esc(cv)}" target="_blank" rel="noopener">cv</a>` : ""}
      </div>
    </section>`;
}

function footerHTML() {
  // Solo el wordmark, centrado. Enlaza al grid (única puerta de vuelta).
  return `
    <footer class="easy-footer">
      <a href="index.html">meowrhino.studio</a>
    </footer>`;
}

function renderBody(data, lang) {
  document.getElementById("easy-body").innerHTML =
    heroHTML(data, lang) +
    portfolioHTML(data) +
    metodologiaHTML(data, lang) +
    statementHTML(data, lang) +
    contactoHTML(data, lang) +
    footerHTML();
  initPortfolio();
  initStatement();
}

// --- Cabecera persistente + arranque ---

function construirHeader(data) {
  const header = document.createElement("header");
  header.className = "easy-header";
  header.innerHTML = `
    <div class="easy-header-id">
      <a class="easy-logo" href="#top">meowrhino studio</a>
      ${buildLangButtons()}
    </div>`;
  root.appendChild(header);

  // Toggle de tema a la derecha del bloque logo + idiomas.
  crearThemeToggle(header);

  const body = document.createElement("div");
  body.id = "easy-body";
  root.appendChild(body);

  // Un único listener: al cambiar idioma, re-renderiza solo el cuerpo.
  attachLangListeners(header, (lang) => renderBody(data, lang));
}

async function init() {
  await cargarDatos();
  const data = obtenerDatos();
  if (!data) {
    root.innerHTML = `
      <div style="max-width:38rem;margin:12vh auto;padding:0 1.5rem;text-align:center;line-height:1.6;">
        <h1>meowrhino studio</h1>
        <p>No se ha podido cargar el contenido. Recarga la página o escríbeme a
           <a href="mailto:hola@meowrhino.studio">hola@meowrhino.studio</a>.</p>
      </div>`;
    return;
  }
  construirHeader(data);
  renderBody(data, currentLang);

  // Deep-link a una sección (#contacto, etc.): como el cuerpo se pinta por JS,
  // el scroll por hash del navegador llega antes de que exista el destino. Lo
  // repetimos una vez maquetado.
  if (location.hash) {
    const target = document.querySelector(location.hash);
    if (target) requestAnimationFrame(() => target.scrollIntoView());
  }
}

init();
