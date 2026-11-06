(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var motionOn = !reduceMotion;
  var hasGsap = typeof window.gsap !== "undefined";
  var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  var root = document.documentElement;

  if (!isMac) document.querySelectorAll("[data-mod]").forEach(function (k) { k.textContent = "Ctrl K"; });

  /* ------------------------------------------------------------------ socials
     Add a URL to show an icon. Icon paths: simple-icons (CC0). */
  var SOCIALS = [
    { id: "github", label: "GitHub", url: "https://github.com/Joeysuh",
      path: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" },
    { id: "linkedin", label: "LinkedIn", url: "", path: "" },
    { id: "x", label: "X", url: "",
      path: "M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z" },
    { id: "email", label: "Email", url: "",
      path: "M2 5h20v14H2zM3.5 6.5v.3l8.5 6 8.5-6v-.3zM20.5 8.6l-8.5 6-8.5-6v8.9h17z" }
  ];
  var liveSocials = SOCIALS.filter(function (s) { return s.url && s.path; });
  var socialList = document.querySelector("[data-socials]");
  liveSocials.forEach(function (s) {
    var li = document.createElement("li");
    li.innerHTML = '<a href="' + s.url + '" aria-label="' + s.label + '" title="' + s.label + '"' +
      (s.url.indexOf("mailto:") === 0 ? "" : ' rel="me noopener"') + '><svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + s.path + '"/></svg></a>';
    if (socialList) socialList.appendChild(li);
  });

  /* ---------------------------------------------------------- status strip */
  var clock = document.getElementById("clock");
  var fmt;
  try {
    fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  } catch (e) { fmt = null; }
  function tick() { if (clock && fmt) clock.textContent = fmt.format(new Date()); }
  tick(); setInterval(tick, 1000);

  var fpsOut = document.getElementById("fps");
  if (fpsOut) {
    var frames = 0, last = performance.now();
    (function loop(now) {
      frames++;
      if (now - last >= 1000) { fpsOut.textContent = String(Math.round(frames * 1000 / (now - last))); frames = 0; last = now; }
      requestAnimationFrame(loop);
    })(last);
  }

  /* --------------------------------------------------------- smooth scroll */
  var lenis = null;
  if (motionOn && hasGsap && typeof window.Lenis !== "undefined") {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  function scrollToEl(el) {
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: -72 });
    else el.scrollIntoView({ behavior: motionOn ? "smooth" : "auto", block: "start" });
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute("href").slice(1);
    var el = id ? document.getElementById(id) : null;
    if (!el) return;
    e.preventDefault();
    scrollToEl(el);
    if (id === "main") window.scrollTo(0, 0);
  });

  /* ----------------------------------------------------------------- theme */
  var mq = window.matchMedia("(prefers-color-scheme: dark)");
  function applyTheme(choice) {
    var dark = choice === "dark" || (choice === "system" && mq.matches);
    root.setAttribute("data-theme", dark ? "dark" : "light");
    root.setAttribute("data-theme-choice", choice);
    try { localStorage.setItem("theme", choice); } catch (e) {}
    document.querySelectorAll("[data-theme-set]").forEach(function (b) {
      b.setAttribute("aria-checked", String(b.getAttribute("data-theme-set") === choice));
    });
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#1e1e1e" : "#f4f4f2");
    swapPreviewTheme();
  }
  function currentChoice() { return root.getAttribute("data-theme-choice") || "system"; }
  mq.addEventListener && mq.addEventListener("change", function () { if (currentChoice() === "system") applyTheme("system"); });
  document.querySelectorAll("[data-theme-set]").forEach(function (b) {
    b.addEventListener("click", function () { applyTheme(b.getAttribute("data-theme-set")); });
  });

  /* ------------------------------------------------------------- work list */
  function setItem(item, open) {
    var head = item.querySelector(".item-head");
    var body = item.querySelector(".item-body");
    item.classList.toggle("open", open);
    head.setAttribute("aria-expanded", String(open));
    if (hasGsap && motionOn) gsap.to(body, { height: open ? "auto" : 0, duration: 0.4, ease: "power2.inOut", overwrite: true });
    else body.style.height = open ? "auto" : "0px";
  }
  document.querySelectorAll(".item").forEach(function (item) {
    item.querySelector(".item-head").addEventListener("click", function () { setItem(item, !item.classList.contains("open")); });
  });

  /* preview image follows the pointer (mouse and trackpad only) */
  var preview = document.querySelector(".preview");
  var previewImg = preview && preview.querySelector("img");
  var currentPreview = null;
  function previewSrc(name) { return "img/proj-" + name + "-" + (root.getAttribute("data-theme") === "dark" ? "dark" : "light") + ".png"; }
  function swapPreviewTheme() { if (currentPreview && previewImg) previewImg.src = previewSrc(currentPreview); }
  if (preview && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    var xTo, yTo;
    if (hasGsap) {
      xTo = gsap.quickTo(preview, "x", { duration: motionOn ? 0.45 : 0, ease: "power3" });
      yTo = gsap.quickTo(preview, "y", { duration: motionOn ? 0.45 : 0, ease: "power3" });
    }
    var placed = false;
    document.querySelectorAll("[data-preview]").forEach(function (li) {
      var head = li.querySelector(".item-head");
      head.addEventListener("pointerenter", function (e) {
        currentPreview = li.getAttribute("data-preview");
        previewImg.src = previewSrc(currentPreview);
        if (!placed && hasGsap) { gsap.set(preview, { x: e.clientX + 140, y: e.clientY }); placed = true; }
        preview.classList.add("on");
      });
      head.addEventListener("pointerleave", function () { preview.classList.remove("on"); });
      head.addEventListener("pointermove", function (e) {
        var x = e.clientX + 140, y = e.clientY;
        if (xTo) { xTo(x); yTo(y); } else { preview.style.transform = "translate(" + (x - 104) + "px," + (y - 104) + "px)"; }
      });
    });
  }

  /* -------------------------------------------------- lab: CAN name decoder
     1 = the two lines sit together (recessive), 0 = they split apart (dominant). */
  (function initScope() {
    var screen = document.getElementById("scope");
    var byteEls = Array.prototype.slice.call(document.querySelectorAll(".byte"));
    if (!screen || !byteEls.length) return;
    var NS = "http://www.w3.org/2000/svg";
    var bits = [];
    byteEls.forEach(function (el) { el.getAttribute("data-bits").split("").forEach(function (b) { bits.push(Number(b)); }); });
    var n = bits.length;
    function make(tag, attrs) { var el = document.createElementNS(NS, tag); for (var k in attrs) el.setAttribute(k, attrs[k]); return el; }
    var svg = make("svg", { "aria-hidden": "true", focusable: "false" });
    var bands = byteEls.map(function () { return make("rect", { "class": "band" }); });
    var low = make("path", { "class": "trace trace-low", pathLength: "1" });
    var high = make("path", { "class": "trace trace-high", pathLength: "1" });
    bands.forEach(function (b) { svg.appendChild(b); });
    svg.appendChild(low); svg.appendChild(high);
    while (screen.firstChild) screen.removeChild(screen.firstChild);
    screen.appendChild(svg);

    function layout() {
      var W = screen.clientWidth, H = screen.clientHeight;
      if (!W || !H) return;
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      var w = W / n, edge = Math.min(w * 0.22, 6), mid = H / 2, rec = H * 0.03, dom = H * 0.24;
      function level(bit, hi) { return mid + (hi ? -1 : 1) * (bit ? rec : dom); }
      function trace(hi) {
        var d = "M0 " + level(bits[0], hi);
        bits.forEach(function (bit, i) {
          var y = level(bit, hi);
          d += " L" + (i * w + edge).toFixed(1) + " " + y + " L" + ((i + 1) * w - edge).toFixed(1) + " " + y;
        });
        return d + " L" + W + " " + level(bits[n - 1], hi);
      }
      high.setAttribute("d", trace(true));
      low.setAttribute("d", trace(false));
      var bw = W / byteEls.length;
      bands.forEach(function (band, i) {
        band.setAttribute("x", (i * bw).toFixed(1)); band.setAttribute("y", 0);
        band.setAttribute("width", bw.toFixed(1)); band.setAttribute("height", H);
      });
    }
    var state = byteEls.map(function () { return { hover: false, focus: false }; });
    function refresh(i) {
      var pressed = byteEls[i].getAttribute("aria-pressed") === "true";
      bands[i].classList.toggle("on", state[i].hover || state[i].focus || pressed);
    }
    byteEls.forEach(function (el, i) {
      el.addEventListener("pointerenter", function () { state[i].hover = true; refresh(i); });
      el.addEventListener("pointerleave", function () { state[i].hover = false; refresh(i); });
      el.addEventListener("focus", function () { state[i].focus = true; refresh(i); });
      el.addEventListener("blur", function () { state[i].focus = false; refresh(i); });
      el.addEventListener("click", function () {
        el.setAttribute("aria-pressed", String(el.getAttribute("aria-pressed") !== "true"));
        refresh(i);
      });
    });
    layout();
    if (window.ResizeObserver) new ResizeObserver(layout).observe(screen);

    /* sweep once when the lab scrolls into view. The dash offset is set as an
       attribute from a proxy because GSAP's CSS plugin rounds px lengths. */
    if (!hasGsap || !motionOn || !window.IntersectionObserver) return;
    [high, low].forEach(function (p) { p.setAttribute("stroke-dasharray", "1"); p.setAttribute("stroke-dashoffset", "1"); });
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      var tl = gsap.timeline();
      [[high, 0], [low, 0.1]].forEach(function (pair) {
        var path = pair[0], p = { v: 0 };
        tl.to(p, { v: 1, duration: 1.4, ease: "none",
          onUpdate: function () { path.setAttribute("stroke-dashoffset", String(1 - p.v)); },
          onComplete: function () { path.removeAttribute("stroke-dasharray"); path.removeAttribute("stroke-dashoffset"); } }, pair[1]);
      });
    }, { threshold: 0.5 });
    io.observe(screen);
  })();

  /* ------------------------------------------------------- scripted answers
     Matches a question against what's on this site. Nothing leaves the browser. */
  function socialLinksHtml() {
    if (!liveSocials.length) return "";
    return "<ul>" + liveSocials.map(function (s) {
      return '<li><a href="' + s.url + '"' + (s.url.indexOf("mailto:") === 0 ? "" : ' rel="noopener"') + ">" + s.label + "</a></li>";
    }).join("") + "</ul>";
  }
  function openBtn(id, label) { return '<button type="button" data-open="' + id + '">' + label + "</button>"; }

  var KB = [
    { id: "hello", keys: ["hi", "hello", "hey", "yo", "sup"],
      a: function () { return "<p>Hi! Ask me about my projects, my internships, Tesla, or what I'm into.</p>"; } },
    { id: "who", keys: ["who", "about you", "yourself", "introduce", "joey", "background"],
      a: function () { return "<p>I'm Joey, a Computer Engineering student at the University of Waterloo, graduating in 2027, and currently at Tesla. I like work close to the hardware: firmware, real-time systems and hardware acceleration.</p>"; } },
    { id: "tesla", keys: ["tesla", "now", "currently", "current job", "right now", "these days"],
      a: function () { return "<p>I'm at Tesla right now.</p>"; } },
    { id: "school", keys: ["waterloo", "school", "university", "uni", "study", "degree", "graduate", "graduating", "major"],
      a: function () { return "<p>Computer Engineering at the University of Waterloo, class of 2027.</p>"; } },
    { id: "interests", keys: ["interested", "interests", "focus", "passion", "enjoy", "into"],
      a: function () { return "<p>Embedded systems, firmware and hardware acceleration. I like knowing exactly what the hardware is doing, from a scheduler on an STM32 to an RTL datapath.</p>"; } },
    { id: "projects", keys: ["projects", "project", "built", "build", "made", "portfolio", "work on", "working on"],
      a: function () { return "<p>A bare-metal RTOS, ALIVE (a biometric wearable), RTL for the BitWave accelerator, a 16-lane multi-precision dot-product unit and a pipelined FPGA matrix-vector multiplier.</p>" + openBtn("work", "Go to selected work"); } },
    { id: "rtos", keys: ["rtos", "scheduler", "edf", "earliest deadline", "kernel", "real-time", "realtime", "heap", "allocator", "bare-metal", "bare metal", "stm32"],
      a: function () { return "<p>A real-time kernel on an STM32F401RE with no vendor OS. It schedules by earliest deadline first and has its own heap allocator with free-block merging and magic-number corruption checks.</p>" + openBtn("w-rtos", "Open the RTOS"); } },
    { id: "alive", keys: ["alive", "capstone", "wearable", "biometric", "biometrics", "unreal", "ue5", "ppg", "pulse", "esp32", "sensor", "sensors", "imu"],
      a: function () { return "<p>ALIVE is my capstone: a wearable that drives an adaptive Unreal Engine 5 game. I own the biometric acquisition unit, an STM32F401RE plus ESP32 reading pulse, motion and skin response sensors through a fourth-order Butterworth band-pass filter.</p>" + openBtn("w-alive", "Open ALIVE"); } },
    { id: "bitwave", keys: ["bitwave", "accelerator", "sram", "cocotb", "ece 493", "ece493"],
      a: function () { return "<p>A team implementation of the BitWave accelerator paper. I own the RTL interface, memory and integration, with SRAM modules verified against a Python golden model in cocotb.</p>" + openBtn("w-bitwave", "Open BitWave"); } },
    { id: "dot", keys: ["dot product", "dot-product", "fp8", "fp16", "bf16", "tf32", "mxfp8", "precision", "floating point"],
      a: function () { return "<p>A 16-lane dot-product unit covering FP16, BF16, TF32, FP8, MXFP8 and UINT8, checked bit for bit against a Python replica.</p>" + openBtn("w-dot", "Open the dot-product unit"); } },
    { id: "fpga", keys: ["fpga", "matrix", "vector", "multiplier", "pipelined"],
      a: function () { return "<p>A pipelined matrix-vector multiplier with eight parallel lanes in SystemVerilog.</p>" + openBtn("w-fpga", "Open the FPGA project"); } },
    { id: "experience", keys: ["experience", "internship", "internships", "intern", "interned", "job", "jobs", "worked", "companies", "co-op", "coop"],
      a: function () { return "<ul><li><b>Tesla:</b> current</li><li><b>Harbinger Motors:</b> OTA firmware validation, DoCAN and DoIP diagnostics, MACsec, TCU</li><li><b>Ford:</b> multi-threaded ECU simulation, deadlock debugging, CAN and DoIP</li><li><b>Waterloo FSAE:</b> HIL and SIL bring-up, BMU firmware</li></ul>" + openBtn("experience", "Go to experience"); } },
    { id: "harbinger", keys: ["harbinger", "ota", "over-the-air", "over the air", "macsec", "tcu", "doip", "docan"],
      a: function () { return "<p>At Harbinger Motors I validated over-the-air firmware updates and worked on DoCAN and DoIP diagnostics, MACsec and the TCU.</p>"; } },
    { id: "ford", keys: ["ford", "ecu", "simulation", "deadlock", "deadlocks", "multithreaded", "multi-threaded"],
      a: function () { return "<p>At Ford I worked on a multi-threaded ECU simulation, with plenty of deadlock debugging, plus CAN and DoIP diagnostics.</p>"; } },
    { id: "fsae", keys: ["fsae", "formula", "racing", "race car", "bmu", "battery", "hil", "sil"],
      a: function () { return "<p>On Waterloo FSAE I work on hardware-in-the-loop and software-in-the-loop test setups and battery management unit firmware.</p>"; } },
    { id: "skills", keys: ["skills", "languages", "language", "stack", "tools", "c++", "python", "systemverilog", "verilog", "rtl"],
      a: function () { return "<ul><li><b>Languages:</b> C, C++, Python, SystemVerilog</li><li><b>Embedded:</b> STM32, ESP32, RTOS, bare-metal</li><li><b>Automotive:</b> CAN, DoCAN, DoIP, MACsec</li><li><b>Hardware:</b> RTL, FPGA, cocotb</li></ul>"; } },
    { id: "can", keys: ["can bus", "canbus", "automotive", "diagnostics", "decoder"],
      a: function () { return "<p>CAN keeps coming up in my work. The lab section has my name sent as ASCII on a CAN bus.</p>" + openBtn("lab", "Go to the lab"); } },
    { id: "contact", keys: ["contact", "reach", "email", "mail", "linkedin", "twitter", "github", "socials", "social", "hire", "hiring", "resume", "cv", "connect", "dm"],
      a: function () { var l = socialLinksHtml(); return l ? "<p>You can find me here:</p>" + l : "<p>Links are coming soon.</p>"; } },
    { id: "site", keys: ["this site", "website", "site", "chatbot", "bot", "ai", "built this"],
      a: function () { return "<p>Hand-written HTML, CSS and JavaScript on GitHub Pages, with GSAP and Lenis for motion. These answers are scripted from what's on the site, so nothing you type leaves your browser.</p>"; } },
    { id: "thanks", keys: ["thanks", "thank you", "ty", "cool", "nice"],
      a: function () { return "<p>Thanks for stopping by!</p>"; } }
  ];
  function normalize(s) {
    return " " + s.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9+#.\- ]+/g, " ").replace(/\s+/g, " ").trim() + " ";
  }
  function answerFor(q) {
    var text = normalize(q), best = null, bestScore = 0;
    KB.forEach(function (entry) {
      var score = 0;
      entry.keys.forEach(function (k) {
        if (text.indexOf(" " + k + " ") !== -1 || (k.indexOf(" ") !== -1 && text.indexOf(k) !== -1)) {
          score += k.indexOf(" ") !== -1 ? 3 : (k.length <= 2 ? 0.5 : 1.5);
        }
      });
      if (entry.id === "hello" && score > 0) score = 0.6;
      if (score > bestScore) { bestScore = score; best = entry; }
    });
    if (best && bestScore >= 0.5) return best.a();
    return "<p>I don't have an answer for that one. Try asking about my projects, internships, Tesla, skills or how to reach me.</p>";
  }

  /* ------------------------------------------------------- command palette */
  var palette = document.getElementById("palette");
  var input = document.getElementById("pal-input");
  var list = document.getElementById("pal-list");
  var answerBox = palette.querySelector(".pal-answer");
  var lastFocus = null, results = [], sel = 0;

  function go(id) {
    closePalette();
    var el = document.getElementById(id);
    if (!el) return;
    if (el.classList.contains("item")) { setItem(el, true); scrollToEl(el); }
    else scrollToEl(el);
  }
  var COMMANDS = [
    { group: "Go to", label: "Selected work", hint: "work", run: function () { go("work"); } },
    { group: "Go to", label: "Experience", hint: "tesla, ford", run: function () { go("experience"); } },
    { group: "Go to", label: "Lab", hint: "can decoder", run: function () { go("lab"); } },
    { group: "Go to", label: "About", hint: "skills", run: function () { go("about"); } },
    { group: "Projects", label: "Bare-metal RTOS", hint: "stm32", run: function () { go("w-rtos"); } },
    { group: "Projects", label: "ALIVE", hint: "capstone", run: function () { go("w-alive"); } },
    { group: "Projects", label: "BitWave accelerator", hint: "rtl", run: function () { go("w-bitwave"); } },
    { group: "Projects", label: "Multi-precision dot product", hint: "fp8", run: function () { go("w-dot"); } },
    { group: "Projects", label: "FPGA matrix-vector multiplier", hint: "fpga", run: function () { go("w-fpga"); } },
    { group: "Theme", label: "Light theme", hint: "theme", run: function () { applyTheme("light"); closePalette(); } },
    { group: "Theme", label: "Dark theme", hint: "theme", run: function () { applyTheme("dark"); closePalette(); } },
    { group: "Theme", label: "System theme", hint: "theme", run: function () { applyTheme("system"); closePalette(); } }
  ];
  liveSocials.forEach(function (s) {
    COMMANDS.push({ group: "Links", label: "Open " + s.label, hint: "link", run: function () { closePalette(); window.open(s.url, "_blank", "noopener"); } });
  });
  var SUGGESTED = ["What are you doing at Tesla?", "Tell me about the RTOS", "Where have you interned?", "What languages do you use?", "How can I reach you?"];

  function render() {
    var q = input.value.trim().toLowerCase();
    results = [];
    var matched = COMMANDS.filter(function (c) {
      return !q || (c.label + " " + c.hint + " " + c.group).toLowerCase().indexOf(q) !== -1;
    });
    if (q) results.push({ group: "Ask", label: "Ask: " + input.value.trim(), hint: "answer", run: function () { showAnswer(input.value.trim()); } });
    else SUGGESTED.forEach(function (s) { results.push({ group: "Ask", label: s, hint: "answer", run: function () { showAnswer(s); } }); });
    results = q && matched.length ? matched.concat(results) : results.concat(matched);
    sel = 0;
    list.innerHTML = "";
    var group = null;
    results.forEach(function (r, i) {
      if (r.group !== group) {
        group = r.group;
        var g = document.createElement("li");
        g.className = "pal-group"; g.setAttribute("role", "presentation"); g.textContent = group;
        list.appendChild(g);
      }
      var li = document.createElement("li");
      li.className = "pal-item"; li.id = "pal-opt-" + i; li.setAttribute("role", "option");
      li.innerHTML = "<span></span><small></small>";
      li.firstChild.textContent = r.label; li.lastChild.textContent = r.hint;
      li.addEventListener("click", function () { r.run(); });
      li.addEventListener("pointermove", function () { if (sel !== i) { sel = i; mark(); } });
      list.appendChild(li);
    });
    mark();
  }
  function mark() {
    list.querySelectorAll(".pal-item").forEach(function (li, i) { li.setAttribute("aria-selected", String(i === sel)); });
    var cur = document.getElementById("pal-opt-" + sel);
    if (cur) { input.setAttribute("aria-activedescendant", cur.id); cur.scrollIntoView({ block: "nearest" }); }
  }
  function showAnswer(q) {
    if (!q) return;
    answerBox.innerHTML = '<p class="q"></p>' + answerFor(q);
    answerBox.querySelector(".q").textContent = "> " + q;
    answerBox.hidden = false;
    list.hidden = true;
    input.value = "";
    input.placeholder = "Ask something else";
    input.focus();
  }
  answerBox.addEventListener("click", function (e) {
    var b = e.target.closest("[data-open]");
    if (b) go(b.getAttribute("data-open"));
  });
  input.addEventListener("input", function () {
    if (!answerBox.hidden) { answerBox.hidden = true; list.hidden = false; }
    render();
  });
  input.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") { e.preventDefault(); if (!list.hidden && results.length) { sel = (sel + 1) % results.length; mark(); } }
    else if (e.key === "ArrowUp") { e.preventDefault(); if (!list.hidden && results.length) { sel = (sel - 1 + results.length) % results.length; mark(); } }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (!list.hidden && results[sel]) results[sel].run();
      else if (input.value.trim()) showAnswer(input.value.trim());
    }
  });
  function openPalette() {
    if (!palette.hidden) return;
    lastFocus = document.activeElement;
    palette.hidden = false;
    answerBox.hidden = true; list.hidden = false;
    input.value = ""; input.placeholder = "Type a command or ask a question";
    render();
    if (lenis) lenis.stop();
    input.focus();
    if (hasGsap && motionOn) gsap.fromTo(palette.querySelector(".palette-box"), { opacity: 0, y: -8, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.18, ease: "power2.out" });
  }
  function closePalette() {
    if (palette.hidden) return;
    palette.hidden = true;
    if (lenis) lenis.start();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.querySelectorAll("[data-palette]").forEach(function (b) { b.addEventListener("click", openPalette); });
  palette.addEventListener("click", function (e) { if (e.target === palette) closePalette(); });
  document.addEventListener("keydown", function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); palette.hidden ? openPalette() : closePalette(); }
    else if (e.key === "Escape" && !palette.hidden) closePalette();
    else if (e.key === "/" && palette.hidden && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); openPalette(); }
  });
  palette.addEventListener("keydown", function (e) {
    if (e.key !== "Tab") return;          /* keep focus inside the dialog */
    var f = palette.querySelectorAll("input, button, a[href]");
    if (!f.length) return;
    var first = f[0], lastEl = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
    else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
  });

  /* ------------------------------------------------- nav highlights section */
  if (window.IntersectionObserver) {
    var navLinks = document.querySelectorAll('.top nav a[href^="#"]');
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (a) { a.setAttribute("aria-current", String(a.getAttribute("href") === "#" + en.target.id)); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    ["work", "experience", "lab", "about"].forEach(function (id) { var el = document.getElementById(id); if (el) spy.observe(el); });
  }

  applyTheme(currentChoice());
})();
