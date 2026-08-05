// ============================================================================
//  ui.js  —  DOM rendering + screen flow. No business logic lives here beyond
//  wiring; scoring is in scoring.js, words are in copy.js.
// ============================================================================

import { QUESTIONS, TOTAL_STEPS } from './questions.js';
import { scoreAnswers } from './scoring.js';
import { ARCHETYPES_BY_ID, FORMATS } from './archetypes.js';
import { COPY } from './copy.js';
import { submitEmail } from './email.js';
import { track } from './analytics.js';

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
  const state = { step: 0, answers: {}, result: null };

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

  function swap(node) { screen.innerHTML = ''; screen.appendChild(node); screen.scrollIntoView?.({ block: 'nearest' }); }

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
      state.result = scoreAnswers(state.answers);
      track('quiz_complete', {
        archetype: state.result.archetypeId,
        formats: state.result.formats,
        deep: state.result.deep,
      });
      showEmail();
    }
  }

  // ---- email (skippable) ----------------------------------------------------
  function showEmail() {
    renderProgress(0, true);
    const input = el('input', { class: 'kq-input', type: 'email', placeholder: COPY.email.placeholder, autocomplete: 'email' });
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
      submitBtn.innerHTML = '<span class="kq-spin"></span>Sending…';
      submitEmail(email, state.result).finally(() => {
        track('email_captured', { archetype: state.result.archetypeId });
        showResults();
      });
    } }, [input, errNode, submitBtn]);

    swap(el('div', {}, [
      el('h2', { class: 'kq-h2', text: COPY.email.title }),
      el('p', { class: 'kq-lead', text: COPY.email.body }),
      form,
      el('button', { class: 'kq-back', text: COPY.email.skip, onclick: showResults }),
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

    const href = product.url;
    if (primaryCta) {
      parts.push(el('a', {
        class: 'kq-btn kq-btn-primary', href, style: 'display:inline-block;margin-top:16px;text-decoration:none;',
        text: `Shop ${product.title}`,
        onclick: () => track('result_click', { slug: product.slug, placement }),
      }));
    } else {
      body.appendChild(el('a', {
        class: 'kq-link', href, text: 'See the blend →',
        onclick: () => track('result_click', { slug: product.slug, placement }),
      }));
    }
    return el('div', {}, parts);
  }

  function showResults() {
    renderProgress(0, true);
    const r = state.result;
    const a = ARCHETYPES_BY_ID[r.archetypeId];
    const c = COPY.archetypes[r.archetypeId];

    const nodes = [
      el('p', { class: 'kq-mirror-eyebrow', text: 'Your Kismet' }),
      el('h2', { class: 'kq-h1', text: c.mirror }),
      el('p', { class: 'kq-tagline', text: a.tagline }),
      el('p', { class: 'kq-reading', text: c.reading }),
    ];

    // hero (with §1 fallback redirect line)
    let note = null;
    if (r.hero?.fallback) {
      const reqList = (r.hero.fallback.requestedFormats || []).map(formatLabel);
      const requested = reqList.length ? 'a ' + reqList.join(' or ') : 'a different format';
      note = COPY.results.fallbackLine
        .replace('{requestedFormat}', requested)
        .replace('{actualFormat}', formatLabel(r.hero.fallback.actualFormat))
        .replace('{archetype}', a.name);
    }
    const heroLabel = r.hero?.product?.isSet ? COPY.results.ritualLabel : COPY.results.heroLabel;
    const heroBlock = productNode(r.hero?.product, { label: heroLabel, primaryCta: true, placement: 'hero', note });
    if (heroBlock) nodes.push(el('div', { class: 'kq-block' }, [heroBlock]));

    // supporting
    const supBlock = productNode(r.supporting, { label: COPY.results.supportingLabel, placement: 'supporting' });
    if (supBlock) nodes.push(el('div', { class: 'kq-block' }, [supBlock]));

    // pairing upsell
    if (r.pairing) {
      nodes.push(el('div', { class: 'kq-block' }, [
        el('p', { class: 'kq-block-label', text: COPY.results.pairingLabel }),
        el('p', { class: 'kq-product-essence', text: c.pairing }),
        el('div', { class: 'kq-pairing' }, [productNode(r.pairing.product, { placement: 'pairing' })]),
      ]));
    }

    // reassurance close
    nodes.push(el('p', { class: 'kq-close', text: c.close }));
    nodes.push(el('button', { class: 'kq-back', text: COPY.results.restart, onclick: restart }));

    swap(el('div', {}, nodes));
  }

  function formatLabel(id) {
    // Use the short format noun ("bath soak", "diffuser blend") — NOT the long
    // Q5 answer label — so the fallback line reads naturally.
    const f = FORMATS.find((x) => x.id === id);
    return (f?.label || id).toLowerCase();
  }

  function restart() {
    state.step = 0;
    state.answers = {};
    state.result = null;
    showIntro();
  }

  showIntro();
}
