(() => {
  // —————————————————————————
  // 1) UTILIDADES
  // —————————————————————————

  const qs = (sel) => document.querySelector(sel);
  const qsa = (sel) => Array.from(document.querySelectorAll(sel));

  // Genera un número aleatorio entre min y max
  const randomBetween = (min, max) => Math.random() * (max - min) + min;

  // Función que genera parámetros aleatorios para las nubes
  function getRandomCloudParams() {
    let minW = randomBetween(40, 250);
    let maxW = randomBetween(400, 600);
    if (minW > maxW) [minW, maxW] = [maxW, minW];

    // Detectar si es móvil (ancho menor a 600px)
    const isMobile = window.innerWidth <= 600;

    const count = isMobile
      ? Math.floor(randomBetween(20, 35))
      : Math.floor(randomBetween(50, 120));

    return {
      count,
      minWidth: minW,
      maxWidth: maxW,
      durationRange: [randomBetween(12, 20), randomBetween(22, 30)],
    };
  }

  // Vacía un contenedor de forma performante
  function clearContainer(container) {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  }

  // —————————————————————————
  // 2) GESTIÓN DE TEMA
  // —————————————————————————

  const themeBtn = qs("#toggleTheme");
  const root = document.documentElement;

  // Orden nuevo: de claro a oscuro
  const themes = ["light", "dark"];
  const emojis = {
    light: "⚪️",
    dark: "⚫️",
  };

  let currentThemeIndex = Math.max(
    0,
    themes.indexOf(root.getAttribute("data-theme"))
  );

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    themeBtn.textContent = emojis[theme] || "🎛️";
    currentThemeIndex = themes.indexOf(theme);
  }

  themeBtn.addEventListener("click", () => {
    currentThemeIndex = (currentThemeIndex + 1) % themes.length;
    const nextTheme = themes[currentThemeIndex];
    applyTheme(nextTheme);
  });

  const CITY_TIMEZONE = "Europe/Madrid";
  const SUNLIGHT_DATA_URL = "data/sunlight.json";
  const SUNLIGHT_CACHE_KEY = "sunlight:data";
  const SUNLIGHT_CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4h
  const madridFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: CITY_TIMEZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  function partsToObj(parts) {
    return parts.reduce((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});
  }

  function getMadridNow() {
    const parts = partsToObj(madridFormatter.formatToParts(new Date()));
    const isoDate = `${parts.year}-${parts.month}-${parts.day}`;
    const seconds =
      Number(parts.hour) * 3600 +
      Number(parts.minute) * 60 +
      Number(parts.second);
    return { isoDate, seconds };
  }

  function getMadridSecondsFromUtc(utcString) {
    const parts = partsToObj(
      madridFormatter.formatToParts(new Date(utcString))
    );
    return (
      Number(parts.hour) * 3600 +
      Number(parts.minute) * 60 +
      Number(parts.second)
    );
  }

  function getCachedSunlight({ allowExpired = false } = {}) {
    try {
      const raw = localStorage.getItem(SUNLIGHT_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.timestamp !== "number" || !parsed.payload)
        return null;
      if (
        !allowExpired &&
        Date.now() - parsed.timestamp > SUNLIGHT_CACHE_TTL_MS
      )
        return null;
      return parsed;
    } catch (err) {
      console.warn("⚠️ Cache de sunlight.json corrupta, se ignora", err);
      return null;
    }
  }

  function cacheSunlightPayload(payload) {
    try {
      const record = { timestamp: Date.now(), payload };
      localStorage.setItem(SUNLIGHT_CACHE_KEY, JSON.stringify(record));
    } catch (err) {
      console.warn("⚠️ No se pudo cachear sunlight.json", err);
    }
  }

  async function loadSunlightPayload() {
    const cached = getCachedSunlight();
    if (cached) return cached.payload;
    try {
      const res = await fetch(SUNLIGHT_DATA_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`sunlight.json responded ${res.status}`);
      const payload = await res.json();
      cacheSunlightPayload(payload);
      return payload;
    } catch (networkErr) {
      const stale = getCachedSunlight({ allowExpired: true });
      if (stale) {
        console.warn(
          "⚠️ Usando sunlight.json cacheado (expirado) por error de red",
          networkErr
        );
        return stale.payload;
      }
      throw networkErr;
    }
  }

  async function checkSunBarcelona() {
    try {
      const payload = await loadSunlightPayload();
      const { isoDate, seconds: nowSeconds } = getMadridNow();
      const info = payload?.days?.[isoDate];
      if (!info || !info.sunriseUtc || !info.sunsetUtc) {
        throw new Error(`Missing sunlight data for ${isoDate}`);
      }
      const sunriseSeconds = getMadridSecondsFromUtc(info.sunriseUtc);
      const sunsetSeconds = getMadridSecondsFromUtc(info.sunsetUtc);
      const isDaylight =
        nowSeconds >= sunriseSeconds && nowSeconds < sunsetSeconds;
      applyTheme(isDaylight ? "light" : "dark");
    } catch (err) {
      console.warn("⚠️ No se pudo leer sunlight.json, usando hora local", err);
      const hour = new Date().getHours();
      const fallbackTheme = hour >= 7 && hour < 19 ? "light" : "dark";
      applyTheme(fallbackTheme);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    checkSunBarcelona();
  });

  // —————————————————————————
  // 3) GESTIÓN DE NUBES
  // —————————————————————————

  const bgContainer = qs("#backgroundContainer");

  // Parámetros por defecto (podrías leer estos valores de CSS custom props si prefieres)
  let cloudParams = getRandomCloudParams();

  // Genera un único div.cloud con estilos aleatorios
  function createCloud(params) {
    const cloud = document.createElement("div");
    cloud.className = "cloud";

    const w = randomBetween(params.minWidth, params.maxWidth);
    cloud.style.width = `${w}px`;
    cloud.style.height = `${w * randomBetween(0.6, 0.8)}px`;
    cloud.style.top = `${randomBetween(-10, 110)}%`;
    cloud.style.left = `${randomBetween(-10, 110)}%`;
    // Opacidad fija (100%)
    cloud.style.opacity = "1";

    cloud.style.animationDuration = `${randomBetween(
      ...params.durationRange
    )}s`;
    cloud.style.animationDelay = `${randomBetween(0, 5)}s`;
    // randomBetween(1, 5) devuelve [1,5), con floor => 1..4 (incluye float4)
    cloud.style.animationName = `float${Math.floor(randomBetween(1, 5))}`;

    return cloud;
  }

  // Genera todas las nubes usando un DocumentFragment
  function generateClouds(params) {
    clearContainer(bgContainer);

    const frag = document.createDocumentFragment();
    for (let i = 0; i < params.count; i++) {
      frag.appendChild(createCloud(params));
    }
    bgContainer.appendChild(frag);
  }

  // Inicializa
  generateClouds(cloudParams);

  // Randomizar parámetros
  qs("#randomizeClouds").addEventListener("click", () => {
    cloudParams = getRandomCloudParams();
    generateClouds(cloudParams);
  });
})();

