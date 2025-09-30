const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

// 💡 USO:
// node screenshot.js url1 nombre1 url2 nombre2 url3 nombre3 ...

const args = process.argv.slice(2);

if (args.length === 0 || args.length % 2 !== 0) {
  console.error("❌ Uso: node screenshot.js [url1] [nombre1] [url2] [nombre2] ...");
  process.exit(1);
}

// construimos pares de url y nombre
const pairs = [];
for (let i = 0; i < args.length; i += 2) {
  pairs.push({ url: args[i], nombre: args[i + 1] });
}

const sizes = [
  { width: 1920, height: 1280, name: "ordenador" },
  { width: 375, height: 667, name: "movil" },
];

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  for (const { url, nombre } of pairs) {
    console.log(`🌐 Procesando: ${url} → ${nombre}`);

    const dir = path.join("galeria", nombre);
    fs.mkdirSync(dir, { recursive: true });

    for (const size of sizes) {
      await page.setViewport({ width: size.width, height: size.height });
      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
      await page.evaluate(() => {
        Object.defineProperty(window, 'devicePixelRatio', {
          get: () => 2,
        });
      });
      await page.goto(url, { waitUntil: "networkidle2" });
      await new Promise(resolve => setTimeout(resolve, 10000));

      const filename = path.join(dir, `${size.name}.png`);
      await page.screenshot({ path: filename }); // captura solo viewport
      console.log(`✅ Captura guardada: ${filename}`);
    }
  }

  await browser.close();
})();