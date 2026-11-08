(function () {
  "use strict";

  /* Horizon band. Pulls public-domain pastoral landscapes live from the Art
     Institute of Chicago API, shows one at random, then walks the rest in a
     shuffled no-repeat queue (reshuffled when exhausted). Every painting
     re-tints the page: a palette is sampled from the image and written to the
     CSS variables, which crossfade (styles.css). Falls back to four
     public-domain paintings on Wikimedia Commons if the API fails or is slow. */

  var ROTATE_MS = 5000, FADE_MS = 1600, API_WAIT_MS = 2500, IMG_WAIT_MS = 8000, POOL_SIZE = 8;

  var band = document.querySelector("[data-horizon]");
  if (!band) return;
  var root = document.documentElement;
  var art = band.querySelector(".horizon-art");
  var creditEl = band.querySelector("[data-credit]");
  var dotsEl = band.querySelector("[data-dots]");
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var still = window.matchMedia("(prefers-reduced-motion: reduce)");
  var dusk = window.matchMedia("(prefers-color-scheme: dark)");

  /* ------------------------------------------------------------ fallbacks
     Public domain, hosted by Wikimedia Commons (not the same servers as the
     live pull). pal = [lightest, ink, sage, gold], used only if the image
     can't be sampled. */
  function commons(dir, file) {
    var f = encodeURIComponent(file);
    return "https://upload.wikimedia.org/wikipedia/commons/thumb/" + dir + "/" + f + "/1280px-" + f;
  }
  var FALLBACKS = [
    { title: "The Hay Wain", artist: "John Constable", date: "1821",
      src: commons("5/5e", "John_Constable_-_The_Hay_Wain_(1821).jpg"),
      href: "https://www.nationalgallery.org.uk/paintings/john-constable-the-hay-wain",
      pal: ["#ebe7dc", "#262b22", "#8e9a68", "#c4a35f"] },
    { title: "Stoke-by-Nayland", artist: "John Constable", date: "1836",
      src: commons("0/08", "John_Constable_-_Stoke-by-Nayland_-_1922.4453_-_Art_Institute_of_Chicago.jpg"),
      href: "https://www.artic.edu/artworks/4758/stoke-by-nayland",
      pal: ["#ece3cf", "#2a2619", "#87905a", "#c9a352"] },
    { title: "River with a Distant Tower", artist: "Jean-Baptiste-Camille Corot", date: "1865",
      src: commons("a/ae", "Corot,_River_with_a_Distant_Tower.jpg"),
      href: "https://www.metmuseum.org/art/collection/search/435983",
      pal: ["#e8e6da", "#23271f", "#93a07c", "#bfa86a"] },
    { title: "The Vire at Saint-Lô", artist: "Jean-Baptiste-Camille Corot", date: "",
      src: commons("2/21", "Corot-_La_Vire_à_Saint-Lô.jpg"),
      href: "https://commons.wikimedia.org/wiki/File:Corot-_La_Vire_%C3%A0_Saint-L%C3%B4.jpg",
      pal: ["#e9e5d6", "#262a21", "#8f9b72", "#c2a464"] }
  ];

  /* ------------------------------------------------------------ live pull
     One search request per page load. The query only asks for public-domain
     works; everything else is filtered here so nothing garish lands:
     paintings only, tagged as landscapes, wide, calm dominant colour, made
     between 1700 and 1925, and nothing stormy, nocturnal, urban or at sea. */
  var TERMS = ["pastoral landscape", "landscape river", "meadow landscape", "landscape cattle",
               "countryside landscape", "landscape fields", "river valley", "farm landscape", "hay harvest"];
  var FIELDS = "id,title,artist_title,date_display,image_id,thumbnail,color,artwork_type_title,subject_titles,term_titles,style_titles";
  var LAND = /landscape|pastoral/i;
  var RURAL = /river|stream|meadow|pasture|field|countryside|farm|valley|cattle|cow|sheep|hay|harvest|rural|village|pond|hill/i;
  var AVOID = /battle|war\b|storm|wreck|fire|burning|night|moon|winter|snow|portrait|nude|crucifi|martyr|death|interior|still life|street|city|harbo|seascape|marine|\bsea\b|abstract|ruin/i;

  function fits(a) {
    if (!a || !a.image_id || !a.thumbnail || !a.thumbnail.width || !a.thumbnail.height) return false;
    if (a.artwork_type_title !== "Painting") return false;
    var tags = [a.title].concat(a.subject_titles || [], a.term_titles || [], a.style_titles || []).join(" | ");
    if (!LAND.test(tags) || !RURAL.test(tags)) return false;
    if (AVOID.test(a.title + " | " + (a.subject_titles || []).join(" | "))) return false;
    var r = a.thumbnail.width / a.thumbnail.height;
    if (r < 1.25 || r > 2.4) return false;
    var c = a.color;
    if (c && (c.s > 62 || c.l < 28 || c.l > 88)) return false;
    var y = +(((a.date_display || "").match(/1[6-9]\d\d/) || [0])[0]);
    if (y && (y < 1700 || y > 1925)) return false;
    return true;
  }

  function pull() {
    var url = "https://api.artic.edu/api/v1/artworks/search?q=" + encodeURIComponent(pick(TERMS)) +
      "&query%5Bterm%5D%5Bis_public_domain%5D=true&fields=" + FIELDS + "&limit=100";
    var ctrl = window.AbortController ? new AbortController() : null;
    var slow = setTimeout(function () { if (ctrl) ctrl.abort(); }, API_WAIT_MS);
    return Promise.race([
      fetch(url, ctrl ? { signal: ctrl.signal } : {}),
      new Promise(function (_, no) { setTimeout(function () { no(new Error("slow")); }, API_WAIT_MS); })
    ]).then(function (r) {
      if (!r.ok) throw new Error("api " + r.status);
      return r.json();
    }).then(function (j) {
      clearTimeout(slow);
      var iiif = (j.config && j.config.iiif_url) || "https://www.artic.edu/iiif/2";
      var w = window.innerWidth * (window.devicePixelRatio || 1) > 1200 ? 1686 : 843;
      var list = (j.data || []).filter(fits).map(function (a) {
        return { title: a.title, artist: a.artist_title || "Unknown artist", date: a.date_display || "",
                 src: iiif + "/" + a.image_id + "/full/" + w + ",/0/default.jpg",
                 href: "https://www.artic.edu/artworks/" + a.id };
      });
      if (list.length < 4) throw new Error("too few");
      return shuffle(list).slice(0, POOL_SIZE);
    });
  }

  /* ------------------------------------------------------------- helpers */
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* --------------------------------------------------------------- colour */
  function hex2rgb(h) { var n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function rgb2hex(c) { return "#" + c.map(function (v) { return ("0" + Math.round(clamp(v, 0, 255)).toString(16)).slice(-2); }).join(""); }
  function rgb2hsl(c) {
    var r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, s = 0;
    if (mx !== mn) {
      var d = mx - mn;
      s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }
  function hsl2rgb(x) {
    var h = x[0] / 360, s = x[1], l = x[2];
    if (!s) return [l * 255, l * 255, l * 255];
    function f(p, q, t) { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }
    var q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    return [f(p, q, h + 1 / 3) * 255, f(p, q, h) * 255, f(p, q, h - 1 / 3) * 255];
  }
  function lum(c) {
    var v = c.map(function (x) { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); });
    return .2126 * v[0] + .7152 * v[1] + .0722 * v[2];
  }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function mean(px) {
    if (!px.length) return null;
    var s = [0, 0, 0];
    px.forEach(function (p) { s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; });
    return [s[0] / px.length, s[1] / px.length, s[2] / px.length];
  }
  /* walk lightness until the colour clears a contrast ratio against `bg` */
  function reach(hsl, bg, ratio, dir) {
    var x = hsl.slice();
    for (var i = 0; i < 100 && contrast(hsl2rgb(x), bg) < ratio; i++) x[2] = clamp(x[2] + dir * .01, 0, 1);
    return hsl2rgb(x);
  }

  function sample(im) {
    try {
      var w = 64, h = Math.max(8, Math.round(64 * im.naturalHeight / im.naturalWidth));
      var c = document.createElement("canvas");
      c.width = w; c.height = h;
      var x = c.getContext("2d", { willReadFrequently: true });
      x.drawImage(im, 0, 0, w, h);
      var d = x.getImageData(0, 0, w, h).data, px = [];
      for (var i = 0; i < d.length; i += 4) { var p = [d[i], d[i + 1], d[i + 2]]; p.L = lum(p); p.hsl = rgb2hsl(p); px.push(p); }
      px.sort(function (a, b) { return a.L - b.L; });
      var k = Math.max(1, Math.floor(px.length * .08));
      return {
        light: mean(px.slice(px.length - k)),
        dark: mean(px.slice(0, k)),
        sage: mean(px.filter(function (p) { return p.hsl[0] >= 60 && p.hsl[0] <= 170 && p.hsl[1] >= .1 && p.hsl[2] > .15 && p.hsl[2] < .85; })),
        gold: mean(px.filter(function (p) { return p.hsl[0] >= 28 && p.hsl[0] <= 58 && p.hsl[1] >= .18 && p.hsl[2] > .2 && p.hsl[2] < .85; }))
      };
    } catch (e) { return null; }   /* tainted canvas: no CORS on this image */
  }

  /* lightest tone -> paper, darkest -> ink, then muted/rule between them and
     sage/gold accents; every text colour is pushed until it clears WCAG AA
     (ink 12:1, muted 5:1) against its paper, in both light and dusk. */
  function derive(s) {
    var L = rgb2hsl(s.light), D = rgb2hsl(s.dark);
    var sg = s.sage ? rgb2hsl(s.sage) : [88, .2, .55], gd = s.gold ? rgb2hsl(s.gold) : [42, .45, .6];
    var sage = [sg[0], clamp(sg[1], .16, .38), .56], gold = [gd[0], clamp(gd[1], .32, .58), .6];

    var bg = hsl2rgb([L[0], clamp(L[1] * .6, .1, .32), .925]);
    var fg = reach([D[0], clamp(D[1], .12, .42), .2], bg, 12, -1);
    var muted = reach([D[0], clamp(D[1] * .7, .08, .25), .45], bg, 5, -1);

    var dbg = hsl2rgb([D[0], clamp(D[1] * .8, .12, .32), .11]);
    var dfg = reach([L[0], clamp(L[1] * .5, .06, .22), .88], dbg, 12, 1);
    var dmuted = reach([L[0], clamp(L[1] * .4, .05, .18), .62], dbg, 5, 1);

    return {
      light: { bg: rgb2hex(bg), fg: rgb2hex(fg), muted: rgb2hex(muted), rule: rgb2hex(mix(bg, fg, .14)),
               sage: rgb2hex(hsl2rgb(sage)), gold: rgb2hex(hsl2rgb(gold)) },
      dark: { bg: rgb2hex(dbg), fg: rgb2hex(dfg), muted: rgb2hex(dmuted), rule: rgb2hex(mix(dbg, dfg, .16)),
              sage: rgb2hex(hsl2rgb([sage[0], sage[1] * .85, .36])), gold: rgb2hex(hsl2rgb([gold[0], gold[1] * .85, .42])) }
    };
  }

  function paletteFor(p, im) {
    if (p.theme) return p.theme;
    var s = p.cors ? sample(im) : null;
    if (!s || !s.light || !s.dark) {
      var f = p.pal || ["#ebe7dc", "#262b22", "#8e9a68", "#c4a35f"];
      s = { light: hex2rgb(f[0]), dark: hex2rgb(f[1]), sage: hex2rgb(f[2]), gold: hex2rgb(f[3]) };
    }
    p.theme = derive(s);
    return p.theme;
  }

  var theme = null;
  function applyTheme(t) {
    theme = t || theme;
    if (!theme) return;
    var v = dusk.matches ? theme.dark : theme.light;
    Object.keys(v).forEach(function (k) { root.style.setProperty("--" + k, v[k]); });
    if (themeMeta) themeMeta.setAttribute("content", v.bg);
    document.querySelectorAll("[data-hex]").forEach(function (el) { el.textContent = v[el.getAttribute("data-hex")].toUpperCase(); });
  }
  (dusk.addEventListener ? dusk.addEventListener.bind(dusk, "change") : dusk.addListener.bind(dusk))(function () { applyTheme(); });

  /* -------------------------------------------------------------- loading */
  function load(p) {
    if (p.img) return Promise.resolve(p.img);
    if (p.loading) return p.loading;
    p.loading = new Promise(function (res, rej) {
      function attempt(cors) {
        var im = new Image(), done = false;
        if (cors) im.crossOrigin = "anonymous";
        im.decoding = "async";
        im.alt = "";
        var slow = setTimeout(function () { if (!done) { done = true; rej(new Error("slow image")); } }, IMG_WAIT_MS);
        im.onload = function () { if (done) return; done = true; clearTimeout(slow); p.img = im; p.cors = cors; res(im); };
        im.onerror = function () {
          if (done) return; clearTimeout(slow);
          if (cors) attempt(false);              /* no CORS headers: show it anyway, palette from presets */
          else { done = true; rej(new Error("image failed")); }
        };
        im.src = p.src;
      }
      attempt(true);
    });
    p.loading.catch(function () { p.loading = null; });
    return p.loading;
  }

  /* ---------------------------------------------------------- the rotation */
  var pool = [], queue = [], cur = -1, front = null, timer = 0, held = false, live = false;

  function good() { return pool.filter(function (p) { return !p.bad; }).length; }
  function reseed(exclude) {
    queue = shuffle(pool.map(function (_, k) { return k; }).filter(function (k) { return k !== exclude && !pool[k].bad; }));
  }
  function nextIndex() {
    for (var tries = 0; tries < 2; tries++) {
      while (queue.length) { var i = queue.shift(); if (!pool[i].bad) return i; }
      reseed(cur);
    }
    return -1;
  }
  function preloadNext() { if (queue.length) load(pool[queue[0]]).catch(function () {}); }

  function show(i) {
    var p = pool[i];
    return load(p).then(function (im) {
      if (pool[i] !== p) return;
      var t = paletteFor(p, im);
      im.className = "";
      art.appendChild(im);                       /* newest sits on top and fades in over the old one */
      void im.offsetWidth;
      im.classList.add("is-on");
      var old = front;
      front = im;
      if (old && old !== im) setTimeout(function () { if (old !== front && old.parentNode) old.parentNode.removeChild(old); }, still.matches ? 0 : FADE_MS + 100);
      cur = i;
      credit(p);
      pool.forEach(function (q, k) { if (q.dot) q.dot.setAttribute("aria-pressed", String(k === i)); });
      applyTheme(t);
    });
  }

  function fail(i) {
    pool[i].bad = true;
    if (pool[i].dot) { pool[i].dot.parentNode.removeChild(pool[i].dot); pool[i].dot = null; }
    if (live && !good()) { live = false; start(shuffle(FALLBACKS.slice())); return false; }   /* live images all failed */
    return good() > 0;
  }

  function advance() {
    var i = nextIndex();
    if (i < 0) return;
    show(i).then(function () { preloadNext(); schedule(); }, function () { if (fail(i)) advance(); });
  }

  function schedule() {
    clearTimeout(timer);
    if (still.matches || document.hidden || held || good() < 2) return;
    timer = setTimeout(advance, ROTATE_MS);
  }

  function credit(p) {
    creditEl.textContent = "";
    var t = document.createElement(p.href ? "a" : "span");
    if (p.href) { t.href = p.href; t.target = "_blank"; t.rel = "noopener"; }
    t.textContent = p.title;
    creditEl.appendChild(t);
    creditEl.appendChild(document.createTextNode((p.date ? ", " + p.date : "") + " · " + p.artist));
  }

  function dots() {
    dotsEl.textContent = "";
    pool.forEach(function (p, k) {
      if (p.bad) return;
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", p.title + ", " + p.artist);
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () {
        if (k === cur) return;
        clearTimeout(timer);
        show(k).then(function () { reseed(k); preloadNext(); schedule(); },   /* a dot reseeds the queue */
                     function () { if (fail(k)) schedule(); });
      });
      p.dot = b;
      dotsEl.appendChild(b);
    });
  }

  function start(list) {
    pool = list.map(function (p) { var q = {}; for (var k in p) q[k] = p[k]; return q; });
    dots();
    var first = Math.floor(Math.random() * pool.length);  /* random first painting on every load */
    reseed(first);
    show(first).then(function () { preloadNext(); schedule(); }, function () { if (fail(first)) advance(); });
  }

  /* hold while the visitor is on the credit or the dots (not the whole band:
     a cursor resting over the painting shouldn't freeze it) */
  var meta = band.querySelector(".horizon-meta");
  meta.addEventListener("pointerenter", function () { held = true; clearTimeout(timer); });
  meta.addEventListener("pointerleave", function () { held = false; schedule(); });
  meta.addEventListener("focusin", function () { held = true; clearTimeout(timer); });
  meta.addEventListener("focusout", function (e) { if (!meta.contains(e.relatedTarget)) { held = false; schedule(); } });
  document.addEventListener("visibilitychange", function () { if (document.hidden) clearTimeout(timer); else schedule(); });
  (still.addEventListener ? still.addEventListener.bind(still, "change") : still.addListener.bind(still))(schedule);

  pull().then(function (list) { live = true; start(list); },
              function () { start(shuffle(FALLBACKS.slice())); });
})();
