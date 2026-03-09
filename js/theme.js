// ============================================
// THEME — Toggle claro/oscuro
// ============================================
//
// Gestiona el tema claro/oscuro con un toggle ☽/☼.
// Persiste la preferencia en localStorage.
// El tema se aplica ANTES del render mediante un script
// inline en <head> (ver index.html) para evitar flash.

const STORAGE_KEY = "meowrhino-theme";
const ICON_LIGHT = "☽";   // mostrado en modo claro  → "pulsa para oscuro"
const ICON_DARK  = "☼";   // mostrado en modo oscuro → "pulsa para claro"

let toggleEl = null;

/** Devuelve el tema actual ("light" | "dark"). */
function getTema() {
  return document.documentElement.getAttribute("data-theme") || "light";
}

/** Aplica el tema y actualiza el icono. */
function aplicarTema(tema) {
  document.documentElement.setAttribute("data-theme", tema);
  localStorage.setItem(STORAGE_KEY, tema);
  if (toggleEl) {
    toggleEl.textContent = tema === "dark" ? ICON_DARK : ICON_LIGHT;
    toggleEl.setAttribute("aria-label",
      tema === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
    );
  }
}

/** Alterna entre claro y oscuro. */
function alternarTema() {
  aplicarTema(getTema() === "dark" ? "light" : "dark");
}

/** Crea el botón toggle de tema (☽/☼) en la esquina superior izquierda. */
export function crearThemeToggle() {
  toggleEl = document.createElement("button");
  toggleEl.classList.add("theme-toggle");
  toggleEl.addEventListener("click", alternarTema);

  // Sincronizar icono con el tema actual (ya aplicado por el script de <head>)
  const temaActual = getTema();
  toggleEl.textContent = temaActual === "dark" ? ICON_DARK : ICON_LIGHT;
  toggleEl.setAttribute("aria-label",
    temaActual === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
  );

  document.body.appendChild(toggleEl);
}
