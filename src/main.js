// ============================================================================
//  main.js  —  widget entry point.
// ----------------------------------------------------------------------------
//  Injects the (inlined) stylesheet once, finds #kismet-quiz on the page, and
//  mounts the quiz inside a namespaced .kq-root wrapper. Safe to load with
//  `defer`; also handles being dropped in after DOMContentLoaded.
// ============================================================================

import styles from './styles.css?inline';
import { mount } from './ui.js';

const STYLE_ID = 'kq-styles';
const MOUNT_ID = 'kismet-quiz';

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const tag = document.createElement('style');
  tag.id = STYLE_ID;
  tag.textContent = styles;
  document.head.appendChild(tag);
}

function boot() {
  const target = document.getElementById(MOUNT_ID);
  if (!target) return; // page doesn't host the quiz — do nothing
  if (target.dataset.kqMounted === '1') return; // guard against double-load
  target.dataset.kqMounted = '1';

  injectStyles();
  const rootEl = document.createElement('div');
  rootEl.className = 'kq-root';
  target.appendChild(rootEl);
  mount(rootEl);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
