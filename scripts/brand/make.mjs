#!/usr/bin/env node
// Generates the project screenshots, the favicon set and the 1200×630 share image.
//
//   npm i --no-save puppeteer-core@23.11.1
//   node scripts/brand/make.mjs            # everything
//   node scripts/brand/make.mjs --shots    # only the project screenshots
//   node scripts/brand/make.mjs --brand    # only the icons and share image
//
// Needs Google Chrome at CHROME_PATH (default: the macOS app path).
// Outputs (committed): public/projects/<key>.jpg, public/icon.svg, public/favicon.ico,
// public/favicon-32.png, public/apple-touch-icon.png, public/og.png

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { SITE_URL } from '../../src/data/site.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pub = path.join(root, 'public');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const only = process.argv.includes('--shots') ? 'shots' : process.argv.includes('--brand') ? 'brand' : 'all';
const projects = JSON.parse(fs.readFileSync(path.join(root, 'src/data/projects.json'), 'utf8'));

const C = { bg: '#f7f4ee', ink: '#1d1b18', mute: '#6b665d', rule: '#ddd6c9', acc: '#b4442b' };
const b64 = (file) => fs.readFileSync(file).toString('base64');
const font = (pkg, file) => b64(path.join(root, 'node_modules/@fontsource', pkg, 'files', file));
const FONTS = `
@font-face{font-family:Newsreader;font-weight:500;src:url(data:font/woff2;base64,${font('newsreader', 'newsreader-latin-500-normal.woff2')}) format('woff2')}
@font-face{font-family:Inter;font-weight:400;src:url(data:font/woff2;base64,${font('inter', 'inter-latin-400-normal.woff2')}) format('woff2')}
@font-face{font-family:Inter;font-weight:600;src:url(data:font/woff2;base64,${font('inter', 'inter-latin-600-normal.woff2')}) format('woff2')}`;

// ---- icon: a serif N on cream ------------------------------------------------------------
// The SVG favicon can't load web fonts, so it falls back to Georgia; the PNGs use Newsreader.
const iconSvg = (family) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${C.bg}"/>
  <rect x="2" y="2" width="60" height="60" rx="12" fill="none" stroke="${C.acc}" stroke-width="4"/>
  <text x="32" y="47" text-anchor="middle" font-family="${family}" font-weight="500" font-size="44" fill="${C.acc}">N</text>
</svg>`;

function ico(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, buf }, i) => {
    const o = 6 + 16 * i;
    header.writeUInt8(size, o); header.writeUInt8(size, o + 1);
    header.writeUInt16LE(1, o + 4); header.writeUInt16LE(32, o + 6);
    header.writeUInt32LE(buf.length, o + 8); header.writeUInt32LE(offset, o + 12);
    offset += buf.length;
  });
  return Buffer.concat([header, ...pngs.map((p) => p.buf)]);
}

// ---- share image ---------------------------------------------------------------------------
function ogHtml() {
  const photo = b64(path.join(pub, 'headshot.jpg'));
  const thumbs = projects.map((p) => `<img src="data:image/jpeg;base64,${b64(path.join(pub, 'projects', `${p.key}.jpg`))}">`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}
  *{box-sizing:border-box;margin:0}
  body{width:1200px;height:630px;overflow:hidden;background:${C.bg};color:${C.ink};font-family:Inter,sans-serif;position:relative}
  .top{position:absolute;left:72px;top:64px;right:72px;display:flex;gap:40px;align-items:center}
  .ph{width:170px;height:170px;border-radius:50%;object-fit:cover}
  h1{font-family:Newsreader;font-weight:500;font-size:84px;line-height:1;letter-spacing:-.01em}
  .role{font-size:28px;color:${C.mute};margin-top:14px}
  .rule{position:absolute;left:72px;right:72px;top:300px;border-top:2px solid ${C.ink}}
  .k{position:absolute;left:72px;top:318px;font-weight:600;font-size:18px;letter-spacing:.14em;text-transform:uppercase;color:${C.mute}}
  .row{position:absolute;left:72px;right:72px;top:362px;display:grid;grid-template-columns:repeat(5,1fr);gap:16px}
  .row img{width:100%;aspect-ratio:16/10;object-fit:cover;object-position:top;border-radius:6px;border:1px solid ${C.rule}}
  .url{position:absolute;left:72px;bottom:52px;font-size:24px;color:${C.acc};font-weight:600}
  </style></head><body>
  <div class="top"><img class="ph" src="data:image/jpeg;base64,${photo}"><div><h1>Nathan Nam</h1>
  <div class="role">Principal Product Manager, Archetype AI</div></div></div>
  <div class="rule"></div><div class="k">Side projects</div>
  <div class="row">${thumbs}</div>
  <div class="url">${new URL(SITE_URL).host}</div>
  </body></html>`;
}

const browser = await puppeteer.launch({ executablePath: chrome, headless: true });
try {
  if (only !== 'brand') {
    // Each project's home page at 1280×800, saved at 768×480 (sharp at 2× in the 240 px column).
    fs.mkdirSync(path.join(pub, 'projects'), { recursive: true });
    for (const p of projects) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 0.6 });
      await page.goto(p.url, { waitUntil: 'networkidle2', timeout: 60000 });
      await new Promise((r) => setTimeout(r, 2500));
      await page.screenshot({ path: path.join(pub, 'projects', `${p.key}.jpg`), type: 'jpeg', quality: 82 });
      await page.close();
      console.log(`wrote public/projects/${p.key}.jpg`);
    }
  }
  if (only !== 'shots') {
    fs.writeFileSync(path.join(pub, 'icon.svg'), iconSvg('Georgia, serif'));
    console.log('wrote public/icon.svg');
    const page = await browser.newPage();
    // The apple-touch icon must be opaque (iOS paints transparent corners black).
    const png = async (size, opaque = false) => {
      await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
      await page.setContent(`<style>${FONTS}*{margin:0}body{background:${opaque ? C.bg : 'transparent'}}svg{display:block;width:${size}px;height:${size}px}</style>${iconSvg('Newsreader')}`);
      await page.evaluate(() => document.fonts.ready);
      return page.screenshot({ omitBackground: !opaque });
    };
    const [p16, p32, p48, p180] = [await png(16), await png(32), await png(48), await png(180, true)];
    fs.writeFileSync(path.join(pub, 'favicon-32.png'), p32);
    fs.writeFileSync(path.join(pub, 'apple-touch-icon.png'), p180);
    fs.writeFileSync(path.join(pub, 'favicon.ico'), ico([{ size: 16, buf: p16 }, { size: 32, buf: p32 }, { size: 48, buf: p48 }]));
    console.log('wrote public/favicon-32.png, apple-touch-icon.png, favicon.ico');

    await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
    await page.setContent(ogHtml(), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(pub, 'og.png') });
    console.log('wrote public/og.png');
  }
} finally {
  await browser.close();
}
