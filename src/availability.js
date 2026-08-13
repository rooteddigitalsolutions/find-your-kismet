// ============================================================================
//  availability.js  —  live "what's visible right now" check.
// ----------------------------------------------------------------------------
//  The quiz runs ON the Squarespace site, so it can read the store's own JSON
//  feed (same-origin) to learn which products are currently visible. Results
//  are then filtered to only-available products — so items toggled offline stop
//  appearing automatically, with NO rebuild.
//
//  Fails safe: if the feed can't be read (local preview, network error, or the
//  quiz is hosted somewhere without /shop), it returns null and the quiz falls
//  back to the full baked product list — it never hides everything by mistake.
// ============================================================================

let cache; // Promise<Set<string>|null> — fetched once per page load

export function getVisibleSlugs() {
  if (!cache) cache = fetchVisible();
  return cache;
}

async function fetchVisible() {
  try {
    const slugs = new Set();
    let offset = null;
    for (let guard = 0; guard < 12; guard++) {
      const url = '/shop?format=json' + (offset ? '&offset=' + offset : '');
      const res = await fetch(url, { credentials: 'same-origin', headers: { accept: 'application/json' } });
      if (!res.ok) return null;
      const data = await res.json();
      const items = data && data.items;
      if (!Array.isArray(items)) return null;
      for (const it of items) {
        // The store feed lists only visible products (hidden ones are excluded),
        // and each carries workflowState === 1 when published. urlId is the slug
        // used in /shop/p/<slug>.
        if (it.urlId && it.workflowState === 1) slugs.add(it.urlId);
      }
      const pg = data.pagination;
      offset = pg && pg.nextPage ? pg.nextPageOffset : null;
      if (!offset) break;
    }
    return slugs.size ? slugs : null; // empty set is treated as "unknown" → no filtering
  } catch (_) {
    return null;
  }
}

// Resolve the visible set but never block the UI for long.
export function getVisibleSlugsWithTimeout(ms = 2500) {
  return Promise.race([
    getVisibleSlugs(),
    new Promise((r) => setTimeout(() => r(null), ms)),
  ]);
}
