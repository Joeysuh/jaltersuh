(function () {
  "use strict";

  /* The parts of the band's cinema that need a script: the opening, where the
     first painting paints itself in, and the pointer, which leans the camera
     and carries a soft light over the painting. Everything else is CSS or
     lives with the paintings in horizon.js. */

  var root = document.documentElement;
  var still = window.matchMedia("(prefers-reduced-motion: reduce)");
  var band = document.querySelector("[data-horizon]");
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* ------------------------------------------------------------ opening
     The head script adds .opening-on before first paint (once per session,
     never under reduced motion). The screen starts near-black. When The Hay
     Wain has loaded (horizon.js hands it over), it is painted onto a canvas
     that sits exactly where the band does: broad sky strokes first, then the
     land, then small detail strokes, each one coloured from the painting
     itself. A warm wash of light crosses, the strokes resolve into the real
     painting, the name arrives letter by letter, the car crosses under it,
     and the whole thing lifts. About 4s. Skip, a click or a key ends it at
     once; so does scrolling or resizing. If the painting is slow or can't be
     sampled, only the name and the car play. */
  (function () {
    if (!root.classList.contains("opening-on")) return;
    var el = document.querySelector(".opening");
    function opened() { document.dispatchEvent(new CustomEvent("joey:opened")); }
    if (!el || !band) { root.classList.remove("opening-on"); opened(); return; }

    var stage = el.querySelector(".opening-stage"), paint = el.querySelector(".opening-paint"), real = el.querySelector(".opening-real");
    var nameEl = el.querySelector(".opening-name"), road = el.querySelector(".opening-road");
    var timers = [], raf = 0, lifting = false;

    "Joey Suh".split("").forEach(function (ch, i) {
      var sp = document.createElement("span");
      sp.textContent = ch;
      sp.style.setProperty("--i", i);
      nameEl.appendChild(sp);
    });
    var car = document.querySelector(".car");
    if (car && road) {                                   /* the same drawing as the car that laps the page */
      var copy = car.cloneNode(true);
      copy.setAttribute("class", "car-art opening-car");
      copy.removeAttribute("style");
      var defs = copy.querySelector("defs");
      if (defs) defs.parentNode.removeChild(defs);
      road.appendChild(copy);
    }

    function after(ms, fn) { timers.push(setTimeout(fn, ms)); }
    function lift(skipped) {
      if (lifting) return;
      lifting = true;
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
      el.classList.add("is-lifting");
      if (skipped) el.classList.add("is-skipped");
      opened();
      document.removeEventListener("keydown", skip);
      window.removeEventListener("scroll", skip);
      window.removeEventListener("resize", skip);
      setTimeout(function () { root.classList.remove("opening-on"); }, skipped ? 320 : 680);
    }
    function skip() { lift(true); }
    el.addEventListener("click", skip);
    document.addEventListener("keydown", skip);
    window.addEventListener("scroll", skip, { passive: true });
    window.addEventListener("resize", skip);

    /* the name, the car, then the lift */
    function titles(t) {
      after(t, function () { el.classList.add("is-named"); });
      after(t + 150, function () { el.classList.add("is-driving"); });
      after(t + 1650, function () { lift(false); });
    }

    function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

    function start(img) {
      var frame = band.querySelector(".horizon-frames img");
      if (!frame || window.scrollY > 4) return false;
      var br = band.getBoundingClientRect(), W = Math.round(br.width), H = Math.round(br.height);
      var k = Math.min(window.devicePixelRatio || 1, 2, 2200 / W);
      stage.style.left = br.left + "px"; stage.style.top = br.top + "px"; stage.style.width = W + "px"; stage.style.height = H + "px";
      [paint, real].forEach(function (c) { c.width = Math.round(W * k); c.height = Math.round(H * k); });
      /* where the real painting sits right now: object-fit cover at 50% 42%, inside its own slow zoom */
      function place() {
        var r = frame.getBoundingClientRect(), iw = img.naturalWidth, ih = img.naturalHeight, sc = Math.max(r.width / iw, r.height / ih);
        return { x: r.left - br.left + (r.width - iw * sc) * .5, y: r.top - br.top + (r.height - ih * sc) * .42, w: iw * sc, h: ih * sc };
      }

      /* a small copy of that view to take colours from */
      var g = place(), sw = 220, sh = Math.max(2, Math.round(sw * H / W)), f = sw / W, data;
      var small = document.createElement("canvas");
      small.width = sw; small.height = sh;
      try {
        var sx = small.getContext("2d", { willReadFrequently: true });
        sx.drawImage(img, g.x * f, g.y * f, g.w * f, g.h * f);
        data = sx.getImageData(0, 0, sw, sh).data;
      } catch (e) { return false; }
      function at(x, y) { var o = (clamp(Math.round(y * f), 0, sh - 1) * sw + clamp(Math.round(x * f), 0, sw - 1)) * 4; return [data[o], data[o + 1], data[o + 2]]; }
      function lit(ix, iy) { var o = (clamp(iy, 0, sh - 1) * sw + clamp(ix, 0, sw - 1)) * 4; return (data[o] * 2 + data[o + 1] * 5 + data[o + 2]) / 8; }
      function sky(c, y) { return y < H * .6 && (Math.max(c[0], c[1], c[2]) + Math.min(c[0], c[1], c[2])) / 510 > .56; }
      /* small strokes follow the edges in the painting, like a brush following a form */
      function along(x, y) {
        var ix = Math.round(x * f), iy = Math.round(y * f), gx = lit(ix + 1, iy) - lit(ix - 1, iy), gy = lit(ix, iy + 1) - lit(ix, iy - 1);
        return Math.abs(gx) + Math.abs(gy) < 10 ? (rnd() - .5) * 1.2 : Math.atan2(gy, gx) + Math.PI / 2;
      }

      var rnd = rng(1821), u = clamp(W / 1440, .55, 1.15);
      function tone(c, m) { return "rgb(" + Math.round(clamp(c[0] * m, 0, 255)) + "," + Math.round(clamp(c[1] * m, 0, 255)) + "," + Math.round(clamp(c[2] * m, 0, 255)) + ")"; }
      /* one stroke is a small bundle of bristles: parallel threads of slightly different length and shade */
      function stroke(x, y, c, len, w, ang, key) {
        var n = w > 9 ? 4 : 2, m = 1 + (rnd() - .5) * .08, bend = (rnd() - .5) * len * .22, ca = Math.cos(ang), sa = Math.sin(ang), hairs = [];
        for (var i = 0; i < n; i++) {
          var off = ((i + .5) / n - .5) * w, half = len / 2 * (.8 + rnd() * .35), slip = (rnd() - .5) * len * .12;
          hairs.push({ ox: -sa * off + ca * slip, oy: ca * off + sa * slip, dx: ca * half, dy: sa * half, col: tone(c, m * (1 + (rnd() - .5) * .14)) });
        }
        return { x: x, y: y, bx: -sa * bend, by: ca * bend, w: w / n * 1.5, hairs: hairs, key: key };
      }
      function grid(step, fn) {
        for (var y = step / 2; y < H * .98; y += step)
          for (var x = step / 2; x < W + step / 2; x += step) fn(x + (rnd() - .5) * step * .9, y + (rnd() - .5) * step * .9);
      }
      var passes = [[], [], []];
      grid(46 * u, function (x, y) { var c = at(x, y); if (sky(c, y)) passes[0].push(stroke(x, y, c, (70 + rnd() * 60) * u, (30 + rnd() * 14) * u, (rnd() - .5) * .42, x / W * .7 + rnd() * .3)); });
      grid(28 * u, function (x, y) { var c = at(x, y); if (!sky(c, y)) passes[1].push(stroke(x, y, c, (42 + rnd() * 30) * u, (22 + rnd() * 10) * u, (rnd() - .5) * 1.3, y / H * .6 + rnd() * .4)); });
      grid(12 * u, function (x, y) { passes[2].push(stroke(x, y, at(x, y), (11 + rnd() * 10) * u, (4.5 + rnd() * 3.5) * u, along(x, y) + (rnd() - .5) * .5, rnd())); });
      passes.forEach(function (p) { p.sort(function (a, b) { return a.key - b.key; }); });

      var ctx = paint.getContext("2d");
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.lineCap = "round";
      ctx.globalAlpha = .88;
      function draw(s) {
        ctx.lineWidth = s.w;
        for (var i = 0; i < s.hairs.length; i++) {
          var b = s.hairs[i], x = s.x + b.ox, y = s.y + b.oy;
          ctx.strokeStyle = b.col;
          ctx.beginPath(); ctx.moveTo(x - b.dx, y - b.dy); ctx.quadraticCurveTo(x + s.bx, y + s.by, x + b.dx, y + b.dy); ctx.stroke();
        }
      }

      /* sky, then land, then detail, overlapping a little */
      var T = [[0, 700], [450, 1350], [1100, 2050]], done = [0, 0, 0], t0 = performance.now();
      (function tick(now) {
        var t = (now || t0) - t0, more = false;
        for (var i = 0; i < 3; i++) {
          var p = clamp((t - T[i][0]) / (T[i][1] - T[i][0]), 0, 1), n = Math.floor(p * p * (3 - 2 * p) * passes[i].length);
          while (done[i] < n) draw(passes[i][done[i]++]);
          if (p < 1) more = true;
        }
        if (more && !lifting) raf = requestAnimationFrame(tick);
      })();

      after(1850, function () { el.classList.add("is-wash"); });
      after(2150, function () {                           /* resolve into the real painting, placed exactly as the band shows it */
        var q = place(), rx = real.getContext("2d");
        rx.setTransform(k, 0, 0, k, 0, 0);
        try { rx.drawImage(img, q.x, q.y, q.w, q.h); } catch (e) {}
        el.classList.add("is-real");
      });
      titles(2250);
      return true;
    }

    var gaveUp = false;
    var giveUp = setTimeout(function () { gaveUp = true; titles(0); }, 2600);
    (window.joeyOpening || Promise.reject(new Error("no painting"))).then(function (r) {
      if (gaveUp || lifting) return;
      var tries = 0;
      (function wait() {                                  /* until the band has laid the painting out */
        if (gaveUp || lifting) return;
        if (band.querySelector(".horizon-frames img.is-on") || ++tries > 30) {
          clearTimeout(giveUp);
          if (!(r.sampled && start(r.img))) titles(0);
        } else requestAnimationFrame(wait);
      })();
    }, function () { if (!gaveUp && !lifting) { clearTimeout(giveUp); titles(0); } });
  })();

  /* --------------------------------------------------------- the pointer
     Moving the pointer leans the camera a few pixels around the frame (the
     blurred backdrop moves less, which is where the depth comes from) and
     carries a soft light over the painting. Both ease in CSS. Mouse and
     trackpad only; off under reduced motion. */
  if (!band || still.matches || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  var art = band.querySelector(".horizon-art"), light = band.querySelector(".horizon-light");
  var nx = 0, ny = 0, lx = 0, ly = 0, over = false, lit = false, raf = 0;
  function apply() {
    raf = 0;
    band.style.setProperty("--lean-x", nx.toFixed(3));
    band.style.setProperty("--lean-y", ny.toFixed(3));
    if (!light) return;
    if (over && !lit) {                                   /* arrive where the pointer is instead of sliding in from the corner */
      light.style.transition = "none";
      light.style.transform = "translate3d(" + lx + "px," + ly + "px,0)";
      void light.offsetWidth;
      light.style.transition = "";
    }
    if (over) light.style.transform = "translate3d(" + lx + "px," + ly + "px,0)";
    light.classList.toggle("is-on", over);
    lit = over;
  }
  window.addEventListener("pointermove", function (e) {
    nx = e.clientX / window.innerWidth * 2 - 1;
    ny = e.clientY / window.innerHeight * 2 - 1;
    var b = band.getBoundingClientRect(), a = art.getBoundingClientRect();
    over = e.clientY >= b.top && e.clientY <= b.top + b.height * .9;
    lx = Math.round(e.clientX - a.left);
    ly = Math.round(e.clientY - a.top);
    if (!raf) raf = requestAnimationFrame(apply);
  }, { passive: true });
  document.addEventListener("pointerleave", function () { nx = ny = 0; over = false; if (!raf) raf = requestAnimationFrame(apply); });
})();
