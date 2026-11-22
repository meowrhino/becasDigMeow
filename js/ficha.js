// ============================================
// FICHA — los controles de las páginas estáticas (fichas, landings y 404)
// ============================================
//
// La barra y los desplegables de abajo los escribe build-seo.js en el HTML;
// aquí se les da vida a los de `zoom(…)` y `modo(…)` (idioma son enlaces), y a
// la fila de capturas. Lo compartido con el lienzo está en controles.js; sin
// importar theme.js: arrastra data.js, que cambiaría el <html lang> de la ficha.

import { montarFila } from "./fila.js";
import { ZOOMS, modoActual, ponerModo, cerrarAlClicarFuera } from "./controles.js";

document.querySelectorAll(".controles [data-modo]").forEach(boton => {
  boton.addEventListener("click", () => { ponerModo(boton.dataset.modo); marcarModo(); });
});

/** El modo activo, subrayado, y su nombre en `modo(…)`. */
function marcarModo() {
  const activo = modoActual();
  document.querySelectorAll(".controles [data-modo]").forEach(b => {
    const es = b.dataset.modo === activo;
    b.classList.toggle("is-active", es);
    if (es) {
      const resumen = b.closest(".desplegable").querySelector("summary");
      resumen.textContent = resumen.textContent.replace(/\(.*\)/, `(${b.textContent})`);
    }
  });
}
marcarModo();

// zoom(…): los mismos pasos que en el lienzo.
let zoomIdx = 1;
document.querySelectorAll("[data-zoom]").forEach(boton => {
  boton.addEventListener("click", () => {
    zoomIdx = Math.min(ZOOMS.length - 1, Math.max(0, zoomIdx + Number(boton.dataset.zoom)));
    document.documentElement.style.setProperty("--zoom", ZOOMS[zoomIdx] / 100);
    boton.closest(".desplegable").querySelector("summary").textContent = `zoom(${ZOOMS[zoomIdx]}%)`;
  });
});

cerrarAlClicarFuera();

// La galería de la ficha, en la fila de la portada. Sin la rueda: aquí la
// página baja, y la fila la atraparía al pasar el ratón por encima.
document.querySelectorAll(".proy-fila .welcome-proyectos").forEach(p => montarFila(p, { rueda: false }));
