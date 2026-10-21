# LINKS — inventario de lo que tenemos desplegado

Qué es esto: el listado de todo lo que está publicado bajo meowrhino, sacado de
las dos fuentes reales (la API de GitHub y la de Cloudflare) y cruzado con lo que
la web enlaza hoy en `data.json` y `archive-data.json`. Sirve para decidir qué
entra en la celda de links y qué no, sin tener que acordarse de memoria.

No se genera solo. Cuando se despliegue algo nuevo, se añade una entrada con la
fecha en vez de reescribir la anterior: así queda el rastro de cuándo apareció
cada cosa.

---

## 2026-09-08 — primer inventario

**Resumen**: 173 repos con GitHub Pages activo (de 212 activos), 23 subdominios de `meowrhino.studio` servidos por workers de Cloudflare, y 1 proyecto de Cloudflare Pages (`manga-reader`, sin dominio propio).

De todo eso, **45 cosas están vivas y no se enlazan desde ningún sitio de la web**.

### Cloudflare — subdominios SIN enlazar

| subdominio | link | worker |
| --- | --- | --- |
| `arwuchivo` | <https://arwuchivo.meowrhino.studio/> | `arwuchivo` |
| `ml2` | <https://ml2.meowrhino.studio/> | `mediocre-learner-gallery` |
| `ml3` | <https://ml3.meowrhino.studio/> | `mediocre-learner-gallery` |
| `notas` | <https://notas.meowrhino.studio/> | `notas` |
| `psico` | <https://psico.meowrhino.studio/> | `psico` |
| `tabarra` | <https://tabarra.meowrhino.studio/> | `tabarra` |

### GitHub Pages — repos SIN enlazar

| repo | link | nota |
| --- | --- | --- |
| `alekos` | <https://meowrhino.github.io/alekos/> |  |
| `almarbra` | <https://meowrhino.github.io/almarbra/> |  |
| `anella-olimpica` | <https://meowrhino.github.io/anella-olimpica/> |  |
| `becasDigMeow` | <https://meowrhino.github.io/becasDigMeow/> |  |
| `blobGenerator` | <https://meowrhino.github.io/blobGenerator/> |  |
| `camille` | <https://meowrhino.github.io/camille/> |  |
| `cielov0` | <https://meowrhino.github.io/cielov0/> | ⚠ Pages a medio activar |
| `elteto` | <https://meowrhino.github.io/elteto/> |  |
| `geomag` | <https://meowrhino.github.io/geomag/> |  |
| `hierbaRios` | <https://meowrhino.github.io/hierbaRios/> |  |
| `kajiura` | <https://meowrhino.github.io/kajiura/> |  |
| `laorbit` | <https://meowrhino.github.io/laorbit/> |  |
| `limpiatexto` | <https://meowrhino.github.io/limpiatexto/> | ⚠ Pages a medio activar |
| `lindaporn` | <https://meowrhino.github.io/lindaporn/> | ⚠ Pages a medio activar |
| `lisa` | <https://meowrhino.github.io/lisa/> |  |
| `meditest` | <https://meowrhino.github.io/meditest/> |  |
| `minesweeper` | <https://meowrhino.github.io/minesweeper/> |  |
| `misspepi` | <https://meowrhino.github.io/misspepi/> |  |
| `music0` | <https://meowrhino.github.io/music0/> |  |
| `networking` | <https://meowrhino.github.io/networking/> |  |
| `notas0` | <https://meowrhino.github.io/notas0/> |  |
| `notas1` | <https://meowrhino.github.io/notas1/> |  |
| `notas6` | <https://meowrhino.github.io/notas6/> |  |
| `notasX` | <https://meowrhino.github.io/notasX/> | ⚠ Pages a medio activar |
| `oriol-colomer` | <https://meowrhino.github.io/oriol-colomer/> |  |
| `pakuafun` | <https://meowrhino.github.io/pakuafun/> |  |
| `parlamalament` | <https://parlamalament.com/> | dominio propio: parlamalament.com |
| `pasatiempos` | <https://meowrhino.github.io/pasatiempos/> |  |
| `piuler` | <https://meowrhino.github.io/piuler/> |  |
| `RAADS-R_amics` | <https://meowrhino.github.io/RAADS-R_amics/> |  |
| `ragnarok` | <https://meowrhino.github.io/ragnarok/> |  |
| `randomStars2` | <https://meowrhino.github.io/randomStars2/> |  |
| `SSBCN26` | <https://meowrhino.github.io/SSBCN26/> | ⚠ Pages a medio activar |
| `studio` | <https://meowrhino.github.io/studio/> |  |
| `tallerEscocesa` | <https://meowrhino.github.io/tallerEscocesa/> |  |
| `tatara` | <https://meowrhino.github.io/tatara/> |  |
| `tfg` | <https://meowrhino.github.io/tfg/> |  |
| `ukulele` | <https://meowrhino.github.io/ukulele/> |  |
| `visualizer` | <https://meowrhino.github.io/visualizer/> |  |

