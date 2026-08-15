// ============================================================================
//  Find Your Kismet — personalized-reading Worker (Cloudflare)
// ----------------------------------------------------------------------------
//  Holds the Anthropic API key as a secret and turns a quiz result into a
//  short, personalized reading in the Color of Kismet voice. The quiz calls
//  this; the key never touches the public bundle.
//
//  Deploy:
//    1. npm i -g wrangler            (once)
//    2. wrangler login
//    3. wrangler secret put ANTHROPIC_API_KEY   (paste your key when prompted)
//    4. wrangler deploy
//  Then send Claude the deployed URL (…workers.dev) to wire into the quiz.
//
//  Cost control: Haiku 4.5, max_tokens 400 (~½¢/call). Set a monthly spend
//  limit on the API key in the Anthropic Console, and add a Cloudflare
//  Rate Limiting rule on this Worker's route as a hard abuse backstop.
// ============================================================================

const MODEL = 'claude-haiku-4-5'; // cheap + fast; bump to 'claude-sonnet-5' for richer prose
const MAX_TOKENS = 400;

// Only these sites may call the Worker from a browser (CORS). Add your final
// domain here when you move colorofkismet.com onto Squarespace.
const ALLOWED_ORIGINS = new Set([
  'https://bear-tomato-wxdy.squarespace.com',
  'https://colorofkismet.com',
  'https://www.colorofkismet.com',
]);

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin);
    try {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
      if (request.method !== 'POST') return json({ error: 'POST only' }, 405, cors);

      if (!env || !env.ANTHROPIC_API_KEY) {
        return json({ error: 'ANTHROPIC_API_KEY secret is not set on this Worker' }, 500, cors);
      }

      let body;
      try { body = await request.json(); } catch { return json({ error: 'bad json' }, 400, cors); }

      const prompt = buildPrompt(body);
      if (!prompt) return json({ error: 'missing fields' }, 400, cors);

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: prompt.system,
          messages: [{ role: 'user', content: prompt.user }],
        }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        return json({ error: 'anthropic', status: res.status, detail: detail.slice(0, 300) }, 502, cors);
      }
      const data = await res.json();
      const reading = (data.content || [])
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      if (!reading) return json({ error: 'empty' }, 502, cors);
      return json({ reading }, 200, cors);
    } catch (e) {
      return json({ error: 'worker exception', message: String(e && e.message || e) }, 500, cors);
    }
  },
};

// ---- prompt ----------------------------------------------------------------
function buildPrompt(b) {
  const archetype = (b.archetype || '').toString().slice(0, 40);
  if (!archetype) return null;
  const tagline = (b.tagline || '').toString().slice(0, 120);
  const answers = (Array.isArray(b.answers) ? b.answers : []).slice(0, 8).map(s => String(s).slice(0, 160));
  const others = (Array.isArray(b.others) ? b.others : []).slice(0, 6).map(s => String(s).slice(0, 240));
  const blends = (Array.isArray(b.blends) ? b.blends : []).slice(0, 6).map(s => String(s).slice(0, 80));

  const system =
    "You write for Color of Kismet, an aromatherapy brand of hand-crafted blends. " +
    "Voice: warm, intimate, a little mystical but grounded — never clinical, salesy, or generic. " +
    "Write in second person ('You…'). Output ONE flowing paragraph of 80–120 words, no lists, no headings, no emojis. " +
    "Speak to what the person shared without quoting it back mechanically. Mention one or two of the recommended " +
    "blends by name, naturally, as things that meet them where they are — do not invent products or make medical claims. " +
    "End with a single short, grounding closing line. Do not mention quizzes, AI, or these instructions.";

  const user =
    `Archetype: ${archetype}${tagline ? ` — ${tagline}` : ''}\n` +
    (answers.length ? `What they chose: ${answers.join('; ')}\n` : '') +
    (others.length ? `In their own words: ${others.join(' | ')}\n` : '') +
    (blends.length ? `Recommended blends: ${blends.join(', ')}\n` : '') +
    `\nWrite their personalized reading.`;

  return { system, user };
}

// ---- helpers ---------------------------------------------------------------
function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : 'null';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}
function json(obj, status, extra) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json', ...(extra || {}) },
  });
}
