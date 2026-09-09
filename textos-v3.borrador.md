# about + metodología — borrador v3

Versión de trabajo en **castellano**. `en` y `cat` se traducen cuando esta
quede aprobada. Nada de esto ha entrado todavía en `data.json`.

Decisiones que lo gobiernan, ya cerradas:

- about vende visión, metodología quita miedo. No se pisan.
- El estudio habla en plural. El bloque de la persona habla en singular.
- El precio sale del about y se queda como una línea enlazada.
- Los datos económicos **no** se van de metodología: cambian de tono, no de sitio.
- Fórmula única en todo el sitio: `3 entregas · 1 ronda de revisión por entrega`.
- Claim arriba ("un internet más común, cercano y vivo"), manifiesto abajo
  ("un lugar donde pueden pasar cosas").
- "¿te ayudo a hacer tu rinconcito en internet?" se queda.
- "no hacemos webs para que las tengas... para que puedas quedártelas" sube a la entrada.

---

# 1. ABOUT

## la pregunta (arriba del todo)

> **¿te ayudo a hacer tu rinconcito en internet?**

## entrada (4 líneas)

somos un estudio pequeño de diseño y desarrollo web en barcelona.

hacemos webs para un internet más común, cercano y vivo.

webs desde cero para artistas, fotógrafos, músicos, colectivos y gente que trabaja por su cuenta.

no hacemos webs para que las tengas y te olvides de ellas. hacemos webs para que puedas quedártelas.

## quién está detrás

detrás de meowrhino estoy yo: manu latour. estudié en la massana y en la uab, y desde 2020 diseño y programo webs a medida desde barcelona.

trabajo contigo durante todo el proceso: la estructura la pensamos juntos, la interfaz la diseño y el código lo escribo yo. no hay plantillas — tu proyecto no tiene que caber dentro de una web que ya existe.

también hago herramientas libres para lo que me hace falta: comprimir imágenes sin subirlas a ningún servidor, generar facturas sin registro, calcular lo que de verdad cobras siendo autónom·a.

## internet puede ser otra cosa

nos gusta internet cuando todavía parece un lugar donde pueden pasar cosas.

cada vez pasamos más tiempo en plataformas que deciden cómo publicas, qué puedes enseñar y a quién le llega.

una web propia funciona de otra manera: decides qué cuentas, cómo lo cuentas y cómo se ve. no tienes que adaptarte al formato de nadie ni diseñar tu trabajo pensando en un algoritmo.

tu web puede ser sencilla, extraña, experimental, pequeña o completamente absurda. si tu portfolio tiene sentido siendo una disquetera, hacemos una disquetera.

internet es demasiado grande para que todos tengamos la misma página.

## tu web es tuya

cuando terminamos te llevas el código y los archivos.

te enseñamos a mantenerla y a cambiarla por tu cuenta. si prefieres que lo hagamos nosotros, seguimos aquí.

no queremos que dependas de nosotros para entender lo que tienes.

el día que te pelees con el servidor, con el proveedor o con nosotros, coges tus archivos y te los llevas. no hay nada que rescatar, porque nunca dejó de ser tuyo.

## cierre

si tienes una idea, aunque esté todavía un poco verde, escríbenos y la hablamos.

`webs desde 850 € + IVA · ver cómo trabajamos →`  (enlace a /metodologia)

---

# 2. METODOLOGÍA

## trabajar juntos

### 01 · hablamos

la primera reunión es gratis y no compromete a nada. empezamos por entender qué haces, qué necesitas y qué te gustaría que fuese tu web.

trae 3–5 referentes de cosas que te gusten o que no: webs, otras interfaces, bocetos en una servilleta. los miramos juntos y hablamos de estructura, estética y dinero.

antes de irnos dejamos fecha para la siguiente y una lista de lo que necesitamos de ti: textos, imágenes y tu identidad visual si la tienes.

### 02 · pensamos

con el material delante damos forma al proyecto: estructura, contenidos, estética y funcionamiento.

diseñamos contigo, no para ti.

### 03 · diseñamos

en una o dos semanas tienes una primera propuesta. la revisamos juntos y la vamos afinando hasta que tenga sentido.

tómate el tiempo que necesites para decidirte. es mucho más fácil cambiar de dirección aquí que cuando ya estamos programando.

### 04 · construimos

