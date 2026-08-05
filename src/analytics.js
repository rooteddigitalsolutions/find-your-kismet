// ============================================================================
//  analytics.js  —  single analytics stub.
// ----------------------------------------------------------------------------
//  Every trackable moment goes through track(). Today it logs and, if present,
//  forwards to Squarespace's / GA's dataLayer or gtag so you can wire it up in
//  the site's injection settings without touching this bundle again.
//
//  Events fired by the app:
//    quiz_start      — user leaves the intro
//    quiz_complete   — Q6 answered, result computed  { archetype, format, deep }
//    email_captured  — email submitted (not skipped)  { archetype }
//    result_click    — a product CTA clicked          { slug, placement }
// ============================================================================

export function track(event, props = {}) {
  // eslint-disable-next-line no-console
  console.info(`[kismet] track: ${event}`, props);
  try {
    if (typeof window !== 'undefined') {
      if (Array.isArray(window.dataLayer)) window.dataLayer.push({ event: `kismet_${event}`, ...props });
      if (typeof window.gtag === 'function') window.gtag('event', `kismet_${event}`, props);
    }
  } catch (_) {
    /* analytics must never break the quiz */
  }
}