/* ==========================
       BLOQUE MULTILENGUAJE
       ========================== */

const websRealizadas = [
  {
    nombre: "andrea carilla",
    carpeta: "andreacarilla",
    link: "https://meowrhino.github.io/andreacarilla/",
    movilPos: "left",
    imgQuantity: 5,
    textoES:
      "portfolio online y archivo de <a target='_blank' href='https://meowrhino.github.io/andreacarilla/'>andrea</a>. La página principal se divide en una galería y una nube de links con opciones de filtrado por categorías.",
    textoEN:
      "<a target='_blank' href='https://meowrhino.github.io/andreacarilla/'>andrea</a>'s online portfolio and archive. The homepage combines a gallery with a link cloud and category filters.",
    textoFR:
      "portfolio en ligne et archive d'<a target='_blank' href='https://meowrhino.github.io/andreacarilla/'>andrea</a>. La page d’accueil mêle une galerie et un nuage de liens avec des filtres par catégorie.",
    textoCAT:
      "portfolio en línia i arxiu de la fotògrafa <a target='_blank' href='https://meowrhino.github.io/andreacarilla/'>andrea</a>. La portada combina una galeria i un núvol d’enllaços amb filtres per categories.",
  },

  {
    nombre: "miranda perez-hita",
    carpeta: "mph",
    link: "https://mirandaperezhita.com/",
    movilPos: "left",
    imgQuantity: 5,
    textoES:
      "portfolio de diseño gráfico de <a target='_blank' href='https://mirandaperezhita.com/'>miranda</a>. Se compone de un scroll y menú de navegación responsive con idiomas y colores según proyecto.",
    textoEN:
      "<a target='_blank' href='https://mirandaperezhita.com/'>miranda</a>'s graphic design portfolio. It features a scroll-based layout and a responsive navigation menu with language options and project-specific color themes.",
    textoFR:
      "portfolio de design graphique de <a target='_blank' href='https://mirandaperezhita.com/'>miranda</a>. Il propose une page à défilement continu et un menu de navigation responsive avec gestion des langues et des couleurs selon le projet.",
    textoCAT:
      "portfolio de disseny gràfic de <a target='_blank' href='https://mirandaperezhita.com/'>miranda</a>. Presenta un scroll i un menú de navegació responsive amb idiomes i colors segons cada projecte.",
  },

  {
    nombre: "christine",
    carpeta: "christine",
    link: "https://meowrhino.github.io/christine/",
    movilPos: "left",
    imgQuantity: 4,
    textoES:
      "web brújula para explorar el universo de <a target='_blank' href='https://meowrhino.github.io/christine/'>christine</a>. Los proyectos se disponen en coordenadas en 4 ejes y se eligen 2 para poblar el gráfico.",
    textoEN:
      "compass-like website to explore <a target='_blank' href='https://meowrhino.github.io/christine/'>christine</a>’s universe. Projects live on four axes; two are chosen to populate the chart.",
    textoFR:
      "site-boussole pour explorer l’univers de <a target='_blank' href='https://meowrhino.github.io/christine/'>christine</a>. Les projets se placent sur 4 axes et deux alimentent le graphique.",
    textoCAT:
      "web brúixola per explorar l’univers de <a target='_blank' href='https://meowrhino.github.io/christine/'>christine</a>. Els projectes es distribueixen en 4 eixos i se’n trien 2 per poblar el gràfic.",
  },

  {
    nombre: "mikesx",
    carpeta: "mikesx",
    link: "https://mikebros.com/",
    movilPos: "left",
    imgQuantity: 5,
    textoES:
      "portfolio temático del diseñador gráfico <a target='_blank' href='https://mikebros.com/'>mikesx</a>. La home simula una stack de CD's que se repite infinitamente, cada uno contiene una galería con sus imágenes",
    textoEN:
      "<a target='_blank' href='https://mikebros.com/'>mikesx</a>'s thematic portfolio. The homepage simulates an infinite stack of CDs, each containing a gallery with his images.",
    textoFR:
      "portfolio thématique du graphiste <a target='_blank' href='https://mikebros.com/'>mikesx</a>. La page d’accueil simule une pile infinie de CD, chacun contenant une galerie avec ses images.",
    textoCAT:
      "portfolio temàtic del dissenyador gràfic <a target='_blank' href='https://mikebros.com/'>mikesx</a>. La portada simula una pila infinita de CD's, cadascun amb una galeria amb les seves imatges.",
  },

  {
    nombre: "estructuras3000",
    carpeta: "e3000",
    link: "https://meowrhino.github.io/e300/",
    movilPos: "left",
    imgQuantity: 7,
    textoES:
      "web oficial del colectivo <a target='_blank' href='https://meowrhino.github.io/e300/'>estructuras3000</a>.",
    textoEN:
      "official website of the collective <a target='_blank' href='https://meowrhino.github.io/e300/'>estructuras3000</a>.",
    textoFR:
      "site officiel du collectif <a target='_blank' href='https://meowrhino.github.io/e300/'>estructuras3000</a>.",
    textoCAT:
      "web oficial del col·lectiu <a target='_blank' href='https://meowrhino.github.io/e300/'>estructuras3000</a>.",
  },

  {
    nombre: "hifas studio",
    carpeta: "hifasstudio",
    link: "https://meowrhino.github.io/anakatana/",
    movilPos: "left",
    imgQuantity: 7,
    textoES:
      "ecommerce funcional para la tienda <a target='_blank' href='https://meowrhino.github.io/anakatana/'>hifas studio</a> con panel de administración, registro de transacciones y cobros vía Stripe.",
    textoEN:
      "functional ecommerce for <a target='_blank' href='https://meowrhino.github.io/anakatana/'>hifas studio</a> with admin panel, transaction logging and Stripe payments.",
    textoFR:
      "e-commerce fonctionnel pour <a target='_blank' href='https://meowrhino.github.io/anakatana/'>hifas studio</a> avec panneau d’admin, journal des transactions et paiements Stripe.",
    textoCAT:
      "ecommerce funcional per a <a target='_blank' href='https://meowrhino.github.io/anakatana/'>hifas studio</a> amb panell d’administració, registre de transaccions i pagaments amb Stripe.",
  },

  {
    nombre: "berta esteve",
    carpeta: "bertaesteve",
    link: "https://meowrhino.github.io/snerta/",
    movilPos: "left",
    imgQuantity: 6,
    textoES:
      "archivo profesional de la curadora <a target='_blank' href='https://meowrhino.github.io/snerta/'>berta esteve</a> que se divide en una home scrolleable y un archivo de proyectos que puede actualizar ella misma.",
    textoEN:
      "professional archive of curator <a target='_blank' href='https://meowrhino.github.io/snerta/'>berta esteve</a>, featuring a scrollable home and a project archive she can update herself.",
    textoFR:
      "archives professionnelles de la curatrice <a target='_blank' href='https://meowrhino.github.io/snerta/'>berta esteve</a>, avec une page d’accueil défilante et un archive de projets qu’elle peut mettre à jour.",
    textoCAT:
      "arxiu professional de la curadora <a target='_blank' href='https://meowrhino.github.io/snerta/'>berta esteve</a>, amb una home desplaçable i un arxiu de projectes que pot actualitzar ella mateixa.",
  },

  {
    nombre: "jaumeclotet",
    carpeta: "jaumeclotet",
    link: "https://meowrhino.github.io/jaumeclotet/",
    movilPos: "left",
    imgQuantity: 4,
    textoES:
      "página oficial del artista <a target='_blank' href='https://meowrhino.github.io/jaumeclotet/'>jaumeclotet</a> donde se destacan 6 proyectos de su archivo y una sorpresa cuando has visto todos.",
    textoEN:
      "<a target='_blank' href='https://meowrhino.github.io/jaumeclotet/'>jaumeclotet</a>'s official page, highlighting 6 archive projects and a surprise once you’ve seen them all.",
    textoFR:
      "page officielle de l’artiste <a target='_blank' href='https://meowrhino.github.io/jaumeclotet/'>jaumeclotet</a> avec 6 projets mis en avant et une surprise quand tu les as tous vus.",
    textoCAT:
      "pàgina oficial de l’artista <a target='_blank' href='https://meowrhino.github.io/jaumeclotet/'>jaumeclotet</a> amb 6 projectes destacats i una sorpresa quan els hagis vist tots.",
  },

  {
    nombre: "erikamichi",
    carpeta: "rikamichie",
    link: "https://meowrhino.github.io/rikamichie/",
    movilPos: "left",
    imgQuantity: 7,
    textoES:
      "sitio web de <a target='_blank' href='https://meowrhino.github.io/rikamichie/'>rikamichie</a> donde se combinan todas sus disciplinas en una cruz navegable dividida en 6 pantallas.",
    textoEN:
      " <a target='_blank' href='https://meowrhino.github.io/rikamichie/'>rikamichie</a>'s website where she puts together all her disciplines in a navigable cross split into 6 screens.",
    textoFR:
      "site de <a target='_blank' href='https://meowrhino.github.io/rikamichie/'>rikamichie</a> combinant toutes ses disciplines dans une croix navigable en 6 écrans.",
    textoCAT:
      "lloc web de <a target='_blank' href='https://meowrhino.github.io/rikamichie/'>rikamichie</a> on es combinen totes les seves disciplines en una creu navegable dividida en 6 pantalles.",
  },

  {
    nombre: "villagranota",
    carpeta: "villagranota",
    link: "https://meowrhino.github.io/villagranota/",
    movilPos: "left",
    imgQuantity: 6,
    textoES:
      "statement online del colectivo <a target='_blank' href='https://meowrhino.github.io/villagranota/'>villagranota</a> por el código libre, divertido y honesto. Un pequeño estanque digital.",
    textoEN:
      "<a target='_blank' href='https://meowrhino.github.io/villagranota/'>villagranota</a>'s online statement for free, fun and honest code. A small digital pond.",
    textoFR:
      "déclaration en ligne du collectif <a target='_blank' href='https://meowrhino.github.io/villagranota/'>villagranota</a> pour un code libre, ludique et honnête. Un petit étang numérique.",
    textoCAT:
      "manifest en línia del col·lectiu <a target='_blank' href='https://meowrhino.github.io/villagranota/'>villagranota</a> pel codi lliure, divertit i honest. Un petit estany digital.",
  },

  {
    nombre: "elmundodelasjordis.com",
    carpeta: "jordis",
    link: "https://elmundodelasjordis.com/",
    movilPos: "left",
    imgQuantity: 5,
    textoES:
      "página oficial de <a target='_blank' href='https://elmundodelasjordis.com/'>las jordis</a>. Contiene 4 secciones con editores de texto integrados para que podamos seguir 'keeping up' con sus aventuras.",
    textoEN:
      "official page of <a target='_blank' href='https://elmundodelasjordis.com/'>las jordis</a>. It contains four sections with integrated text editors so we can keep up with their adventures.",
    textoFR:
      "page officielle de <a target='_blank' href='https://elmundodelasjordis.com/'>las jordis</a>. Elle comporte quatre sections avec des éditeurs de texte intégrés pour que nous puissions suivre leurs aventures.",
    textoCAT:
      "pàgina oficial de <a target='_blank' href='https://elmundodelasjordis.com/'>les jordis</a>. Conté quatre seccions amb editors de text integrats perquè puguem seguir les seves aventures.",
  },
];

