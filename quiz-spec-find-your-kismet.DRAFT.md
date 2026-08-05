# Find Your Kismet — Quiz Spec (RECONSTRUCTED DRAFT)

> ⚠️ **This is a draft, not the approved spec.** The real `quiz-spec-find-your-kismet.md`
> referenced by the kickoff prompt was never provided. Everything below was
> reverse-engineered from the product catalog so there was something concrete and
> working to react to. **None of this copy is approved.** Treat every question,
> archetype name, and results line as a starting point for Angelyn's review.
> When the real spec arrives, this file is what it replaces.

---

## §0. What's a draft vs. what's load-bearing

**Load-bearing (works, matches the kickoff's stated architecture):**

- Single-file namespaced (`.kq-`) IIFE widget, CSS inlined, built with Vite.
- Data pipeline is the only path for product data → `src/data.json`.
- 6-question flow; Q4 context layer, Q5 format filter, Q6 depth gate.
- Email screen is skippable and behind a `submitEmail()` stub.
- Analytics through a single `track()` stub.
- CTAs are relative `/shop/<slug>` links; no cart injection.

**Draft (invented — expect to rewrite):**

- The six archetype **names** and their **readings**.
- The **wording** of all six questions and their options.
- The results-page prose.

---

## §1. Archetypes & fallback rules

Six archetypes, each anchored to real product **theme tags** (the CSV `Tags`
column) so every archetype maps onto inventory. Two — **Emerge** and **Kali** —
are *deep-tier*: only reachable when the user chooses the deep path in Q6.

| Archetype     | Tier    | Theme tags it owns                         |
|---------------|---------|--------------------------------------------|
| The Anchor    | surface | Grounding & Protection, Calm & Comfort     |
| The Beacon    | surface | Focus & Confidence                         |
| The Oracle    | surface | Insight & Processing, Spiritual Connection |
| The Solace    | surface | Healing & Pathfinding, Healing & Release   |
| **Emerge**    | deep    | Transformation & Growth                    |
| **Kali**      | deep    | Courage & Strength                         |

**Depth gate (Q6).** On the *surface* path, a deep archetype folds into a
redirect: Emerge → The Beacon, Kali → The Anchor. So a user who scores toward
transformation but isn't ready to "go deep" still gets a coherent surface
result instead of being pushed somewhere they didn't ask to go.

**Fallback rules for empty archetype × format cells.** The catalog does not have
every format for every archetype (e.g. no *bath* Kali blend). Resolution order
when the ideal `(archetype, format)` cell is empty:

1. **Same archetype, best other format.** Keep the archetype; pick its highest-count
   available format. Show an in-voice redirect line (pattern below).
2. **Redirect archetype (deep only), same format.** If a deep archetype has no
   product at all in that format, try its surface redirect target in the chosen
   format before relaxing further.
3. **Same archetype, any product.** Last resort within the archetype.

**In-voice redirect line pattern** (shown above the hero when the format was
relaxed):

> *"Kismet didn't have a {requested_format} waiting for The Anchor — so it
> reached for the {actual_format} that carries the same steadiness."*

Coverage as of the current catalog (from `build-data` output):

```
anchor   diffuser:5  spray:6  bath:1
beacon   diffuser:5  spray:4  body:3
oracle   diffuser:4  body:5   bath:2  spray:4  kit:1
solace   diffuser:6  bath:2   body:1  spray:1
emerge   diffuser:4  body:3   spray:2 kit:1
kali     diffuser:3  spray:3  body:1
```

---

## §2. Build plan

```
find-your-kismet/
  data/products.csv          # Squarespace export (source of truth for products)
  scripts/build-data.mjs      # CSV -> src/data.json (the ONLY data path)
  src/
    archetypes.js             # taxonomy: archetypes, theme map, formats (shared)
    questions.js              # the 6 questions + option scoring
    scoring.js                # answers -> archetype + format + hero product
    copy.js                   # ALL results prose  [FOR ANGELYN'S REVIEW]
    email.js                  # submitEmail() stub (Mailchimp later)
    analytics.js              # track() stub
    ui.js                     # DOM rendering, screen flow
    styles.css                # all styles, namespaced .kq-
    data.json                 # GENERATED — never hand-edit
    main.js                   # entry: mount widget, inject CSS
  preview/index.html          # Squarespace-like page that mounts the widget
  vite.config.js              # single-file IIFE build -> kismet-quiz.v1.js
```

`npm run build-data && npm run build` → `preview/kismet-quiz.v1.js`.

---

## §3. Flow

Intro → Q1 → Q2 → Q3 → Q4 (context) → Q5 (format) → Q6 (depth) → Email (skippable)
→ Results. Progress bar spans the six questions.

**All questions are multi-select** (`multi: true`): the visitor may check any number
of answers, and each checked answer scores. A **Continue** button advances (answers
no longer auto-advance). Every question also has an **"Other" free-text box**
(`other: true`); the typed text is captured on the result payload (`result.others`)
for analytics/email but scores nothing — free text can't be mapped to an archetype.
For Q5 the chosen format(s) are all treated as acceptable; for Q6, "deep" wins if
the deep option is among the picks.

---

## §4. The six questions  (DRAFT COPY — not approved)

Scoring notation: each option lists the theme(s) it adds a point to. Themes roll
up to archetypes per §1. Q1–Q3 are the archetype scorers. Q4 adds context weight.
Q5 sets format. Q6 sets depth.

See `src/questions.js` for the machine-readable version. Copy lives there so it's
edited in exactly one place.

Each scoring question covers four of the six archetypes; the sets rotate so
every archetype is scorable in three of Q1–Q4 and can reach a clean winning
total. `scripts/verify.mjs` proves all six are reachable (2,560 combinations).

Each question is multi-select and carries an "Other" free-text box (see §3).

**Q1 — "I see myself as…"** *(anchor / beacon / oracle / kali)*
- A protector standing guard over the people and spaces I love → *Grounding & Protection*
- A seeker, a builder, someone on the move → *Focus & Confidence*
- A thinker who turns things over → *Insight & Processing*
- A fighter who stands up for what is right → *Courage & Strength*

**Q2 — "What would change everything right now?"** *(anchor / oracle / solace / emerge)*
- Feeling safe enough to exhale → *Calm & Comfort*
- Trusting myself and knowing what I want → *Spiritual Connection*
- Finally tending the thing I keep pushing down → *Healing & Pathfinding*
- Becoming a version of me I can't quite see yet → *Transformation & Growth*

**Q3 — "Which sentence is most true today?"** *(beacon / solace / emerge / kali)*
- "I know what I want; I need to move." → *Focus & Confidence*
- "Something's asking to be released." → *Healing & Release*
- "I'm waiting for clarity." → *Transformation & Growth*
- "I'm done being afraid of it." → *Courage & Strength*

**Q4 — Context layer: "And underneath all of it?"** (adds weight, doesn't pick alone; carries each archetype's 3rd hit)
- A season of loss or grief → +*Healing & Pathfinding*, +*Calm & Comfort*
- A threshold: a move, a start, an ending → +*Transformation & Growth*, +*Courage & Strength*
- The daily grind wearing me thin → +*Focus & Confidence*, +*Grounding & Protection*
- A pull toward something bigger than me → +*Spiritual Connection*

**Q5 — Format filter: "How do you want it to reach you?"**
- In the air around me → `diffuser`
- Something I can carry and mist → `spray`
- On my skin, close → `body`
- A long soak, all the way down → `bath`
- Give me the whole ritual → `kit`

**Q6 — Depth gate: "How far do you want to go?"**
- Somewhere gentle to start → **surface** (Emerge/Kali fold to redirect)
- All the way in — I'm ready → **deep** (Emerge/Kali unlocked)

---

## §5. Results template

Order, top to bottom:

1. **Mirror** — name the archetype back to them (`copy.archetypes[id].mirror`).
2. **Hero blend** — the single best-matching product for
   `(archetype, format, depth)`, with its essence. Fallback redirect line if the
   format was relaxed (§1).
3. **Supporting product** — a second product in the archetype, different from the
   hero, to round out the result.
4. **Pairing upsell** — a cross-archetype nudge (`copy.archetypes[id].pairing`),
   linking to a complementary blend.
5. **Reassurance close** — a warm, low-pressure closing line
   (`copy.archetypes[id].close`), then the CTA to the hero product.

All prose in `src/copy.js`, marked **FOR ANGELYN'S REVIEW**.

---

## §6. Integrations (stubs only)

- `submitEmail(email) → Promise` in `src/email.js`. Mailchimp not wired yet.
- `track(event, props)` in `src/analytics.js`. Events: `quiz_start`,
  `quiz_complete`, `email_captured`, `result_click`.