---

## 2026-10-21 — archive vs Neocities vs GitHub

**Resumen**: el archive (`archive-data.json`) y el índice de Neocities (`meowrhino.neocities.org`) son la misma lista: 221 URLs en el archive, 222 externas en Neocities, y lo que difiere no son proyectos. Lo que falta por subir al archive son los **repos con Pages** de abajo (45, de los que 13 han aparecido desde el inventario de septiembre).

Hay una herramienta para esto: `meowrhino/neocitiesUpdater` (pestaña «revisar github» y «publicar» regenera Neocities, clouds, archive y studio desde un JSON único). No se ha usado aquí; este cruce está hecho a mano.

### Archive ↔ Neocities

Está en Neocities y no en el archive (nada de esto es un proyecto):

- redes y contacto: bluesky, twitter, instagram, paypal, mailto, CVs en pdf (`/CVs/cast.pdf`, `/CVs/eng.pdf`)
- `meowrhino.cargo.site/portfolio_esp` y un prototipo de portfolio en Figma
- `noancittadino.com` (el archive solo enlaza `github.io/noan`; el dominio está en clientHold)

Está en el archive y no en Neocities:

- `meowrhino.github.io/arxiu` (Neocities solo tiene `arxiu.meowrhino.studio`)

El vídeo «AI (art direction)» es el mismo en los dos, con la URL escrita distinta.

### Repos con GitHub Pages que no están ni en el archive ni en el portfolio

Nuevos desde el 2026-09-08 (13):

| repo | nota |
| --- | --- |
| `lasadcum`, `ladiegol`, `annaCarreras`, `polroig1`, `MEWS`, `descartes` | webs/proyectos nuevos |
| `almarbrav0`, `tatarav0`, `oriol-colomerv0`, `ladiegolv0` | v0 archivadas (van a *unfinished* o junto a la web) |
| `polroig-disenos`, `annaCarreras-disenos`, `almarbraSveltia` | pruebas de diseño / CMS |

Ya estaban en la lista de septiembre y siguen sin enlazar (32): `alekos`, `almarbra`, `anella-olimpica`, `becasDigMeow`, `blobGenerator`, `camille`, `cielov0`, `elteto`, `hierbaRios`, `kajiura`, `laorbit`, `lindaporn`, `lisa`, `meditest`, `minesweeper`, `misspepi`, `music0`, `notas0`, `notas1`, `notas6`, `notasX`, `oriol-colomer`, `pakuafun`, `parlamalament`, `pasatiempos`, `RAADS-R_amics`, `ragnarok`, `randomStars2`, `SSBCN26`, `tallerEscocesa`, `tfg`, `ukulele`, `visualizer`.

