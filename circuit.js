(function () {
  "use strict";

  /* Draw a loop, it becomes a track, a top-down F1 car laps it.
     Speed comes from a small quasi-steady-state lap sim: each point's speed is
     capped by lateral grip in the corner, then by how hard the car can
     accelerate out of the previous corner and brake into the next one. */

  var NAVY = "#1b2547", BG = "#f3ecdc";
  var TRACK_W = 18;            /* px, edge to edge */
  var CAR_SCALE = 1.2;
  var M_PER_PX = 1.6;          /* scale: a screen-wide sketch comes out at F1 length */
  var VMAX = 92;               /* m/s, about 330 km/h */
  var ALAT = 42;               /* m/s^2 lateral grip, about 4.3 g */
  var ACC = 11;                /* m/s^2 traction-limited acceleration */
  var BRK = 40;                /* m/s^2 braking */
  var VISUAL_LAP_S = 7;        /* a lap plays back in about this many seconds */

  var canvas = document.querySelector(".pad");
  var ctx = canvas.getContext("2d");
  var readout = document.querySelector("[data-readout]");
  var clearBtn = document.querySelector(".clear");
  var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var raw = null;        /* points while drawing */
  var track = null;      /* { pts, path, dsM, v, lenM, lap, timeScale } */
  var s = 0;             /* metres along the lap */
  var last = 0, raf = 0;

  /* ------------------------------------------------------------ geometry */
  function dist(a, b) { return Math.hypot(b.x - a.x, b.y - a.y); }

  function resampleClosed(pts, d) {
    var src = pts.concat([pts[0]]), out = [src[0]], a = src[0], carry = 0;
    for (var i = 1; i < src.length; i++) {
      var b = src[i], seg = dist(a, b);
      while (carry + seg >= d && seg > 0) {
        var t = (d - carry) / seg;
        a = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
        out.push(a); seg = dist(a, b); carry = 0;
      }
      carry += seg; a = b;
    }
    if (out.length > 2 && dist(out[out.length - 1], out[0]) < d * 0.5) out.pop();
    return out;
  }

  function smoothClosed(pts, radius, passes) {
    var n = pts.length;
    for (var k = 0; k < passes; k++) {
      var next = new Array(n);
      for (var i = 0; i < n; i++) {
        var sx = 0, sy = 0;
        for (var j = -radius; j <= radius; j++) { var p = pts[(i + j + n) % n]; sx += p.x; sy += p.y; }
        next[i] = { x: sx / (2 * radius + 1), y: sy / (2 * radius + 1) };
      }
      pts = next;
    }
    return pts;
  }

  function wrap(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }

  /* Hand-drawn loops overshoot or start with a tail. Cut the stroke where its
     beginning and end pass closest to each other, so the lap closes cleanly. */
  function trimClosure(pts) {
    var n = pts.length, k = Math.max(3, Math.floor(n * 0.15)), best = Infinity, bi = 0, bj = n - 1;
    for (var i = 0; i < k; i++) for (var j = n - k; j < n; j++) {
      var d = dist(pts[i], pts[j]);
      if (d >= best) continue;
      /* the closing step has to keep going forward, or an overshoot leaves a kink */
      var tx = pts[i + 1].x - pts[i].x, ty = pts[i + 1].y - pts[i].y;
      if (d > 1 && (pts[i].x - pts[j].x) * tx + (pts[i].y - pts[j].y) * ty < 0) continue;
      best = d; bi = i; bj = j;
    }
    return best < 48 ? pts.slice(bi, bj + 1) : pts;
  }

  /* ------------------------------------------------------------- lap sim */
  function build(points) {
    var DS = 2;
    var pts = resampleClosed(trimClosure(resampleClosed(points, 4)), 4);
    pts = smoothClosed(pts, 3, 6);
    pts = resampleClosed(pts, DS);
    var n = pts.length;
    if (n < 40) return null;

    var head = new Array(n), kap = new Array(n), v = new Array(n), i, j;
    for (i = 0; i < n; i++) {
      var a = pts[(i - 2 + n) % n], b = pts[(i + 2) % n];
      head[i] = Math.atan2(b.y - a.y, b.x - a.x);
    }
    for (i = 0; i < n; i++) kap[i] = Math.abs(wrap(head[(i + 1) % n] - head[i])) / (DS * M_PER_PX);
    var ks = kap.slice();                                   /* light smoothing of curvature */
    for (i = 0; i < n; i++) { var sum = 0; for (j = -3; j <= 3; j++) sum += kap[(i + j + n) % n]; ks[i] = sum / 7; }
    for (i = 0; i < n; i++) v[i] = Math.min(VMAX, Math.sqrt(ALAT / Math.max(ks[i], 1e-6)));

    var dsM = DS * M_PER_PX;
    for (var lap = 0; lap < 2; lap++) {
      for (i = 0; i < n; i++) { j = (i + 1) % n; v[j] = Math.min(v[j], Math.sqrt(v[i] * v[i] + 2 * ACC * dsM)); }
      for (i = n - 1; i >= 0; i--) { j = (i + 1) % n; v[i] = Math.min(v[i], Math.sqrt(v[j] * v[j] + 2 * BRK * dsM)); }
    }
    var t = 0;
    for (i = 0; i < n; i++) t += dsM / ((v[i] + v[(i + 1) % n]) / 2);

    var path = new Path2D();
    path.moveTo(pts[0].x, pts[0].y);
    for (i = 1; i < n; i++) path.lineTo(pts[i].x, pts[i].y);
    path.closePath();

    return { pts: pts, head: head, path: path, dsM: dsM, v: v, lenM: n * dsM, lap: t,
             timeScale: Math.max(1, t / VISUAL_LAP_S) };
  }

  function fmtLap(t) {
    var m = Math.floor(t / 60), sec = t - m * 60;
    return m + ":" + (sec < 10 ? "0" : "") + sec.toFixed(3);
  }

  /* ------------------------------------------------------------ drawing */
  function size() {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    render();
  }

  function drawCar(x, y, a) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(a); ctx.scale(CAR_SCALE, CAR_SCALE);
    ctx.fillStyle = NAVY; ctx.strokeStyle = NAVY; ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.fillRect(4.6, -6, 3.6, 2.3); ctx.fillRect(4.6, 3.7, 3.6, 2.3);       /* front tyres */
    ctx.fillRect(-9, -6.2, 4.4, 2.7); ctx.fillRect(-9, 3.5, 4.4, 2.7);       /* rear tyres */
    ctx.beginPath();                                                        /* chassis */
    ctx.moveTo(12, 0); ctx.lineTo(4, -1.4); ctx.lineTo(0, -2.9); ctx.lineTo(-7, -2.9); ctx.lineTo(-10, -1.6);
    ctx.lineTo(-10, 1.6); ctx.lineTo(-7, 2.9); ctx.lineTo(0, 2.9); ctx.lineTo(4, 1.4); ctx.closePath();
    ctx.fillStyle = BG; ctx.fill(); ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath();                                                        /* wings */
    ctx.moveTo(12.6, -5.4); ctx.lineTo(12.6, 5.4); ctx.moveTo(-11.6, -4.6); ctx.lineTo(-11.6, 4.6);
    ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(-1.6, 0, 1.15, 0, 2 * Math.PI); ctx.fillStyle = NAVY; ctx.fill(); /* helmet */
    ctx.restore();
  }

  function carAt(sM) {
    var n = track.pts.length, f = sM / track.dsM;
    f = isFinite(f) ? ((f % n) + n) % n : 0;              /* always a valid spot on the lap */
    var i = Math.floor(f) % n, t = f - Math.floor(f), k = (i + 1) % n;
    var p = track.pts[i], q = track.pts[k];
    return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t,
             a: track.head[i] + wrap(track.head[k] - track.head[i]) * t, i: i };
  }

  function render() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    if (track) {
      ctx.strokeStyle = NAVY; ctx.lineWidth = TRACK_W; ctx.stroke(track.path);
      ctx.strokeStyle = BG; ctx.lineWidth = TRACK_W - 2; ctx.stroke(track.path);
      var p0 = track.pts[0], h = track.head[0], nx = -Math.sin(h), ny = Math.cos(h), w = TRACK_W / 2 - 1;
      ctx.beginPath(); ctx.moveTo(p0.x - nx * w, p0.y - ny * w); ctx.lineTo(p0.x + nx * w, p0.y + ny * w);
      ctx.strokeStyle = NAVY; ctx.lineWidth = 2; ctx.lineCap = "butt"; ctx.stroke();       /* start / finish */
      var c = carAt(s);
      drawCar(c.x, c.y, c.a);
    }
    if (raw && raw.length > 1) {
      ctx.beginPath(); ctx.moveTo(raw[0].x, raw[0].y);
      for (var i = 1; i < raw.length; i++) ctx.lineTo(raw[i].x, raw[i].y);
      ctx.strokeStyle = NAVY; ctx.lineWidth = 1; ctx.stroke();
    }
  }

  /* ------------------------------------------------------------ the lap */
  function frame(now) {
    raf = 0;
    if (!track || raw) return;
    /* A frame's timestamp can be earlier than when a long track build finished,
       so dt can come out negative on the first frame. Never let time run backwards. */
    var dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = Math.max(last, now);
    var c = carAt(s);
    s = (s + track.v[c.i] * dt * track.timeScale) % track.lenM;
    render();
    raf = requestAnimationFrame(frame);
  }
  function go() {
    if (still || raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

  /* --------------------------------------------------------------- input */
  function pt(e) { return { x: e.clientX, y: e.clientY }; }

  canvas.addEventListener("pointerdown", function (e) {
    if (e.button !== 0) return;
    canvas.setPointerCapture(e.pointerId);
    stop();
    raw = [pt(e)];
    render();
  });
  canvas.addEventListener("pointermove", function (e) {
    if (!raw) return;
    var p = pt(e);
    if (dist(p, raw[raw.length - 1]) >= 2) { raw.push(p); render(); }
  });
  function finish() {
    if (!raw) return;
    var pts = raw; raw = null;
    var len = 0, minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < pts.length; i++) {
      if (i) len += dist(pts[i - 1], pts[i]);
      minX = Math.min(minX, pts[i].x); maxX = Math.max(maxX, pts[i].x);
      minY = Math.min(minY, pts[i].y); maxY = Math.max(maxY, pts[i].y);
    }
    var t = (len >= 240 && maxX - minX >= 60 && maxY - minY >= 60) ? build(pts) : null;
    if (!t) {
      readout.textContent = track ? readout.textContent : "Too small. Draw a bigger loop.";
      render(); if (track) go();
      return;
    }
    track = t; s = 0;
    readout.textContent = (track.lenM / 1000).toFixed(2) + " km · lap " + fmtLap(track.lap);
    clearBtn.hidden = false;
    render(); go();
  }
  canvas.addEventListener("pointerup", finish);
  canvas.addEventListener("pointercancel", finish);

  clearBtn.addEventListener("click", function () {
    stop(); track = null; raw = null; s = 0;
    readout.textContent = "Draw anywhere on the page.";
    clearBtn.hidden = true;
    render();
  });

  window.addEventListener("resize", size);
  size();
})();
