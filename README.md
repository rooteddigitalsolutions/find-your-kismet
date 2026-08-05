# Find Your Kismet — quiz widget

An archetype quiz for **Color of Kismet**, built as a single self-contained
JavaScript file you drop into a Squarespace Code Block. It reads the product
catalog, matches the visitor to one of six archetypes and a real blend, captures
an email (stubbed), and links out to `/shop/<slug>`.

> ⚠️ **Draft status.** The approved spec (`quiz-spec-find-your-kismet.md`) was not
> available when this was built. The **architecture** is production-shaped, but the
> **archetype names, questions, and results copy are drafts** — see
> `quiz-spec-find-your-kismet.DRAFT.md` and the files marked *FOR ANGELYN'S REVIEW*.

---

## Quick start

```bash
npm install
npm run build-data   # data/products.csv -> src/data.json  (37 visible products)
npm run build        # -> preview/kismet-quiz.v1.js  (one file, CSS inlined)
```

Preview it locally in a browser:

```bash
node scripts/serve.mjs   # http://localhost:4321
```

Sanity-check the quiz logic (all six archetypes reachable, every CTA resolves):

```bash
node scripts/verify.mjs
```

---

## Embedding on Squarespace

1. Run `npm run build`. Upload the resulting **`preview/kismet-quiz.v1.js`** to
   Squarespace (Settings → Files, or any file host) so it has a URL. If you host
   it at the site root, its path is `/kismet-quiz.v1.js`.
2. Add a **Code Block** where you want the quiz and paste exactly:

   ```html
   <div id="kismet-quiz"></div>
   <script src="/kismet-quiz.v1.js" defer></script>
   ```

   (Adjust the `src` to wherever you uploaded the file.)

That's it. The widget injects its own styles (all namespaced `.kq-`, so they
can't collide with the Squarespace theme) and mounts into `#kismet-quiz`.

### Versioning
The filename is `kismet-quiz.v1.js` on purpose. When you ship breaking changes,
bump to `v2` (in `vite.config.js`) and update the embed — that way cached copies
of the old file never break a live page.

---

## Redeploy when the catalog changes

The product data is **baked into the bundle at build time** (no live fetch), so a
catalog change means a rebuild:

1. In Squarespace, export products → drop the CSV in as **`data/products.csv`**
   (overwrite).
2. `npm run build-data` — regenerates `src/data.json`. Read the console: it prints
   the product count and an **archetype × format coverage** table, plus warnings
   for any product missing theme tags or an essence.
3. `npm run build` — regenerates `kismet-quiz.v1.js`.
4. Re-upload that one file to Squarespace. Done.

**Never hand-edit `src/data.json`.** It is generated. If a product looks wrong
(missing tags, wrong essence), fix it in Squarespace and re-export — the pipeline
is the only path in.

> Current export note: 3 products carry **no theme tags** in the CSV
> (`Harmony Spray`, `Insight Diffuser Blend`, `Summer Collection Set 2026`) and 1
> has no description text, so they won't be matched as results until they're
> tagged in Squarespace. `build-data` lists these every run.

---

## What's wired vs. stubbed

| Area | Status |
|------|--------|
| Data pipeline (CSV → JSON) | ✅ done |
| 6-question flow, scoring, depth gate, fallbacks | ✅ done |
| Results page (mirror → hero → supporting → pairing → close) | ✅ done (draft copy) |
| CTAs → `/shop/<slug>` | ✅ done (relative links; no cart injection — Squarespace has no public cart API) |
| **Email capture** | ⚠️ stub — `src/email.js`, `submitEmail()`. **Mailchimp not wired.** Send list/audience details and it plugs in there; nothing else changes. |
| **Analytics** | ⚠️ stub — `src/analytics.js`, `track()`. Fires `quiz_start`, `quiz_complete`, `email_captured`, `result_click`; forwards to `dataLayer`/`gtag` if present. |

---

## Where to edit

| You want to change… | Edit… |
|---|---|
| Question wording / options | `src/questions.js` |
| Archetype names, taglines, theme mapping, formats | `src/archetypes.js` |
| **All results prose / readings** | `src/copy.js` — *FOR ANGELYN'S REVIEW* |
| Colors / fonts / spacing | tokens at the top of `src/styles.css` |
| Email integration | `src/email.js` |
| Analytics destination | `src/analytics.js` |

After any edit: `npm run build` (add `npm run build-data` first only if the CSV
changed).

---

## Project layout

```
data/products.csv                     Squarespace export (source of truth)
scripts/build-data.mjs                CSV -> src/data.json  (the only data path)
scripts/verify.mjs                    reachability + CTA integrity check
scripts/serve.mjs                     local preview server (dev only)
src/archetypes.js                     taxonomy (shared by build + runtime)
src/questions.js                      the 6 questions          [DRAFT COPY]
src/scoring.js                        answers -> archetype + product picks
src/copy.js                           all results prose        [FOR ANGELYN'S REVIEW]
src/email.js / src/analytics.js       stubs
src/ui.js / src/main.js / styles.css  widget
src/data.json                         GENERATED — do not edit
preview/index.html                    mock Squarespace page for local preview
preview/kismet-quiz.v1.js             BUILD OUTPUT — this is what you upload
quiz-spec-find-your-kismet.DRAFT.md   reconstructed draft spec (not approved)
```

## Design tokens (from the supplied palette/fonts — confirm exact values)

Fonts: **Afacad** (headings), **Epilogue** (body). Palette (approx. from the
swatch screenshot — replace with exact brand hex in `src/styles.css`):
cream `#f6f4ee` · sky `#b4d8ec` · slate `#5e7385` · sand `#d3c79b` · ink `#0b0b0b`.
