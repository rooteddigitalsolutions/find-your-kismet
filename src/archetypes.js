// ============================================================================
//  DRAFT ARCHETYPE + FORMAT CONFIG  —  FOR ANGELYN'S REVIEW
// ----------------------------------------------------------------------------
//  This file is the single source of truth for the quiz's taxonomy. It is
//  imported by BOTH scripts/build-data.mjs (to tag products) and the runtime
//  engine (to score answers), so the two can never drift apart.
//
//  NOTE: The real spec (quiz-spec-find-your-kismet.md) was not provided. These
//  six archetypes were reverse-engineered from the product catalog's own theme
//  tags so every archetype maps onto real inventory. "Emerge" and "Kali" are the
//  two deep-tier names the kickoff prompt referenced; the other four are drafts.
//  Rename freely — change `name`/`tagline` here and rebuild.
// ============================================================================

// The nine theme tags that actually appear on products (the "Tags" CSV column).
export const THEMES = [
  'Focus & Confidence',
  'Insight & Processing',
  'Transformation & Growth',
  'Healing & Pathfinding',
  'Grounding & Protection',
  'Calm & Comfort',
  'Courage & Strength',
  'Spiritual Connection',
  'Healing & Release',
];

// Six archetypes. `themes` are the product theme-tags that "belong" to each
// archetype — every one of the nine THEMES above is claimed by exactly one
// archetype, so every product lands somewhere.
//
//   tier: 'surface'  -> reachable at any depth (Q6)
//   tier: 'deep'     -> only reachable when the user chooses the deep path in Q6.
//                       On the surface path, its themes redirect to `redirect`.
export const ARCHETYPES = [
  {
    id: 'anchor',
    name: 'The Anchor',
    tier: 'surface',
    themes: ['Grounding & Protection', 'Calm & Comfort'],
    tagline: 'Steady. Rooted. Unshakeable.',
  },
  {
    id: 'beacon',
    name: 'The Beacon',
    tier: 'surface',
    themes: ['Focus & Confidence'],
    tagline: 'Clear-eyed and moving toward something.',
  },
  {
    id: 'oracle',
    name: 'The Oracle',
    tier: 'surface',
    themes: ['Insight & Processing', 'Spiritual Connection'],
    tagline: 'Listening for what the surface hides.',
  },
  {
    id: 'solace',
    name: 'The Solace',
    tier: 'surface',
    themes: ['Healing & Pathfinding', 'Healing & Release'],
    tagline: 'Tending the tender places.',
  },
  {
    id: 'emerge',
    name: 'Emerge',
    tier: 'deep',
    redirect: 'beacon', // on the surface path, Transformation themes -> The Beacon
    themes: ['Transformation & Growth'],
    tagline: 'Becoming who you are next.',
  },
  {
    id: 'kali',
    name: 'Kali',
    tier: 'deep',
    redirect: 'anchor', // on the surface path, Courage themes -> The Anchor
    themes: ['Courage & Strength'],
    tagline: 'Fierce. Clearing. Unafraid of the fire.',
  },
];

// Product formats (drives Q5, the format filter). `collections` are the
// Squarespace collection slugs seen in the CSV "Categories" column; `keywords`
// are a title fallback when a product carries no recognizable collection.
export const FORMATS = [
  { id: 'diffuser', label: 'Diffuser blend', collections: ['/diffuser-blends'], keywords: ['diffuser'] },
  { id: 'spray',    label: 'Room & aura spray', collections: ['/spray-blends'], keywords: ['spray', 'mist'] },
  { id: 'body',     label: 'Body blend',        collections: ['/body-blends'],  keywords: ['body', 'roll', 'serum'] },
  { id: 'bath',     label: 'Bath soak',         collections: ['/bath-blends'],  keywords: ['bath', 'soak'] },
  { id: 'kit',      label: 'Kit / set',         collections: ['/kits-packs'],   keywords: ['kit', 'set', 'pack', 'bundle'] },
];

// ---- derived lookups (don't edit; computed from the tables above) ----------

export const ARCHETYPES_BY_ID = Object.fromEntries(ARCHETYPES.map((a) => [a.id, a]));

// theme tag -> archetype id
export const THEME_TO_ARCHETYPE = (() => {
  const map = {};
  for (const a of ARCHETYPES) for (const t of a.themes) map[t] = a.id;
  return map;
})();

// Resolve a raw scored archetype id against the chosen depth path.
// On the surface path, a deep archetype folds into its redirect target.
export function resolveTier(archetypeId, deep) {
  const a = ARCHETYPES_BY_ID[archetypeId];
  if (!a) return archetypeId;
  if (a.tier === 'deep' && !deep) return a.redirect;
  return archetypeId;
}

// Map a product's collection slugs + title to a format id.
export function detectFormat(collections, title) {
  const cols = (collections || []).map((c) => c.trim());
  for (const f of FORMATS) {
    if (f.collections.some((c) => cols.includes(c))) return f.id;
  }
  const t = (title || '').toLowerCase();
  for (const f of FORMATS) {
    if (f.keywords.some((k) => t.includes(k))) return f.id;
  }
  return 'diffuser'; // sensible default; most of the catalog is diffuser blends
}
