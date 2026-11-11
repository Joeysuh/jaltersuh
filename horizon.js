(function () {
  "use strict";

  /* Horizon band: an endless stream of public-domain pastoral paintings.
     Three open-access museum collections feed it (Art Institute of Chicago,
     Cleveland Museum of Art, The Met), no keys needed. Batches are pulled in
     turn as the queue runs low, shuffled together, and nothing repeats within
     a visit. Metadata filters keep it to calm rural landscapes, and every
     image is checked again once loaded (shape, saturation, lightness) before
     it is shown. Each painting re-tints the page from a sampled palette.
     Four public-domain paintings on Wikimedia Commons stand in whenever the
     collections fail or are slow. */

  var ROTATE_MS = 8000, FADE_MS = 800, API_WAIT_MS = 2500, FETCH_MS = 7000, IMG_WAIT_MS = 8000, LOW_WATER = 4;

  var band = document.querySelector("[data-horizon]");
  if (!band) return;
  var root = document.documentElement;
  var art = band.querySelector(".horizon-frames");        /* paintings stack here, under the atmosphere layers */
  var back = band.querySelector(".horizon-back");         /* a blurred copy of each painting, behind it */
  var sheen = band.querySelector(".sheen");
  var fill = band.querySelector(".timeline i");
  var bars = document.querySelectorAll(".letterbox .bar");
  var creditEl = band.querySelector("[data-credit]");
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

  /* ------------------------------------------------------------ sources
     Each source returns a batch of paintings shaped
     { key, title, artist, date, src, href }. A source that errors or is slow
     just contributes nothing this round. */
  var LAND = /landscape|pastoral/i;
  var RURAL = /river|stream|meadow|pasture|field|countryside|farm|valley|cattle|cow|sheep|hay|harvest|rural|village|pond|hill/i;
  var AVOID = /battle|war\b|storm|wreck|fire|burning|night|moon|winter|snow|portrait|nude|crucifi|martyr|death|interior|still life|street|city|harbo|seascape|marine|\bsea\b|abstract|ruin|\bvirgin\b|\bsaint\b(?!-)|\bchrist\b|madonna|\bholy\b/i;
  function yearOk(y) { return !y || (y >= 1700 && y <= 1925); }
  function firstYear(t) { return +(((t || "").match(/1[6-9]\d\d/) || [0])[0]); }
  function wideEnough(w, h) { var r = w / h; return r >= 1.25 && r <= 2.4; }

  function getJSON(url) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, FETCH_MS);
    return Promise.race([
      fetch(url, ctrl ? { signal: ctrl.signal } : {}),
      new Promise(function (_, no) { setTimeout(function () { no(new Error("slow")); }, FETCH_MS); })
    ]).then(function (r) { clearTimeout(t); if (!r.ok) throw new Error("http " + r.status); return r.json(); });
  }

  /* Art Institute of Chicago: public-domain search, random term and page */
  var AIC_TERMS = ["pastoral landscape", "landscape river", "meadow landscape", "landscape cattle",
                   "countryside landscape", "landscape fields", "river valley", "farm landscape", "hay harvest"];
  var AIC_FIELDS = "id,title,artist_title,date_display,image_id,thumbnail,color,artwork_type_title,subject_titles,term_titles,style_titles";
  function aicFits(a) {
    if (!a || !a.image_id || !a.thumbnail || !a.thumbnail.width || !a.thumbnail.height) return false;
    if (a.artwork_type_title !== "Painting") return false;
    var tags = [a.title].concat(a.subject_titles || [], a.term_titles || [], a.style_titles || []).join(" | ");
    if (!LAND.test(tags) || !RURAL.test(tags)) return false;
    if (AVOID.test(a.title + " | " + (a.subject_titles || []).join(" | "))) return false;
    if (!wideEnough(a.thumbnail.width, a.thumbnail.height)) return false;
    var c = a.color;
    if (c && (c.s > 62 || c.l < 28 || c.l > 88)) return false;
    return yearOk(firstYear(a.date_display));
  }
  function aic() {
    var url = "https://api.artic.edu/api/v1/artworks/search?q=" + encodeURIComponent(pick(AIC_TERMS)) +
      "&query%5Bterm%5D%5Bis_public_domain%5D=true&fields=" + AIC_FIELDS + "&limit=60&page=" + (1 + Math.floor(Math.random() * 3));
    return getJSON(url).then(function (j) {
      var iiif = (j.config && j.config.iiif_url) || "https://www.artic.edu/iiif/2";
      var w = window.innerWidth * (window.devicePixelRatio || 1) > 1200 ? 1686 : 843;
      return (j.data || []).filter(aicFits).map(function (a) {
        return { key: "aic:" + a.id, title: a.title, artist: a.artist_title || "Unknown artist", date: a.date_display || "",
                 src: iiif + "/" + a.image_id + "/full/" + w + ",/0/default.jpg", href: "https://www.artic.edu/artworks/" + a.id };
      });
    });
  }

  /* Cleveland Museum of Art: CC0 paintings with a web image, 1700 to 1925 */
  var CMA_TERMS = ["landscape", "pastoral", "river landscape", "countryside", "meadow", "cattle", "farm", "valley"];
  var cmaTotal = {};
  function cmaFits(a) {
    var web = a && a.images && a.images.web;
    if (!web || !web.url || !wideEnough(+web.width, +web.height)) return false;
    if (a.share_license_status && a.share_license_status !== "CC0") return false;
    if (AVOID.test(a.title || "")) return false;
    return yearOk(firstYear(a.creation_date));
  }
  function cmaArtist(cs) { var d = (cs && cs[0] && cs[0].description) || ""; return d.split(" (")[0] || "Unknown artist"; }
  function cma() {
    var term = pick(CMA_TERMS), total = cmaTotal[term], skip = total ? Math.floor(Math.random() * Math.max(1, total - 40)) : 0;
    var url = "https://openaccess-api.clevelandart.org/api/artworks/?q=" + encodeURIComponent(term) +
      "&type=Painting&cc0&has_image=1&created_after=1700&created_before=1925&limit=40&skip=" + skip;
    return getJSON(url).then(function (j) {
      if (j.info && j.info.total) cmaTotal[term] = j.info.total;
      return (j.data || []).filter(cmaFits).map(function (a) {
        return { key: "cma:" + a.id, title: a.title, artist: cmaArtist(a.creators), date: a.creation_date || "",
                 src: a.images.web.url, href: a.url };
      });
    });
  }

  /* The Met: search once per term for painting IDs, then open a few at a time */
  var MET = "https://collectionapi.metmuseum.org/public/collection/v1";
  var MET_TERMS = ["landscape", "pastoral", "river landscape", "countryside", "cattle"];
  var metIds = [];
  function metFits(o) {
    if (!o || !o.isPublicDomain || !o.primaryImageSmall || !/paint/i.test(o.classification || "")) return false;
    var tags = (o.tags || []).map(function (t) { return t.term; }).join(" | ");
    if (!LAND.test(o.title + " | " + tags) && !RURAL.test(o.title + " | " + tags)) return false;
    if (AVOID.test(o.title + " | " + tags)) return false;
    return yearOk(o.objectBeginDate);
  }
  function met() {
    var ids = metIds.length ? Promise.resolve(metIds) :
      getJSON(MET + "/search?hasImages=true&medium=Paintings&dateBegin=1700&dateEnd=1925&q=" + encodeURIComponent(pick(MET_TERMS)))
        .then(function (j) { metIds = shuffle((j.objectIDs || []).slice(0, 400)); return metIds; });
    return ids.then(function () {
      var batch = [];
      while (batch.length < 8 && metIds.length) { var id = metIds.pop(); if (!seen["met:" + id]) batch.push(id); }
      return Promise.all(batch.map(function (id) { return getJSON(MET + "/objects/" + id).catch(function () { return null; }); }));
    }).then(function (objs) {
      return objs.filter(metFits).map(function (o) {
        return { key: "met:" + o.objectID, title: o.title, artist: o.artistDisplayName || "Unknown artist", date: o.objectDate || "",
                 src: o.primaryImageSmall, href: o.objectURL };
      });
    });
  }

  var SOURCES = [aic, cma, met];

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
      var k = Math.max(1, Math.floor(px.length * .08)), ms = 0, ml = 0;
      px.forEach(function (p) { ms += (Math.max(p[0], p[1], p[2]) - Math.min(p[0], p[1], p[2])) / 255; ml += p.hsl[2]; });
      return {
        chroma: ms / px.length,   /* mean colourfulness; unlike HSL saturation it doesn't swell in dark varnish */
        lit: ml / px.length,
        light: mean(px.slice(px.length - k)),
        dark: mean(px.slice(0, k)),
        sage: mean(px.filter(function (p) { return p.hsl[0] >= 60 && p.hsl[0] <= 170 && p.hsl[1] >= .1 && p.hsl[2] > .15 && p.hsl[2] < .85; })),
        gold: mean(px.filter(function (p) { return p.hsl[0] >= 28 && p.hsl[0] <= 58 && p.hsl[1] >= .18 && p.hsl[2] > .2 && p.hsl[2] < .85; }))
      };
    } catch (e) { return null; }   /* tainted canvas: no CORS on this image */
  }

  /* lightest tone -> paper, darkest -> ink, then muted/rule between them and
     sage/gold accents; every text colour is pushed until it clears WCAG AA
     (ink 12:1, muted 6.5:1 so it still clears 4.5:1 on tints and glass) against its paper, in both light and dusk. */
  function derive(s) {
    var L = rgb2hsl(s.light), D = rgb2hsl(s.dark);
    var sg = s.sage ? rgb2hsl(s.sage) : [88, .2, .55], gd = s.gold ? rgb2hsl(s.gold) : [42, .45, .6];
    var sage = [sg[0], clamp(sg[1], .16, .38), .56], gold = [gd[0], clamp(gd[1], .32, .58), .6];

    var bg = hsl2rgb([L[0], clamp(L[1] * .6, .1, .32), .925]);
    var fg = reach([D[0], clamp(D[1], .12, .42), .2], bg, 12, -1);
    var muted = reach([D[0], clamp(D[1] * .7, .08, .25), .45], bg, 6.5, -1);

    var dbg = hsl2rgb([D[0], clamp(D[1] * .8, .12, .32), .11]);
    var dfg = reach([L[0], clamp(L[1] * .5, .06, .22), .88], dbg, 12, 1);
    var dmuted = reach([L[0], clamp(L[1] * .4, .05, .18), .62], dbg, 6.5, 1);

    return {
      light: { bg: rgb2hex(bg), fg: rgb2hex(fg), muted: rgb2hex(muted), rule: rgb2hex(mix(bg, fg, .14)),
               sage: rgb2hex(hsl2rgb(sage)), gold: rgb2hex(hsl2rgb(gold)) },
      dark: { bg: rgb2hex(dbg), fg: rgb2hex(dfg), muted: rgb2hex(dmuted), rule: rgb2hex(mix(dbg, dfg, .16)),
              sage: rgb2hex(hsl2rgb([sage[0], sage[1] * .85, .36])), gold: rgb2hex(hsl2rgb([gold[0], gold[1] * .85, .42])) }
    };
  }

  function paletteFor(p, im) {
    if (p.theme) return p.theme;
    var s = p.sampled !== undefined ? p.sampled : (p.cors ? sample(im) : null);
    if (!s || !s.light || !s.dark) {
      var f = p.pal || ["#ebe7dc", "#262b22", "#8e9a68", "#c4a35f"];
      s = { light: hex2rgb(f[0]), dark: hex2rgb(f[1]), sage: hex2rgb(f[2]), gold: hex2rgb(f[3]) };
    }
    p.theme = derive(s);
    return p.theme;
  }

  /* The page takes the new palette in one step at the cut (no wash across the
     page), and only while the reader is up at the band. Scrolled down to the
     rows, the page keeps its colours; the newest palette waits for the next
     cut seen at the top. */
  var theme = null;
  function bandInView() { var r = band.getBoundingClientRect(); return r.bottom > window.innerHeight * 0.35 && r.top < window.innerHeight; }
  function retint(t) { if (!theme || bandInView()) applyTheme(t); }
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

  /* ---------------------------------------------------------- the stream */
  var queue = [], seen = {}, current = null, front = null, run = null, held = false, live = false;
  var turn = 0, filling = null, strikes = [0, 0, 0];

  function enqueue(list) {
    var fresh = (list || []).filter(function (p) { return p && !seen[p.key]; });
    fresh.forEach(function (p) { seen[p.key] = true; });
    if (fresh.length && !live) { live = true; queue = queue.filter(function (p) { return !p.fallback; }); }   /* live paintings replace stand-ins */
    queue = shuffle(queue.concat(fresh));
    return fresh.length;
  }
  /* ask the next source in turn for a batch; a source that keeps failing mostly rests */
  function refill() {
    if (filling) return filling;
    var tries = 0;
    function attempt() {
      if (tries++ >= SOURCES.length) return Promise.resolve(0);
      var k = turn++ % SOURCES.length;
      if (strikes[k] >= 3 && Math.random() > 0.2) return attempt();
      return SOURCES[k]().then(function (list) { strikes[k] = 0; return enqueue(list); },
                               function () { strikes[k]++; return 0; })
        .then(function (n) { return n || attempt(); });
    }
    filling = attempt().then(function (n) { filling = null; return n; });
    return filling;
  }
  function standIns() {
    return shuffle(FALLBACKS.map(function (f, i) { var q = { key: "wm:" + i, fallback: true }; for (var k in f) q[k] = f[k]; return q; })
      .filter(function (p) { return !current || p.key !== current.key; }));
  }
  function next() {
    if (queue.length) return Promise.resolve(queue.shift());
    return refill().then(function () { if (!queue.length) queue = standIns(); return queue.shift(); });
  }
  function topUp() { if (queue.length < LOW_WATER) refill(); }

  /* the last check, on the loaded image itself: landscape-shaped, calm colour, not too dark or blown out */
  function calm(p, im) {
    if (p.fallback) return true;
    var r = im.naturalWidth / im.naturalHeight;
    if (!(r >= 1.2 && r <= 2.6)) return false;
    p.sampled = p.cors ? sample(im) : null;
    var s = p.sampled;
    return !s || (s.chroma <= .36 && s.lit >= .25 && s.lit <= .9);
  }

  /* director's cut: each painting drifts one way (never the same way twice in a row) */
  var DRIFTS = [["-0.9%", "-0.45%"], ["0.9%", "-0.45%"], ["-0.8%", "0.45%"], ["0.8%", "0.45%"], ["0%", "-0.7%"], ["-1%", "0%"], ["1%", "0%"]];
  var lastDrift = -1;
  function drift(im) {
    var d; do { d = Math.floor(Math.random() * DRIFTS.length); } while (d === lastDrift);
    lastDrift = d;
    im.style.setProperty("--kb-x", DRIFTS[d][0]);
    im.style.setProperty("--kb-y", DRIFTS[d][1]);
  }
  function inView() { var r = band.getBoundingClientRect(); return r.bottom > window.innerHeight * 0.35 && r.top < window.innerHeight; }
  /* a brief letterbox squeeze on the cut, only while the band is on screen */
  function squeeze() {
    if (still.matches || !inView() || !bars[0] || !bars[0].animate) return;
    bars.forEach(function (b) {
      b.animate([{ transform: "scaleY(0)" }, { transform: "scaleY(.11)", offset: .4 }, { transform: "scaleY(0)" }],
                { duration: 1100, easing: "cubic-bezier(0,0,.58,1)" });   /* Apple ease-out */
    });
  }
  /* a faint gallery-glass sheen crosses each print once, just after it lands */
  function glint() {
    if (still.matches || !sheen || !sheen.animate) return;
    sheen.animate([{ transform: "translateX(-55%)", opacity: 0 }, { opacity: 1, offset: .2 }, { opacity: 1, offset: .8 }, { transform: "translateX(55%)", opacity: 0 }],
                  { duration: 1800, delay: 900, easing: "cubic-bezier(.45,0,.25,1)" });
  }

  /* depth: a tiny copy of the painting, scaled up and blurred in CSS, crossfades behind it */
  function backdrop(im) {
    if (!back) return;
    var c = document.createElement("canvas");
    c.width = 96; c.height = Math.max(1, Math.round(96 * im.naturalHeight / im.naturalWidth));
    try { c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); } catch (e) { return; }
    var old = back.querySelectorAll("canvas");
    back.appendChild(c);
    void c.offsetWidth;
    c.classList.add("is-on");
    setTimeout(function () { old.forEach(function (o) { if (o.parentNode) o.parentNode.removeChild(o); }); }, still.matches ? 0 : FADE_MS + 100);
  }

  function show(p) {
    return load(p).then(function (im) {
      if (!calm(p, im)) { p.img = null; throw new Error("not calm"); }
      var t = paletteFor(p, im);
      im.className = "";
      drift(im);
      art.appendChild(im);                       /* newest sits on top and fades in over the old one */
      backdrop(im);
      void im.offsetWidth;
      im.classList.add("is-on");
      var old = front, oldP = current;
      front = im;
      current = p;
      if (old && old !== im) {
        old.classList.add("out");                /* rack focus: the outgoing print softens as the new one lands */
        squeeze();
        setTimeout(function () {
          if (old !== front && old.parentNode) old.parentNode.removeChild(old);
          if (oldP && !oldP.fallback) oldP.img = null;   /* an endless stream shouldn't keep every image in memory */
        }, still.matches ? 0 : FADE_MS + 100);
      }
      glint();
      credit(p);
      retint(t);
    });
  }

  /* show the next painting; skip any that fail to load or fail the calm check */
  function advance(misses) {
    misses = misses || 0;
    next().then(function (p) {
      return show(p).then(function () { if (queue[0]) load(queue[0]).catch(function () {}); topUp(); schedule(); },
        function () { if (misses < 8) advance(misses + 1); else { queue = standIns().concat(queue); advance(0); } });
    });
  }

  /* The thin gold line is the clock: it fills once per painting and the
     next painting comes in when it finishes, so pausing one pauses both. */
  function stopClock() {
    if (run) { run.onfinish = null; run.cancel(); run = null; }
    if (fill && fill.getAnimations) fill.getAnimations().forEach(function (a) { a.cancel(); });   /* finished lines would otherwise pile up over an endless visit */
  }
  function schedule() {
    stopClock();
    if (opening || still.matches || !fill || !fill.animate) return;   /* the clock starts when the opening lifts */
    run = fill.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: ROTATE_MS, easing: "linear", fill: "forwards" });
    run.onfinish = function () { run = null; advance(); };
    if (document.hidden || held) run.pause();
  }
  function hold(on) { held = on; if (run) { if (on) run.pause(); else if (!document.hidden) run.play(); } }

  function credit(p) {
    creditEl.textContent = "";
    var t = document.createElement(p.href ? "a" : "span");
    if (p.href) { t.href = p.href; t.target = "_blank"; t.rel = "noopener"; }
    t.textContent = p.title;
    creditEl.appendChild(t);
    creditEl.appendChild(document.createTextNode((p.date ? ", " + p.date : "") + "\u00a0· " + p.artist));
  }

  /* hold while the visitor is on the credit (not the whole band: a cursor
     resting over the painting shouldn't freeze it) */
  var meta = band.querySelector(".horizon-meta");
  meta.addEventListener("pointerenter", function () { hold(true); });
  meta.addEventListener("pointerleave", function () { hold(false); });
  meta.addEventListener("focusin", function () { hold(true); });
  meta.addEventListener("focusout", function (e) { if (!meta.contains(e.relatedTarget)) hold(false); });
  document.addEventListener("visibilitychange", function () { if (!run) return; if (document.hidden) run.pause(); else if (!held) run.play(); });
  (still.addEventListener ? still.addEventListener.bind(still, "change") : still.addListener.bind(still))(schedule);

  /* When the opening plays (cinema.js), the first painting is The Hay Wain: the
     opening paints it stroke by stroke and resolves into this real one. The
     loaded image is handed over through a promise, and the 8s clock waits for
     the opening to lift. */
  var opening = root.classList.contains("opening-on");
  var started = false;
  if (opening) {
    var hay = standIns().filter(function (q) { return q.key === "wm:0"; })[0];
    window.joeyOpening = load(hay).then(function (im) { return { img: im, sampled: !!hay.cors }; });
    window.joeyOpening.catch(function () {});
    queue.unshift(hay);
    started = true;
    advance();
    document.addEventListener("joey:opened", function () { opening = false; if (current) schedule(); }, { once: true });
  }

  /* first painting otherwise: ask every source at once and take a random one
     from whichever answers first; stand-ins if none answers within 2.5s */
  function begin() { if (started) return; started = true; advance(); }
  SOURCES.forEach(function (src, k) {
    src().then(function (list) { if (enqueue(list)) begin(); }, function () { strikes[k]++; });
  });
  setTimeout(function () { if (!started) { if (!queue.length) queue = standIns(); begin(); } }, API_WAIT_MS);
})();
