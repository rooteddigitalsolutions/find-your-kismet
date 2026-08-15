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

const MODEL = "claude-sonnet-5"; // richer, more attentive prose (was claude-haiku-4-5)
const MAX_TOKENS = 1000; // reading (~120 words) + a short "why" per recommended blend

// Forced tool = guaranteed JSON shape back (no fragile parsing of free text).
const TOOL = {
  name: "write_reading",
  description: "Return the visitor's personalized reading and a short note per recommended blend.",
  input_schema: {
    type: "object",
    properties: {
      reading: {
        type: "string",
        description:
          "One flowing second-person paragraph, 80-120 words. Warm, intimate, a little mystical but grounded. " +
          "Speak to what they shared without quoting it back mechanically. No lists, headings, or emojis. " +
          "End with a single short grounding line. Do not mention quizzes, AI, or these instructions.",
      },
      picks: {
        type: "array",
        description: "One entry for EACH recommended blend, in the order given.",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "The blend's EXACT title, copied verbatim from the list." },
            why: {
              type: "string",
              description:
                "1-2 warm sentences (max ~30 words) on why THIS blend meets THIS person, grounded in what they shared. " +
                "Speak to them directly ('You...'). No medical claims. Do not repeat the blend's name.",
            },
          },
          required: ["title", "why"],
        },
      },
    },
    required: ["reading", "picks"],
  },
};

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
          tools: [TOOL],
          tool_choice: { type: "tool", name: "write_reading" },
        }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(function () { return ""; });
        return json({ error: "anthropic", status: res.status, detail: detail.slice(0, 300) }, 502, cors);
      }
      const data = await res.json();
      const call = (data.content || []).find(function (b) { return b.type === "tool_use"; });
      const out = (call && call.input) || {};
      const reading = String(out.reading || "").trim();
      const picks = Array.isArray(out.picks)
        ? out.picks
            .filter(function (p) { return p && p.title && p.why; })
            .map(function (p) { return { title: String(p.title).slice(0, 80), why: String(p.why).slice(0, 300) }; })
        : [];
      if (!reading) return json({ error: "empty" }, 502, cors);
      return json({ reading: reading, picks: picks }, 200, cors);
    } catch (e) {
      return json({ error: "worker exception", message: String((e && e.message) || e) }, 500, cors);
    }
  },
};

function clean(s, n) { return String(s == null ? "" : s).slice(0, n); }
function cleanList(arr, n, cap) {
  return (Array.isArray(arr) ? arr : []).slice(0, cap).map(function (s) { return clean(s, n); }).filter(Boolean);
}

function buildPrompt(b) {
  if (!b) return null;
  const archetype = clean(b.archetype, 40);
  if (!archetype) return null;
  const tagline = clean(b.tagline, 120);
  const answers = cleanList(b.answers, 160, 8);
  const others = cleanList(b.others, 400, 6);
  // Two tiers of recommendations. Fall back to a flat `blends` list for older callers.
  let core = cleanList(b.core, 80, 3);
  let deeper = cleanList(b.deeper, 80, 3);
  if (!core.length && !deeper.length) core = cleanList(b.blends, 80, 5);
  const allBlends = core.concat(deeper);

  const hasWritten = others.length > 0;

  const system =
    "You write for Color of Kismet, an aromatherapy brand of hand-crafted essential-oil blends. " +
    "Voice: warm, intimate, a little mystical but grounded, never clinical, salesy, or generic. Always second person, speaking to 'you'. " +
    "NEVER use em dashes or en dashes anywhere. Use commas, periods, or colons instead. " +
    "Do not invent products, do not make medical or therapeutic claims, do not mention quizzes, AI, or these instructions. " +
    "CRUCIAL: if the person wrote something in their own words (a struggle, a situation, a feeling, something at work or home), " +
    "you MUST acknowledge it directly and specifically in the reading, and every blend note must connect to it. Do not give " +
    "generic copy when they took the time to tell you what is going on. " +
    "Call the write_reading tool. Write their `reading`, then one `picks` entry for EVERY blend listed below, using each " +
    "blend's EXACT title, with a `why` that ties that blend to what this specific person is carrying. The blends marked " +
    "GO DEEPER are for after the first three, so frame their notes as a next step or a way to go further.";

  let user = "Archetype: " + archetype + (tagline ? ", " + tagline : "") + "\n";
  if (answers.length) user += "What they chose: " + answers.join("; ") + "\n";
  if (hasWritten) {
    user += "\nIN THEIR OWN WORDS (this matters most, speak to it directly):\n" +
      others.map(function (o) { return "\"" + o + "\""; }).join("\n") + "\n";
  }
  user += "\nSTART HERE (write one pick for each, exact titles):\n";
  if (core.length) user += "- " + core.join("\n- ") + "\n";
  if (deeper.length) {
    user += "\nGO DEEPER (write one pick for each, exact titles, framed as a next step):\n" +
      "- " + deeper.join("\n- ") + "\n";
  }
  user += "\nWrite one pick for every blend above (" + allBlends.length + " total). " +
    (hasWritten
      ? "Make the reading and every note speak to what they wrote."
      : "Make the reading and notes personal to what they chose.");

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