con el diseño aprobado empezamos a escribir código y la web empieza a existir de verdad.

aquí el diseño cambia un poco: hay que hacerlo funcionar, adaptarlo al móvil y resolver lo que aparece al construirlo. eso es parte del trabajo, no una ronda de revisión.

solemos tardar otras una o dos semanas. con el diseño y la programación seguidos, sale el mes.

### 05 · te la entregamos

nos vemos una última vez delante de tu ordenador. sales de esa reunión sabiendo actualizar tu web sin nosotros: ese es el objetivo, no un extra.

si hace falta configuramos el dominio —recomendamos cloudflare— y queda siempre a tu nombre.

### 06 · y después

el código es tuyo. puedes seguir por tu cuenta o pedirnos ayuda cuando la necesites.

no necesitas pagarnos una cuota mensual para tener una web funcionando.

## algunas cosas importantes

el proyecto dura aproximadamente un mes desde que recibimos todo el material necesario. no trabajamos con placeholders.

3 entregas · 1 ronda de revisión por entrega. cada ronda admite varios cambios; una vez enviada, lo que venga después pasa a la siguiente.

50% al cerrar el diseño · 50% al terminar la programación.

2 semanas de garantía después de la entrega. durante ese tiempo puedes avisarnos de cualquier cosa que falle.

después, 60 €/hora para cambios. y si aprendiste a tocarlo tú, no pagas.

si el proyecto queda parado más de dos semanas por falta de material, se reactiva con un 10%. te habíamos reservado un mes de agenda y tenemos que volver a hacerte hueco.

`la letra pequeña completa está en condiciones →`

---

# 3. Lo que hay que tocar además del copy

## 3.1 La fórmula de las rondas, en las cuatro apariciones

| dónde | dice ahora | pasa a decir |
|---|---|---|
| cupón portada (`welcome.cupon.*.condiciones`) | 3 rondas de revisión | 3 entregas · 1 ronda cada una |
| about (`about.es.parrafos[7]`) | tres rondas de revisión | *(desaparece: el precio sale del about)* |
| metodología (paso 4) | trabajamos en tres entregas. cada entrega incluye una ronda… | 3 entregas · 1 ronda de revisión por entrega |
| condiciones (`condiciones.html`) | 3 entregas … y una ronda de revisiones por entrega | 3 entregas · 1 ronda de revisión por entrega |

El cupón lleva la versión corta porque la línea es estrecha y va separada por `·`;
misma cuenta y mismo vocabulario, entra en el ancho.

## 3.2 Cambios de plantilla (no es solo copy)

**about** — hoy se pinta plano, `entrada[] + parrafos[]`, sin titulares:
`js/pages.js:456` y su gemelo pre-renderizado `js/easy-template.js:169`.
El borrador tiene cuatro secciones con titular, así que hace falta una forma
nueva en `data.json`:

```
about.es = {
  pregunta: "…",
  entrada: [ …4 líneas… ],
  secciones: [ { titular: "quién está detrás", parrafos: [ … ] }, … ],
  cierre: { texto: "…", precio: "850 €", enlace: "/metodologia" }
}
```

**metodología** — hoy solo pinta `pasos[]` (`js/pages.js:216`, más
`easy-template.js`). El bloque "algunas cosas importantes" no tiene sitio:

```
metodologia.es = {
  pasos: [ { titular: "hablamos", parrafos: [ … ] }, … ],
  importante: { titular: "algunas cosas importantes", parrafos: [ … ] }
}
```

Los pasos ya se numeran solos (`String(i+1).padStart(2,"0")`), así que el
`01 · 02 · 03` sale gratis y el titular pasa a ser el verbo.

## 3.3 Orden de ejecución

1. Aprobar este castellano.
2. Tocar `pages.js` + `easy-template.js` para las dos formas nuevas.
3. Escribir `es` en `data.json`, `npm run build`, mirar `/about` y `/metodologia`.
4. Traducir `en` y `cat` desde este texto (no desde la versión vieja) y volver a construir.
5. Alinear el cupón y `condiciones.html` con la fórmula única.

---

# 4. Lo que se pierde por el camino (para que sea una decisión, no un descuido)

- **"un autónomo que hace webs a sus amigas"** (del borrador v2). Es la frase más
  simpática que tienes y no entra: el about nuevo abre como estudio. Si te duele,
  su sitio sería el bloque personal, en singular.