const LANGS = ["ES", "EN", "FR", "CAT"];

const textosMain = {
  ES: {
    whyTitle: "por qué una web propia?",
    whyP1:
      "porque no quieres vivir de alquiler dentro de las plataformas; porque crees en el código abierto; porque quieres apoyar la propuesta de una amiga; para recuperar la propiedad de tu identidad en línea; para jugar y explorar espacios nuevos; para escapar de cuadrículas, vigilancia y censura; para no quedarte sin cuenta de un día para otro; para dejar de pagar suscripciones que no te hacen falta; porque piensas demasiado en la tecnocracia/tecnofeudalismo…",
    whyP2:
      "internet nació como bien común y la queremos descentralizada, local, compartida y —sobre todo— divertida.",
    ctaText: "¡quiero una web!",
    ctaSubject: "¡quiero una web!",
  },
  EN: {
    whyTitle: "why a website of your own?",
    whyP1:
      "because you don’t want to live “renting” inside platforms; because you believe in open‑source; because you want to support a friend’s proposal; to reclaim ownership of your online identity; to play and explore new spaces; to escape grids, surveillance and censorship; to not lose your account overnight; to stop paying subscriptions you don’t need; because you think too much about technocracy/techno‑feudalism…",
    whyP2:
      "the internet was born as a commons, and we want it decentralized, local, shared and—above all—fun.",
    ctaText: "i want a website!",
    ctaSubject: "i want a website!",
  },
  FR: {
    whyTitle: "pourquoi un site à toi ?",
    whyP1:
      "parce que tu ne veux plus vivre en location dans les plateformes ; parce que tu crois au logiciel libre ; parce que tu veux soutenir la proposition d’une amie ; pour reprendre la propriété de ton identité en ligne ; pour jouer et explorer de nouveaux espaces ; pour échapper aux grilles, à la surveillance et à la censure ; pour ne pas te retrouver sans compte du jour au lendemain ; pour arrêter de payer des abonnements inutiles ; parce que tu penses trop à la technocratie/techno‑féodalisme…",
    whyP2:
      "internet est né comme un bien commun et nous le voulons décentralisé, local, partagé et —surtout— ludique.",
    ctaText: "je veux un site web!",
    ctaSubject: "je veux un site web!",
  },
  CAT: {
    whyTitle: "per què una web pròpia?",
    whyP1:
      "perquè vols deixar de viure de lloguer dins les plataformes; perquè creus en el codi obert; perquè vols donar suport a la proposta d’una amiga; per recuperar la propietat de la teva identitat en línia; per jugar i explorar espais nous; per escapar de graelles, vigilància i censura; per no quedar-te sense compte d’un dia per l’altre; per deixar de pagar subscripcions que no et calen; perquè pensas massa en la tecnocracia/tecnofeudalisme”...",
    whyP2:
      "internet va néixer com un bé comú i la volem descentralitzada, local, compartida i —sobretot— divertida.",
    ctaText: "vull una web!",
    ctaSubject: "vull una web!",
  },
};

