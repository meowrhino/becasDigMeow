// ============================================
// FICHA — los controles de las páginas estáticas (fichas y landings)
// ============================================
//
// La barra y los desplegables de abajo los escribe build-seo.js en el HTML;
// aquí solo se les da vida a los de `modo(…)` (idioma son enlaces). Sin
// importar theme.js: arrastra data.js, que cambiaría el <html lang> de la ficha.

const raiz = document.documentElement;

document.querySelectorAll("[data-modo-base]").forEach(boton => {
  boton.addEventListener("click", () => {
    const { modoBase: base, modoTinte: tinte } = boton.dataset;
    raiz.setAttribute("data-theme", base);
    localStorage.setItem("meowrhino-theme", base);
    if (tinte) {
      raiz.dataset.tinte = tinte;
      localStorage.setItem("meowrhino-tinte", tinte);
    } else {
      delete raiz.dataset.tinte;
      localStorage.removeItem("meowrhino-tinte");
    }
    marcarModo();
  });
});

/** El modo activo, subrayado, y su nombre en `modo(…)`. */
function marcarModo() {
  const activo = raiz.dataset.tinte || (raiz.getAttribute("data-theme") === "dark" ? "oscuro" : "claro");
  document.querySelectorAll("[data-modo]").forEach(b => {
    const es = b.dataset.modo === activo;
    b.classList.toggle("is-active", es);
    if (es) {
      const resumen = b.closest(".desplegable").querySelector("summary");
      resumen.textContent = resumen.textContent.replace(/\(.*\)/, `(${b.textContent})`);
    }
  });
}
marcarModo();

// Un clic fuera cierra el desplegable abierto, como en el lienzo.
document.addEventListener("click", (e) => {
  document.querySelectorAll(".controles details[open]").forEach(d => { if (!d.contains(e.target)) d.open = false; });
});
