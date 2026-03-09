# TODO MAESTRO — meowrhino studio + archive (2026-03-09)

## Contexto
Tres grandes bloques + modularización del código:
1. **Tema claro/oscuro** para el studio (claro por defecto)
2. **Repensar portfolio** — una nube por proyecto con crossfade, click → scroll vertical con links como texto
3. **meowrhino archive** — archive.html con grid/celdas como el studio, oscuro por defecto, inventario de proyectos del neocities (excluyendo main/side quests)
4. **Modularizar script.js** — dividir en archivos más manejables

---

## FASE 0: MODULARIZAR SCRIPT.JS

Separar el monolito en ES modules:

- [ ] `js/main.js` — inicialización, event listeners globales, orquestación
- [ ] `js/data.js` — carga de data.json, caché, idioma global, obtenerDatos()
- [ ] `js/navigation.js` — grid config, celdas, minimap (inline + expanded), nav labels, hash routing, actualizarVista()
- [ ] `js/pages.js` — renderTools, renderWelcome, renderStatement, renderMetodologia, renderPoliticas, renderContacto
- [ ] `js/portfolio.js` — nubes flotantes, hover/drag, crossfade de imágenes, vista detalle
- [ ] `js/theme.js` — toggle claro/oscuro, localStorage, crearThemeToggle()
- [ ] Actualizar `index.html` → `<script type="module" src="js/main.js">`
- [ ] Verificar que todo sigue funcionando

---

## FASE 1: TEMA CLARO/OSCURO

### 1a. Variables CSS en `:root`
- [ ] ~20 variables de color: `--bg`, `--text`, `--text-content`, `--text-secondary`, `--text-muted`, `--text-hover`, `--border`, `--border-hover`, `--shadow-sm`, `--shadow-md`, `--zone-label`, `--minimap-cell`, `--minimap-active`, `--overlay-bg`, `--minimap-expanded`, `--minimap-expanded-text`, `--minimap-expanded-hover`, `--btn-subtle`, `--btn-subtle-hover`, `--card-bg`, `--card-hover-bg`, `--gradient-color`

### 1b. Reemplazar ~40 colores hardcodeados
- [ ] body, celda, zone-label, minimap, nav-labels, gradientes de scroll, tool-link, dropdown-btn, dropdown-content, statement/metodología/políticas p, lang-btn, font-btn, col-btn, portfolio-switch, nav-label-inline, pcloud-name, contacto-email, contacto-instagram

### 1c. Tema oscuro `[data-theme="dark"]`
- [ ] bg: #121212, text: #e0e0e0, borders: rgba(255,255,255,...), etc.

### 1d. Toggle ☽/☼
- [ ] CSS: `.theme-toggle` fixed top-left (3dvh, 3dvw)
- [ ] JS: crearThemeToggle(), alternarTema(), localStorage
- [ ] HTML: script inline en `<head>` (anti-flash)
- [ ] Transiciones suaves de color

---

## FASE 2: REPENSAR PORTFOLIO

### 2a. Una sola nube por proyecto con crossfade
- [ ] UNA nube por proyecto (11 nubes, no ~30)
- [ ] Crossfade automático entre imágenes (~5-8s, loop infinito)
- [ ] Nubes más grandes, mejor distribución

### 2b. Click en nube → vista scroll vertical
- [ ] Transición animada (nubes → posición scroll)
- [ ] Scroll vertical: proyectos uno debajo de otro
- [ ] Imagen sin link, URL del proyecto como texto debajo
- [ ] Nombre del proyecto visible
- [ ] Botón para volver a nubes

### 2c. Eliminar grid mode antiguo
- [ ] Borrar: animarNubesAGrid, animarGridANubes, medirPosicionesGrid
- [ ] Borrar: cambiarColumnasPortfolio, actualizarBotonesColumnas
- [ ] Borrar: botones +/-, portfolio-bottom-bar, portfolio-col-btn
- [ ] Borrar: portfolio-switch, nav-label-group.bottom, nav-label-inline
- [ ] Borrar: portfolio-grid-container, portfolio-grid, portfolio-item, portfolio-stack, portfolio-layer
- [ ] Simplificar crearNavLabels()
- [ ] Limpiar variables: portfolioMode, portfolioUserColumns, portfolioAnimating

