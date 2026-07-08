# TODO MAESTRO — meowrhino studio + archive

---

## Historial de fases completadas

### FASE 0: MODULARIZAR SCRIPT.JS — COMPLETADA
> Monolito separado en ES modules: main.js, data.js, navigation.js, pages.js, portfolio.js, theme.js, zoom.js, scroll-gradients.js. index.html usa `<script type="module">`.

### FASE 1: TEMA CLARO/OSCURO — COMPLETADA
> ~20 variables CSS en `:root`, `[data-theme="dark"]`, toggle ☽/☼ con localStorage, anti-flash inline script en `<head>`.

### FASE 2: REPENSAR PORTFOLIO — COMPLETADA
> Una nube por proyecto con crossfade (5-8s), click nube → vista scroll vertical con links como texto, grid mode antiguo eliminado.

### FASE 3: MEOWRHINO ARCHIVE — COMPLETADA
> archive.html + archive-main.js + archive-data.json. Tema oscuro por defecto, grid diamante con 11 categorías, link bidireccional studio ↔ archive (toggle tema al navegar).

---

## Pendiente

### Performance e imágenes

- [x] **Preloader con skeleton + blur-up** — hecho (2026-07-08) sobre el grid actual: `.pgrid-thumb::before` shimmer con variables de tema, `load`/`error` añaden `.loaded` con fade-in, cycling no empieza hasta que la primaria cargue. Respeta `prefers-reduced-motion`
- [x] **Lazy loading nubes** — hecho (2026-07-08): `src` diferido vía `data-src` + `MutationObserver` sobre la clase `.activa` de la celda (las celdas están apiladas, IntersectionObserver siempre reportaba visible). 0 imágenes descargadas hasta activar el portfolio; verificado en navegador
- [x] ~~**RAF hover loop**~~ — obsoleto: `iniciarMonitorHoverNubes` desapareció al reemplazar las nubes flotantes por el grid (`2ce4b31`). El grid usa `:hover` CSS puro (2026-07-08)
- [x] ~~**innerHTML = "" en resize**~~ — obsoleto: el resize handler de nubes desapareció con el grid (`2ce4b31`) (2026-07-08)
- [x] ~~**Google Fonts @import → `<link>`**~~ — obsoleto: las fuentes son self-hosted (`@font-face` + `fonts/`) desde `aada0ef`; ya no hay `@import` ni petición externa (2026-07-08)
- [ ] Evaluar `content-visibility: auto` en celdas no visibles
- [ ] Thumbnails en nubes, imágenes grandes solo en detalle

### Bugs

- [x] **Interval leak en ciclo de imágenes** — ya estaba resuelto en el grid actual (`_delayId` registrado y cancelado en stop/pausa); reforzado con el gating `ready`/`_pendiente` del preloader (2026-07-08)
- [x] **`langUpdateCallbacks` crece sin límite** — hecho (2026-07-08): cada entrada guarda `{ container, cb }` y al cambiar idioma se purgan las de contenedores desconectados (`isConnected`) antes de disparar
- [x] **`fetch("data.json")` no verifica `res.ok`** — hecho (2026-07-08): `cargarDatos` lanza Error claro con el status HTTP
- [x] **`ResizeObserver` nunca se desconecta** — hecho (2026-07-08): `WeakMap` contenido→observer desconecta el anterior al reinstalar; `checkScroll.dispose()` disponible para limpieza explícita
- [ ] **JSDoc de `crearDropdownHTML` encima de `crearDualLinkHTML`** — documentación engañosa (`pages.js:25-31`)
  > (2026-04-01) `crearDualLinkHTML` se insertó entre el JSDoc y su función. Reubicar el JSDoc.

### CSS cleanup

