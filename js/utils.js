// ============================================
// UTILS — Helpers compartidos
// ============================================

/**
 * Escapa los caracteres con significado en HTML para que un string de texto
 * plano se pinte tal cual (sin interpretarse como markup) al interpolarlo en
 * un template de innerHTML o en el HTML del build (easy-template.js lo usa
 * como `esc`). Cubre también el contexto de atributo entre comillas dobles: al
 * escapar `"` no se puede romper un `href="…"`/`src="…"`. Los atributos van
 * siempre entre comillas dobles: el apóstrofo no se escapa.
 *
 * Uso: SOLO sobre valores de data.json que sean texto plano (títulos, nombres,
 * urls, labels…). NO usarlo sobre campos que llevan markup a propósito, como
 * `footer.*.secciones[].parrafos` (traen <strong>/<a>/<em>): escaparlos los
 * rompería. La meta es defensiva: que un futuro editor de data.json no pueda
 * inyectar un <script> por accidente en un campo de texto plano.
 *
 * @param {*} str
 * @returns {string}
 */
export function escapeHTML(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Fetch JSON con captura de error y log. Devuelve null si falla.
 *
 * El chequeo de `res.ok` es importante: sin él, un 404 intenta parsear la
 * página de error como JSON y el fallo llega como un SyntaxError críptico
 * en vez de decir claramente qué pasó.
 *
 * @param {string} url
 * @returns {Promise<Object|null>}
 */
export async function fetchJson(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`Error cargando ${url}:`, err);
    return null;
  }
}

/**
 * Una lista en columnas, una fila-enlace por cosa, que se ordena al pulsar una
 * cabecera. La usan el portfolio y los links (estilos .plista en style.css).
 *
 * @param {HTMLElement} lista
 * @param {Object[]} items  — cada fila guarda el suyo en `fila.item`
 * @param {Object} o
 * @param {string[]} o.campos                             — una columna por campo
 * @param {(lang: string) => string[]} o.cols             — los títulos de las columnas
 * @param {(item, campo, lang) => string} o.texto         — el texto de una casilla
 * @param {(item, lang) => string} o.href                 — a dónde lleva la fila
 * @returns {(lang: string) => void} pone textos y enlaces en un idioma; hay que
 *   llamarla una vez al crear y otra en cada cambio de idioma
 */
/**
 * Al pasar por una fila aparece su captura, grande y cada vez en un sitio:
 * cada fila tiene el suyo, siempre el mismo, sacado de su posición en `items`
 * (--dx, --dy, --giro; style.css decide cuánto se mueve en cada página). Es
 * decorativa (alt vacío): el nombre ya está en la fila. En móvil no sale.
 *
 * @param {HTMLElement} lista    — la de `pintarLista`
 * @param {HTMLImageElement} captura
 * @param {Object[]} items
 * @param {(item) => string} src — la ruta de la captura de una fila
 */
export function capturaAlPasar(lista, captura, items, src) {
  captura.onerror = () => captura.classList.remove("visible");   // una fila sin captura
  lista.addEventListener("mouseover", (e) => {
    const fila = e.target.closest("a.plista-fila");
    if (!fila) return;
    const i = items.indexOf(fila.item);
    captura.style.setProperty("--dx", -((i * 7) % 19));
    captura.style.setProperty("--dy", ((i * 11) % 25) - 12);
    captura.style.setProperty("--giro", ((i * 3) % 5) - 2);
    captura.src = src(fila.item);
    captura.classList.add("visible");
  });
  lista.addEventListener("mouseleave", () => captura.classList.remove("visible"));
}

export function pintarLista(lista, items, { campos, cols, texto, href }) {
  lista.innerHTML = `
    <div class="plista-fila plista-cabecera">${campos.map(c => `<button type="button" data-campo="${c}"></button>`).join("")}</div>
    ${items.map(() => `<a class="plista-fila">${campos.map(() => "<span></span>").join("")}</a>`).join("")}`;
  const filas = [...lista.querySelectorAll("a.plista-fila")];
  filas.forEach((a, i) => { a.item = items[i]; });

  // Pulsar una cabecera ordena por esa columna; volver a pulsarla, al revés.
  let lang;
  let orden = { campo: null, dir: 1 };
  lista.querySelector(".plista-cabecera").addEventListener("click", (e) => {
    const campo = e.target.dataset.campo;
    if (!campo) return;
    orden = { campo, dir: orden.campo === campo ? -orden.dir : 1 };
    filas
      .sort((a, b) => orden.dir * texto(a.item, campo, lang).localeCompare(texto(b.item, campo, lang), "es"))
      .forEach(a => lista.appendChild(a));
  });

  return (l) => {
    lang = l;
    lista.querySelectorAll(".plista-cabecera button").forEach((b, k) => { b.textContent = cols(l)[k]; });
    filas.forEach(a => {
      [...a.children].forEach((s, k) => { s.textContent = texto(a.item, campos[k], l); });
      a.href = href(a.item, l);
    });
  };
}
