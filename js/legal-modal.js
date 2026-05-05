// ============================================
// LEGAL MODAL — Política de cookies / aviso legal
// ============================================
//
// Modal que se abre desde el link gris bajo el título de la welcome.
// Contiene aviso legal mínimo (responsable + cookies + analítica + derechos).
// Sin velo: los lang-btn de la celda siguen siendo clicables y disparan
// la actualización del contenido del modal vía langUpdateCallbacks.
// Rotación random pequeña al abrir para que se sienta vivo, como el cupón.

import { currentLang, langUpdateCallbacks } from "./data.js";

let modalEl = null;
let legalData = null;

export function setupLegalModal(legal) {
  if (modalEl || !legal) return;
  legalData = legal;

  modalEl = document.createElement("div");
  modalEl.className = "legal-modal";
  modalEl.innerHTML = `
    <div class="legal-modal-card" role="dialog" aria-modal="false">
      <button class="legal-modal-close" aria-label="cerrar">×</button>
      <div class="legal-modal-scroll">
        <div class="legal-modal-body"></div>
      </div>
    </div>
  `;
  document.body.appendChild(modalEl);

  const body = modalEl.querySelector(".legal-modal-body");
  const closeBtn = modalEl.querySelector(".legal-modal-close");

  const renderContent = (lang) => {
    const d = legalData[lang] || legalData.es;
    if (!d) return;
    body.innerHTML = `
      <h2 class="legal-modal-title">${d.titulo}</h2>
      ${d.secciones.map(s => `
        <section class="legal-modal-section">
          <h3>${s.titulo}</h3>
          ${s.parrafos.map(p => `<p>${p}</p>`).join("")}
        </section>
      `).join("")}
    `;
  };

  renderContent(currentLang);

  closeBtn.addEventListener("click", closeLegalModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalEl.classList.contains("visible")) {
      closeLegalModal();
    }
  });

  // Cuando cualquier lang-btn (de la celda o donde sea) cambie idioma,
  // re-pintamos el contenido del modal aunque esté cerrado.
  langUpdateCallbacks.push(renderContent);
}

export function openLegalModal() {
  if (!modalEl) return;
  const card = modalEl.querySelector(".legal-modal-card");
  if (card) {
    // Rotación random sutil: ±1.8º, suficiente para sentirse vivo sin marear.
    const rot = (Math.random() - 0.5) * 3.6;
    card.style.setProperty("--legal-rotation", `${rot.toFixed(2)}deg`);
  }
  modalEl.classList.add("visible");
}

export function closeLegalModal() {
  if (!modalEl) return;
  modalEl.classList.remove("visible");
}

export function getLegalLinkLabel(legal) {
  if (!legal?.linkLabel) return "";
  return legal.linkLabel[currentLang] || legal.linkLabel.es || "";
}
