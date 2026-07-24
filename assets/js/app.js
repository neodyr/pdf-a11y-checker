/**
 * Vérificateur d'accessibilité PDF — Neodyr.
 *
 * 100 % côté client : le fichier n'est jamais envoyé. Utilise pdf.js (vendorisé)
 * pour analyser les points d'accessibilité automatiquement vérifiables (RGAA 13.3 / PDF-UA).
 */
import * as pdfjsLib from '../vendor/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdf.worker.min.mjs', import.meta.url).href;

const input = document.getElementById('pdf-input');
const dropzone = document.getElementById('dropzone');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');
const resultsTitle = document.getElementById('results-title');
const summaryEl = document.getElementById('results-summary');
const listEl = document.getElementById('results-list');

/* ---------- Interactions (fichier + glisser-déposer) ---------- */
input.addEventListener('change', () => {
  if (input.files && input.files[0]) handleFile(input.files[0]);
});

['dragenter', 'dragover'].forEach((evt) =>
  dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add('is-dragover'); })
);
['dragleave', 'drop'].forEach((evt) =>
  dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove('is-dragover'); })
);
dropzone.addEventListener('drop', (e) => {
  const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) handleFile(file);
});

/* ---------- Traitement ---------- */
async function handleFile(file) {
  resultsEl.hidden = true;
  statusEl.classList.remove('is-error');

  if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
    setError('Ce fichier n’est pas un PDF. Choisissez un document au format PDF.');
    return;
  }

  statusEl.textContent = 'Analyse du document en cours…';
  try {
    const buffer = await file.arrayBuffer();
    const checks = await analyze(new Uint8Array(buffer));
    render(file.name, checks);
    statusEl.textContent = '';
  } catch (err) {
    if (err && err.name === 'PasswordException') {
      setError('Ce PDF est protégé par un mot de passe : impossible de l’analyser.');
    } else {
      setError('Impossible de lire ce PDF. Le fichier est peut-être endommagé.');
    }
  }
}

function setError(message) {
  statusEl.textContent = message;
  statusEl.classList.add('is-error');
}