function appendSafeRichText(target, html = "") {
  if (!html) return;
  const temp = document.createElement("div");
  temp.innerHTML = html;
  Array.from(temp.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      target.appendChild(document.createTextNode(node.textContent));
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "A") {
      const safeLink = document.createElement("a");
      const href = node.getAttribute("href");
      if (href) safeLink.href = href;
      const targetAttr = node.getAttribute("target");
      if (targetAttr) safeLink.target = targetAttr;
      safeLink.rel = node.getAttribute("rel") || "noopener noreferrer";
      safeLink.textContent = node.textContent;
      target.appendChild(safeLink);
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "BR") {
      target.appendChild(document.createElement("br"));
      return;
    }
    target.appendChild(document.createTextNode(node.textContent));
  });
}

// Priorizar webp para probar conversiones ligeras, con fallback a formatos existentes
const MULTI_IMAGE_EXTENSIONS = ["webp", "jpeg", "jpg", "png"];
const SINGLE_IMAGE_EXTENSIONS = ["webp", "png", "jpg", "jpeg"];
const imageExtensionCache = new Map();

function getImageCacheKey(folder, device, qty) {
  return `${folder}|${device}|${qty > 1 ? "multi" : "single"}`;
}

function getImageBasePath(folder, device, idx, qty) {
  const suffix = qty > 1 ? `-${(idx % qty) + 1}` : "";
  return `galeria/${folder}/${device}${suffix}`;
}

