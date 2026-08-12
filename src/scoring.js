// ============================================================================
//  scoring.js  —  answers -> archetype + featured set + top 5 blends
// ----------------------------------------------------------------------------
//  Pure logic, no DOM. All six archetypes are reachable directly by score
//  (there is no depth gate). Each result features the archetype's set at the
//  top plus the five best-matching individual blends.
// ============================================================================

import data from './data.json' with { type: 'json' };
import { ARCHETYPES, ARCHETYPES_BY_ID, THEME_TO_ARCHETYPE } from './archetypes.js';
import { SETS, FEATURE_SETS } from './sets.js';

const PRODUCTS = data.products;

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

// Top individual blends for an archetype (sets/kits excluded), ordered so the
// visitor's chosen format(s) come first, then the rest by quality rank.
function topBlends(archetypeId, formats, limit = 5) {
  const pool = productsFor(archetypeId).filter((p) => p.format !== 'kit');
  const ranked = rank(pool, archetypeId);
  const prefs = (formats || []).filter((f) => f && f !== 'kit');
  if (!prefs.length) return ranked.slice(0, limit);
  const matches = ranked.filter((p) => prefs.includes(p.format));
  const rest = ranked.filter((p) => !prefs.includes(p.format));
  return [...matches, ...rest].slice(0, limit);
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
    q4: normalize(answers.q4), q5: normalize(answers.q5),
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

  // formats: every format the visitor accepted in Q5 ("I'm not sure" is null and
  // drops out here, meaning no preference).
  const formats = a.q5.options.map((o) => o.format).filter(Boolean);
  // free-text the visitor typed, kept for analytics / email personalization
  const others = Object.entries(a)
    .map(([qid, v]) => (v.other ? { qid, text: v.other } : null))
    .filter(Boolean);

  // 4) winner — all six archetypes reachable directly (no depth gate)
  const archetypeId = ranked[0] || 'anchor';

  // 5) the featured set (only when sets are live) + top individual blends.
  //    When sets are hidden we show 6 blends to fill the space the set left.
  const set = FEATURE_SETS ? (SETS[archetypeId] || null) : null;
  const products = topBlends(archetypeId, formats, set ? 5 : 6);
  const wantsRitual = formats.includes('kit');

  return {
    archetypeId,
    formats,
    wantsRitual,
    others,      // [{ qid, text }]
    scores: archPoints,
    ranked,
    set,         // the archetype's set — featured at top
    products,    // top 5 blends
  };
}
