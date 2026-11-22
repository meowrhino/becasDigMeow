// ============================================
// PAGES — Renderizado de páginas de contenido
// ============================================
//
// Cada función renderiza una celda/página específica:
// Tools, Welcome, Statement, Metodología, Footer, Contacto.

import { currentLang, buildLangButtons, attachLangListeners, onLangChange } from "./data.js";
import { setupZoom } from "./zoom.js";
import { setupScrollGradients } from "./scroll-gradients.js";
// Las tarjetas que rebotan, apagadas con la portada nueva (PRUEBA): mientras no
// se pinten, su módulo y el del rebote no se piden. Vuelven igual que el cupón:
// este import con comillas dobles y su llamada en renderWelcome.
// import { renderWelcomeCard } from './welcome-card.js';
// Cupón desactivado de momento (recuperable para una promoción): descomentar
// este import (con comillas dobles) y la llamada en renderWelcome. Con comillas
// simples el build no lo ve como import y quita el modulepreload.
// import { renderWelcomeCupon } from './welcome-cupon.js';
import { repaintWithFade, escapeHTML, pintarLista, capturaAlPasar } from "./utils.js";
import { rutaProyectos, rutaCelda, slugify } from "./rutas.js";
import { escConEnlaces } from "./easy-template.js";
import { filaHTML, montarFila } from "./fila.js";

/** true si el viewport es táctil / móvil (mismo criterio que portfolio usa para hover/pointer). */
export const esMovil = window.matchMedia("(hover: none) and (pointer: coarse)").matches;

/**
 * Encabezado de sección de una celda: un <h2> real, oculto visualmente.
 *
 * El texto ya se ve en pantalla — es el zone label gigante del fondo — pero ese
 * vive en un <div> decorativo FUERA de la celda, así que ni un lector de
 * pantalla ni un buscador tenían forma de saber dónde empieza cada sección.
 * De las ocho celdas del lienzo, cinco no tenían ningún encabezado: links,
 * condiciones, portfolio y buscaminas. Esto se lo pone sin tocar el
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

/**
 * El emoji de un bloque de texto (about, metodología, statement, condiciones). El
 * bloque solo lo lleva apuntado (`data-emoji`); en la página hay uno solo, el
 * del bloque que pasa por el centro, y entra y sale con un fundido (manu,
 * 22 nov 2026). Sale repetido y pequeño, como pegatinas sueltas por el hueco
 * de la derecha que van saliendo y escondiéndose: en grande el emoji del
 * sistema se veía borroso. En móvil no sale (style.css, `.bloque-emoji`).
 */
// `e` es un emoji o una lista: las pegatinas del bloque los mezclan.
const emojiHTML = (e) => e?.length ? ` data-emoji="${escapeHTML([e].flat().join(" "))}"` : "";

/**
 * Una pegatina en la casilla `c` de una rejilla de 3×3 sobre el hueco de la
 * derecha: dentro de su casilla, sitio, tamaño y giro al azar. La rejilla solo
 * está para que no se amontonen.
 */
const pegatina = (emoji, c, retraso = 0) => {
  const x = ((c % 3) + 0.15 + Math.random() * 0.7) * 100 / 3;
  const y = (Math.floor(c / 3) + 0.15 + Math.random() * 0.7) * 100 / 3;
  const tam = Math.round(56 + Math.random() * 54);   // hasta 110 px: más grande, el emoji del sistema se emborrona
  const giro = Math.round(Math.random() * 44 - 22);
  return `<i data-c="${c}" style="left:${x}%;top:${y}%;font-size:${tam}px;rotate:${giro}deg;animation-delay:${retraso}ms">${emoji}</i>`;
};
const quieto = matchMedia("(prefers-reduced-motion: reduce)");

