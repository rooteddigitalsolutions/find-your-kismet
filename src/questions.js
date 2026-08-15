// ============================================================================
//  QUESTIONS  —  DRAFT COPY, FOR ANGELYN'S REVIEW
// ----------------------------------------------------------------------------
//  Q1–Q3 score archetypes (via theme tags). Q4 adds context weight. Q5 sets the
//  format filter. Q6 is an OPTIONAL open-ended reflection (skippable) — it
//  scores nothing, but its text feeds the personalized AI reading.
//
//  Scoring questions are MULTI-SELECT (`multi: true`) — choose any number; each
//  selected answer scores. Options are written to SCAN: a short bold `label`
//  (the lead) plus a tiny muted `sub` gloss. `themes` are the product theme-tags
//  the option scores toward (see src/archetypes.js) — keep every theme string
//  spelled EXACTLY as in the CSV.
// ============================================================================

export const QUESTIONS = [
  {
    id: 'q1',
    kind: 'score',
    multi: true,
    prompt: 'I see myself as…', // anchor / beacon / oracle / kali
    options: [
      { label: 'A protector', sub: 'guarding the people and places I love', themes: ['Grounding & Protection'] },
      { label: 'A seeker', sub: 'a builder, always in motion', themes: ['Focus & Confidence'] },
      { label: 'A thinker', sub: 'I turn things over', themes: ['Insight & Processing'] },
      { label: 'A fighter', sub: "I stand up for what's right", themes: ['Courage & Strength'] },
    ],
  },
  {
    id: 'q2',
    kind: 'score',
    multi: true,
    prompt: 'What would change everything right now?', // anchor / oracle / solace / emerge
    options: [
      { label: 'Room to exhale', sub: 'feeling safe enough to rest', themes: ['Calm & Comfort'] },
      { label: 'Trusting myself', sub: 'knowing what I want', themes: ['Spiritual Connection'] },
      { label: 'Facing what I avoid', sub: 'the thing I keep pushing down', themes: ['Healing & Pathfinding'] },
      { label: "Becoming who's next", sub: "a me I can't quite see yet", themes: ['Transformation & Growth'] },
    ],
  },
  {
    id: 'q3',
    kind: 'score',
    multi: true,
    prompt: 'Which is most true today?', // beacon / solace / emerge / kali
    options: [
      { label: 'I need to move', sub: 'I know what I want', themes: ['Focus & Confidence'] },
      { label: 'I need to release', sub: "something's asking to be let go", themes: ['Healing & Release'] },
      { label: "I'm seeking clarity", sub: 'still waiting to see', themes: ['Transformation & Growth'] },
      { label: "I'm done being afraid", sub: 'ready to face it', themes: ['Courage & Strength'] },
    ],
  },
  {
    id: 'q4',
    kind: 'context', // adds weight; carries each archetype's 3rd hit
    multi: true,
    weight: 1,
    prompt: 'And underneath it all?',
    options: [
      { label: 'Loss or grief', sub: 'a heavy season', themes: ['Healing & Pathfinding', 'Calm & Comfort'] },
      { label: 'A threshold', sub: 'a move, a start, an ending', themes: ['Transformation & Growth', 'Courage & Strength'] },
      { label: 'The daily grind', sub: 'wearing me thin', themes: ['Focus & Confidence', 'Grounding & Protection'] },
      { label: 'Something bigger', sub: "a pull I can't name", themes: ['Spiritual Connection'] },
    ],
  },
  {
    id: 'q5',
    kind: 'format',
    multi: true, // visitor can accept more than one format; orders the recommendations
    prompt: 'How do you want it to reach you?',
    options: [
      { label: 'In the air', sub: 'diffused around me', format: 'diffuser' },
      { label: 'Carry & mist', sub: 'a spray for anywhere', format: 'spray' },
      { label: 'On my skin', sub: 'close, like an oil', format: 'body' },
      { label: 'A long soak', sub: 'in the bath', format: 'bath' },
      { label: 'Show me everything', sub: 'no preference', format: null },
    ],
  },
  {
    id: 'q6',
    kind: 'open', // optional free-text; scores nothing, feeds the personalized reading
    optional: true,
    prompt: 'Anything you want your blend to know?',
    hint: "Optional. A word, a feeling, what today's been like. Skip if you like.",
    placeholder: "What's on your heart right now…",
  },
];

// Questions that render a progress step (all of them).
export const TOTAL_STEPS = QUESTIONS.length;