Enlaces del archive que apuntan a una versión vieja cuando ya hay repo nuevo: `TFG` → cargo.site (existe `meowrhino/tfg` con Pages); `piuler` → onrender (existe `piulerv2` en workers, enlazado como «piupiu»); `notas` enlaza notas…notas5 pero no notas0, notas1, notas6 ni notasX.

### Sin Pages pero publicados en otro sitio y sin enlazar

`tatara`, `wushusanchai`, `quien-no-corre-vuela`, `emilioHupe`, `manifiesto`, `fuckmarrykill`, `convertidor`, `diarioDeAbordo` (y los privados: `seres`, `petra`, `psico`, `lemuria`, `tabarra`, `meowboard`, `meowrhino-music`, `notas8`, `trackr-api`, `semillaEcommerce*`, `buscaminas-palestina`, `gontiveros-tienda`, `manga-reader`, `magical-mirai-2026`).

---

## Ya enlazados (referencia)

### Cloudflare

`arxiu`, `bici`, `chords`, `foro`, `geomag`, `lemuria`, `meowboard`, `messenger`, `networking`, `petra`, `piuler`, `profile`, `pspsps`, `rumrum`, `toctoc`, `trackr`, `twoitter`

### GitHub Pages

`5cards`, `8guafuture1`, `8guamusic1`, `a`, `ableme`, `ajutscat`, `anakatana`, `andreacarilla`, `animeTest`, `apoloASCII`, `arwuchivo`, `arxiu`, `atalanta`, `barbaraWong`, `becasDigMeow_v0`, `becasDigMeow_v1`, `blurberri`, `buddhabrot`, `calculadoraInversa`, `cards1`, `chords`, `christine`, `cielo`, `clouds`, `cloudsv0`, `colorFun`, `conor`, `contarTexto`, `diarioBarbara`, `diego3`, `diegosanmarcos`, `directorio`, `discriminationtest`, `e300`, `encuestaClientes`, `etchASketch`, `etymodict`, `faqAutonomos`, `fcyp`, `gameOfLife`, `generadorFacturas`, `grid-web-generator`, `gridChat`, `guiaSetupCloudflarePages`, `guiaSetupGithubPages`, `guiaVSCode`, `hexagramaNacimiento`, `historias`, `hopeko`, `hopeko2`, `horseLife`, `htmlDay2025`, `ichingPic`, `igChecker`, `imgTo1600x900`, `imgToNavicon`, `imgToWeb`, `instagramNameGenerator`, `investigaciones_001`, `investigaciones_002`, `investigaciones_003`, `investigaciones_004`, `jaumeclotet`, `jordis`, `jordiyordiyordyiordi`, `ladiega`, `latrini`, `letterSoup`, `linktree`, `maxito`, `messagePark`, `mikesx`, `minesweeperV2`, `mirandaperezhita`, `moixi`, `mokakopa`, `MTC`, `neolib10`, `noan`, `notas`, `notas2`, `notas3`, `notas4`, `notas5`, `oca`, `odin-recipes`, `paintOnline`, `paulabarjau`, `pdfs`, `plantitas`, `polroig`, `polroig2`, `polroig3`, `polroig4`, `poporingGenerator`, `profilePics`, `projectChat`, `quests`, `randomStars`, `receptesdelapats`, `registro`, `retals`, `rikamichie`, `rikamichiev0`, `rockPaperScissors`, `ryf`, `safeAmorx`, `safeAmorxV2`, `snerta`, `solar5`, `somnis`, `tarifas2026_DEPRECATED`, `tarifas_DEPRECATED`, `tarifasCalculadora`, `taxrhino`, `TEM`, `tinnitusRelief`, `trackerTest`, `trackr`, `trigrama`, `twinMokakopa`, `txttohtml`, `valentin`, `valentin2`, `valentin3`, `viciostorpes`, `viciostorpesV2`, `videoToLilVideo_DEPRECATED`, `videoToWeb`, `villagranota`, `VNGenerator`, `wholeSignHouseChart`, `writingapp`, `zumino`