function getExtensionCandidates(folder, device, qty) {
  const defaults = qty > 1 ? MULTI_IMAGE_EXTENSIONS : SINGLE_IMAGE_EXTENSIONS;
  const key = getImageCacheKey(folder, device, qty);
  if (!imageExtensionCache.has(key)) {
    return defaults.slice();
  }
  const cached = imageExtensionCache.get(key);
  return [cached, ...defaults.filter((ext) => ext !== cached)];
}

function resolveImageSrc(folder, device, idx, qty) {
  const base = getImageBasePath(folder, device, idx, qty);
  const candidates = getExtensionCandidates(folder, device, qty);
  return `${base}.${candidates[0]}`;
}

function getPlaceholderForDevice(device) {
  return device === "ordenador"
    ? "galeria/_placeholder/ordenador.png"
    : "galeria/_placeholder/movil.png";
}

function setImageSrcWithFallback(imgEl, folder, device, idx, qty, onLoad) {
  const base = getImageBasePath(folder, device, idx, qty);
  const key = getImageCacheKey(folder, device, qty);
  const candidates = getExtensionCandidates(folder, device, qty);
  let attempt = 0;
  imgEl.dataset.folder = folder;
  imgEl.dataset.device = device;
  imgEl.dataset.qty = String(qty);
  imgEl.dataset.currentIndex = String(idx);

  const tryNext = () => {
    if (attempt >= candidates.length) {
      imgEl.src = getPlaceholderForDevice(device);
      if (typeof onLoad === "function") onLoad();
      return;
    }
    const ext = candidates[attempt++];
    const src = `${base}.${ext}`;
    const handleLoad = () => {
      cleanup();
      imageExtensionCache.set(key, ext);
      if (typeof onLoad === "function") onLoad();
    };
    const handleError = () => {
      cleanup();
      tryNext();
    };
    const cleanup = () => {
      imgEl.removeEventListener("load", handleLoad);
      imgEl.removeEventListener("error", handleError);
    };
    imgEl.addEventListener("load", handleLoad, { once: true });
    imgEl.addEventListener("error", handleError, { once: true });
    imgEl.src = src;
  };

  tryNext();
}

