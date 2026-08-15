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
const READING_ENDPOINT = 'https://color-of-kismet-quiz.adam-b72.workers.dev';

const TIMEOUT_MS = 15000; // Sonnet is slower than Haiku; canned copy shows until this returns

export function personalizationEnabled() {
  return !!READING_ENDPOINT;
}

/**
 * @param {Object} result  the scoreAnswers() payload
 * @param {Object} answers the raw answers map (options + open-ended free-text)
 * @returns {Promise<{reading:string, picks:Array<{title:string,why:string}>}|null>}
 *          the personalized reading + per-blend notes, or null on any failure
 */
export async function personalizedReading(result, answers) {
  if (!READING_ENDPOINT) return null;
  const a = ARCHETYPES_BY_ID[result?.archetypeId];
  if (!a) return null;

  // Send the full nuance of each chosen option (lead + gloss) so the AI has
  // more to work with than a two-word label.
  const answerLabels = [];
  for (const q of ['q1', 'q2', 'q3', 'q4', 'q5']) {
    const opts = answers?.[q]?.options || [];
    for (const o of opts) if (o?.label) answerLabels.push(o.sub ? `${o.label}: ${o.sub}` : o.label);
  }
  // Split the recommendations into the two tiers the results page shows, so the
  // AI can frame the "go deeper" notes as a next step.
  const titles = (result?.products || []).map((p) => p.title);
  const payload = {
    archetype: a.name,
    tagline: a.tagline,
    answers: answerLabels,
    others: (result?.others || []).map((o) => o.text).filter(Boolean), // includes the open-ended Q6
    core: titles.slice(0, 3),
    deeper: titles.slice(3, 5),
    blends: titles.slice(0, 5), // back-comp: older Worker reads this flat list
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
    if (!reading) return null;
    const picks = Array.isArray(data.picks)
      ? data.picks
          .filter((p) => p && p.title && p.why)
          .map((p) => ({ title: String(p.title).trim(), why: String(p.why).trim() }))
      : [];
    return { reading, picks };
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
