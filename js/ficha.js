// ============================================
// FICHA — los controles de las páginas estáticas (fichas, landings y 404)
// ============================================
//
// La barra y los desplegables de abajo los escribe build-seo.js en el HTML;
// aquí solo se les da vida a los de `zoom(…)` y `modo(…)` (idioma son enlaces). Sin
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

// zoom(…): los mismos pasos que en el lienzo (navigation.js, ZOOMS). La letra
// la escala `--zoom` en .about-content (style.css).
const ZOOMS = [85, 100, 115, 130];
let zoomIdx = 1;
document.querySelectorAll("[data-zoom]").forEach(boton => {
  boton.addEventListener("click", () => {
    zoomIdx = Math.min(ZOOMS.length - 1, Math.max(0, zoomIdx + Number(boton.dataset.zoom)));
    raiz.style.setProperty("--zoom", ZOOMS[zoomIdx] / 100);
    boton.closest(".desplegable").querySelector("summary").textContent = `zoom(${ZOOMS[zoomIdx]}%)`;
  });
});

// Un clic fuera cierra el desplegable abierto, como en el lienzo.
document.addEventListener("click", (e) => {
  document.querySelectorAll(".controles details[open]").forEach(d => { if (!d.contains(e.target)) d.open = false; });
});