function crearGaleria(webs, lang = "ES") {
  const contenedor = document.getElementById("galeriaWebs");
  contenedor.textContent = "";
  webs.forEach((web) => {
    const article = document.createElement("article");
    article.className = "web-card";
    const texto = web[`texto${lang}`] || web.textoES || "";
    const altDesktop = {
      ES: `vista escritorio de ${web.nombre}`,
      EN: `desktop view of ${web.nombre}`,
      FR: `aperçu bureau de ${web.nombre}`,
      CAT: `vista d'escriptori de ${web.nombre}`,
    }[lang];

    const altMobile = {
      ES: `vista móvil de ${web.nombre}`,
      EN: `mobile view of ${web.nombre}`,
      FR: `aperçu mobile de ${web.nombre}`,
      CAT: `vista mòbil de ${web.nombre}`,
    }[lang];
    const qty = web.imgQuantity || 1;

    const preview = document.createElement("div");
    preview.className = `web-preview ${
      web.movilPos === "right" ? "movil-derecha" : "movil-izquierda"
    }`;
    preview.dataset.folder = web.carpeta;
    preview.dataset.qty = String(qty);

    const desktopImg = document.createElement("img");
    desktopImg.alt = altDesktop;
    desktopImg.className = "img-ordenador img-fade";
    desktopImg.loading = "lazy";
    desktopImg.decoding = "async";

    const mobileImg = document.createElement("img");
    mobileImg.alt = altMobile;
    mobileImg.className = "img-movil img-fade";
    mobileImg.loading = "lazy";
    mobileImg.decoding = "async";
    setImageSrcWithFallback(desktopImg, web.carpeta, "ordenador", 0, qty);
    setImageSrcWithFallback(mobileImg, web.carpeta, "movil", 0, qty);

    preview.appendChild(desktopImg);
    preview.appendChild(mobileImg);

    // Event listeners para fullscreen
    desktopImg.addEventListener('click', () => {
      openFullscreen(web.carpeta, qty, 'ordenador', 0);
    });
    mobileImg.addEventListener('click', () => {
      openFullscreen(web.carpeta, qty, 'movil', 0);
    });

    // Añadir controles e indicadores si hay más de 1 imagen
    if (qty > 1) {
      const controls = document.createElement('div');
      controls.className = 'slideshow-controls';

      const prevBtn = document.createElement('button');
      prevBtn.className = 'slideshow-btn prev-btn';
      prevBtn.setAttribute('aria-label', 'Imagen anterior');
      prevBtn.textContent = '◀';

      const pauseBtn = document.createElement('button');
      pauseBtn.className = 'slideshow-btn pause-btn';
      pauseBtn.setAttribute('aria-label', 'Pausar slideshow');
      pauseBtn.textContent = '⏸';

      const nextBtn = document.createElement('button');
      nextBtn.className = 'slideshow-btn next-btn';
      nextBtn.setAttribute('aria-label', 'Imagen siguiente');
      nextBtn.textContent = '▶';

      const indicators = document.createElement('div');
      indicators.className = 'slide-indicators';
      for (let i = 0; i < qty; i++) {
        const dot = document.createElement('span');
        dot.className = 'dot';
        if (i === 0) dot.classList.add('active');
        dot.setAttribute('aria-label', `Ir a imagen ${i + 1}`);
        indicators.appendChild(dot);
      }

      // Wrapper para los botones
      const buttonsWrapper = document.createElement('div');
      buttonsWrapper.className = 'controls-buttons';
      buttonsWrapper.appendChild(prevBtn);
      buttonsWrapper.appendChild(pauseBtn);
      buttonsWrapper.appendChild(nextBtn);

      controls.appendChild(buttonsWrapper);
      controls.appendChild(indicators);
      preview.appendChild(controls);
    }

    const textDiv = document.createElement("div");
    textDiv.className = "web-texto";
    if (/<a\b/i.test(texto)) {
      appendSafeRichText(textDiv, texto);
    } else {
      textDiv.textContent = texto;
    }

    article.appendChild(preview);
    article.appendChild(textDiv);
    contenedor.appendChild(article);
  });
}

// ==========================
// Slideshow con "respirar", efecto ola y controles
// ==========================
const SLIDESHOW_CONFIG = {
  intervalMs: 4500, // intervalo fijo entre cambios (ajusta aquí); pon null para cálculo automático
  minInterval: 3500, // usado solo si intervalMs es null
  basePerCard: 800, // usado solo si intervalMs es null
  breathingDuration: 900, // duración del efecto breathing
  fadeDuration: 250, // duración del fade
};

const TOTAL_WEB_COUNT = websRealizadas.length; // cache: no hace falta contar DOM cada vez
const slideControllers = new Map();
let intersectionObserver = null;

function preload(folder, device, idx, qty) {
  const im = new Image();
  im.decoding = "async";
  im.loading = "eager";
  im.src = resolveImageSrc(folder, device, idx, qty);
}

function swapSrcWithFade(imgEl, folder, device, idx, qty) {
  imgEl.classList.add("is-hidden");
  requestAnimationFrame(() => {
    setImageSrcWithFallback(imgEl, folder, device, idx, qty, () => {
      imgEl.classList.remove("is-hidden");
    });
  });
}

function resetSlides() {
  slideControllers.forEach((controller) => controller.destroy());
  slideControllers.clear();
  if (intersectionObserver) {
    intersectionObserver.disconnect();
    intersectionObserver = null;
  }
}

function getIntervalMs(totalCards) {
  if (Number.isFinite(SLIDESHOW_CONFIG.intervalMs) && SLIDESHOW_CONFIG.intervalMs > 0) {
    return SLIDESHOW_CONFIG.intervalMs;
  }
  return Math.max(
    SLIDESHOW_CONFIG.minInterval,
    totalCards * SLIDESHOW_CONFIG.basePerCard
  );
}

