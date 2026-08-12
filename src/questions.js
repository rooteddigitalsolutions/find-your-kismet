// ============================================================================
//  QUESTIONS  —  DRAFT COPY, FOR ANGELYN'S REVIEW
// ----------------------------------------------------------------------------
//  Six questions. Q1–Q3 score archetypes (via theme tags). Q4 adds context
//  weight. Q5 sets the format filter. Q6 sets depth (unlocks Emerge / Kali).
//
//  Every question is MULTI-SELECT (`multi: true`) — the visitor can choose any
//  number of answers, and each selected answer scores. Every question also has
//  an "Other" free-text box (`other: true`); typed text is captured but scores
//  nothing (there's no reliable way to map free text to an archetype).
//
//  `themes` on an option are the product theme-tags it scores toward (see
//  src/archetypes.js). Keep every theme string spelled exactly as in the CSV.
// ============================================================================

const OTHER_PLACEHOLDER = 'Something else — type it here';

export const QUESTIONS = [
  {
    id: 'q1',
    kind: 'score',
    multi: true,
    other: true,
    otherPlaceholder: OTHER_PLACEHOLDER,
    prompt: 'I see myself as…', // anchor / beacon / oracle / kali
    options: [
      { label: 'A protector standing guard over the people and spaces I love', themes: ['Grounding & Protection'] },
      { label: 'A seeker, a builder, someone on the move', themes: ['Focus & Confidence'] },
      { label: 'A thinker who turns things over', themes: ['Insight & Processing'] },
      { label: 'A fighter who stands up for what is right', themes: ['Courage & Strength'] },
    ],
  },
  {
    id: 'q2',
    kind: 'score',
    multi: true,
    other: true,
    otherPlaceholder: OTHER_PLACEHOLDER,
    prompt: 'What would change everything right now?', // anchor / oracle / solace / emerge
    options: [
      { label: 'Feeling safe enough to exhale', themes: ['Calm & Comfort'] },
      { label: 'Trusting myself and knowing what I want', themes: ['Spiritual Connection'] },
      { label: 'Finally tending the thing I keep pushing down', themes: ['Healing & Pathfinding'] },
      { label: "Becoming a version of me I can't quite see yet", themes: ['Transformation & Growth'] },
    ],
  },
  {
    id: 'q3',
    kind: 'score',
    multi: true,
    other: true,
    otherPlaceholder: OTHER_PLACEHOLDER,
    prompt: 'Which sentence is most true today?', // beacon / solace / emerge / kali
    options: [
      { label: 'I know what I want; I need to move.', themes: ['Focus & Confidence'] },
      { label: "Something's asking to be released.", themes: ['Healing & Release'] },
      { label: "I'm waiting for clarity.", themes: ['Transformation & Growth'] },
      { label: "I'm done being afraid of it.", themes: ['Courage & Strength'] },
    ],
  },
  {
    id: 'q4',
    kind: 'context', // adds weight; carries each archetype's 3rd hit
    multi: true,
    other: true,
    otherPlaceholder: OTHER_PLACEHOLDER,
    weight: 1, // each context theme adds this many points
    prompt: 'And underneath all of it?',
    options: [
      { label: 'A season of loss or grief', themes: ['Healing & Pathfinding', 'Calm & Comfort'] },
      { label: 'A threshold — a move, a start, an ending', themes: ['Transformation & Growth', 'Courage & Strength'] },
      { label: 'The daily grind wearing me thin', themes: ['Focus & Confidence', 'Grounding & Protection'] },
      { label: 'A pull toward something bigger than me', themes: ['Spiritual Connection'] },
    ],
  },
  {
    id: 'q5',
    kind: 'format',
    multi: true, // visitor can accept more than one format; used to order the recommendations
    other: true,
    otherPlaceholder: 'A different way — type it here',
    prompt: 'How do you want it to reach you?',
    options: [
      { label: 'In the air around me', format: 'diffuser' },
      { label: 'Something I can carry and mist', format: 'spray' },
      { label: 'On my skin, close', format: 'body' },
      { label: 'A long soak, all the way down', format: 'bath' },
      { label: "I'm not sure, show me everything", format: null }, // no preference — recommend across all formats
    ],
  },
];

// Questions that render a progress step (all six).
export const TOTAL_STEPS = QUESTIONS.length;
