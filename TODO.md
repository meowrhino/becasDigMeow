# TODO · Beca de Digitalización · meowrhino

> Plan de implementación con orden sugerido, patches listos para pegar, criterios de aceptación y QA.  
> Orden sugerido: **(1) Ticker/Aviso temporal → (2) Fijar botones + margen nube (móvil) → (3) Iteración de imágenes → (4) Idiomas/i18n**.

---

## 0) Archivos a tocar (orientativo)
- `index.html` (estructura y contenedores nuevos: ticker, sección “proceso”)
- `style.css` (ticker, safe-area, breathing, pequeños ajustes responsive)
- `main.js` (i18n, ticker, persistencia idioma, slideshow imágenes, observers)
- (si lo tienes separado) `data/*.js` o `textos.js` (estructura `textosMain` y `websRealizadas` multilenguaje)

---

## 1) AVISO TEMPORAL (Ticker/Marquee)

**Objetivo**  
Mostrar una franja arriba (por detrás de los botones) con un mensaje localizado tipo:  
`Barcelona, 22:41 — 19 °C, nubes dispersas. Tema: ⚡ tempesta. Cambia tema, idioma o nubes arriba.`

**Requisitos**
- Se actualiza al cambiar tema o idioma.
- Usa datos de clima ya disponibles (el mismo fetch que usas para Barcelona).
- Respetar `prefers-reduced-motion` (si reduce, el ticker no se mueve).
- Localizable ES/EN/FR/CAT.

### 1.1 HTML (añadir cerca del inicio del `<body>`)
```html
<div id="ticker" aria-live="polite">
  <div class="ticker-inner"><span id="tickerText">…</span></div>
</div>
```

### 1.2 CSS
```css
#ticker{
  position: relative;
  z-index: 0;               /* los botones tienen z-index alto; esto queda detrás */
  height: 28px;
  overflow: hidden;
  margin-top: 4px;
}
.ticker-inner{
  display: inline-block;
  white-space: nowrap;
  animation: ticker-scroll 35s linear infinite;
  will-change: transform;
  opacity: .9;
}
@keyframes ticker-scroll {
  0%   { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
}
@media (prefers-reduced-motion: reduce){
  .ticker-inner{ animation: none; }
}
```

### 1.3 JS (utilidades + integración)
**Añadir** helpers (junto al bloque de clima/tema):
```js
const langToLocale = { ES:'es-ES', EN:'en-GB', FR:'fr-FR', CAT:'ca-ES' };
const themeLabels  = {
  ES:{light:'claro',dark:'oscuro',cloud:'nubes',darkCloud:'nube densa',lightRain:'llovizna',rain:'lluvia',storm:'tormenta',heat:'calor',snow:'nieve',fog:'niebla'},
  EN:{light:'light',dark:'dark',cloud:'clouds',darkCloud:'overcast',lightRain:'drizzle',rain:'rain',storm:'storm',heat:'heat',snow:'snow',fog:'fog'},
  FR:{light:'clair',dark:'sombre',cloud:'nuages',darkCloud:'couvert',lightRain:'bruine',rain:'pluie',storm:'orage',heat:'chaleur',snow:'neige',fog:'brouillard'},
  CAT:{light:'clar',dark:'fosc',cloud:'núvols',darkCloud:'enuvolat',lightRain:'plugim',rain:'pluja',storm:'tempesta',heat:'calor',snow:'neu',fog:'boira'}
};
let lastWeather = null;

function updateTicker(){
  const el = document.getElementById('tickerText');
  if (!el) return;
  const lang = LANGS[currentLangIndex];
  const loc  = langToLocale[lang] || 'es-ES';
  const now  = new Date();
  const time = new Intl.DateTimeFormat(loc,{hour:'2-digit',minute:'2-digit'}).format(now);
  const temp = lastWeather ? `${Math.round(lastWeather.temp)}°C, ${lastWeather.description}` : '—';
  const theme = themes[currentThemeIndex];
  const themeWord = themeLabels[lang][theme] || theme;
  const themeEmoji = (emojis[theme]||'🎛️');
  const city = 'Barcelona';

  const msg = {
    ES: `${city}, ${time} — ${temp}. Tema: ${themeEmoji} ${themeWord}. Cambia tema, idioma o nubes arriba.`,
    EN: `${city}, ${time} — ${temp}. Theme: ${themeEmoji} ${themeWord}. Change theme, language or clouds above.`,
    FR: `${city}, ${time} — ${temp}. Thème : ${themeEmoji} ${themeWord}. Change le thème, la langue ou les nuages en haut.`,
    CAT:`${city}, ${time} — ${temp}. Tema: ${themeEmoji} ${themeWord}. Canvia tema, idioma o núvols a dalt.`
  }[lang];

  el.textContent = msg;
}
```

