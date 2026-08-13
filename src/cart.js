// ============================================================================
//  cart.js  —  best-effort, same-origin Add to Cart with graceful fallback.
// ----------------------------------------------------------------------------
//  The quiz runs on the Squarespace store, so it can POST to Squarespace's own
//  cart endpoint (the exact request the native "Add to Cart" button makes):
//
//    POST /api/commerce/shopping-cart/entries?crumb=<crumb cookie>
//    body: { itemId, sku, quantity, additionalFields: "null" }
//
//  This is an UNDOCUMENTED internal endpoint. If Squarespace ever changes it,
//  addToCart() returns false and the UI falls back to opening the product page
//  (which always has a working native Add to Cart). So it can never leave a
//  broken button — worst case it behaves like a plain product link.
// ============================================================================

function getCrumb() {
  const m = (typeof document !== 'undefined' ? document.cookie : '').match(/(?:^|;\s*)crumb=([^;]+)/);
  return m ? m[1] : '';
}

/**
 * Try to add a product to the Squarespace cart.
 * @returns {Promise<boolean>} true if the item was added (HTTP 200), else false.
 */
export async function addToCart(product) {
  try {
    if (!product || !product.productId || !product.sku) return false;
    const crumb = getCrumb();
    if (!crumb) return false; // not on a Squarespace page / no session
    const res = await fetch('/api/commerce/shopping-cart/entries?crumb=' + encodeURIComponent(crumb), {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId: product.productId,
        sku: product.sku,
        quantity: 1,
        additionalFields: 'null',
      }),
    });
    return res.ok; // 200 = added; 4xx (e.g. endpoint changed) = false → caller falls back
  } catch (_) {
    return false;
  }
}
