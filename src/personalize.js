// ============================================================================
//  personalize.js  —  optional AI-written reading via the Cloudflare Worker.
// ----------------------------------------------------------------------------
//  When READING_ENDPOINT is set to the deployed Worker URL, the results page
//  asks Claude (through the Worker, which holds the API key) to write a reading
//  personalized to the visitor's answers + their "Other" free-text. Until the
//  URL is set — or if the call fails/times out — the quiz uses the pre-written
//  archetype reading from copy.js. It is pure progressive enhancement: it never
//  blocks or breaks the results.
// ============================================================================

import { ARCHETYPES_BY_ID } from './archetypes.js';

// Paste the deployed Worker URL here (…workers.dev). Empty = feature off.
const READING_ENDPOINT = '';

const TIMEOUT_MS = 6000;

export function personalizationEnabled() {
  return !!READING_ENDPOINT;
}

/**
 * @param {Object} result  the scoreAnswers() payload
 * @param {Object} answers the raw answers map (for the free-text "Other")
 * @returns {Promise<string|null>} the personalized reading, or null on any failure
 */
export async function personalizedReading(result, answers) {
  if (!READING_ENDPOINT) return null;
  const a = ARCHETYPES_BY_ID[result?.archetypeId];
  if (!a) return null;

  const answerLabels = [];
  for (const q of ['q1', 'q2', 'q3', 'q4']) {
    const opts = answers?.[q]?.options || [];
    for (const o of opts) if (o?.label) answerLabels.push(o.label);
  }
  const payload = {
    archetype: a.name,
    tagline: a.tagline,
    answers: answerLabels,
    others: (result?.others || []).map((o) => o.text).filter(Boolean),
    blends: (result?.products || []).map((p) => p.title),
    // NOTE: email is deliberately NOT sent — the reading needs none of it.
  };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(READING_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const reading = (data && data.reading) ? String(data.reading).trim() : '';
    return reading || null;
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