**Hookear** en tu `applyTheme()` y en la rutina de clima:
```js
const _applyThemeOriginal = applyTheme;
applyTheme = function(theme){
  _applyThemeOriginal(theme);
  updateTicker();
};

// Dentro del try de setThemeByBarcelonaWeather():
lastWeather = { temp, description, cloudPercentage, weather, isNight };
updateTicker();

// En catch/fallback:
lastWeather = null;
updateTicker();

// Al final de applyLanguage(lang):
updateTicker();
```

**Criterios de aceptación**
- [ ] El ticker aparece, se mueve (salvo reduce-motion) y se actualiza al cambiar tema/idioma.
- [ ] Muestra hora local, temperatura y descripción del tiempo (si hay datos).
- [ ] Está por detrás de los botones (no tapa la UI).

---

## 2) MÓVIL: Botones “fijos” + margen de la nube

**Problema**  
En móviles (sobre todo iOS) los `position: fixed` “saltan” por la barra de direcciones; además la nube queda muy pegada a los bordes.

### 2.1 Meta viewport
En `<head>`:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

### 2.2 CSS: safe-area + estabilidad
```css
:root { 
  --safe-top: env(safe-area-inset-top, 0px); 
  --safe-right: env(safe-area-inset-right, 0px); 
}

nav { 
  position: fixed; 
  top: calc(10px + var(--safe-top)); 
  right: calc(10px + var(--safe-right));
  will-change: transform;
}
#toggleLang { 
  position: fixed; 
  top: calc(10px + var(--safe-top)); 
  left: 10px; 
  will-change: transform; 
}

/* Margen lateral nube en móvil */
@media (max-width: 600px){
  .header-cloud::before{
    width: calc(100vw - 24px);
    max-width: 480px;
  }
  .header-cloud{ padding-inline: 18px; }
  .pre-header-cloud{ padding-inline: 6px; }
}
```

**Criterios de aceptación**
- [ ] Los botones se mantienen accesibles al hacer scroll en móvil sin “brincos” visibles.
- [ ] La nube no toca los bordes en móvil.

---

## 3) ITERACIÓN DE IMÁGENES (galería)

**Objetivo**  
Permitir múltiples imágenes por web, cambiando con un “aliento” (escala a 1.1 en mitad de 500ms) y **stagger** calculado por el número de tarjetas para crear una “ola”. Pausar si no están en viewport o si la pestaña no está visible.

**Convenciones**
- Las rutas siguen `ordenador-0.png`, `movil-0.png`, `ordenador-1.png`, etc.
- Cada card indica `data-folder` y `data-qty`.
- Si `data-qty <= 1`, no hay slideshow.

### 3.1 CSS
```css
@keyframes breathe {
  0%   { transform: scale(1);   }
  50%  { transform: scale(1.1); }
  100% { transform: scale(1);   }
}
.web-preview.breathing { animation: breathe 500ms cubic-bezier(.25,.1,.25,1); }

@media (prefers-reduced-motion: reduce) {
  .web-preview.breathing { animation: none; }
  .img-ordenador, .img-movil { transition: opacity 0.001s linear; }
}
```

### 3.2 JS
```js
function preload(src){
  const im = new Image();
  im.decoding='async'; im.loading='eager'; im.src = src;
}

function makeSrc(folder, kind, idx, qty){
  // ajusta extensión si procede (.png/.jpg/.webp)
  return `${folder}/${kind}-${idx}.png`;
}

function swapSrcWithFade(imgEl, nextSrc){
  imgEl.style.opacity = 0;
  const on = () => {
    imgEl.removeEventListener('transitionend', on);
    imgEl.src = nextSrc;
    requestAnimationFrame(() => { imgEl.style.opacity = 1; });
  };
  imgEl.addEventListener('transitionend', on, { once:true });
}

function setupSlides() {
  const cards = Array.from(document.querySelectorAll('.web-preview'));
  const total = cards.length || 1;
  const BASE_PER_CARD_MS = 3500;                     // ajustable
  const SLIDE_INTERVAL_MS = Math.max(3500, total * BASE_PER_CARD_MS);
  const STAGGER = Math.floor(SLIDE_INTERVAL_MS / total);

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { e.target.__visible = e.isIntersecting; });
  }, {rootMargin: '50px'});

  cards.forEach((card, idx) => {
    io.observe(card);
    const folder = card.getAttribute('data-folder');
    const qty = parseInt(card.getAttribute('data-qty') || '1', 10);
    if (qty <= 1) return;

    const desk = card.querySelector('.img-ordenador');
    const mob  = card.querySelector('.img-movil');
    let cur = 0;

    function advance() {
      if (!card.__visible || document.hidden) return;
      card.classList.add('breathing');
      setTimeout(() => card.classList.remove('breathing'), 500);
      const next = (cur + 1) % qty;
      preload(makeSrc(folder, 'ordenador', next, qty));
      preload(makeSrc(folder, 'movil', next, qty));
      cur = next;
      swapSrcWithFade(desk, makeSrc(folder, 'ordenador', cur, qty));
      swapSrcWithFade(mob,  makeSrc(folder, 'movil',     cur, qty));
    }

    setTimeout(() => {
      advance();
      setInterval(advance, SLIDE_INTERVAL_MS);
    }, idx * STAGGER);
  });
}

document.addEventListener('visibilitychange', () => {
  // no hace falta limpiar intervals si usas las guards de visibility
});
```