- **"hay quien llama a esto jardines digitales"** y el párrafo del país y sus mitos.
  Los dos son buenos y los dos alargan el manifiesto justo donde conviene que sea
  corto. Candidatos a un texto propio más adelante.
- **"te enseñamos a mantenerlas y personalizarlas a tu gusto"** sale de la entrada
  y se dice, mejor, en "tu web es tuya".

---

# 5. Tres cosas que no cerré como venían propuestas

**"coges tus archivos y te vas" → "y te los llevas"**, no "y sigues por tu cuenta".
El tono desafiante había que quitarlo, de acuerdo. Pero "sigues por tu cuenta" ya
es literalmente el paso 06 ("puedes seguir por tu cuenta o pedirnos ayuda"), y
repetirlo a dos pantallas de distancia gasta la frase. "te los llevas" mantiene
el gesto físico, que es de donde viene la fuerza.

**El calendario de semanas: la idea sí, el calendario no.** "semana 1 hablamos +
pensamos" choca con la regla del material: el reloj arranca cuando llega tu
material, y la segunda reunión puede caer hasta dos semanas después de la
primera. Un calendario impreso contradiría eso. En su lugar, cada bloque lleva
su duración y el mes se suma solo: paso 03 "en una o dos semanas tienes una
primera propuesta", paso 04 "solemos tardar otras una o dos semanas". El lector
hace la cuenta sin que le prometamos un calendario que no controlamos.

**"autónom·a": es tu decisión, con el dato delante.** No es un desliz aislado:
está exactamente igual en la descripción de /links, en castellano y en catalán
(`data.json:60` y `data.json:62`), y en las dos habla de la misma herramienta.
Pero sí es la única marca de lenguaje inclusivo de todo el sitio. Quitarla del
about y dejarla en links sería lo peor de las dos opciones. O se quedan las
tres, o se van las tres. Yo las dejaría: quitarlas es una decisión más ruidosa
que mantenerlas.

---

# 6. Correcciones finales (ya publicadas)

Sobre la v3, en la ronda del 9 sep:

**metodología**
- 01: fuera "en una servilleta", más ejemplos → "webs, carteles, videojuegos,
  interfaces que hayas visto por ahí". Y fuera "antes de irnos".
- 04: "aquí el diseño cambia un poco" → "el diseño evolucionará al adaptarlo a
  móvil y a otras resoluciones posibles".
- 05: "si hace falta configuramos el dominio" → "configuramos el dominio: lo
  mejor es que esperes a comprarlo con nosotros".
- El pago pasa de **50/50** a **40/30/30**, en tres líneas separadas en vez de
  una con puntos medios: 40% al empezar (reserva el mes de agenda), 30% al
  aprobar el diseño, 30% al terminar la programación.

**condiciones**
- Mismo 40/30/30, en los tres idiomas.
- Se añade la garantía de dos semanas, que se prometía en metodología y no
  estaba por escrito en la letra pequeña.

`3 entregas · 1 ronda de revisión por entrega` mantiene su punto medio: es la
fórmula que se repite igual en tres páginas, y partirla la volvería a
desalinear.

---

# 7. Segunda ronda de correcciones (publicada)

- **La pregunta de apertura** pasa a ser el eslogan que ya se dice en todas
  partes: **"¿te hago una web?"** (`shall i make you a website?`,
  `et faig una web?`). Fuera "rinconcito".
- **Fuera el punto medio de `autónom·a`**, reformulado con el vocabulario que
  ya está en la entrada del about: "calcular lo que de verdad cobras
  **trabajando por tu cuenta**". Igual en la descripción de /links (es y cat).
  El inglés ya decía "as a freelancer" y no se toca.
- **Vuelve el 50/50**, con los dos momentos dichos por su nombre:
  "50% al confirmar el proyecto · 50% antes de la entrega final", y debajo qué
  es cada pago. Mismo texto en condiciones, en los tres idiomas.
- **El dominio y el alojamiento entran en condiciones**: quién lo compra, a
  nombre de quién queda, quién lo renueva, qué pasa si caduca y por qué no hay
  coste mensual de alojamiento.

## Sigue abierto

- **La foto de "quién está detrás".** No hay ninguna en el sitio y el hueco
  sigue ahí.
