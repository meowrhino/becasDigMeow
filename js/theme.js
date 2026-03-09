// ============================================
// THEME — Toggle claro/oscuro con SVG morph
// ============================================
//
// Gestiona el tema claro/oscuro con un toggle SVG
// que hace morph suave entre luna y sol.
// Persiste la preferencia en localStorage.
// El tema se aplica ANTES del render mediante un script
// inline en <head> (ver index.html) para evitar flash.

const STORAGE_KEY = "meowrhino-theme";

const SVG_MOON = `<svg class="toggle-icon toggle-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

const SVG_SUN = `<svg class="toggle-icon toggle-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;

let toggleEl = null;

/** Devuelve el tema actual ("light" | "dark"). */
function getTema() {
  return document.documentElement.getAttribute("data-theme") || "light";
}

/** Aplica el tema y actualiza los iconos SVG. */
function aplicarTema(tema) {
  document.documentElement.setAttribute("data-theme", tema);
  localStorage.setItem(STORAGE_KEY, tema);
  if (toggleEl) {
    toggleEl.classList.toggle("is-dark", tema === "dark");
    toggleEl.setAttribute("aria-label",
      tema === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
    );
  }
}

/** Alterna entre claro y oscuro con animación de rotación. */
function alternarTema() {
  if (toggleEl) {
    toggleEl.animate(
      [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
      { duration: 500, easing: "ease-in-out" }
    );
  }
  aplicarTema(getTema() === "dark" ? "light" : "dark");
}

/** Crea el botón toggle de tema (SVG moon/sun) en la esquina superior izquierda. */
export function crearThemeToggle() {
  toggleEl = document.createElement("button");
  toggleEl.classList.add("theme-toggle");
  toggleEl.innerHTML = SVG_MOON + SVG_SUN;
  toggleEl.addEventListener("click", alternarTema);

  // Sincronizar estado con el tema actual (ya aplicado por el script de <head>)
  const temaActual = getTema();
  toggleEl.classList.toggle("is-dark", temaActual === "dark");
  toggleEl.setAttribute("aria-label",
    temaActual === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
  );

  document.body.appendChild(toggleEl);
}