function createSlideController(folder, qty, desk, mob, card, startDelay, intervalMs) {
  let cur = 0;
  let intervalId = null;
  let timeoutId = null;
  let isPaused = true;  // Empezar pausado por defecto
  let isVisible = false;

  const pauseBtn = card.querySelector(".pause-btn");
  const prevBtn = card.querySelector(".prev-btn");
  const nextBtn = card.querySelector(".next-btn");
  const indicators = Array.from(card.querySelectorAll(".slide-indicators .dot"));
  const indicatorHandlers = indicators.map((dot, index) => ({
    dot,
    handler: () => goToSlide(index),
  }));

  function updateIndicators() {
    indicators.forEach((dot, i) => {
      dot.classList.toggle("active", i === cur);
    });
  }

  function breathe() {
    desk.classList.add("breathing");
    mob.classList.add("breathing");
    setTimeout(() => {
      desk.classList.remove("breathing");
      mob.classList.remove("breathing");
    }, SLIDESHOW_CONFIG.breathingDuration);
  }

  function showSlide(index) {
    breathe();
    preload(folder, "ordenador", index, qty);
    preload(folder, "movil", index, qty);
    cur = index;
    swapSrcWithFade(desk, folder, "ordenador", cur, qty);
    swapSrcWithFade(mob, folder, "movil", cur, qty);
    updateIndicators();
  }

  function advance() {
    if (document.hidden || !isVisible) return;
    const next = (cur + 1) % qty;
    showSlide(next);
  }

  function goToSlide(index) {
    if (index === cur) return;
    showSlide(index);
  }

  function prev() {
    const prevIndex = (cur - 1 + qty) % qty;
    goToSlide(prevIndex);
  }

  function next() {
    const nextIndex = (cur + 1) % qty;
    goToSlide(nextIndex);
  }

  function start() {
    if (intervalId || timeoutId || isPaused || !isVisible) return;
    timeoutId = setTimeout(() => {
      timeoutId = null;
      advance();
      intervalId = setInterval(advance, intervalMs);
    }, startDelay);
  }

  function clearTimers() {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function pause() {
    isPaused = true;
    clearTimers();
    if (pauseBtn) {
      pauseBtn.textContent = "▶";
      pauseBtn.classList.add("paused");
    }
  }

  function resume() {
    isPaused = false;
    if (pauseBtn) {
      pauseBtn.textContent = "⏸";
      pauseBtn.classList.remove("paused");
    }
    if (isVisible) start();
  }

  function togglePause() {
    if (isPaused) {
      resume();
    } else {
      pause();
    }
  }

  function setVisible(visible) {
    isVisible = visible;
    if (visible && !isPaused) {
      start();
    } else if (!visible) {
      clearTimers();
    }
  }

  function destroy() {
    clearTimers();
    if (pauseBtn) pauseBtn.removeEventListener("click", togglePause);
    if (prevBtn) prevBtn.removeEventListener("click", prev);
    if (nextBtn) nextBtn.removeEventListener("click", next);
    indicatorHandlers.forEach(({ dot, handler }) => {
      dot.removeEventListener("click", handler);
    });
  }

  if (pauseBtn) pauseBtn.addEventListener("click", togglePause);
  if (prevBtn) prevBtn.addEventListener("click", prev);
  if (nextBtn) nextBtn.addEventListener("click", next);
  indicatorHandlers.forEach(({ dot, handler }) => {
    dot.addEventListener("click", handler);
  });

  updateIndicators();

  // Inicializar botón de pausa como pausado (mostrar ▶)
  if (pauseBtn) {
    pauseBtn.textContent = '▶';
    pauseBtn.classList.add('paused');
  }

  return { start, destroy, pause, resume, setVisible };
}

function setupSlides() {
  resetSlides();
  const cards = Array.from(document.querySelectorAll(".web-preview"));
  if (!cards.length) return;

  const total = TOTAL_WEB_COUNT || cards.length || 1;
  const fullCycle = getIntervalMs(total);

  intersectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const controller = slideControllers.get(entry.target);
        if (controller) {
          controller.setVisible(entry.isIntersecting);
        }
      });
    },
    {
      threshold: 0.3, // 30% visible para activar
      rootMargin: "50px", // Empezar un poco antes
    }
  );

  cards.forEach((card, idx) => {
    const folder = card.getAttribute("data-folder");
    const qty = parseInt(card.getAttribute("data-qty") || "1", 10);
    if (!folder || qty <= 1) return; // sin slideshow si solo hay 1

    const desk = card.querySelector(".img-ordenador");
    const mob = card.querySelector(".img-movil");
    if (!desk || !mob) return;

    const controller = createSlideController(
      folder,
      qty,
      desk,
      mob,
      card,
      0, // Sin efecto ola, todas empiezan a la vez
      fullCycle
    );

    slideControllers.set(card, controller);
    intersectionObserver.observe(card);
  });
}

// ==========================
// Modal Fullscreen
// ==========================
let fullscreenState = {
  folder: null,
  qty: 0,
  device: null,
  currentIndex: 0,
};

