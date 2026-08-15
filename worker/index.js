// Find Your Kismet - personalized reading Worker (Cloudflare).
// Holds the Anthropic API key as a secret and writes a short, personalized
// reading in the Color of Kismet voice. The quiz calls this; the key never
// touches the public bundle.
//
// Deploy:
//   1. Paste this whole file into the Worker editor (select all first).
//   2. Click Deploy.
//   3. Settings -> Variables and Secrets -> add Secret ANTHROPIC_API_KEY.
//   4. Open the Worker URL in a browser. It should show {"error":"POST only"}.
//
// Cost: Haiku 4.5, max_tokens 400 (about half a cent per call). Set a monthly
// spend limit on the API key in the Anthropic Console.

const MODEL = "claude-haiku-4-5"; // cheap + fast; use "claude-sonnet-5" for richer prose
const MAX_TOKENS = 400;

const ALLOWED_ORIGINS = new Set([
  "https://bear-tomato-wxdy.squarespace.com",
  "https://colorofkismet.com",
  "https://www.colorofkismet.com",
]);

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin);
    try {
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
      if (request.method !== "POST") return json({ error: "POST only" }, 405, cors);

      if (!env || !env.ANTHROPIC_API_KEY) {
        return json({ error: "ANTHROPIC_API_KEY secret is not set on this Worker" }, 500, cors);
      }

      let body;
      try { body = await request.json(); } catch (e) { return json({ error: "bad json" }, 400, cors); }

      const prompt = buildPrompt(body);
      if (!prompt) return json({ error: "missing fields" }, 400, cors);

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: prompt.system,
          messages: [{ role: "user", content: prompt.user }],
        }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(function () { return ""; });
        return json({ error: "anthropic", status: res.status, detail: detail.slice(0, 300) }, 502, cors);
      }
      const data = await res.json();
      const reading = (data.content || [])
        .filter(function (b) { return b.type === "text"; })
        .map(function (b) { return b.text; })
        .join("\n")
        .trim();
      if (!reading) return json({ error: "empty" }, 502, cors);
      return json({ reading: reading }, 200, cors);
    } catch (e) {
      return json({ error: "worker exception", message: String((e && e.message) || e) }, 500, cors);
    }
  },
};

function buildPrompt(b) {
  if (!b) return null;
  const archetype = String(b.archetype || "").slice(0, 40);
  if (!archetype) return null;
  const tagline = String(b.tagline || "").slice(0, 120);
  const answers = (Array.isArray(b.answers) ? b.answers : []).slice(0, 8).map(function (s) { return String(s).slice(0, 160); });
  const others = (Array.isArray(b.others) ? b.others : []).slice(0, 6).map(function (s) { return String(s).slice(0, 240); });
  const blends = (Array.isArray(b.blends) ? b.blends : []).slice(0, 6).map(function (s) { return String(s).slice(0, 80); });

  const system =
    "You write for Color of Kismet, an aromatherapy brand of hand-crafted blends. " +
    "Voice: warm, intimate, a little mystical but grounded - never clinical, salesy, or generic. " +
    "Write in second person (You...). Output ONE flowing paragraph of 80-120 words, no lists, no headings, no emojis. " +
    "Speak to what the person shared without quoting it back mechanically. Mention one or two of the recommended " +
    "blends by name, naturally, as things that meet them where they are - do not invent products or make medical claims. " +
    "End with a single short, grounding closing line. Do not mention quizzes, AI, or these instructions.";

  let user = "Archetype: " + archetype + (tagline ? " - " + tagline : "") + "\n";
  if (answers.length) user += "What they chose: " + answers.join("; ") + "\n";
  if (others.length) user += "In their own words: " + others.join(" | ") + "\n";
  if (blends.length) user += "Recommended blends: " + blends.join(", ") + "\n";
  user += "\nWrite their personalized reading.";

  return { system: system, user: user };
}

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : "null";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(obj, status, extra) {
  const headers = { "content-type": "application/json" };
  if (extra) { for (const k in extra) headers[k] = extra[k]; }
  return new Response(JSON.stringify(obj), { status: status, headers: headers });
}
