// ============================================================================
//  email.js  —  email capture stub.
// ----------------------------------------------------------------------------
//  The email platform (Mailchimp) is not wired yet. Everything downstream calls
//  submitEmail() and only cares that it returns a Promise. When Mailchimp
//  details arrive, implement the body of submitEmail() here and NOTHING else in
//  the app needs to change.
//
//  Mailchimp options, for later:
//   - Embedded-form POST to the list's post URL (no API key in client), or
//   - A tiny serverless proxy that calls the Mailchimp API with your key
//     (keeps the audience/API key off the page). Recommended.
//
//  The `result` arg carries the quiz outcome so the archetype can be stored as
//  a Mailchimp merge field / tag when you wire it up.
// ============================================================================

/**
 * @param {string} email
 * @param {Object} [result]  the scoreAnswers() payload (archetype, format, …)
 * @returns {Promise<{ok: boolean, stub?: boolean}>}
 */
export function submitEmail(email, result) {
  // eslint-disable-next-line no-console
  console.info('[kismet] submitEmail stub →', email, {
    archetype: result?.archetypeId,
    format: result?.format,
    hero: result?.hero?.product?.slug,
  });
  // Simulate a network round-trip so the UI's loading state is exercised.
  return new Promise((resolve) => setTimeout(() => resolve({ ok: true, stub: true }), 400));
}