/* ---------- Analyse ---------- */
async function analyze(data) {
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const checks = [];
  const { info, metadata } = await pdf.getMetadata().catch(() => ({ info: {}, metadata: null }));
  const meta = info || {};

  // 1. Titre du document
  const title = (meta.Title || '').trim();
  checks.push(check('Titre du document', title ? 'ok' : 'fail',
    title ? `Titre défini : « ${title} ».` : 'Aucun titre défini. Le titre aide à identifier le document (barre de titre, lecteur d’écran).',
    'RGAA 13.3 · PDF/UA'));

  // 2. Langue du document
  let lang = (meta.Language || '').trim();
  if (!lang && metadata && typeof metadata.get === 'function') {
    lang = (metadata.get('dc:language') || '').trim();
  }
  checks.push(check('Langue du document', lang ? 'ok' : 'warn',
    lang ? `Langue déclarée : « ${lang} ».` : 'Langue non détectée automatiquement. Elle doit être définie pour la restitution vocale — à vérifier.',
    'RGAA 8.3 · PDF/UA'));

  // 3. Balisage (structure logique)
  const markInfo = await pdf.getMarkInfo().catch(() => null);
  const tagged = !!(markInfo && markInfo.Marked === true);
  checks.push(check('Balisage (structure logique)', tagged ? 'ok' : 'fail',
    tagged ? 'Le PDF est balisé : sa structure peut être restituée aux technologies d’assistance.'
      : 'Le PDF n’est pas balisé. Sans balises, l’ordre de lecture, les titres et les tableaux ne sont pas restitués. C’est le défaut le plus grave.',
    'PDF/UA'));

  // 4. Texte réel vs document scanné
  const pageCount = pdf.numPages;
  const sample = Math.min(pageCount, 5);
  let totalChars = 0;
  for (let i = 1; i <= sample; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent().catch(() => ({ items: [] }));
    totalChars += tc.items.reduce((n, it) => n + (it.str ? it.str.trim().length : 0), 0);
  }
  const scanned = totalChars / sample < 10;
  checks.push(check('Texte réel (non scanné)', scanned ? 'fail' : 'ok',
    scanned ? 'Aucun texte extractible : ce document est probablement un scan (image). Il est illisible pour un lecteur d’écran et à la sélection.'
      : 'Le document contient du texte réel, sélectionnable et lisible par un lecteur d’écran.',
    'RGAA 13.3'));

  // 5. Alternatives des images (si balisé)
  if (tagged) {
    let figures = 0, missingAlt = 0;
    for (let i = 1; i <= sample; i++) {
      const page = await pdf.getPage(i);
      const tree = await page.getStructTree().catch(() => null);
      walkTree(tree, (node) => {
        if (node.role === 'Figure') {
          figures++;
          if (!node.alt || !String(node.alt).trim()) missingAlt++;
        }
      });
    }
    if (figures === 0) {
      checks.push(check('Alternatives des images', 'warn',
        'Aucune image balisée détectée sur l’échantillon analysé. À confirmer sur l’ensemble du document.',
        'RGAA 1.1 · PDF/UA'));
    } else {
      checks.push(check('Alternatives des images', missingAlt > 0 ? 'fail' : 'ok',
        missingAlt > 0 ? `${missingAlt} image(s) sur ${figures} sans alternative textuelle (sur l’échantillon).`
          : `Les ${figures} image(s) balisée(s) ont une alternative textuelle.`,
        'RGAA 1.1 · PDF/UA'));
    }
  } else {
    checks.push(check('Alternatives des images', 'warn',
      'Non vérifiable : le PDF n’étant pas balisé, les alternatives d’images ne peuvent pas être contrôlées.',
      'RGAA 1.1 · PDF/UA'));
  }

  // 6. Signets / sommaire
  const outline = await pdf.getOutline().catch(() => null);
  const hasOutline = Array.isArray(outline) && outline.length > 0;
  checks.push(check('Signets (navigation)', hasOutline ? 'ok' : 'warn',
    hasOutline ? 'Le document propose des signets pour naviguer entre les sections.'
      : 'Aucun signet. Recommandé pour naviguer, surtout dans les documents longs.',
    'Navigation'));

  // 7. Formulaire
  if (meta.IsAcroFormPresent) {
    checks.push(check('Champs de formulaire', 'warn',
      'Le document contient un formulaire. Vérifiez manuellement que chaque champ possède une étiquette (infobulle) explicite.',
      'RGAA 11.1'));
  }

  return { checks, pageCount, tagged };
}

function walkTree(node, fn) {
  if (!node) return;
  fn(node);
  if (Array.isArray(node.children)) node.children.forEach((c) => walkTree(c, fn));
}

function check(label, status, detail, ref) {
  return { label, status, detail, ref };
}

/* ---------- Rendu ---------- */
function render(fileName, { checks, pageCount }) {
  const fails = checks.filter((c) => c.status === 'fail').length;
  const warns = checks.filter((c) => c.status === 'warn').length;

  let summary;
  if (fails > 0) {
    summary = `${fails} problème(s) d’accessibilité détecté(s)` + (warns ? `, et ${warns} point(s) à vérifier` : '') + '.';
  } else if (warns > 0) {
    summary = `Aucun problème bloquant détecté automatiquement, mais ${warns} point(s) restent à vérifier manuellement.`;
  } else {
    summary = 'Aucun problème automatiquement détecté. Une vérification humaine reste recommandée.';
  }
  summaryEl.textContent = `« ${fileName} » — ${pageCount} page(s). ${summary}`;

  listEl.innerHTML = '';
  const badges = { ok: 'Conforme', fail: 'Non conforme', warn: 'À vérifier' };
  for (const c of checks) {
    const li = document.createElement('li');
    li.className = 'check ' + c.status;
    const badge = document.createElement('span');
    badge.className = 'check-badge';
    badge.textContent = badges[c.status];
    const body = document.createElement('div');
    const h = document.createElement('p');
    h.className = 'check-label';
    h.textContent = c.label;
    const d = document.createElement('p');
    d.className = 'check-detail';
    d.textContent = c.detail + ' ';
    const ref = document.createElement('span');
    ref.className = 'check-ref';
    ref.textContent = c.ref;
    d.appendChild(ref);
    body.appendChild(h);
    body.appendChild(d);
    li.appendChild(badge);
    li.appendChild(body);
    listEl.appendChild(li);
  }

  resultsEl.hidden = false;
  resultsTitle.focus();
}
