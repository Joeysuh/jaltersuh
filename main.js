(() => {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined';

  // Smooth scroll (Lenis). Touch scrolling stays native.
  if (!reduce && typeof window.Lenis !== 'undefined') {
    new window.Lenis({ autoRaf: true, lerp: 0.1 });
  }

  // Project details: animate open and close. Without GSAP or with reduced
  // motion, the browser's own toggle runs.
  document.querySelectorAll('details').forEach((details) => {
    const summary = details.querySelector('summary');
    const panel = details.querySelector('.detail');
    if (!summary || !panel) return;

    const settle = () => gsap.set(panel, { clearProps: 'height,opacity,overflow' });

    summary.addEventListener('click', (event) => {
      if (reduce || !hasGsap) return;
      event.preventDefault();
      gsap.killTweensOf(panel);

      const closing = details.open && !details.classList.contains('is-closing');
      if (closing) {
        details.classList.add('is-closing');
        gsap.to(panel, {
          height: 0,
          opacity: 0,
          duration: 0.25,
          ease: 'power2.in',
          overflow: 'hidden',
          onComplete: () => {
            details.open = false;
            details.classList.remove('is-closing');
            settle();
          },
        });
      } else {
        details.classList.remove('is-closing');
        details.open = true;
        gsap.fromTo(
          panel,
          { height: 0, opacity: 0, overflow: 'hidden' },
          { height: 'auto', opacity: 1, duration: 0.35, ease: 'power2.out', onComplete: settle },
        );
      }
    });
  });

  // Home: the oscilloscope. The trace is the ASCII bits of the name, sent as a
  // CAN bus differential pair (1 = lines together, 0 = lines apart).
  const screen = document.getElementById('scope');
  const bytes = Array.from(document.querySelectorAll('.byte'));
  if (screen && bytes.length) {
    try {
      initScope(screen, bytes);
    } catch (error) {
      console.error(error);
    }
  }

  function initScope(screenEl, byteEls) {
    const NS = 'http://www.w3.org/2000/svg';
    const bits = byteEls.flatMap((el) => Array.from(el.dataset.bits, Number));
    const n = bits.length;

    const make = (tag, attrs) => {
      const el = document.createElementNS(NS, tag);
      Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
      return el;
    };

    const svg = make('svg', { 'aria-hidden': 'true', focusable: 'false' });
    const bands = byteEls.map(() => make('rect', { class: 'band' }));
    const low = make('path', { class: 'trace trace-low', pathLength: 1 });
    const high = make('path', { class: 'trace trace-high', pathLength: 1 });
    svg.append(...bands, low, high);
    screenEl.replaceChildren(svg);

    function layout() {
      const W = screenEl.clientWidth;
      const H = screenEl.clientHeight;
      if (!W || !H) return;

      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      const w = W / n; // one bit
      const edge = Math.min(w * 0.22, 8);
      const mid = H / 2;
      const recessive = H * 0.03;
      const dominant = H * 0.24;

      const level = (bit, isHigh) => mid + (isHigh ? -1 : 1) * (bit ? recessive : dominant);
      const trace = (isHigh) => {
        let d = `M0 ${level(bits[0], isHigh)}`;
        bits.forEach((bit, i) => {
          const y = level(bit, isHigh);
          d += ` L${(i * w + edge).toFixed(1)} ${y} L${((i + 1) * w - edge).toFixed(1)} ${y}`;
        });
        return `${d} L${W} ${level(bits[n - 1], isHigh)}`;
      };

      high.setAttribute('d', trace(true));
      low.setAttribute('d', trace(false));

      const byteWidth = W / byteEls.length;
      bands.forEach((band, i) => {
        band.setAttribute('x', (i * byteWidth).toFixed(1));
        band.setAttribute('y', 0);
        band.setAttribute('width', byteWidth.toFixed(1));
        band.setAttribute('height', H);
      });
    }

    // Letters light up their byte on the trace.
    const state = byteEls.map(() => ({ hover: false, focus: false }));
    const refresh = (i) => {
      const pressed = byteEls[i].getAttribute('aria-pressed') === 'true';
      bands[i].classList.toggle('on', state[i].hover || state[i].focus || pressed);
    };
    byteEls.forEach((el, i) => {
      el.addEventListener('pointerenter', () => { state[i].hover = true; refresh(i); });
      el.addEventListener('pointerleave', () => { state[i].hover = false; refresh(i); });
      el.addEventListener('focus', () => { state[i].focus = true; refresh(i); });
      el.addEventListener('blur', () => { state[i].focus = false; refresh(i); });
      el.addEventListener('click', () => {
        const pressed = el.getAttribute('aria-pressed') === 'true';
        el.setAttribute('aria-pressed', String(!pressed));
        refresh(i);
      });
    });

    layout();
    new ResizeObserver(layout).observe(screenEl);

    // One entrance: the trace sweeps left to right and each letter appears as
    // the sweep reaches its byte.
    if (reduce || !hasGsap) return;

    // Path length is normalised to 1 (pathLength attribute), so a dash of 1
    // with an offset that runs 1 to 0 draws the path from start to end. The
    // offset is written as an attribute from a proxy value: GSAP's CSS plugin
    // snaps px lengths like stroke-dashoffset to whole numbers, which turns
    // the sweep into a single jump.
    const sweep = 1.8;
    const timeline = gsap.timeline();
    const draw = (path, at) => {
      const progress = { value: 0 };
      path.setAttribute('stroke-dasharray', '1');
      path.setAttribute('stroke-dashoffset', '1');
      timeline.to(
        progress,
        {
          value: 1,
          duration: sweep,
          ease: 'none',
          onUpdate: () => path.setAttribute('stroke-dashoffset', String(1 - progress.value)),
          onComplete: () => {
            path.removeAttribute('stroke-dasharray');
            path.removeAttribute('stroke-dashoffset');
          },
        },
        at,
      );
    };
    draw(high, 0.15);
    draw(low, 0.25);
    byteEls.forEach((el, i) => {
      timeline.fromTo(
        el,
        { opacity: 0 },
        { opacity: 1, duration: 0.4, ease: 'power1.out' },
        0.2 + (i * sweep) / byteEls.length,
      );
    });
  }
})();
