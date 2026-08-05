// ============================================================================
//  sets.js  —  the "whole ritual" set for each archetype.  FOR ANGELYN'S REVIEW
// ----------------------------------------------------------------------------
//  When a visitor picks "Give me the whole ritual" (the `kit` format in Q5),
//  the results page recommends that archetype's curated $75 set instead of a
//  single blend.
//
//  These sets live in the Squarespace catalog but are currently Visible = No.
//  The quiz links to /shop/<slug>, so those links only resolve once you switch
//  the matching set to Visible = Yes and re-import. Until then the quiz still
//  runs; the set's button just points at an unpublished page.
//
//  Each archetype maps to ONE set. Anchor and Oracle each have two sets in the
//  catalog (Calm/Grounding, Awareness/Awakening); the quiz features the one
//  named below — swap the slug/title here to feature the other.
// ============================================================================

function set(slug, title, archetypeId, includes) {
  return {
    slug,
    title,
    url: `/shop/${slug}`,
    price: 75,
    essence: includes,   // shown on the results card (what's inside the set)
    blurb: includes,
    image: '',
    themes: [],
    archetypes: [archetypeId],
    format: 'kit',
    isSet: true,
  };
}

// archetype id -> its featured set
export const SETS = {
  anchor: set('the-grounding-set', 'The Grounding Set', 'anchor',
    'Grounding Diffuser + For The Land Diffuser + Protect Spray'),
  beacon: set('the-clarity-set', 'The Clarity Set', 'beacon',
    'Clarity Diffuser + Motivate Diffuser + Fortitude Body Blend'),
  oracle: set('the-awareness-set', 'The Awareness Set', 'oracle',
    'Awareness Body + Clairvoyance Body + Congruity Bath Salts'),
  solace: set('the-healing-set', 'The Healing Set', 'solace',
    'Forgiveness Diffuser + Non-Attachment Body + Overcoming Grief Spray'),
  emerge: set('the-creator-set', 'The Creator Set', 'emerge',
    'Create Diffuser + Emerge Body + Create & Manifest Spray'),
  kali: set('the-courage-set', 'The Courage Set', 'kali',
    'Home Diffuser + Fortitude Body Blend + Kali Spray'),
};
