const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const https = require('https');
const http = require('http');

const DATA_PATH = path.join(__dirname, 'data/test.json');
const OUTPUT_DIR = path.join(__dirname, 'datajson');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    proto.get(url, res => {
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', err => { fs.unlink(dest, () => reject(err)); });
  });
}

(async () => {
  const items = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });

  for (const item of items) {
    const url = item.url;
    const baseName = item.id;
    console.log(`🔍 Traitement : ${url}`);

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/143 Safari/537.36');

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch {
      console.error('❌ Page inaccessible');
      item.error = 'PAGE_LOAD_FAILED';
      await page.close();
      continue;
    }

    // Extraire l'image principale
    const imgUrl = await page.evaluate(() => {
      // 1️⃣ OG / Twitter
      let img = document.querySelector('meta[property="og:image"]')?.content
             || document.querySelector('meta[name="twitter:image"]')?.content;
      if (img) return img;

      // 2️⃣ Article img centré
      const imgs = Array.from(document.querySelectorAll('article img, .article img'));
      if (imgs.length === 0) return null;

      // Chercher l'image centrée
      for (const i of imgs) {
        const style = window.getComputedStyle(i);
        if (style.marginLeft === 'auto' && style.marginRight === 'auto') return i.src;
        if (style.textAlign === 'center') return i.src;
      }

      // Sinon fallback première image
      return imgs[0].src || null;
    });

    if (imgUrl) {
      const imgPath = path.join(OUTPUT_DIR, `${baseName}.jpg`);
      try {
        await downloadFile(imgUrl, imgPath);
        item.image_brute = imgPath;
        console.log(`🖼️ Image principale sauvegardée : ${imgPath}`);
      } catch {
        console.warn('⚠️ Impossible de télécharger l’image');
      }
    } else {
      console.warn('⚠️ Aucune image détectée sur cette page');
    }

    item.type = 'HTML';
    await page.close();
  }

  await browser.close();
  fs.writeFileSync('data_enrichi.json', JSON.stringify(items, null, 2), 'utf-8');
  console.log('✅ Traitement terminé');
})();
