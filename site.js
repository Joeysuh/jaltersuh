(function () {
  "use strict";

  /* ------------------------------------------------------------------ socials
     Add a URL to show an icon. Entries without a URL stay hidden.
     Icon paths: simple-icons (CC0), https://simpleicons.org */
  var SOCIALS = [
    { id: "github", label: "GitHub", url: "https://github.com/Joeysuh",
      path: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" },
    { id: "linkedin", label: "LinkedIn", url: "", path: "" },
    { id: "x", label: "X (Twitter)", url: "",
      path: "M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z" },
    { id: "email", label: "Email", url: "",
      path: "M2 5h20v14H2zM3.5 6.5v.3l8.5 6 8.5-6v-.3zM20.5 8.6l-8.5 6-8.5-6v8.9h17z" }
  ];
  var liveSocials = SOCIALS.filter(function (s) { return s.url && s.path; });

  var socialList = document.querySelector("[data-socials]");
  if (socialList) {
    liveSocials.forEach(function (s) {
      var li = document.createElement("li");
      li.innerHTML = '<a href="' + s.url + '" aria-label="' + s.label + '" title="' + s.label + '"' +
        (s.url.indexOf("mailto:") === 0 ? "" : ' rel="me noopener"') + '>' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + s.path + '"/></svg></a>';
      socialList.appendChild(li);
    });
  }

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var motionOn = !reduceMotion;
  var hasGsap = typeof window.gsap !== "undefined";

  /* --------------------------------------------------------- smooth scroll */
  if (motionOn && hasGsap && typeof window.Lenis !== "undefined") {
    var lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* ------------------------------------------------------- project expand */
  function setProject(item, open) {
    var head = item.querySelector(".proj-head");
    var detail = item.querySelector(".detail");
    item.classList.toggle("open", open);
    head.setAttribute("aria-expanded", String(open));
    if (hasGsap && motionOn) {
      gsap.to(detail, { height: open ? "auto" : 0, duration: 0.45, ease: "power2.inOut", overwrite: true });
    } else {
      detail.style.height = open ? "auto" : "0px";
    }
  }
  document.querySelectorAll(".proj").forEach(function (item) {
    item.querySelector(".proj-head").addEventListener("click", function () {
      setProject(item, !item.classList.contains("open"));
    });
  });

  /* ------------------------------------------------------- panel switching */
  var panels = Array.prototype.slice.call(document.querySelectorAll("[data-panel]"));
  var scope = null;
  function showPanel(name) {
    panels.forEach(function (p) {
      var on = p.getAttribute("data-panel") === name;
      p.hidden = !on;
      if (on && hasGsap && motionOn) {
        gsap.fromTo(p, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power1.out", overwrite: true });
      }
    });
    window.scrollTo(0, 0);
    if (name === "about" && scope) scope.play();
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-goto]");
    if (!b) return;
    /* on a phone the chat covers the page, so close it before showing a panel */
    if (b.closest("#chat") && window.matchMedia("(max-width: 30rem)").matches) {
      var closeBtn = document.querySelector(".chat-close");
      if (closeBtn) closeBtn.click();
    }
    showPanel(b.getAttribute("data-goto"));
    var target = b.getAttribute("data-open");
    if (target) {
      var item = document.getElementById(target);
      if (item) { setProject(item, true); item.scrollIntoView({ block: "center" }); }
    }
  });

  /* ------------------------------------- about: name on a CAN bus (scope) */
  /* 1 = the two lines sit together (recessive), 0 = they split apart (dominant). */
  function initScope() {
    var screen = document.getElementById("scope");
    var byteEls = Array.prototype.slice.call(document.querySelectorAll(".byte"));
    if (!screen || !byteEls.length) return null;
    var NS = "http://www.w3.org/2000/svg";
    var bits = [];
    byteEls.forEach(function (el) {
      el.getAttribute("data-bits").split("").forEach(function (b) { bits.push(Number(b)); });
    });
    var n = bits.length;
    function make(tag, attrs) {
      var el = document.createElementNS(NS, tag);
      for (var k in attrs) el.setAttribute(k, attrs[k]);
      return el;
    }
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
      var w = W / n, edge = Math.min(w * 0.22, 8), mid = H / 2, rec = H * 0.03, dom = H * 0.24;
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

    var played = false;
    return {
      /* Sweep the trace left to right the first time About opens. The offset is set
         as an attribute from a proxy because GSAP's CSS plugin rounds px lengths. */
      play: function () {
        if (played || !hasGsap || !motionOn) return;
        played = true;
        layout();
        var sweep = 1.6, tl = gsap.timeline();
        [[high, 0.1], [low, 0.2]].forEach(function (pair) {
          var path = pair[0], p = { v: 0 };
          path.setAttribute("stroke-dasharray", "1");
          path.setAttribute("stroke-dashoffset", "1");
          tl.to(p, { v: 1, duration: sweep, ease: "none",
            onUpdate: function () { path.setAttribute("stroke-dashoffset", String(1 - p.v)); },
            onComplete: function () { path.removeAttribute("stroke-dasharray"); path.removeAttribute("stroke-dashoffset"); } }, pair[1]);
        });
      }
    };
  }
  scope = initScope();

  /* ------------------------------------------------------------------ chat
     A scripted helper. It matches questions against what's on this site and
     answers in Joey's voice. No network calls, nothing is sent anywhere. */
  function socialLinks() {
    if (!liveSocials.length) return "";
    return "<ul>" + liveSocials.map(function (s) {
      return '<li><a href="' + s.url + '"' + (s.url.indexOf("mailto:") === 0 ? "" : ' rel="noopener"') + ">" + s.label + "</a></li>";
    }).join("") + "</ul>";
  }
  function openProject(id, label) {
    return '<button type="button" class="chip" data-goto="projects" data-open="' + id + '">' + label + "</button>";
  }

  var KB = [
    { id: "hello", keys: ["hi", "hello", "hey", "yo", "sup", "hiya"],
      answer: function () { return "<p>Hi! I'm a small scripted version of Joey. Ask me about my projects, internships, or what I'm into.</p>"; } },
    { id: "who", keys: ["who", "about you", "yourself", "introduce", "joey", "background", "tell me about you"],
      answer: function () { return "<p>I'm Joey, a Computer Engineering student at the University of Waterloo, graduating in 2027. I like work close to the hardware: bare-metal firmware, real-time systems, and hardware acceleration.</p>"; } },
    { id: "school", keys: ["waterloo", "school", "university", "uni", "study", "studying", "degree", "graduate", "graduating", "year", "major"],
      answer: function () { return "<p>I study Computer Engineering at the University of Waterloo and graduate in 2027.</p>"; } },
    { id: "interests", keys: ["interested", "interest", "interests", "focus", "passion", "enjoy", "like doing", "into"],
      answer: function () { return "<p>Mostly embedded systems, firmware, and hardware acceleration. I like knowing exactly what the hardware is doing, whether that's a scheduler on an STM32 or an RTL datapath.</p>"; } },
    { id: "projects", keys: ["projects", "project", "built", "build", "made", "portfolio", "work on", "working on"],
      answer: function () {
        return "<p>A few things I've built:</p><ul><li>A bare-metal RTOS on an STM32F401RE</li><li>ALIVE, a biometric wearable for my capstone</li><li>RTL for the BitWave accelerator</li><li>A 16-lane multi-precision dot-product unit</li><li>A pipelined FPGA matrix-vector multiplier</li></ul><p>Ask about any of them, or open the list:</p>" +
          '<button type="button" class="chip" data-goto="projects">Open projects</button>';
      } },
    { id: "rtos", keys: ["rtos", "scheduler", "edf", "earliest deadline", "kernel", "real-time", "realtime", "heap", "allocator", "malloc", "bare-metal", "bare metal", "stm32"],
      answer: function () { return "<p>My RTOS runs on an STM32F401RE with no vendor OS. It schedules tasks by earliest deadline first and has its own heap allocator that merges adjacent free blocks and uses magic numbers to catch memory corruption.</p>" + openProject("proj-rtos", "Open the RTOS project"); } },
    { id: "alive", keys: ["alive", "capstone", "wearable", "biometric", "biometrics", "unreal", "ue5", "game", "ppg", "pulse", "heart", "esp32", "sensor", "sensors", "imu", "gsr"],
      answer: function () { return "<p>ALIVE is my capstone: a wearable that reads biometrics and drives an adaptive game in Unreal Engine 5. I own the biometric acquisition unit, an STM32F401RE with an ESP32 co-processor reading a MAX30102 pulse sensor, an MPU-6050 IMU and a skin response sensor, cleaned up by a fourth-order Butterworth band-pass filter.</p>" + openProject("proj-alive", "Open ALIVE"); } },
    { id: "bitwave", keys: ["bitwave", "accelerator", "sram", "cocotb", "ece 493", "ece493", "ml hardware", "machine learning hardware"],
      answer: function () { return "<p>BitWave is an ECE 493 team project where we implement the BitWave accelerator paper. I own the RTL interface, memory and integration, including single-port and banked SRAM modules in SystemVerilog, verified against a Python golden model with cocotb.</p>" + openProject("proj-bitwave", "Open BitWave"); } },
    { id: "dot", keys: ["dot product", "dot-product", "tensix", "fp8", "fp16", "bf16", "tf32", "mxfp8", "precision", "lanes", "floating point"],
      answer: function () { return "<p>A 16-lane dot-product unit that handles FP16, BF16, TF32, FP8, MXFP8 and UINT8. I built a Python replica of the reference behavior first, then checked the RTL against test vectors until it matched bit for bit.</p>" + openProject("proj-dot", "Open the dot-product unit"); } },
    { id: "fpga", keys: ["fpga", "matrix", "vector", "multiplier", "pipelined", "pipeline", "systemverilog project"],
      answer: function () { return "<p>A pipelined matrix-vector multiplier with eight parallel lanes, written in SystemVerilog.</p>" + openProject("proj-fpga", "Open the FPGA project"); } },
    { id: "experience", keys: ["experience", "internship", "internships", "intern", "interned", "interning", "work experience", "job", "jobs", "worked", "companies", "co-op", "coop"],
      answer: function () {
        return "<ul><li><b>Harbinger Motors:</b> over-the-air firmware validation, DoCAN and DoIP diagnostics, MACsec and the TCU</li><li><b>Ford Motor Company:</b> a multi-threaded ECU simulation, deadlock debugging, CAN and DoIP diagnostics</li><li><b>UWaterloo FSAE:</b> hardware- and software-in-the-loop bring-up and BMU firmware</li></ul>" +
          '<button type="button" class="chip" data-goto="experience">Open experience</button>';
      } },
    { id: "harbinger", keys: ["harbinger", "ota", "over-the-air", "over the air", "macsec", "tcu", "doip", "docan"],
      answer: function () { return "<p>At Harbinger Motors I validated over-the-air firmware updates and worked on DoCAN and DoIP diagnostics, MACsec, and the TCU.</p>"; } },
    { id: "ford", keys: ["ford", "ecu", "simulation", "deadlock", "deadlocks", "multithreaded", "multi-threaded", "threads"],
      answer: function () { return "<p>At Ford I worked on a multi-threaded ECU simulation, which meant a fair amount of deadlock debugging, plus CAN and DoIP diagnostics.</p>"; } },
    { id: "fsae", keys: ["fsae", "formula", "racing", "race car", "car", "bmu", "battery", "hil", "sil", "hardware-in-the-loop", "team"],
      answer: function () { return "<p>On the Waterloo FSAE team I work on hardware-in-the-loop and software-in-the-loop test setups, and on firmware for the battery management unit.</p>"; } },
    { id: "skills", keys: ["skills", "languages", "language", "stack", "tools", "tech", "c++", "python", "systemverilog", "verilog", "rtl", "know"],
      answer: function () { return "<ul><li><b>Languages:</b> C, C++, Python, SystemVerilog</li><li><b>Embedded:</b> STM32, ESP32, RTOS, bare-metal firmware</li><li><b>Automotive:</b> CAN, DoCAN, DoIP, MACsec</li><li><b>Hardware:</b> RTL design, FPGA, cocotb verification</li></ul>"; } },
    { id: "can", keys: ["can bus", "canbus", "automotive", "diagnostics", "vehicle"],
      answer: function () { return "<p>Automotive networking keeps coming up for me: CAN, DoCAN, DoIP and MACsec at Harbinger and Ford. The trace on my About page is my name sent as ASCII on a CAN bus.</p>"; } },
    { id: "contact", keys: ["contact", "reach", "email", "mail", "linkedin", "twitter", "x", "github", "socials", "social", "hire", "hiring", "resume", "cv", "connect", "message", "dm"],
      answer: function () {
        var links = socialLinks();
        return links ? "<p>You can find me here:</p>" + links : "<p>Links are coming soon.</p>";
      } },
    { id: "site", keys: ["this site", "website", "site", "chatbot", "bot", "ai", "built this", "how was this made", "pictures", "images"],
      answer: function () { return "<p>This site is plain HTML, CSS and a little JavaScript on GitHub Pages. I'm a scripted helper that answers from what's on the site, so nothing you type leaves your browser. The banner is an impressionist painting of a poppy field, and the project pictures are generated and dithered like old engravings.</p>"; } },
    { id: "thanks", keys: ["thanks", "thank you", "ty", "cool", "nice", "awesome"],
      answer: function () { return "<p>Thanks for stopping by!</p>"; } }
  ];

  var STARTERS = ["What have you built?", "Tell me about the RTOS", "Where have you interned?", "What languages do you use?", "How can I reach you?"];

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
      if (entry.id === "hello" && score > 0) score = 0.6;   /* greetings lose to real questions */
      if (score > bestScore) { bestScore = score; best = entry; }
    });
    if (best && bestScore >= 0.5) return best.answer();
    return "<p>I don't have an answer for that one. I can talk about my projects, internships, skills, school, or how to reach me.</p>";
  }

  var openBtn = document.querySelector(".chat-open");
  var panel = document.getElementById("chat");
  if (!openBtn || !panel) return;
  var log = panel.querySelector(".chat-log");
  var chips = panel.querySelector(".chips");
  var form = panel.querySelector(".chat-form");
  var input = form.querySelector("input");
  var started = false;

  function add(html, who) {
    var div = document.createElement("div");
    div.className = "msg msg-" + who;
    if (who === "me") div.textContent = html; else div.innerHTML = html;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }
  function ask(q) {
    q = q.trim();
    if (!q) return;
    add(q, "me");
    chips.hidden = true;
    var typing = add("&hellip;", "bot");
    typing.classList.add("msg-typing");
    setTimeout(function () {
      typing.classList.remove("msg-typing");
      typing.innerHTML = answerFor(q);
      log.scrollTop = log.scrollHeight;
    }, motionOn ? 380 : 0);
  }
  function open() {
    panel.hidden = false;
    openBtn.setAttribute("aria-expanded", "true");
    if (!started) {
      started = true;
      add("<p>Hi, I'm Joey's site helper. Ask me anything about my work, or pick a question.</p>", "bot");
      STARTERS.forEach(function (s) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "chip"; b.textContent = s;
        b.addEventListener("click", function () { ask(s); });
        chips.appendChild(b);
      });
    }
    input.focus();
  }
  function close() {
    panel.hidden = true;
    openBtn.setAttribute("aria-expanded", "false");
    openBtn.focus();
  }
  openBtn.addEventListener("click", open);
  panel.querySelector(".chat-close").addEventListener("click", close);
  panel.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var q = input.value;
    input.value = "";
    ask(q);
  });
})();
