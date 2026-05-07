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

- [ ] **Preloader con skeleton + blur-up** — cada nube renderiza con placeholder, `onload` añade `.loaded` con fade-in individual, cycling no empieza hasta que la primaria cargue. Opción recomendada tras análisis de 4 alternativas (2026-04-01)
- [ ] **Lazy loading nubes** — las 13 imágenes primarias usan `loading="eager"` aunque portfolio no sea la vista activa. Cambiar a eager solo cuando la celda portfolio es visible (`portfolio.js:512`)
- [ ] **RAF hover loop** — `iniciarMonitorHoverNubes` hace `querySelectorAll` + `getBoundingClientRect` en cada frame a 60fps incluso con pointer quieto. Debounce o solo recalcular al mover (`portfolio.js:731-739`)
- [ ] **innerHTML = "" en resize** — destruye y recrea todas las nubes. Reusar nodos existentes y solo reposicionar (`portfolio.js:406-409`)
- [ ] **Google Fonts @import → `<link>`** — `@import url()` en CSS bloquea render. Mover a `<link rel="preload">` en `<head>` (`style.css:1`)
- [ ] Evaluar `content-visibility: auto` en celdas no visibles
- [ ] Thumbnails en nubes, imágenes grandes solo en detalle

### Bugs

- [ ] **Interval leak en ciclo de imágenes** — si `detenerCiclosImagenes()` se llama durante la fase de delay del `setTimeout`, el `setInterval` puede seguir ejecutándose con referencia huérfana (`portfolio.js:44-52`)
- [ ] **`langUpdateCallbacks` crece sin límite** — cada `attachLangListeners()` pushea pero nunca limpia. Callbacks viejos disparan sobre DOM eliminado (`data.js:34`)
- [ ] **`fetch("data.json")` no verifica `res.ok`** — un 404 produce error de JSON parse confuso (`data.js:59-62`)
- [ ] **`ResizeObserver` nunca se desconecta** — leak si el contenido se recrea (`scroll-gradients.js:27`)
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
- [ ] **aria-labels del theme toggle** — `"Cambiar a modo claro/oscuro"` hardcoded en `theme.js:31,58`, sin traducción en/cat (2026-04-21)
- [ ] **Zone labels del grid** — `nombres` en `main.js:111-119` se muestran como zone-labels en los bordes. Algunos cambian entre idiomas (políticas→policies/polítiques, metodología→methodology, contacto→contact, welcome→benvinguda). Considerar i18n (2026-04-21)
- [ ] **Link "archive" del portfolio** — `portfolio.js:107`. En español sería "archivo"; en cat "arxiu". Decidir si se traduce o queda como palabra universal (2026-04-21)
- [ ] **`<meta description>` solo en ES** — `index.html:6`. Para SEO multilingüe setearlo vía JS según idioma detectado (2026-04-21)

### Accesibilidad

- [ ] `<html lang="es">` hardcoded — actualizar dinámicamente al cambiar idioma
- [ ] Celdas del minimapa son `<div>` clickeables sin `role="button"` ni `tabindex` (`navigation.js:117-123`)
- [ ] Nubes clickeables sin accesibilidad teclado/screen reader (`portfolio.js:494-495`)
- [ ] Botones zoom `+`/`-` sin `aria-label` (`zoom.js:12-15`)
- [ ] Botones de idioma sin `aria-pressed` (`data.js:16-18`)
- [ ] Sin `<noscript>` fallback ni skip-nav link
- [ ] `prefers-reduced-motion` — sin implementar
- [ ] `:focus-visible` — sin implementar

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

- [ ] Tagline/subtítulo tipo "estudio de diseño web en Barcelona" con cambio de idioma automático
- [ ] Nombres del equipo (paula, miranda, andrea, jaume) con links a formateadores
- [ ] Hint de navegación para nuevos usuarios (flechas, desaparece tras primera interacción)
- [ ] Estado del estudio + hora BCN ("disponibles para proyectos" + reloj)
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