/** Pone el emoji de la celda y devuelve la función que lo vuelve a mirar. */
function emojiAlCentro(el, content) {
  const span = document.createElement("span");
  span.className = "bloque-emoji";
  span.setAttribute("aria-hidden", "true");
  el.appendChild(span);
  let actual = null, espera, emojis = [];
  // Mientras se lee un bloque, cada poco una pegatina se va y sale en otro sitio.
  setInterval(() => {
    if (!actual || quieto.matches || !el.classList.contains("activa")) return;
    const vieja = span.children[Math.floor(Math.random() * span.children.length)];
    if (!vieja || vieja.classList.contains("fuera")) return;
    vieja.classList.add("fuera");
    const otro = emojis[Math.floor(Math.random() * emojis.length)];
    setTimeout(() => vieja.outerHTML = pegatina(otro, +vieja.dataset.c), 300);
  }, 900);
  const mirar = () => {
    const r = content.getBoundingClientRect();
    const y = r.top + r.height / 2;
    // el último que toca el centro: en condiciones, el apartado antes que su sección
    const bloque = [...content.querySelectorAll("[data-emoji]")]
      .findLast(b => { const q = b.getBoundingClientRect(); return q.top <= y && q.bottom >= y; }) ?? null;
    if (bloque === actual) return;
    actual = bloque;
    const fundido = span.classList.contains("visible") ? 350 : 0;
    span.classList.remove("visible");
    clearTimeout(espera);
    if (!bloque) return;
    espera = setTimeout(() => {
      emojis = bloque.dataset.emoji.split(" ").map(escapeHTML);
      // Salen de una en una, en orden al azar, y los emojis del bloque por turnos: salen todos.
      const orden = [...Array(9).keys()].sort(() => Math.random() - 0.5);
      span.innerHTML = orden.map((c, n) => pegatina(emojis[n % emojis.length], c, n * 70)).join("");
      span.classList.add("visible");
    }, fundido);
  };
  content.addEventListener("scroll", mirar, { passive: true });
  window.addEventListener("resize", mirar);
  requestAnimationFrame(mirar);
  return mirar;
}

export const celdaHeadingHTML = (data, nombre, lang, clase = "celda-h") =>
  `<h2 class="${clase}">${escapeHTML(tituloCelda(data, nombre, lang))}</h2>`;

/** Escoge la variante de idioma (con fallback a es) de un objeto {es,en,cat}. */
const pick = (obj, lang) => (obj?.[lang] ?? obj?.es ?? "");

// --- Links ---

const COLS_LINKS = {
  es:  ["nombre", "descripción", "grupo"],
  en:  ["name", "description", "group"],
  cat: ["nom", "descripció", "grup"],
};

/**
 * Los links, en la misma lista que el portfolio: una fila por enlace con su
 * descripción (si la tiene) y su grupo, y se ordena al pulsar una columna.
 *
 * El orden de entrada es por PARA QUÉ SIRVE cada cosa: primero las
 * herramientas que le sirven a alguien hoy, luego lo demás.
 */
