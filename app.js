// Preview page for Rose-Méry (prospect, 13 Nov 2026): the setup she built in the page builder
// (YourBusinessName/designs/builder/), frozen, without the builder panel or the demo bar.
// French (the language she picked), sample data (name, address, phone, services, hours, reviews are placeholders).
//
// Christmas look: on from 6 Nov to 6 Jan by itself; ?christmas=1 forces it on, ?christmas=0 off.
// Live services and hours: set BOOKING_LINK_ID once the client sends her booking link
// (or preview one with ?link=<id>).

import fr from './i18n/fr.js';
import { itemsFrom, linkFromUrl, query, visible } from './core/state.js';
import { typeOf } from './core/registry.js';
import { loadLang, t } from './core/i18n.js';
import { applyTheme } from './core/theme.js';
import { loadStyle } from './core/loader.js';
import { motion } from './core/motion.js';
import { startData, setDataLang, priceText } from './core/data.js';
import { createPage } from './core/page.js';
import { h } from './core/dom.js';
import { loadContent } from './content/index.js';
import { setupBooking } from './shared/live.js';

const BOOKING_LINK_ID = '';

// ---------- sample texts for this page (on top of the builder's French texts; en.js stays as the fallback) ----------

const BRAND = 'Maison Rose';
const OVERRIDES = {
  brandDefault: BRAND,
  meta: { title: '{name} — Salon de coiffure et beauté' },
  map: {
    address: '12 rue des Roses, Paris',
    phone: '+33 6 00 00 00 00',
    email: 'bonjour@maisonrose.example'
  },
  insta: { title: '@maisonrose' },
  contactbar: { open: 'Ouvert', closed: 'Fermé' }
};
function merge(target, src) {
  for (const [key, value] of Object.entries(src)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) merge(target[key] ??= {}, value);
    else target[key] = value;
  }
}
merge(fr, OVERRIDES);

// ---------- the setup she chose ----------

const SECTIONS = ['hero-3d', 'prices-cards', 'compare-slider', 'team-flip', 'gallery-insta', 'reviews-carousel',
  'gift-card', 'hours-live', 'map-styled', 'prices-booking', 'contactbar-bar'];

const state = { niche: 'beauty', skin: 'clean', accent: '#ee719e', lang: 'fr', name: BRAND, items: itemsFrom(SECTIONS) };

function christmasOn(date = new Date()) {
  const forced = query('christmas');
  if (forced === '1') return true;
  if (forced === '0') return false;
  const md = date.getMonth() * 100 + date.getDate(); // month 0-based
  return md >= 1006 || md <= 6; // 6 Nov – 6 Jan
}
const season = christmasOn() ? 'christmas' : '';

const linkId = linkFromUrl() || BOOKING_LINK_ID;

let content = null;
let data = null;
let theme = null;

const matches = key => it => typeOf(it).mod === key || it.group === key;
const shownBy = key => { const shown = visible(state); return shown.find(it => typeOf(it).mod === key) || shown.find(matches(key)); };
function anchor(...keys) {
  for (const key of keys) {
    const item = shownBy(key);
    if (item) return `#s-${item.id}`;
  }
  return '#page';
}

let toastTimer = 0;
function toast(message) {
  let node = document.querySelector('.bx-toast');
  if (!node) {
    node = h('div', { class: 'lv-toast bx-toast', role: 'status' });
    document.body.appendChild(node);
  }
  node.textContent = message;
  node.classList.add('is-shown');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('is-shown'), 3800);
}

const ctx = () => ({
  t,
  lang: state.lang,
  niche: state.niche,
  name: BRAND,
  content,
  data,
  linkId,
  skin: state.skin,
  theme,
  get reduced() { return motion.reduced; },
  anchor,
  toast,
  priceText: s => priceText(s, data?.currency || ''),
  isOn: key => visible(state).some(matches(key))
});

// Sample contact buttons: a short note instead of a call (no real number yet).
document.addEventListener('click', e => {
  const node = e.target.closest('[data-demo]');
  if (!node) return;
  e.preventDefault();
  const messages = {
    call: t('common.demoCall'),
    whatsapp: t('common.demoWhatsapp'),
    social: t('common.demoSocial'),
    form: t('common.demoForm'),
    reserve: t('common.demoReserve', { name: node.dataset.name || '' })
  };
  toast(messages[node.dataset.demo] || t('common.sampleNote'));
});

async function mountChristmas(main) {
  if (!season) return;
  try {
    const [{ mountDecor }] = await Promise.all([import('./season/decor.js'), loadStyle(new URL('./season/decor.css', import.meta.url).href)]);
    mountDecor({ season, main, t, reduced: motion.reduced });
  } catch (err) { console.error('Christmas theme failed to load', err); }
}

async function boot() {
  document.documentElement.classList.toggle('reduce-motion', motion.reduced);
  await loadLang('fr');
  setDataLang('fr');
  theme = applyTheme(state, season);

  content = await loadContent(state.niche, state.lang);
  let page = null;
  startData({ linkId, sample: content.sample }, fresh => {
    data = fresh;
    page?.dataChanged();
  });

  const main = document.getElementById('page');
  page = createPage({ main, overlay: document.getElementById('overlay'), ctx });
  await mountChristmas(main); // before the sections, so the greeting ribbon never pushes them down

  setupBooking({ linkId, theme: () => (theme.dark ? 'dark' : 'light') });
  await page.sync(visible(state));
  page.renderFooter();
}

boot().catch(err => {
  console.error('Page failed to start', err);
  const loading = document.getElementById('page-loading');
  if (loading) loading.textContent = 'La page n’a pas pu se charger. Veuillez actualiser.';
});