- [ ] **Gradiente de scroll copy-pasteado 4 veces** — tools, metodología, políticas, portfolio-detail. Extraer a clase `.scroll-gradient-wrapper` reutilizable
- [ ] `.contacto-instagram` y `.contacto-cv` son idénticos — compartir clase
- [ ] `.politicas-font-group` definido pero nunca usado — eliminar
- [ ] `text-decoration: none` en `.portfolio-cloud-item` (es un `<div>`) — no hace nada
- [ ] `-webkit-overflow-scrolling: touch` repetido 5 veces — deprecated, eliminar
- [ ] Numeración de secciones rota: "8. WELCOME" y "8. STATEMENT" — renumerar
- [ ] Comentario `style.css:595` dice `.welcome-content` pero es `.tools-content`

### i18n — strings hardcodeados

- [ ] **Labels de dropdowns en tools** — `"conversores"`, `"formateadores"`, `"webs terminadas"` hardcodeados en español (`pages.js:73-75`). Mover a data.json con variantes es/en/cat (2026-04-21)
- [x] **aria-labels del theme toggle** — hecho (2026-07-08): diccionario local es/en/cat en theme.js + `onLangChange(cb)` en data.js, se retraduce al cambiar idioma
- [ ] **Zone labels del grid** — `nombres` en `main.js:111-119` se muestran como zone-labels en los bordes. Algunos cambian entre idiomas (políticas→policies/polítiques, metodología→methodology, contacto→contact, welcome→benvinguda). Considerar i18n (2026-04-21)
- [ ] **Link "archive" del portfolio** — `portfolio.js:107`. En español sería "archivo"; en cat "arxiu". Decidir si se traduce o queda como palabra universal (2026-04-21)
- [ ] **`<meta description>` solo en ES** — `index.html:6`. Para SEO multilingüe setearlo vía JS según idioma detectado (2026-04-21)

### Accesibilidad

- [x] ~~`<html lang="es">` hardcoded~~ — ya estaba implementado (`sincronizarLangDocumento` en data.js, con mapeo cat→ca) (2026-07-08)
- [x] ~~Celdas del minimapa sin accesibilidad~~ — ya eran `<button>` reales; añadido `aria-label="Ir a {nombre}"` explícito (2026-07-08)
- [x] ~~Nubes sin accesibilidad teclado~~ — obsoleto: el grid actual usa `<a href>` focusables nativamente (2026-07-08)
- [x] ~~Botones zoom sin `aria-label`~~ — ya estaban implementados en zoom.js (2026-07-08)
- [x] Botones de idioma sin `aria-pressed` — hecho (2026-07-08): inicial + sincronizado en cada cambio (`data.js`)
- [x] `<noscript>` fallback + skip-nav link — hecho (2026-07-08): skip-link con foco a `#content`, noscript enlaza a easy.html como versión estática
- [x] ~~`prefers-reduced-motion`~~ — ya existía media query global en style.css (2026-07-08)
- [x] ~~`:focus-visible`~~ — ya existía regla global con `var(--text)` en style.css (2026-07-08)

### Cleanup general

- [ ] `backup.html` público en el repo — eliminar o gitignore
- [ ] Lógica teclado + resize handler duplicada entre `main.js` y `archive-main.js` — extraer a módulo compartido
- [ ] `cv_manu.pdf` sin prefijo de ruta (`data.json:251`) — el resto usa `img/`
- [ ] `cuerpo` se destructura de `data.contacto` pero no existe en data.json — dead code (`pages.js:255`)
- [ ] `obtenerDatos()` tiene fallback para estructura nested-by-language que no existe — dead code (`data.js:76-85`)
- [ ] Constantes `anchoMin`/`anchoMax` duplicadas en `generarNubesFlotantes` y `reanudarNubeDesdePosicionActual` — extraer a módulo
- [ ] `esMovil` detección poco fiable (`"ontouchstart" in window`) — usar `matchMedia("(hover: hover)")` que ya se usa en portfolio.js
- [ ] Sanitizar innerHTML de data.json (XSS) — 17 usos sin sanitizar
- [ ] TODO obsoleto en `portfolio.js:9` ("Fase 2c") — ya implementado, borrar

