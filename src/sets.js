// ============================================================================
//  sets.js  —  the "whole ritual" set for each archetype.  FOR ANGELYN'S REVIEW
// ----------------------------------------------------------------------------
//  Each archetype maps to ONE featured $75 set, shown at the TOP of the results
//  page. The sets are live on Squarespace (Visible = Yes) with photos, so the
//  links resolve and the images render.
//
//  Anchor and Oracle each have two sets in the catalog (Calm/Grounding,
//  Awareness/Awakening); the quiz features the one named below — swap the entry
//  to feature the other.
// ============================================================================

// Master switch. The $75 sets are currently HIDDEN in Squarespace, so featuring
// them would link to dead pages. Set to `false` to hide sets from the quiz
// results entirely. Flip back to `true` once the sets are public again.
export const FEATURE_SETS = false;

const IMG = 'https://images.squarespace-cdn.com/content/v1/69cfd7f26e65b829ca8608be/';

function set(slug, title, archetypeId, includes, image) {
  return {
    slug,
    title,
    url: `/shop/p/${slug}`,
    price: 75,
    essence: includes,   // shown on the results card (what's inside the set)
    blurb: includes,
    image: image ? IMG + image : '',
    themes: [],
    archetypes: [archetypeId],
    format: 'kit',
    isSet: true,
  };
}

// archetype id -> its featured set
export const SETS = {
  anchor: set('the-grounding-set', 'The Grounding Set', 'anchor',
    'Grounding Diffuser + For The Land Diffuser + Protect Spray',
    'ab4715de-45c0-4227-9676-22deb8d96111/the-grounding-set-collage.jpg'),
  beacon: set('the-clarity-set', 'The Clarity Set', 'beacon',
    'Clarity Diffuser + Motivate Diffuser + Fortitude Body Blend',
    'c435fc8e-d804-49f1-a8da-0e9f69d73589/the-clarity-set-collage.jpg'),
  oracle: set('the-awareness-set', 'The Awareness Set', 'oracle',
    'Awareness Body + Clairvoyance Body + Congruity Bath Salts',
    'b10a946b-52cb-4d2b-8a69-85e0a1271965/the-awareness-set-collage.jpg'),
  solace: set('the-healing-set', 'The Healing Set', 'solace',
    'Forgiveness Diffuser + Non-Attachment Body + Overcoming Grief Spray',
    'acb4e493-5b5f-4e5c-bc53-a79aa1eefe8a/the-healing-set-collage.jpg'),
  emerge: set('the-creator-set', 'The Creator Set', 'emerge',
    'Create Diffuser + Emerge Body + Create & Manifest Spray',
    '85efcbfa-17ae-4ec2-8a6c-0605b7b62e0c/the-creator-set-collage.jpg'),
  kali: set('the-courage-set', 'The Courage Set', 'kali',
    'Home Diffuser + Fortitude Body Blend + Kali Spray',
    'f551e85f-9cf5-4f5e-9b14-89f03eeea026/the-courage-set-collage.jpg'),
};
