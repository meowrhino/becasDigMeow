const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

// 💡 USO: node screenshot.js https://ejemplo.com nombre_personalizado

const url = process.argv[2];
const nombre = process.argv[3];

if (!url || !nombre) {
  console.error(
    "❌ Uso: node screenshot.js https://ejemplo.com nombre_personalizado"
  );
  process.exit(1);
}

const sizes = [
  { width: 1920, height: 1280, name: "ordenador" },
  { width: 375, height: 667, name: "movil" },
];

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const dir = path.join("img", nombre);
  fs.mkdirSync(dir, { recursive: true });

  for (const size of sizes) {
    await page.setViewport({ width: size.width, height: size.height });
    await page.goto(url, { waitUntil: "networkidle2" });

    const filename = path.join(dir, `${size.name}.png`);
    await page.screenshot({ path: filename }); // <- ✅ solo lo visible
    console.log(`✅ Captura guardada: ${filename}`);
  }

  await browser.close();
})();