### Subvención FSE+ (justificación final 18m)

- [ ] **Recortar/recomprimir `sepe.webp`** — el archivo oficial empaqueta Ministerio + SEPE en una caja muy ancha (900×220), así el "SEPE" queda ilegible a la altura del footer. Cumplimiento actual válido (los 4 logos están), pero de cara a la justificación final conviene tener el SEPE legible. Material de partida ya recuperado: [img/LOGOS/NEGRO/sepe-bruto.png](img/LOGOS/NEGRO/sepe-bruto.png) y [img/LOGOS/BLANCO/sepe-bruto.png](img/LOGOS/BLANCO/sepe-bruto.png) (2040×500, pre-compresión, recuperados de `f6da0b0~1`). Workflow: recortar márgenes en GIMP para que SEPE+Ministerio ocupen más caja útil → reexportar a `.webp` mismas dimensiones que el actual → borrar los `-bruto.png` (2026-05-07)

### Welcome (ideas, baja prioridad)

- [x] Tagline/subtítulo con cambio de idioma automático — hecho (2026-07-08): `data.welcome.tagline` {es,en,cat}, bajo el título
- [ ] Nombres del equipo (paula, miranda, andrea, jaume) con links a formateadores
- [x] Hint de navegación para nuevos usuarios — hecho (2026-07-08): `data.welcome.hint`, flechas con vaivén suave, fade-out al salir de welcome por primera vez, persistido en localStorage (`mw_hint_visto`)
- [x] Estado del estudio + hora BCN — hecho (2026-07-08): `data.welcome.estado` + reloj Intl (Europe/Madrid) cada 30s, sin acumular timers al cambiar idioma
- [ ] Animación tipográfica (letras secuenciales, cursor, glitch suave)
- [ ] Logo / ASCII art del meowrhino
- [ ] Links rápidos (Instagram, email, portfolio)

---

## Log de cambios

### 2026-04-01 — Revisión profunda + portfolio reordenado

**Portfolio:**
- Reordenados los 13 proyectos (nuevo orden definido por el usuario)
- URL de diego san marcos actualizada a diegosanmarcos.com
- Nuevo proyecto: estructuras3000 (estructuras3000.com)
- Nuevo proyecto: mokakopaTwins — botón doble con 2 URLs (ana lópez + mokakopa), 4 imágenes alternadas
- Soporte `urls` (array) en data.json para proyectos con múltiples links
- Vista detalle muestra múltiples links; botón doble en dropdown "webs terminadas" (2 links lado a lado)
- Todas las imágenes renombradas a `[slug]_[index].webp` (empezando en `_0`)
- Imágenes de estructuras3000 actualizadas

**Tools dropdown:**
- Padding dinámico 30dvh solo cuando "webs terminadas" está abierto (clase `.has-open-last-dropdown`)
- Gradiente inferior desaparece al pasar el último item real (ignora el padding decorativo)
- `setupScrollGradients` acepta `bottomMargin` dinámico (función o número)

**Revisión de código:**
- Identificados 8 bugs, 5 problemas de performance, 7 issues CSS, 7 de accesibilidad, 9 de cleanup
- Análisis de 4 estrategias de preloader — recomendada: skeleton + blur-up con fade-in individual
- Items de Fases 0-3 verificados como completados
- `Promise.allSettled` ya implementado en `abrirVistaDetalle` (`portfolio.js:318`)
- Drag de nubes: solo click-to-open-detail, no hay drag-to-move (decisión de diseño)

### 2026-03-09 — Creación del TODO maestro

Definición de las 4 fases principales: modularización, tema claro/oscuro, portfolio con nubes, archive.

### 2026-03-03 — Bugs/mejoras iniciales

Lista inicial de bugs y mejoras identificadas durante el desarrollo.
