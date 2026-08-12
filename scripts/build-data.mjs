// ============================================================================
//  build-data.mjs  —  the ONLY way product data enters the widget.
// ----------------------------------------------------------------------------
//  Reads data/products.csv (a Squarespace product export), keeps Visible=Yes,
//  strips HTML, pulls a one-line "essence", tags each product with its themes /
//  archetype / format, and writes src/data.json.
//
//  Never hand-edit src/data.json. Re-export the catalog, drop it at
//  data/products.csv, and run `npm run build-data`.
//
//  Usage:  node scripts/build-data.mjs
// ============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { THEMES, THEME_TO_ARCHETYPE, detectFormat } from '../src/archetypes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CSV_PATH = join(ROOT, 'data', 'products.csv');
const OUT_PATH = join(ROOT, 'src', 'data.json');

// ---- tiny dependency-free CSV parser (handles quotes, commas, newlines) -----
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\r') {
      // ignore; handled by \n
    } else if (c === '\n') {
      row.push(field); field = '';
      rows.push(row); row = [];
    } else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  // drop trailing empty row
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ''));
}

function toObjects(rows) {
  const header = rows[0];
  return rows.slice(1).map((r) => {
    const o = {};
    header.forEach((h, i) => { o[h] = r[i] ?? ''; });
    return o;
  });
}

// ---- HTML -> clean text -----------------------------------------------------
function stripHtml(html) {
  return (html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&rsquo;|&#39;/g, '’')
    .replace(/&lsquo;/g, '‘')
    .replace(/&rdquo;/g, '”')
    .replace(/&ldquo;/g, '“')
    .replace(/&mdash;/g, '—')
    .replace(/&hellip;/g, '…')
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// The essence = the italic/bold tagline many products lead with
// (e.g. "Soften your grip. Release what you're carrying."). If there isn't one,
// fall back to the first clean sentence that isn't a "Best For:" / "How to Use:"
// housekeeping line.
function extractEssence(html, cleanText) {
  const m = html.match(/<strong>\s*<em>([\s\S]*?)<\/em>\s*<\/strong>/i)
    || html.match(/<em>\s*<strong>([\s\S]*?)<\/strong>\s*<\/em>/i)
    || html.match(/<em>([\s\S]*?)<\/em>/i);
  if (m) {
    const t = stripHtml(m[1]).replace(/\s+/g, ' ').trim();
    if (t) return t;
  }
  const firstLine = cleanText
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l && !/^(best for|how to use|ingredients|note)\s*:/i.test(l));
  if (!firstLine) return '';
  const sentence = firstLine.split(/(?<=[.!?])\s/)[0];
  return sentence.trim();
}

// A short body paragraph for the results page (essence removed, housekeeping
// sections dropped).
function extractBlurb(cleanText, essence) {
  const kept = cleanText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^(best for|how to use|ingredients|note)\s*:/i.test(l))
    .filter((l) => l !== essence);
  return (kept[0] || essence || '').trim();
}

// ---- run --------------------------------------------------------------------
const raw = readFileSync(CSV_PATH, 'utf8');
const all = toObjects(parseCSV(raw));

const seen = new Set();
const products = [];
const warnings = [];

for (const r of all) {
  if ((r['Visible'] || '').trim() !== 'Yes') continue;

  const slug = (r['Product URL'] || '').trim();
  const title = (r['Title'] || '').trim();
  if (!slug || !title) continue;
  if (seen.has(slug)) continue; // one row per product (ignore extra variant rows)
  seen.add(slug);

  const descHtml = r['Description'] || '';
  const clean = stripHtml(descHtml);
  const essence = extractEssence(descHtml, clean);
  const blurb = extractBlurb(clean, essence);

  const themes = (r['Tags'] || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => THEMES.includes(t));

  const collections = (r['Categories'] || '')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);

  const archetypes = [...new Set(themes.map((t) => THEME_TO_ARCHETYPE[t]).filter(Boolean))];
  const format = detectFormat(collections, title);

  const image = (r['Hosted Image URLs'] || '').split(/\s+/).filter(Boolean)[0] || '';

  if (!themes.length) warnings.push(`no theme tags: "${title}" (${slug})`);
  if (!essence) warnings.push(`no essence: "${title}" (${slug})`);

  products.push({
    slug,
    title,
    url: `/products/${slug}`,
    price: parseFloat(r['Price'] || '0') || null,
    onSale: (r['On Sale'] || '').trim() === 'Yes',
    salePrice: parseFloat(r['Sale Price'] || '0') || null,
    image,
    essence,
    blurb,
    themes,
    archetypes,
    format,
    collections,
  });
}

// Coverage report so gaps (empty archetype x format cells) are visible at build
// time — the runtime fallback rules (§1) lean on this.
const byArchetype = {};
for (const p of products) {
  for (const a of p.archetypes) {
    byArchetype[a] = byArchetype[a] || {};
    byArchetype[a][p.format] = (byArchetype[a][p.format] || 0) + 1;
  }
}

const out = {
  generatedFrom: 'data/products.csv',
  count: products.length,
  products,
  coverage: byArchetype,
};

writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n');

console.log(`✓ Wrote ${products.length} visible products → src/data.json`);
console.log('\nArchetype × format coverage:');
for (const [a, cells] of Object.entries(byArchetype)) {
  console.log(`  ${a.padEnd(8)} ${Object.entries(cells).map(([f, n]) => `${f}:${n}`).join('  ')}`);
}
if (warnings.length) {
  console.log(`\n⚠  ${warnings.length} warning(s):`);
  for (const w of warnings.slice(0, 40)) console.log('   - ' + w);
}