### 2d. CSS vista detalle
- [ ] .portfolio-detail — scroll vertical, imágenes grandes, nombre + link como texto, gradientes, botón volver

---

## FASE 3: MEOWRHINO ARCHIVE

### 3a. Scaffold
- [ ] archive.html + js/archive-main.js + archive-data.json
- [ ] Reusar CSS compartido (variables, base, celdas, minimap, nav-labels)
- [ ] Tema oscuro por defecto
- [ ] Mismo sistema de grid/celdas y minimap
- [ ] Link bidireccional studio ↔ archive

### 3b. Contenido (excluir main/side quests del neocities)
- Proyectos personales: CV01, Bichi, Casco, Entierro, Joyicidios, Yamigotchi, Cubito, Palomas, Paradians, ASAV
- Juegos: Barcelona per Eixample, La Festa, Minesweeper, Game of Life...
- Experimentos: Stars, Buddhabrot, I Ching, ASCII art, zodiac...
- Apps sociales: PiuPiu, gridChat, messagePark, projectChat
- Textos: Notas, TFG, hopeko, essays
- Personajes: Pollitos, paradians
- Facts: 32+ datos curiosos

### 3c. Formato de datos
- [ ] Solo metadatos (nombre, URL, descripción, categoría, tags)
- [ ] Extraer descripciones de about_*.html
- [ ] Extraer facts de facts.js
- [ ] Categorizar en archive-data.json

### 3d. Secciones/celdas (por definir)
- Hub central, Inventario proyectos, Notas/Textos, Personajes/ProfilePics, Facts/About

### 3e. Minimap compartido
- [ ] Studio muestra archive como sección inferior (más pequeña) en minimap
- [ ] Archive muestra studio como sección superior
- [ ] Navegación fluida entre ambos

---

## FASE 4: PERFORMANCE Y PULIDO

- [ ] Lazy loading de imágenes
- [ ] Thumbnails en nubes, grandes solo en detalle
- [ ] Archive: lazy loading agresivo
- [ ] prefers-reduced-motion
- [ ] Fix transition blocking (Promise.allSettled)
- [ ] Sanitizar innerHTML (XSS)
- [ ] focus-visible states

---

## ORDEN DE COMMITS

```
Commit 1:  Modularizar script.js en ES modules
Commit 2:  CSS variables (:root) + reemplazar hardcoded
Commit 3:  Tema oscuro [data-theme="dark"]
Commit 4:  Toggle ☽/☼ con localStorage
Commit 5:  Eliminar grid mode del portfolio
Commit 6:  Nubes únicas con crossfade de imágenes
Commit 7:  Click nube → vista scroll con links como texto
Commit 8:  Scaffold archive.html + estructura base
Commit 9:  Migrar contenido neocities → archive-data.json
Commit 10: Implementar secciones del archive
Commit 11: Minimap compartido studio ↔ archive
Commit 12: Performance + lazy loading + pulido
```

---

## Bugs/mejoras pendientes anteriores (2026-03-03)

- [ ] Fix portfolio transition blocking — Promise.allSettled + finally
- [ ] Lazy loading imágenes nubes (eager solo para primeras visibles)
- [ ] Sanitizar innerHTML de data.json (XSS)
- [ ] Decidir bloque drag nubes: conectar pointers o eliminar
- [ ] Optimizar hover lock nubes (menos getBoundingClientRect)
- [ ] Extraer utilidades reutilizables (checkScroll, render con fade)
- [ ] prefers-reduced-motion
- [ ] :focus-visible para teclado
- [ ] Font loading: @import → link preconnect
- [ ] Reducir repetición data.json
- [ ] Evaluar content-visibility: auto
