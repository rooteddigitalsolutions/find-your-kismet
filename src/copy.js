// ============================================================================
//  copy.js  —  ALL results-page prose.
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │  FOR ANGELYN'S REVIEW.  This is DRAFT copy, written from the product  │
//  │  descriptions in the brand's voice. Nothing here is approved. Edit    │
//  │  freely — this is the only file with results wording in it.          │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  Per archetype:
//    mirror   — names them back to themselves (results §5, step 1)
//    reading  — the fuller "here's who you are right now" paragraph
//    pairing  — the cross-blend nudge (step 4)
//    close    — warm, low-pressure closing line (step 5)
// ============================================================================

export const COPY = {
  intro: {
    eyebrow: 'A short ritual',
    title: 'Find Your Kismet',
    body:
      "Six questions, two minutes. Not a personality test — a way of listening " +
      "for what you're actually carrying right now, and the blend that meets it.",
    cta: 'Begin',
  },

  email: {
    title: 'Where should your Kismet find you?',
    body: "Leave your email and we'll send your result and the blend that matched — no noise, just this.",
    placeholder: 'you@email.com',
    submit: 'Send me my result',
    skip: 'Skip — just show me',
    disclaimer: "One email. You can unsubscribe anytime.",
  },

  results: {
    heroLabel: 'Your blend',
    ritualLabel: 'Your whole ritual',
    supportingLabel: 'Keep close',
    pairingLabel: 'When you’re ready for more',
    restart: 'Take it again',
    // {requestedFormat} / {actualFormat} filled at runtime (§1 redirect line).
    // {requestedFormat} is the visitor's chosen format(s), e.g. "a bath soak" or
    // "a bath soak or body blend".
    fallbackLine:
      "You reached for {requestedFormat}; Kismet didn't have one for {archetype} yet, " +
      "so it offered a {actualFormat} that carries the same spirit.",
  },

  // ---- the six archetype readings ------------------------------------------
  archetypes: {
    anchor: {
      mirror: 'You are The Anchor.',
      reading:
        "You're the one who stays. When the room tilts, people find their footing near you — " +
        "and that steadiness costs you more than you let on. Your Kismet isn't about doing more. " +
        "It's about being held for once, so the ground under everyone else can be the ground under you too.",
      pairing:
        "If the holding gets heavy, let The Oracle's clarity in — sometimes staying steady starts " +
        "with finally seeing the thing clearly.",
      close: "Nothing to fix here. Just somewhere to set it down.",
    },
    beacon: {
      mirror: 'You are The Beacon.',
      reading:
        "You already know which way you're going — you just want the fog to lift so you can move. " +
        "Your Kismet is for focus without the white-knuckle: the kind of clarity that feels like " +
        "confidence instead of pressure, so the next step stops being a question.",
      pairing:
        "When drive needs a base to push off from, The Anchor's grounding keeps your momentum from " +
        "burning you out.",
      close: "You don't need permission. Just a clear line of sight.",
    },
    oracle: {
      mirror: 'You are The Oracle.',
      reading:
        "You feel the thing before you can name it. You're always half-listening to a deeper channel — " +
        "and it's real, even when the day makes no room for it. Your Kismet is for that listening: " +
        "for insight that lands, and for trusting your own read when everything says second-guess it.",
      pairing:
        "When what you see asks to be released, The Solace meets the tender part of knowing.",
      close: "Trust the first thing you felt. It was right.",
    },
    solace: {
      mirror: 'You are The Solace.',
      reading:
        "Something in you is healing, and healing isn't linear. You've been carrying a wound quietly, " +
        "tending it between everything else. Your Kismet doesn't rush it. It makes a soft place for the " +
        "part of you that's still finding its way through — and honors that finding-through as its own kind of strength.",
      pairing:
        "When you're ready to move again, The Beacon lights the path forward without hurrying you onto it.",
      close: "Slow is allowed. You're not behind.",
    },
    emerge: {
      mirror: 'You are Emerge.',
      reading:
        "You're at a threshold — a becoming you can feel but can't quite picture yet. Something is ending " +
        "so something else can start, and you chose to go all the way in. Your Kismet is for the crossing: " +
        "for shedding the version of you that got you here, and trusting the one arriving.",
      pairing:
        "Transformation moves faster with sight — The Oracle helps you read the change while you're inside it.",
      close: "You're not losing yourself. You're meeting who's next.",
    },
    kali: {
      mirror: 'You are Kali.',
      reading:
        "You came ready for the fire. Kali is the fierce one — the clearing force, the nerve to burn what " +
        "no longer serves and not flinch at the heat. Your Kismet is for courage that doesn't ask nicely: " +
        "for the strength to end it, cut it, start it, say it. Whatever it is, you already know.",
      pairing:
        "After the fire, The Anchor holds the ground you cleared so something new can root there.",
      close: "The fear was never bigger than you. Go.",
    },
  },
};
