// Reviews carousel without a library: a scroll-snap track (swipe works natively), arrows, dots and a
// gentle autoplay that stops on hover, on focus, after any interaction and with reduced motion.

import { h, icon } from '../core/dom.js';
import { motion, onVisible } from '../core/motion.js';
import { localeOf } from '../core/i18n.js';

export default {
  render(ctx) {
    const { t, content, lang } = ctx;
    const rating = new Intl.NumberFormat(localeOf(lang), { minimumFractionDigits: 1 }).format(content.stats[2].value);
    const cards = content.reviews.map((r, i) => h('div', { class: 'rv-card card', role: 'group', 'aria-roledescription': 'slide', 'aria-label': `${i + 1} / ${content.reviews.length}` },
      h('span', { class: 'rv-stars', role: 'img', 'aria-label': '5/5' }, Array.from({ length: 5 }, () => icon('star', 18))),
      h('blockquote', { class: 'rv-quote', text: `“${r.quote}”` }),
      h('p', { class: 'rv-who' }, h('strong', { text: r.name }), h('span', { class: 'muted', text: r.service })),
      h('span', { class: 'sample-tag', text: t('reviews.sample') })));
    const track = h('div', { class: 'rv-track', tabindex: '0', role: 'region', 'aria-label': t('reviews.label') }, cards);
    const dots = h('div', { class: 'rv-dots' }, content.reviews.map((_, i) => h('button', { type: 'button', class: 'rv-dot', 'aria-label': t('reviews.goto', { n: i + 1 }) })));
    return h('section', { class: 'sec rv-sec', 'aria-roledescription': 'carousel' },
      h('div', { class: 'wrap' },
        h('header', { class: 'sec-head rv-head' },
          h('div', null,
            h('p', { class: 'eyebrow', text: t('reviews.eyebrow') }),
            h('h2', { 'data-split': '', text: t('reviews.title') }),
            h('p', { class: 'lead', text: t('reviews.summary', { rating, count: 128 }) })),
          h('div', { class: 'rv-nav' },
            h('button', { type: 'button', class: 'icon-btn rv-prev', 'aria-label': t('common.prev') }, icon('arrowLeft', 20)),
            h('button', { type: 'button', class: 'icon-btn rv-next', 'aria-label': t('common.next') }, icon('arrowRight', 20)))),
        track,
        dots));
  },

  activate(el) {
    // Endless loop: one hidden copy of the cards before and after the real ones. When the track
    // settles on a copy, it jumps by one full set to the matching real card, so it never rewinds.
    const track = el.querySelector('.rv-track');
    const real = [...track.children];
    const n = real.length;
    const copy = card => {
      const c = card.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      c.inert = true;
      c.removeAttribute('role');
      c.removeAttribute('aria-roledescription');
      c.removeAttribute('aria-label');
      return c;
    };
    track.prepend(...real.map(copy));
    track.append(...real.map(copy));
    const cards = [...track.children];
    const dots = [...el.querySelectorAll('.rv-dot')];
    const pos = i => cards[i].offsetLeft - cards[0].offsetLeft;
    const index = () => {
      const left = track.scrollLeft;
      let best = 0;
      cards.forEach((c, i) => { if (Math.abs(pos(i) - left) < Math.abs(pos(best) - left)) best = i; });
      return best;
    };
    const jump = left => {
      const snap = track.style.scrollSnapType;
      track.style.scrollSnapType = 'none';
      track.scrollLeft = left;
      track.style.scrollSnapType = snap;
    };
    jump(pos(n));
    // Back onto the real set once the track has stopped on a copy.
    const settle = () => {
      const i = index();
      if (i < n) jump(track.scrollLeft + pos(n) - pos(0));
      else if (i >= 2 * n) jump(track.scrollLeft - (pos(2 * n) - pos(n)));
    };
    const go = i => {
      if (i < 0 || i >= cards.length) { settle(); i = index() + Math.sign(i); }
      track.scrollTo({ left: pos(i), behavior: motion.reduced ? 'auto' : 'smooth' });
    };
    const mark = () => { const i = index() % n; dots.forEach((d, j) => d.setAttribute('aria-current', String(i === j))); };
    let raf = 0;
    let idle = 0;
    track.addEventListener('scroll', () => {
      cancelAnimationFrame(raf); raf = requestAnimationFrame(mark);
      clearTimeout(idle); idle = setTimeout(settle, 140); // also where 'scrollend' is missing
    }, { passive: true });
    track.addEventListener('scrollend', () => { clearTimeout(idle); settle(); });
    window.addEventListener('resize', settle);
    mark();

    let stopped = motion.reduced;
    const stop = () => { stopped = true; };
    el.querySelector('.rv-prev').addEventListener('click', () => { stop(); go(index() - 1); });
    el.querySelector('.rv-next').addEventListener('click', () => { stop(); go(index() + 1); });
    dots.forEach((d, i) => d.addEventListener('click', () => { stop(); go(n + i); }));
    track.addEventListener('pointerdown', stop);
    track.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); stop(); go(index() + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); stop(); go(index() - 1); }
    });
    let hover = false;
    el.addEventListener('pointerenter', () => { hover = true; });
    el.addEventListener('pointerleave', () => { hover = false; });
    let inView = false;
    const unwatch = onVisible(el, v => { inView = v; }, { once: false, rootMargin: '0px' });
    const timer = setInterval(() => {
      if (stopped || hover || !inView || document.hidden || el.contains(document.activeElement)) return;
      go(index() + 1);
    }, 6000);
    return () => { clearInterval(timer); unwatch(); window.removeEventListener('resize', settle); };
  }
};