export function renderTools(data) {
  const el = document.querySelector(".celda.tools");
  if (!el || !data?.links) return;

  const l = data.links;
  const labels = l.labels || {};
  const grupo = (label, items = []) => items.map(i => ({ ...i, grupo: label }));
  // Las webs terminadas salen del portfolio, con su `sector` de descripción;
  // la que tiene dos direcciones (mokakopaTwins) da dos filas. Su captura es
  // la del portfolio; la de los demás enlaces, img/links/<slug>.webp.
  const webs = (data.portfolio?.proyectos || []).flatMap(p =>
    (p.urls || [{ nombre: p.nombre, url: p.url }]).map(u => ({ ...u, desc: p.sector, imagen: p.imagen })));
  const items = [
    ...grupo(labels.herramientas, l.herramientas),
    ...grupo(labels.experimentos, l.experimentos),
    ...grupo("wip", l.wip),   // se dice igual en los tres idiomas
    ...grupo(labels.formateadores, data.welcome?.formateadores),
    ...grupo(labels.webs, webs),
    ...grupo(labels.varios, l.varios),
  ];

  el.innerHTML = `
    <div class="scroll-wrapper tools-scroll-wrapper">
      <div class="scroll-content tools-content">
        ${celdaHeadingHTML(data, "links", currentLang, "about-pregunta")}
        <div class="plista plista-links"></div>
        <img class="plista-captura" alt="" decoding="async">
      </div>
    </div>
  `;

  const lista = el.querySelector(".plista");
  const pintar = pintarLista(lista, items, {
    campos: ["nombre", "desc", "grupo"],
    cols: (lang) => COLS_LINKS[lang] || COLS_LINKS.es,
    // Sin los asteriscos de énfasis de data.json: la fila entera es un enlace.
    texto: (i, campo, lang) => (typeof i[campo] === "string" ? i[campo] : pick(i[campo], lang)).replace(/\*/g, ""),
    href: (i) => i.url,
  });
  lista.querySelectorAll("a.plista-fila").forEach(a => {
    a.rel = "noopener";
    if (!esMovil) a.target = "_blank";
  });
  capturaAlPasar(lista, el.querySelector(".plista-captura"), items,
    (i) => `/${i.imagen || `img/links/${slugify(i.nombre)}.webp`}`);
  pintar(currentLang);
  onLangChange(pintar);

  setupScrollGradients(el.querySelector(".tools-scroll-wrapper"), el.querySelector(".tools-content"));
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
  // PRUEBA (21 nov 2026): la portada son las webs, grandes y en fila, en el
  // orden de proyectos.json, pasando de lado. La del centro se ve entera y la
  // de antes y la de después asoman, apagadas, así se ven venir. La fila no se
  // acaba (tras la última vuelve la primera), si nadie la toca avanza sola y,
  // al pasar el ratón, las webs se levantan como una ola.
  // El nombre y la frase pasan por encima en marquee.
  const proyectos = (data.portfolio?.proyectos || []).filter(p => p?.imagen && p?.nombre);
  // La fila (js/fila.js): tres copias; las de los lados son decorado para el
  // bucle (fuera del tabulador y del lector de pantalla).
  const web = (i, copia, primera) => {
    const p = proyectos[i];
    const slug = escapeHTML(slugify(p.nombre));
    const img = escapeHTML(p.imagen);
    // Con vídeo, va encima de la captura y aparece con un fundido cuando ya se mueve (fila.js decide
    // cuándo suena): Safari enseñaba un momento el vídeo sin pintar al pasar de la captura al vídeo.
    // El .mov (HEVC con transparencia) es para Safari, que pinta negro el fondo del webm; Chrome no lo entiende y salta al webm.
    const vid = (ext) => `/${img.replace(/[^/]+$/, `video.${ext}`)}`;
    const video = p.video ? `
            <video muted loop playsinline preload="none" aria-hidden="true">
              <source src="${vid("mov")}" type='video/quicktime; codecs="hvc1"'>
              <source src="${vid("webm")}" type="video/webm">
            </video>` : "";
    return `
          <a class="wp${primera ? " visible" : ""}" data-slug="${slug}" href="${escapeHTML(`${rutaProyectos(currentLang)}/${slugify(p.nombre)}`)}"${copia === 1 ? "" : ' aria-hidden="true" tabindex="-1"'}>
            <img src="/${img}" alt="${copia === 1 ? escapeHTML(p.nombre) : ""}"${primera ? "" : ' loading="lazy"'} decoding="async">${video}
          </a>`;
  };
  // Copias pares: la pista se desplaza justo la mitad y el bucle no se nota.
  const marquee = (texto, copias) => `<span class="marquee-pista">${
    Array.from({ length: copias }, (_, i) =>
      `<span${i ? ' aria-hidden="true"' : ""}>${escapeHTML(texto)}</span>`).join("")
  }</span>`;
  el.innerHTML = `
    <div class="welcome-content">
      <a class="welcome-title" href="${hrefAbout(currentLang)}">${marquee(w.titulo, 4)}</a>
      <a class="welcome-tagline" href="${hrefAbout(currentLang)}">${marquee(pick(w.tagline, currentLang), 8)}</a>
    </div>
    ${filaHTML(proyectos.length, web)}
    ${buildLangButtons()}
  `;

  montarFila(el.querySelector(".welcome-proyectos"), { activa: () => el.classList.contains("activa") });

  // El marquee sale de la celda y se cuelga del body, como la barra: lleva
  // `mix-blend-mode: difference`, que solo mezcla con lo que hay dentro de su
  // contexto de apilamiento, y la celda es uno. Dentro de ella no vería el
  // fondo de la página y saldría blanco sobre blanco.
  document.querySelector("body > .welcome-content")?.remove();
  const nombre = el.querySelector(".welcome-content");
  document.body.appendChild(nombre);
  const titleEl = nombre.querySelector(".welcome-title");
  const taglineEl = nombre.querySelector(".welcome-tagline");

  // i18n en sitio: reusa el mecanismo de attachLangListeners (mismo patrón
  // que el cupón, que registra el suyo aparte sobre la misma celda).
  attachLangListeners(el, (lang) => {
    titleEl.href = rutaCelda("about", lang);
    if (taglineEl) {
      taglineEl.querySelectorAll(".marquee-pista > span").forEach(s => { s.textContent = pick(w.tagline, lang); });
      taglineEl.href = rutaCelda("about", lang);
    }
    el.querySelectorAll(".wp").forEach(a => { a.href = `${rutaProyectos(lang)}/${a.dataset.slug}`; });
  });

  // renderWelcomeCupon(el, w.cupon);
  // PRUEBA: las tarjetas que rebotaban quedan apagadas mientras se prueba la portada nueva.
  // renderWelcomeCard(el, data.portfolio?.proyectos);
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
      <div class="metodologia-paso"${emojiHTML(paso.emoji)}>
        <span class="metodologia-num">${String(i + 1).padStart(2, "0")}</span>
        <p class="metodologia-titular">${escapeHTML(paso.titular)}</p>
        ${(paso.parrafos || []).map(t => `<p>${escapeHTML(t)}</p>`).join("")}
      </div>`).join("");

    // Los plazos, el dinero y lo que pasa si algo se para. Iba repartido entre
    // los pasos y convertía el segundo en una advertencia; aquí abajo es lo que
    // es: la información que necesitas para decidir, junta y sin tono de aviso.
    const imp = (data.metodologia[lang] || data.metodologia.es)?.importante;
    const importante = imp ? `
      <div class="metodologia-importante"${emojiHTML(imp.emoji)}>
        <h2 class="metodologia-importante-titular">${escapeHTML(imp.titular)}</h2>
        ${(imp.parrafos || []).map(t => `<p>${escapeHTML(t)}</p>`).join("")}
        ${imp.enlace ? `<a class="metodologia-enlace" href="${escapeHTML(rutaCelda("condiciones", lang))}">${escapeHTML(imp.enlace)}</a>` : ""}
      </div>` : "";

    // El nombre de la página, grande, como el título del about (manu, 21 nov 2026).
    return `<h2 class="about-pregunta">${escapeHTML(tituloCelda(data, "metodología", lang))}</h2>` + lista + importante;
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
  const mirarEmoji = emojiAlCentro(el, content);

  attachLangListeners(el, (lang) => {
    repaintWithFade(el, content,
      () => { content.innerHTML = buildContent(lang); },
      () => { applyScale(); requestAnimationFrame(checkScroll); requestAnimationFrame(mirarEmoji); }
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

  // Trabajo, privacidad y financiación van seguidas, cada una con su título.
  // Antes eran tres pestañas en el borde de abajo y había que saber que estaban.
  const buildSeccion = (s) => {

    let body = "";
    if (s.tipo === "texto") {
      // `parrafos` lleva markup a propósito (la sección de privacidad trae
      // <strong>/<a>/<em>); NO se escapa. El resto de campos es texto plano.
      // `apartados` es la de trabajo: diez condiciones, cada una con su título,
      // en vez de once párrafos seguidos.
      const parrafos = (ps) => (ps || []).map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
      body = s.apartados
        ? s.apartados.map(a => `<div class="footer-apartado"${emojiHTML(a.emoji)}><h3 class="footer-apartado-titular">${escapeHTML(a.titulo)}</h3>${parrafos(a.parrafos)}</div>`).join("")
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
    return `<div class="footer-seccion"${emojiHTML(s.emoji)}><h2 class="footer-seccion-titular">${escapeHTML(s.label)}</h2>${body}</div>`;
  };
  const buildContent = (lang) =>
    ((data.footer[lang] || data.footer.es)?.secciones || []).map(buildSeccion).join("");

  el.innerHTML = `
    ${celdaHeadingHTML(data, "condiciones", currentLang)}
    <div class="scroll-wrapper footer-scroll-wrapper">
      <div class="scroll-content footer-content">${buildContent(currentLang)}</div>
    </div>
    ${buildLangButtons()}
  `;

  const wrapper = el.querySelector(".footer-scroll-wrapper");
  const content = el.querySelector(".footer-content");
  const checkScroll = setupScrollGradients(wrapper, content);
  const applyScale = setupZoom(el, content, checkScroll);
  const mirarEmoji = emojiAlCentro(el, content);

  attachLangListeners(el, (lang) => {
    repaintWithFade(el, content,
      () => { content.innerHTML = buildContent(lang); },
      () => { content.scrollTop = 0; applyScale(); checkScroll(); mirarEmoji(); });
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
  const mirarEmoji = content.querySelector("[data-emoji]") ? emojiAlCentro(el, content) : () => {};
  attachLangListeners(el, (lang) => {
    repaintWithFade(el, content,
      () => { content.innerHTML = buildContent(lang); },
      () => { applyScale(); requestAnimationFrame(checkScroll); requestAnimationFrame(mirarEmoji); }
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

  const enlaces = (lang) => {
    const cta = (data.about[lang] || data.about.es)?.cta || {};
    const enlace = (celda, texto) => `<a href="${escapeHTML(rutaCelda(celda, lang))}">${escapeHTML(texto)}</a>`;
    return enlace("portfolio", cta.portfolio || "portfolio") + (cta.statement ? enlace("statement", cta.statement) : "");
  };

  const buildContent = (lang) => {
    const d = data.about[lang] || data.about.es;
    if (!d) return "";

    return `
      <h2 class="about-pregunta">${escapeHTML(d.pregunta)}</h2>
      <div class="about-entrada"${emojiHTML(d.emoji)}>${(d.entrada || []).map(parrafo).join("")}</div>
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
      </div>
      <p class="about-enlaces">${enlaces(lang)}</p>`;
  };

  montarCeldaTexto(el, "about", buildContent);

  // El archivo se siente oscuro por defecto: fija el tema destino en vez de
  // invertir el actual, como hacía el enlace que vivía en el borde del
  // portfolio. Delegado en la celda porque el contenido se repinta al cambiar
  // de idioma y un listener sobre el propio enlace se perdería.
  el.addEventListener("click", (e) => {
    if (e.target.closest(".contacto-archive")) {
      localStorage.setItem("meowrhino-theme", "dark");
      localStorage.removeItem("meowrhino-tinte");
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
      <section class="about-seccion"${emojiHTML(sec.emoji)}>
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

/**
 * La celda `reseña`: la página que se manda por whatsapp a un cliente para
 * pedirle una reseña en google. Dos párrafos (por qué, y qué contar) y el enlace al
 * formulario, sin nada a cambio (las normas de google lo prohíben). Comparte
 * la caja y las clases del about; el enlace va con el estilo del email grande.
 */
export function renderResena(data) {
  const el = document.querySelector(".celda.resena");
  const r = data?.["reseña"];
  if (!el || !r) return;

  const buildContent = (lang) => {
    const d = r[lang] || r.es;
    if (!d) return "";
    return `
      <h2 class="about-pregunta">${escapeHTML(d.titulo)}</h2>
      <div class="about-entrada">${(d.entrada || []).map(parrafo).join("")}</div>
      <div class="about-contacto">
        <a class="contacto-email" href="${escapeHTML(r.url)}" target="_blank" rel="noopener">${escapeHTML(d.boton)}</a>
      </div>
      ${d.nota ? `<p class="about-enlaces">${escConEnlaces(d.nota)}</p>` : ""}`;
  };

  montarCeldaTexto(el, "about", buildContent);
}
