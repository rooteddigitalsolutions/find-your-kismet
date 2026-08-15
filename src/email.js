// ============================================================================
//  email.js  —  logs each quiz submission (email + suggested blends) to the
//  "Find Your Kismet — Quiz Submissions" Google Sheet via an Apps Script Web App.
// ----------------------------------------------------------------------------
//  Sheet: https://docs.google.com/spreadsheets/d/1p65R41yQo5L1svg8bYNYOnP26om9IR3tsxMXes5Yr0I/edit
//
//  SETUP: paste the Apps Script Web App /exec URL into SHEET_ENDPOINT below.
//  Until it's set, submissions are only logged to the console (no-op), so the
//  quiz keeps working. The POST is fire-and-forget (mode:'no-cors') — we don't
//  need the response, we just append a row.
// ============================================================================

import { ARCHETYPES_BY_ID } from './archetypes.js';

const SHEET_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxqMiy8DErU3CjFcw2dXNQopRgw0xkDmHMSiPcK9qmn_ABtdS9E7EBTiDAJVlhXVdvRlg/exec';

/**
 * @param {string} email
 * @param {Object} result  the scoreAnswers() payload (archetypeId, products, formats…)
 * @returns {Promise<{ok:boolean}>}
 */
export function submitEmail(email, result) {
  const payload = {
    email,
    archetype: ARCHETYPES_BY_ID[result?.archetypeId]?.name || result?.archetypeId || '',
    blends: (result?.products || []).map((p) => p.title),
    formats: result?.formats || [],
  };

  if (!SHEET_ENDPOINT) {
    // eslint-disable-next-line no-console
    console.info('[kismet] submitEmail (no sheet endpoint set yet) →', payload);
    return Promise.resolve({ ok: false, stub: true });
  }

  try {
    return fetch(SHEET_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors', // fire-and-forget; Apps Script appends the row server-side
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // simple request, no CORS preflight
      body: JSON.stringify(payload),
    })
      .then(() => ({ ok: true }))
      .catch(() => ({ ok: false }));
  } catch (_) {
    return Promise.resolve({ ok: false });
  }
}