**Criterios de aceptación**
- [ ] Si `data-qty > 1`, cambia de imagen con fade+breath (500ms, escala 1.1 a mitad).
- [ ] Stagger perceptible “en ola” a lo largo de la parrilla.
- [ ] Sin saltos ni parpadeos (precarga activa). Pausa cuando no visible.

---

## 4) IDIOMAS / i18n

**Objetivo**  
Mantener ES por defecto + EN/FR/CAT. Botón de idioma en esquina **superior izquierda** (igual que tema/nubes). El verbo “ver” en cada tarjeta cambia según idioma (`ver / view / voir / veure`).

**Modelo de datos (recomendado y ya alineado)**  
- `const LANGS = ['ES','EN','FR','CAT']`
- `textosMain = { ES: { … }, EN:{ … }, FR:{ … }, CAT:{ … } }`
- `websRealizadas[i] = { textoES, textoEN, textoFR, textoCAT, … }`

**Persistencia + Deep-link**
- Guardar idioma en `localStorage` y en `?lang=ES|EN|FR|CAT` (para compartir enlaces).

### 4.1 JS — helpers de idioma
```js
const LANGS = ['ES','EN','FR','CAT'];
let currentLangIndex = 0;

const getInitialLang = () => {
  const qp = new URLSearchParams(location.search).get('lang');
  const fromQS = qp && LANGS.includes(qp.toUpperCase()) ? qp.toUpperCase() : null;
  return fromQS || localStorage.getItem('lang') || 'ES';
};
const setLangInURL = (lang) => {
  const u = new URL(location.href);
  u.searchParams.set('lang', lang);
  history.replaceState(null, '', u);
};

document.addEventListener('DOMContentLoaded', () => {
  const initial = getInitialLang();
  currentLangIndex = LANGS.indexOf(initial);
  applyLanguage(initial);
  const langBtn = document.querySelector('#toggleLang');
  langBtn.addEventListener('click', () => {
    currentLangIndex = (currentLangIndex + 1) % LANGS.length;
    const lang = LANGS[currentLangIndex];
    localStorage.setItem('lang', lang);
    setLangInURL(lang);
    applyLanguage(lang);
  });
});
```

**Notas de accesibilidad**
- Actualizar `document.documentElement.lang = lang.toLowerCase()` dentro de `applyLanguage`.
- `aria-live="polite"` en contenedores de texto clave si haces fades.

**Criterios de aceptación**
- [ ] Idioma persiste entre recargas y puede deep-linkearse con `?lang=XX`.
- [ ] Todos los textos del body salen de `textosMain[lang]`.
- [ ] `websRealizadas` muestra el texto y el verbo correctos por idioma.
- [ ] Transición suave al cambiar idioma (fade ya existente).

---

## 5) Nueva sección “proceso / cobro” con i18n

**HTML (esqueleto)**
```html
<section id="proceso" class="section" data-i18n-scope="proceso">
  <h2 data-i18n="titulo">pasos / presupuesto</h2>
  <h3 data-i18n="paso1_t">primera llamada</h3>
  <p  data-i18n="paso1_p">…</p>
  <h3 data-i18n="paso2_t">presupuesto</h3>
  <p  data-i18n="paso2_p">…</p>
</section>
```
**Datos**  
`textosMain.ES.proceso = { titulo, paso1_t, paso1_p, paso2_t, paso2_p, … }` (y sus homólogos EN/FR/CAT).  
**Render**: en `applyLanguage(lang)`, buscar `[data-i18n]` dentro de `#proceso` y sustituir.

**Criterios de aceptación**
- [ ] La sección aparece tras la galería.
- [ ] Todo su contenido cambia con el idioma.

---

## 6) QA & Performance

- [ ] **Reduce motion**: ticker y breathing respetan `prefers-reduced-motion`.
- [ ] **Scroll móvil**: botones estables con `viewport-fit=cover` y `env(safe-area-inset-*)`.
- [ ] **Precarga**: sin parpadeos en el swap de imágenes.
- [ ] **Visibilidad**: slideshow pausado fuera de viewport y pestaña oculta.
- [ ] **i18n**: idioma persiste + query param; “ver/view/voir/veure” correcto.
- [ ] **A11y**: `aria-live` donde toque, `lang` en `<html>`, contraste OK.

---

## 7) Notas de implementación

- Mantén **un solo punto de verdad** para textos (`textosMain` y `websRealizadas`), sin duplicar.
- Evita *magic strings*: centraliza `LANGS`, `themeLabels`, etc.
- Considera `requestIdleCallback` para precarga si notas jank en móviles antiguos.
- Si el ticker molesta en pantallas muy pequeñas, limita a una línea y trunca con `text-overflow: ellipsis` (opcional).
- Deja comentado un fallback “no-marquee” por si lo necesitas en el futuro.
