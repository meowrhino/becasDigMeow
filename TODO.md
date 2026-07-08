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
- [x] ~~Evaluar `content-visibility: auto`~~ — evaluado (2026-07-08): NO se aplica. Las celdas apiladas ocupan todas el viewport (siempre intersectan → cero beneficio) y ya no pintan por `visibility:hidden`; además welcome-cupon y scroll-gradients miden `clientWidth`/`offsetWidth` y habría riesgo de reflows al activar
- [ ] Thumbnails en el grid del portfolio, imágenes grandes solo en detalle (requiere generar derivados de las webp — herramienta de imagen)

### Bugs

- [x] **Interval leak en ciclo de imágenes** — ya estaba resuelto en el grid actual (`_delayId` registrado y cancelado en stop/pausa); reforzado con el gating `ready`/`_pendiente` del preloader (2026-07-08)
- [x] **`langUpdateCallbacks` crece sin límite** — hecho (2026-07-08): cada entrada guarda `{ container, cb }` y al cambiar idioma se purgan las de contenedores desconectados (`isConnected`) antes de disparar
- [x] **`fetch("data.json")` no verifica `res.ok`** — hecho (2026-07-08): `cargarDatos` lanza Error claro con el status HTTP
- [x] **`ResizeObserver` nunca se desconecta** — hecho (2026-07-08): `WeakMap` contenido→observer desconecta el anterior al reinstalar; `checkScroll.dispose()` disponible para limpieza explícita
- [x] **JSDoc de `crearDropdownHTML` encima de `crearDualLinkHTML`** — hecho (2026-07-08): cada JSDoc sobre su función, `crearDualLinkHTML` con JSDoc propio

### CSS cleanup

> (2026-07-08) Bloque entero verificado contra el código: los 7 items ya estaban resueltos en commits anteriores (`07df027`, `d22ca48`, `aada0ef`…). Solo quedaba un comentario de sección que aún describía las nubes flotantes — corregido.

- [x] ~~Gradiente de scroll copy-pasteado 4 veces~~ — ya consolidado en la base compartida `.scroll-wrapper`/`.scroll-content`; las variantes solo sobreescriben dimensiones
- [x] ~~`.contacto-instagram` y `.contacto-cv` idénticos~~ — ya comparten selectores agrupados
- [x] ~~`.politicas-font-group` sin uso~~ — ya eliminado en `07df027`
- [x] ~~`text-decoration: none` en `.portfolio-cloud-item`~~ — obsoleto: no queda ninguna regla `.portfolio-cloud*` (grid `.pgrid-*` desde `2ce4b31`); corregido el comentario de sección que aún mencionaba las nubes
- [x] ~~`-webkit-overflow-scrolling: touch` repetido~~ — cero ocurrencias, ya eliminado
- [x] ~~Numeración de secciones rota~~ — ya renumerado (0. RESET → 17. MODO FÁCIL, secuencial)
- [x] ~~Comentario `style.css:595` equivocado~~ — ya corregido

### i18n — strings hardcodeados

- [x] **Labels de dropdowns en tools** — hecho (2026-07-08): `links.labels.{formateadores,webs}` en data.json con es/en/cat, actualizados en vivo vía `onLangChange` ("conversores" ya no existía en el código)
- [x] **aria-labels del theme toggle** — hecho (2026-07-08): diccionario local es/en/cat en theme.js + `onLangChange(cb)` en data.js, se retraduce al cambiar idioma
- [x] **Zone labels del grid** — hecho (2026-07-08): `zoneLabels` en data.json (welcome/metodología/contacto con es/en/cat), traductor de texto visible en navigation.js (`setTraductorNombres` + `refrescarTextosCeldas`). Los identificadores internos (hash, clase css, alias) no cambian. Nota: en es el zone label de welcome ahora dice "bienvenida" — si se prefiere "welcome" también en español, cambiar `zoneLabels.welcome.es` en data.json
- [x] **Link "archive" del portfolio** — decidido (2026-07-08): queda como palabra universal, es el nombre propio de la sección (meowrhino archive) y coincide con archive.html
- [x] **`<meta description>` solo en ES** — hecho (2026-07-08): `meta.description` {es,en,cat} en data.json, sincronizada vía JS al detectar/cambiar idioma (easy.html se queda en es a propósito: es la página SEO pre-renderizada)

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

- [x] ~~`backup.html` público en el repo~~ — obsoleto: ya no existe en el repo (2026-07-08)
- [x] ~~Lógica teclado + resize duplicada~~ — obsoleto: ya extraída a `shell.js` (`setupKeyboardNav`, `setupResizeDebounce`), ambos mains la importan (2026-07-08)
- [x] ~~`cv_manu.pdf` sin prefijo de ruta~~ — obsoleto: data.json ya referencia cv_manu_{es,en,ca}.pdf por idioma y los ficheros existen en la raíz (2026-07-08)
- [x] `cuerpo` dead code en contacto — hecho (2026-07-08): eliminado del destructure y del buildMailto
- [x] `obtenerDatos()` fallback nested-by-language — hecho (2026-07-08): eliminado, data.json es plano
- [x] ~~Constantes `anchoMin`/`anchoMax` duplicadas~~ — obsoleto: desaparecieron con las nubes flotantes (`2ce4b31`) (2026-07-08)
- [x] `esMovil` detección poco fiable — hecho (2026-07-08): `matchMedia("(hover: none) and (pointer: coarse)")` (la premisa de que portfolio.js usaba matchMedia era falsa; no había detección táctil en ningún sitio)
- [x] Sanitizar innerHTML de data.json — hecho (2026-07-08): `escapeHTML` en utils.js aplicado a los campos de texto plano interpolados (pages, welcome-cupon, archive-pages). `footer.*.parrafos` NO se escapa: lleva markup a propósito (documentado en pages.js). portfolio.js ya era seguro (API del DOM)
- [x] ~~TODO obsoleto en `portfolio.js:9`~~ — obsoleto: el comentario ya no existía (2026-07-08)

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
