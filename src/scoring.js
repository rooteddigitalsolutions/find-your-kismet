// ============================================================================
//  scoring.js  —  answers -> archetype + format + product picks
// ----------------------------------------------------------------------------
//  Pure logic, no DOM. Implements the depth gate (Q6) and the §1 fallback rules
//  for empty (archetype x format) cells.
// ============================================================================

import data from './data.json' with { type: 'json' };
import { ARCHETYPES, ARCHETYPES_BY_ID, THEME_TO_ARCHETYPE, resolveTier } from './archetypes.js';
import { SETS } from './sets.js';

const PRODUCTS = data.products;

// Complementary archetype for the pairing upsell (§5, step 4).
const COMPLEMENT = {
  anchor: 'oracle',
  beacon: 'anchor',
  oracle: 'solace',
  solace: 'beacon',
  emerge: 'oracle',
  kali: 'anchor',
};

function productsFor(archetypeId) {
  return PRODUCTS.filter((p) => p.archetypes.includes(archetypeId));
}

// Deterministic quality rank within a candidate set: more theme overlap with the
// archetype first, then has-essence, then has-image, then title (stable).
function rank(candidates, archetypeId) {
  const wanted = new Set(ARCHETYPES_BY_ID[archetypeId]?.themes || []);
  return [...candidates].sort((a, b) => {
    const ao = a.themes.filter((t) => wanted.has(t)).length;
    const bo = b.themes.filter((t) => wanted.has(t)).length;
    if (ao !== bo) return bo - ao;
    if (!!b.essence !== !!a.essence) return (b.essence ? 1 : 0) - (a.essence ? 1 : 0);
    if (!!b.image !== !!a.image) return (b.image ? 1 : 0) - (a.image ? 1 : 0);
    return a.title.localeCompare(b.title);
  });
}

// The archetype's best available format when the requested one is empty:
// the format with the most products (ties broken by FORMATS order via first-seen).
function bestFormatFor(archetypeId) {
  const pool = productsFor(archetypeId);
  const counts = {};
  for (const p of pool) counts[p.format] = (counts[p.format] || 0) + 1;
  let best = null;
  let bestN = -1;
  for (const p of pool) {
    if (counts[p.format] > bestN) { bestN = counts[p.format]; best = p.format; }
  }
  return best;
}

// §1 fallback: resolve the best hero product for (archetype, formats[], deep).
// `formats` is the set of formats the visitor accepted in Q5 (multi-select). An
// empty set means "no preference" — any format is fine, no fallback note.
function pickHero(archetypeId, formats) {
  const pool = productsFor(archetypeId);
  if (!pool.length) return null;

  const wanted = formats && formats.length ? formats : null;
  const exact = wanted ? pool.filter((p) => wanted.includes(p.format)) : pool;
  if (exact.length) {
    return { product: rank(exact, archetypeId)[0], fallback: null };
  }

  // Rule 1: same archetype, best other format + in-voice redirect line.
  const actualFormat = bestFormatFor(archetypeId);
  const relaxed = pool.filter((p) => p.format === actualFormat);
  const product = rank(relaxed.length ? relaxed : pool, archetypeId)[0];
  return {
    product,
    fallback: { requestedFormats: wanted || [], actualFormat: product.format },
  };
}

function pickSupporting(archetypeId, heroSlug) {
  const pool = productsFor(archetypeId).filter((p) => p.slug !== heroSlug);
  if (!pool.length) return null;
  return rank(pool, archetypeId)[0];
}

function pickPairing(archetypeId, excludeSlugs) {
  const compId = COMPLEMENT[archetypeId] || 'oracle';
  const chain = [compId, ...ARCHETYPES.map((a) => a.id)]; // try complement, then any
  for (const id of chain) {
    const pool = productsFor(id).filter((p) => !excludeSlugs.has(p.slug));
    if (pool.length) return { archetypeId: id, product: rank(pool, id)[0] };
  }
  return null;
}

// Normalize one question's answer into { options:[...], other:'' }. Accepts the
// multi-select shape and is tolerant of a bare option object (legacy/tests).
function normalize(ans) {
  if (!ans) return { options: [], other: '' };
  if (Array.isArray(ans)) return { options: ans, other: '' };
  if (ans.options || 'other' in ans) return { options: ans.options || [], other: ans.other || '' };
  return { options: [ans], other: '' }; // a single option object
}

/**
 * Score a completed set of answers.
 * @param {Object} answers  keyed by question id -> { options:[opt...], other:'' }
 * @returns {Object} result payload consumed by the UI + copy layer
 */
export function scoreAnswers(answers) {
  const a = {
    q1: normalize(answers.q1), q2: normalize(answers.q2), q3: normalize(answers.q3),
    q4: normalize(answers.q4), q5: normalize(answers.q5), q6: normalize(answers.q6),
  };

  // 1) tally theme points across every SELECTED option (multi-select)
  const themePoints = {};
  const add = (themes, w = 1) => {
    for (const t of themes || []) themePoints[t] = (themePoints[t] || 0) + w;
  };
  for (const opt of a.q1.options) add(opt.themes);
  for (const opt of a.q2.options) add(opt.themes);
  for (const opt of a.q3.options) add(opt.themes);
  for (const opt of a.q4.options) add(opt.themes, 1); // context weight

  // 2) roll themes up to archetype scores
  const archPoints = {};
  for (const [theme, pts] of Object.entries(themePoints)) {
    const id = THEME_TO_ARCHETYPE[theme];
    if (id) archPoints[id] = (archPoints[id] || 0) + pts;
  }

  // 3) rank archetypes (stable tie-break by declared order)
  const order = ARCHETYPES.map((x) => x.id);
  const ranked = order
    .filter((id) => (archPoints[id] || 0) > 0)
    .sort((x, y) => (archPoints[y] - archPoints[x]) || (order.indexOf(x) - order.indexOf(y)));

  // depth: deep wins if ANY selected Q6 option is the deep one
  const deep = a.q6.options.some((o) => o.deep);
  // formats: every format the visitor accepted in Q5 (may be several, or none)
  const formats = a.q5.options.map((o) => o.format).filter(Boolean);
  // free-text the visitor typed, kept for analytics / email personalization
  const others = Object.entries(a)
    .map(([qid, v]) => (v.other ? { qid, text: v.other } : null))
    .filter(Boolean);

  // 4) winner, resolved against the depth gate
  const rawWinner = ranked[0] || 'anchor';
  const archetypeId = resolveTier(rawWinner, deep);

  // 5) hero product. If the visitor chose "the whole ritual" (kit), the hero is
  //    the archetype's curated set; otherwise it's the best single blend.
  const wantsRitual = formats.includes('kit');
  let hero;
  if (wantsRitual && SETS[archetypeId]) {
    hero = { product: SETS[archetypeId], fallback: null };
  } else {
    // ignore 'kit' when matching individual blends (no per-archetype kit SKUs)
    hero = pickHero(archetypeId, formats.filter((f) => f !== 'kit'));
  }
  const supporting = hero ? pickSupporting(archetypeId, hero.product.slug) : null;
  const exclude = new Set([hero?.product.slug, supporting?.slug].filter(Boolean));
  const pairing = pickPairing(archetypeId, exclude);

  return {
    archetypeId,
    rawWinner,
    redirected: rawWinner !== archetypeId, // deep archetype folded to surface
    deep,
    formats,
    wantsRitual, // visitor chose "the whole ritual" → hero is a set
    others,      // [{ qid, text }]
    scores: archPoints,
    ranked,
    hero,        // { product, fallback }
    supporting,  // product | null
    pairing,     // { archetypeId, product } | null
  };
}
