// ============================================================================
//  ui.js  —  DOM rendering + screen flow. No business logic lives here beyond
//  wiring; scoring is in scoring.js, words are in copy.js.
// ============================================================================

import { QUESTIONS, TOTAL_STEPS } from './questions.js';
import { scoreAnswers } from './scoring.js';
import { ARCHETYPES_BY_ID } from './archetypes.js';
import { COPY } from './copy.js';
import { submitEmail } from './email.js';
import { track } from './analytics.js';
import { getVisibleSlugs, getVisibleSlugsWithTimeout } from './availability.js';
import { addToCart } from './cart.js';
import { personalizationEnabled, personalizedReading } from './personalize.js';

// ---- tiny DOM helper --------------------------------------------------------
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v; // always textContent — never innerHTML
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) if (c != null) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  return node;
}

function money(p) {
  if (p == null) return '';
  return '$' + (Number.isInteger(p) ? p : p.toFixed(2));
}

export function mount(root) {
  const state = { step: 0, answers: {}, result: null, email: '', logged: false, aiReading: null };

  // Persist the ANSWERS so a refresh / return within the window restores the
  // result — recomputed against current availability, not a stale snapshot.
  const SAVE_KEY = 'kq_answers_v1';
  const SAVE_TTL = 45 * 60 * 1000; // 45 minutes
  const saveAnswers = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ t: Date.now(), answers: state.answers })); } catch (_) {} };
  const clearSaved = () => { try { localStorage.removeItem(SAVE_KEY); } catch (_) {} };
  const loadAnswers = () => {
    try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s && Date.now() - s.t < SAVE_TTL) return s.answers; } catch (_) {}
    return null;
  };

  // Warm the live-availability fetch as soon as the widget mounts, so it's ready
  // by the time anyone reaches results.
  getVisibleSlugs();

  const card = el('div', { class: 'kq-card' });
  const progress = el('div', { class: 'kq-progress' });
  const screen = el('div', { class: 'kq-screen' });
  card.append(progress, screen);
  root.appendChild(card);

  function renderProgress(activeStep, done) {
    progress.innerHTML = '';
    for (let i = 0; i < TOTAL_STEPS; i++) {
      const cls =
        done || i < activeStep ? 'kq-progress-step is-done'
        : i === activeStep ? 'kq-progress-step is-current'
        : 'kq-progress-step';
      progress.appendChild(el('div', { class: cls }));
    }
  }

  // Render in place. Never scrollIntoView — that would yank the page down to the
  // widget on load (and on every step). The visitor controls the scroll.
  function swap(node) { screen.innerHTML = ''; screen.appendChild(node); }

  // ---- intro ----------------------------------------------------------------
  function showIntro() {
    renderProgress(0, false);
    progress.classList.add('kq-hidden');
    swap(el('div', {}, [
      el('p', { class: 'kq-eyebrow', text: COPY.intro.eyebrow }),
      el('h1', { class: 'kq-h1', text: COPY.intro.title }),
      el('p', { class: 'kq-lead', text: COPY.intro.body }),
      el('button', { class: 'kq-btn kq-btn-primary kq-btn-full', text: COPY.intro.cta, onclick: () => {
        track('quiz_start');
        state.step = 0;
        showQuestion();
      } }),
    ]));
  }

  // ---- questions (multi-select + free-text "Other") -------------------------
  function ensureAnswer(qid) {
    if (!state.answers[qid]) state.answers[qid] = { options: [], other: '' };
    return state.answers[qid];
  }

  function showQuestion() {
    progress.classList.remove('kq-hidden');
    renderProgress(state.step, false);
    const q = QUESTIONS[state.step];
    const ans = ensureAnswer(q.id);

    const optionButtons = q.options.map((opt) => {
      const btn = el('button', {
        class: 'kq-option kq-check' + (ans.options.includes(opt) ? ' is-selected' : ''),
        type: 'button',
        'aria-pressed': ans.options.includes(opt) ? 'true' : 'false',
      }, [
        el('span', { class: 'kq-check-box', 'aria-hidden': 'true' }),
        el('span', { class: 'kq-check-label', text: opt.label }),
      ]);
      btn.addEventListener('click', () => {
        const i = ans.options.indexOf(opt);
        if (i === -1) ans.options.push(opt); else ans.options.splice(i, 1);
        btn.classList.toggle('is-selected');
        btn.setAttribute('aria-pressed', btn.classList.contains('is-selected') ? 'true' : 'false');
      });
      return btn;
    });

    const options = el('div', { class: 'kq-options' }, optionButtons);

    // "Other" free-text row
    if (q.other) {
      const otherInput = el('input', {
        class: 'kq-input kq-other', type: 'text',
        placeholder: q.otherPlaceholder || 'Something else — type it here',
        value: ans.other || '',
        'aria-label': 'Other — type your own answer',
      });
      otherInput.addEventListener('input', () => { ans.other = otherInput.value; });
      options.appendChild(otherInput);
    }

    const nodes = [
      el('p', { class: 'kq-qnum', text: `Question ${state.step + 1} of ${TOTAL_STEPS} · choose any that fit` }),
      el('h2', { class: 'kq-h2', text: q.prompt }),
      options,
      el('button', {
        class: 'kq-btn kq-btn-primary kq-btn-full',
        style: 'margin-top:22px;',
        text: state.step < TOTAL_STEPS - 1 ? 'Continue' : 'See my result',
        onclick: () => advance(q),
      }),
    ];
    if (state.step > 0) {
      nodes.push(el('button', { class: 'kq-back', text: '← Back', onclick: () => { state.step--; showQuestion(); } }));
    }
    swap(el('div', {}, nodes));
  }

  function advance() {
    if (state.step < TOTAL_STEPS - 1) {
      state.step++;
      showQuestion();
    } else {
      // baked result (archetype is availability-independent); showResults() later
      // refines the product list against what's currently in stock.
      state.result = scoreAnswers(state.answers);
      track('quiz_complete', { archetype: state.result.archetypeId, formats: state.result.formats });
      saveAnswers();
      showEmail();
    }
  }

  // ---- email (required — must enter a valid email to see the result) --------
  function showEmail() {
    renderProgress(0, true);
    const input = el('input', { class: 'kq-input', type: 'email', placeholder: COPY.email.placeholder, autocomplete: 'email', required: 'required' });
    const errNode = el('p', { class: 'kq-error kq-hidden' });
    const submitBtn = el('button', { class: 'kq-btn kq-btn-primary kq-btn-full', type: 'submit', text: COPY.email.submit });

    const form = el('form', { onsubmit: (e) => {
      e.preventDefault();
      const email = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errNode.textContent = 'That email looks off — mind checking it?';
        errNode.classList.remove('kq-hidden');
        return;
      }
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="kq-spin"></span>Revealing…';
      // Store the email; showResults() computes the availability-filtered result
      // and THEN logs it, so the sheet records exactly the blends they were shown.
      state.email = email;
      showResults();
    } }, [input, errNode, submitBtn]);

    swap(el('div', {}, [
      el('h2', { class: 'kq-h2', text: COPY.email.title }),
      el('p', { class: 'kq-lead', text: COPY.email.body }),
      form,
      el('p', { class: 'kq-fine', text: COPY.email.disclaimer }),
    ]));
  }

  // ---- results --------------------------------------------------------------
  function productNode(product, { label, primaryCta, placement, note } = {}) {
    if (!product) return null;
    const img = product.image
      ? el('img', { class: 'kq-product-img', src: product.image, alt: product.title, loading: 'lazy' })
      : el('div', { class: 'kq-product-img is-empty', text: '❋' });

    const body = el('div', { class: 'kq-product-body' }, [
      el('p', { class: 'kq-product-title', text: product.title }),
      product.essence ? el('p', { class: 'kq-product-essence', text: product.essence }) : null,
      product.price ? el('p', { class: 'kq-product-price', text: money(product.onSale && product.salePrice ? product.salePrice : product.price) }) : null,
    ]);

    const row = el('div', { class: 'kq-product' }, [img, body]);
    const parts = [];
    if (label) parts.push(el('p', { class: 'kq-block-label', text: label }));
    if (note) parts.push(el('p', { class: 'kq-fallback-note', text: note }));
    parts.push(row);

    // Product Info always opens the product page in a NEW TAB (quiz stays put).
    const openProduct = () => window.open(product.url, '_blank', 'noopener');
    const infoBtn = el('a', {
      class: 'kq-btn kq-btn-ghost kq-btn-sm', href: product.url, target: '_blank', rel: 'noopener',
      text: 'Product Info',
      onclick: () => track('result_click', { slug: product.slug, placement: placement + ':info' }),
    });

    // Add to Cart tries Squarespace's own cart directly; on ANY failure it falls
    // back to opening the product page (which has a native Add to Cart).
    const cartBtn = el('button', { class: 'kq-btn kq-btn-primary kq-btn-sm', type: 'button', text: 'Add to Cart' });
    cartBtn.addEventListener('click', async () => {
      if (cartBtn.dataset.done === '1') { window.open('/cart', '_blank', 'noopener'); return; }
      cartBtn.disabled = true;
      cartBtn.innerHTML = '<span class="kq-spin"></span>Adding…';
      const ok = await addToCart(product);
      if (ok) {
        track('result_click', { slug: product.slug, placement: placement + ':add' });
        cartBtn.disabled = false;
        cartBtn.dataset.done = '1';
        cartBtn.classList.add('is-added');
        cartBtn.textContent = 'Added ✓ — view cart';
      } else {
        // graceful fallback: behave like a product link
        track('result_click', { slug: product.slug, placement: placement + ':add-fallback' });
        openProduct();
        cartBtn.disabled = false;
        cartBtn.textContent = 'Add to Cart';
      }
    });

    parts.push(el('div', { class: 'kq-btn-row' }, [infoBtn, cartBtn]));
    return el('div', { class: 'kq-product-item' }, parts);
  }

  async function showResults() {
    renderProgress(0, true);
    // Filter recommendations to products currently visible in the store (falls
    // back to the full catalog if the live feed can't be read).
    const availableSlugs = await getVisibleSlugsWithTimeout();
    state.result = scoreAnswers(state.answers, { availableSlugs });
    saveAnswers();

    // Log the submission ONCE, now that the shown (availability-filtered) blends
    // are final — so the sheet matches exactly what the visitor saw.
    if (state.email && !state.logged) {
      state.logged = true;
      submitEmail(state.email, state.result);
      track('email_captured', { archetype: state.result.archetypeId });
    }

    const r = state.result;
    const a = ARCHETYPES_BY_ID[r.archetypeId];
    const c = COPY.archetypes[r.archetypeId];

    // The reading starts as the pre-written archetype copy; if AI personalization
    // is enabled it's swapped in-place once the Worker responds (never blocks).
    const readingEl = el('p', { class: 'kq-reading', text: state.aiReading || c.reading });
    const nodes = [
      el('p', { class: 'kq-mirror-eyebrow', text: 'Your Kismet' }),
      el('h2', { class: 'kq-h1', text: c.mirror }),
      el('p', { class: 'kq-tagline', text: a.tagline }),
      readingEl,
    ];
    if (personalizationEnabled() && !state.aiReading) {
      personalizedReading(state.result, state.answers).then((txt) => {
        if (txt && readingEl.isConnected) {
          state.aiReading = txt;
          readingEl.classList.add('kq-reading-swap');
          readingEl.textContent = txt;
        }
      });
    }

    // featured set at the top
    if (r.set) {
      const setBlock = productNode(r.set, { label: COPY.results.setLabel, primaryCta: true, placement: 'set' });
      if (setBlock) nodes.push(el('div', { class: 'kq-block' }, [setBlock]));
    }

    // the five highlighted blends
    if (r.products?.length) {
      nodes.push(el('div', { class: 'kq-block' }, [
        el('p', { class: 'kq-block-label', text: COPY.results.productsLabel }),
        el('div', { class: 'kq-product-list' },
          r.products.map((p) => productNode(p, { placement: 'product' }))),
      ]));
    }

    // reassurance close
    nodes.push(el('p', { class: 'kq-close', text: c.close }));
    nodes.push(el('button', { class: 'kq-back', text: COPY.results.restart, onclick: restart }));

    swap(el('div', {}, nodes));
  }

  function restart() {
    state.step = 0;
    state.answers = {};
    state.result = null;
    state.email = '';
    state.logged = false;
    state.aiReading = null;
    clearSaved();
    showIntro();
  }

  // If they took the quiz recently (e.g. opened a product in a new tab and came
  // back, or refreshed), restore their result instead of the intro.
  const restoredAnswers = loadAnswers();
  if (restoredAnswers) {
    state.answers = restoredAnswers;
    showResults();
  } else {
    showIntro();
  }
}