function createFullscreenModal() {
  const modal = document.createElement('div');
  modal.id = 'fullscreenModal';
  modal.className = 'fullscreen-modal';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-btn';
  closeBtn.textContent = '✕';
  closeBtn.setAttribute('aria-label', 'Cerrar');

  const prevBtn = document.createElement('button');
  prevBtn.className = 'nav-btn prev-fullscreen';
  prevBtn.textContent = '◀';
  prevBtn.setAttribute('aria-label', 'Anterior');

  const nextBtn = document.createElement('button');
  nextBtn.className = 'nav-btn next-fullscreen';
  nextBtn.textContent = '▶';
  nextBtn.setAttribute('aria-label', 'Siguiente');

  const img = document.createElement('img');
  img.className = 'fullscreen-img';
  img.alt = 'Imagen en pantalla completa';

  const indicators = document.createElement('div');
  indicators.className = 'fullscreen-indicators';

  modal.appendChild(closeBtn);
  modal.appendChild(prevBtn);
  modal.appendChild(img);
  modal.appendChild(nextBtn);
  modal.appendChild(indicators);
  document.body.appendChild(modal);

  // Event listeners
  closeBtn.addEventListener('click', closeFullscreen);
  prevBtn.addEventListener('click', () => navigateFullscreen(-1));
  nextBtn.addEventListener('click', () => navigateFullscreen(1));

  // Click fuera de la imagen cierra
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeFullscreen();
    }
  });

  // Tecla Escape cierra
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeFullscreen();
    }
  });

  // Flechas de teclado para navegar
  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('active')) return;
    if (e.key === 'ArrowLeft') navigateFullscreen(-1);
    if (e.key === 'ArrowRight') navigateFullscreen(1);
  });

  return modal;
}

function openFullscreen(folder, qty, device, startIndex = 0) {
  let modal = document.getElementById('fullscreenModal');
  if (!modal) {
    modal = createFullscreenModal();
  }

  fullscreenState = { folder, qty, device, currentIndex: startIndex };

  updateFullscreenImage();
  updateFullscreenIndicators();
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeFullscreen() {
  const modal = document.getElementById('fullscreenModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function navigateFullscreen(direction) {
  const { qty, currentIndex } = fullscreenState;
  fullscreenState.currentIndex = (currentIndex + direction + qty) % qty;
  updateFullscreenImage();
  updateFullscreenIndicators();
}

function updateFullscreenImage() {
  const modal = document.getElementById('fullscreenModal');
  if (!modal) return;

  const img = modal.querySelector('.fullscreen-img');
  const { folder, device, currentIndex, qty } = fullscreenState;

  img.style.opacity = '0';
  setTimeout(() => {
    setImageSrcWithFallback(img, folder, device, currentIndex, qty, () => {
      img.style.opacity = '1';
    });
  }, 150);
}

function updateFullscreenIndicators() {
  const modal = document.getElementById('fullscreenModal');
  if (!modal) return;

  const indicators = modal.querySelector('.fullscreen-indicators');
  const { qty, currentIndex } = fullscreenState;

  indicators.innerHTML = '';
  for (let i = 0; i < qty; i++) {
    const dot = document.createElement('span');
    dot.className = 'dot';
    if (i === currentIndex) dot.classList.add('active');
    dot.addEventListener('click', () => {
      fullscreenState.currentIndex = i;
      updateFullscreenImage();
      updateFullscreenIndicators();
    });
    indicators.appendChild(dot);
  }
}

let currentLangIndex = 0; // ES por defecto
function applyLanguage(lang) {
  const c = document.querySelector(".container");
  const h = document.querySelector(".pre-header-cloud");
  if (c && h) {
    c.style.transition = h.style.transition = "opacity 250ms";
    c.style.opacity = h.style.opacity = "0.35";
  }
  resetSlides();
  const t = textosMain[lang];
  // Actualiza <html lang> y <title> según el idioma activo
  document.documentElement.setAttribute(
    "lang",
    lang === "ES" ? "es" : lang === "EN" ? "en" : lang === "FR" ? "fr" : "ca"
  );

  const titles = {
    ES: "beca de digitalización meowrhino",
    EN: "meowrhino digitization grant",
    FR: "bourse de numérisation meowrhino",
    CAT: "beca de digitalització meowrhino",
  };

  document.title = titles[lang] || titles.ES;
  document.querySelector("#whyTitle").textContent = t.whyTitle;
  document.querySelector("#whyP1").textContent = t.whyP1;
  document.querySelector("#whyP2").textContent = t.whyP2;
  const ctaBtn = document.querySelector(".cta-button");
  if (ctaBtn) {
    ctaBtn.textContent = t.ctaText;
    ctaBtn.href = `mailto:hola@meowrhino.studio?subject=${encodeURIComponent(
      t.ctaSubject || t.ctaText
    )}`;
  }
  crearGaleria(websRealizadas, lang);
  setupSlides();
  const btn = document.querySelector("#toggleLang");
  if (btn) btn.textContent = lang;
  requestAnimationFrame(() => {
    if (c && h) {
      c.style.opacity = h.style.opacity = "1";
    }
  });
}

const getInitialLang = () => {
  const qp = new URLSearchParams(location.search).get("lang");
  const fromQS =
    qp && LANGS.includes(qp.toUpperCase()) ? qp.toUpperCase() : null;
  return fromQS || localStorage.getItem("lang") || "ES";
};
const setLangInURL = (lang) => {
  const u = new URL(location.href);
  u.searchParams.set("lang", lang);
  history.replaceState(null, "", u);
};

document.addEventListener("DOMContentLoaded", () => {
  const initial = getInitialLang();
  currentLangIndex = LANGS.indexOf(initial);
  applyLanguage(initial);
  const langBtn = document.querySelector("#toggleLang");
  langBtn.addEventListener("click", () => {
    currentLangIndex = (currentLangIndex + 1) % LANGS.length;
    const lang = LANGS[currentLangIndex];
    localStorage.setItem("lang", lang);
    setLangInURL(lang);
    applyLanguage(lang);
  });
});
