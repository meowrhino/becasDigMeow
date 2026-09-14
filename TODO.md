# TODO — meowrhino studio + archive

> Repasado entero el **14 sep 2026** contra el código, el DNS y los enlaces
> reales. Lo que estaba hecho se ha borrado en vez de tacharse: el historial
> está en `git log`, que no se desactualiza. Lo que queda abajo es lo que sigue
> sin hacer, verificado uno por uno.

---

## Pendiente

### 1. El SEPE ilegible en los logos de la subvención

`img/LOGOS/{NEGRO,BLANCO}/sepe.webp` mide 900×220: el archivo oficial empaqueta
Ministerio + SEPE en una caja muy ancha, así que a la altura del pie el "SEPE"
no se lee. El cumplimiento actual es válido —los cuatro logos están y se ven—,
pero de cara a la justificación final de los 18 meses conviene que se lea.

**Aviso:** una versión anterior de este fichero decía que el material de
partida (`sepe-bruto.png`, 2040×500) estaba recuperado en `img/LOGOS/`. No es
cierto: no está en el repo ni en ningún commit de la historia. Hay que volver a
sacarlo de la fuente oficial antes de poder recortarlo.

Workflow: recortar márgenes → reexportar a `.webp` en las dos tintas, mismas
dimensiones que el actual → sustituir. Sin tocar código: las rutas ya funcionan.

### 2. Proxy de Cloudflare en las webs de cliente

13 de los 17 dominios siguen sirviéndose directo desde GitHub Pages, que no
está en el registro verde de The Green Web Foundation: sacan F en Website
Carbon por dónde se sirven los bytes, no por lo que pesan. La tabla y los pasos
están en [cloudflarePROXY.md](cloudflarePROXY.md), reverificada por DNS hoy.

Es trabajo de panel, no de código, y depende de tener acceso al Cloudflare de
cada cliente. 1 click en los 9 que ya tienen el DNS en Cloudflare; los otros 4
hay que migrarlos primero.

### 3. Thumbnails del portfolio *(opcional, rentabilidad baja)*

La rejilla carga las capturas a tamaño completo. Hoy: 62 imágenes, 6,1 MB en
total, 98 KB de media, 280 KB la mayor — y ya hay lazy loading real (nada se
descarga hasta activar el portfolio) y recompresión hecha (`-33%`, ago 2026).
Generar derivados pequeños ahorraría poco y añade un paso de build y otra
copia de cada imagen. Queda apuntado, no recomendado.

### 4. Decidir qué más quiere el welcome

La celda cambió de arriba abajo en agosto: donde había un hint de navegación
ahora hay dos tarjetas de proyecto que rebotan. Las ideas viejas siguen sin
hacer, pero hay que decidir si aún se quieren con el welcome de ahora:

- Nombres del equipo (paula, miranda, andrea, jaume) enlazando a sus formateadores
- Animación tipográfica del título (letras secuenciales, cursor, glitch suave)
- Logo o ASCII art del meowrhino
- Links rápidos (instagram, email, portfolio)

---

## Lo que está hecho

Resumen de dónde está cada cosa, para no volver a buscarla. El detalle, en los
comentarios de cabecera de cada módulo, que son largos a propósito.

**El lienzo** — `main.js` monta la rejilla; `navigation.js` la recorre;
`mapa.js` deja recolocar las secciones y guarda el reparto por pestaña;
`rutas.js` traduce celda ↔ URL. Cada celda es una página con su propia
dirección y su propio SEO.

**Las páginas lineales** — `easy-template.js` + `build-seo.js` generan /about,
/metodologia, /condiciones, /proyectos, /mapa y las 63 fichas de proyecto en
tres idiomas, más el sitemap. `npm run build` las regenera. El prefijo `easy-`
de las clases viene de /easy, la página única que las precedió y que hoy
redirige a /metodologia (ver `_redirects`).

**Los textos** — about (el porqué) y metodología (el cómo) se reescribieron en
septiembre a partir de `textos-v3.borrador.md`, ya volcado a `data.json`.
Fórmula única en todo el sitio: 3 entregas · 1 ronda de revisión por entrega.

**Lo demás** — tema claro/oscuro con anti-flash, i18n es/en/cat completa,
accesibilidad (skip-nav, aria, focus-visible, reduced-motion), preloader con
skeleton, buscaminas en la casilla bajo el mapa, y `archive.html` como sitio
aparte con su propio main.

---

## Otros documentos

| Fichero | Qué es | Estado |
|---|---|---|
| [LINKS.md](LINKS.md) | Inventario de todo lo desplegado bajo meowrhino | Al día (8 sep) |
| [cloudflarePROXY.md](cloudflarePROXY.md) | Tabla de proxy por dominio + pasos | Reverificada 14 sep |
| [gbp-kit.md](gbp-kit.md) | Copiar-pegar para el alta en Google Business Profile | Sin usar aún |
| `textos-*.borrador.md` | Borradores de los textos, ya volcados a data.json | Consumidos |
