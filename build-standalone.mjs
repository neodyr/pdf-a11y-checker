/**
 * Génère `pdf-a11y-checker.html` : une version 100 % autonome de l'outil,
 * en UN SEUL fichier HTML. Tout est embarqué (CSS, polices, pdf.js + worker,
 * favicon) → l'utilisateur le télécharge et l'ouvre hors ligne, sans serveur.
 *
 * Utilisé localement et par la CI avant déploiement. Pas de dépendance externe.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const b64 = (p) => fs.readFileSync(path.join(ROOT, p)).toString('base64');

// 1) Polices → data-URI dans fonts.css
let fontsCss = rd('assets/css/fonts.css').replace(
  /url\('\.\.\/fonts\/([^']+)'\)/g,
  (_, file) => `url(data:font/woff2;base64,${b64('assets/fonts/' + file)})`
);
const styleCss = rd('assets/css/style.css');

// 2) JS de l'app : on retire l'import du module pdf.js et la ligne workerSrc
//    (elles sont remplacées par un chargement depuis des blobs embarqués).
const appJs = rd('assets/js/app.js')
  .replace(/^import \* as pdfjsLib.*$/m, '')
  .replace(/^pdfjsLib\.GlobalWorkerOptions\.workerSrc\s*=.*$/m, '');

const themeJs = rd('assets/js/theme.js');

// 3) pdf.js + worker → base64 (chargés à l'exécution via des Blob, hors ligne)
const pdfB64 = b64('assets/vendor/pdf.min.mjs');
const workerB64 = b64('assets/vendor/pdf.worker.min.mjs');

const bootstrap = `
const __b64ToBlobUrl = (b64, type) => {
  const bin = atob(b64);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([u], { type }));
};
const pdfjsLib = await import(__b64ToBlobUrl("${pdfB64}", "text/javascript"));
pdfjsLib.GlobalWorkerOptions.workerSrc = __b64ToBlobUrl("${workerB64}", "text/javascript");
`;

const inlineModule = `<script type="module">\n${bootstrap}\n${appJs}\n</script>`;
const inlineStyle = `<style>\n${fontsCss}\n${styleCss}\n</style>`;
const inlineTheme = `<script>\n${themeJs}\n</script>`;
const faviconDataUri = `data:image/svg+xml;base64,${b64('assets/favicon.svg')}`;

// 4) Assemble le HTML autonome à partir de l'index
let html = rd('index.html');
html = html
  // retire le bloc lien de téléchargement (inutile/cassé dans le fichier autonome)
  .replace(/<!-- dl:start -->[\s\S]*?<!-- dl:end -->/g, '')
  // favicon en data-URI
  .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" href="${faviconDataUri}" type="image/svg+xml" />`)
  // styles inline (remplace le 1er lien CSS, supprime le 2nd)
  .replace('<link rel="stylesheet" href="assets/css/fonts.css" />', inlineStyle)
  .replace('<link rel="stylesheet" href="assets/css/style.css" />', '')
  // theme.js inline en fin de body (le bouton existe à ce moment)
  .replace('<script src="assets/js/theme.js" defer></script>', '')
  .replace('<script type="module" src="assets/js/app.js"></script>', `${inlineTheme}\n${inlineModule}`);

const OUT = path.join(ROOT, 'pdf-a11y-checker.html');
fs.writeFileSync(OUT, html);
const kb = Math.round(fs.statSync(OUT).size / 1024);
console.log(`✓ pdf-a11y-checker.html généré (${kb} Ko, autonome).`);
