(function () {
  "use strict";

  /* Set this to the deployed chat worker URL (see chat-worker/README.md).
     While it's empty, the chat uses the scripted answers below. */
  var CHAT_ENDPOINT = "";

  /* ---------------------------------------------------------------- F1 car
     Laps the edge of the screen every 30s: along the bottom, up the right
     wall, across the top upside down, down the left wall. The path is a
     rounded rectangle, so it turns smoothly through the corners, and the car
     keeps its wheels on the outside edge. Off under reduced motion; frozen
     while the tab is hidden. */
  (function () {
    var car = document.querySelector(".car");
    var layer = document.querySelector(".drive");
    if (!car || !layer || !car.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!(window.CSS && CSS.supports && CSS.supports("offset-path", 'path("M0 0H1")'))) return;

    var LAP_MS = 30000, R = 44, E = 1;

    function lap() {
      var W = layer.clientWidth, H = layer.clientHeight, r = Math.min(R, W / 4, H / 4);
      function arc(x, y) { return "A" + r + " " + r + " 0 0 0 " + x + " " + y; }
      return 'path("M' + r + " " + (H - E) + "H" + (W - r) + arc(W - E, H - r) +
        "V" + r + arc(W - r, E) + "H" + r + arc(E, r) + "V" + (H - r) + arc(r, H - E) + 'Z")';
    }

    car.style.offsetPath = lap();
    car.style.visibility = "visible";
    var anim = car.animate([{ offsetDistance: "0%" }, { offsetDistance: "100%" }],
      { duration: LAP_MS, iterations: Infinity, easing: "linear" });

    var t = 0;
    window.addEventListener("resize", function () {
      clearTimeout(t);
      t = setTimeout(function () { car.style.offsetPath = lap(); }, 100);
    });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) anim.pause(); else anim.play();
    });
  })();

  /* ------------------------------------------------- row previews (tap / click)
     Wide screens show a row's preview on hover; everywhere a click or tap
     toggles it, one row at a time. Escape closes. */
  (function () {
    var rows = document.querySelectorAll(".list li[aria-describedby]");
    function closeAll(except) { rows.forEach(function (r) { if (r !== except) r.classList.remove("is-open"); }); }
    rows.forEach(function (r) {
      r.addEventListener("click", function () { var open = !r.classList.contains("is-open"); closeAll(r); r.classList.toggle("is-open", open); });
      r.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); r.click(); } });
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeAll(null); });
    document.addEventListener("click", function (e) { if (!e.target.closest || !e.target.closest(".list li")) closeAll(null); });
  })();

  /* ------------------------------------------------------------------ socials
     Icons: GitHub from simple-icons (CC0); LinkedIn and X from Font Awesome
     Free brands (CC BY 4.0, https://fontawesome.com/license/free). */
  var SOCIALS = [
    { id: "github", label: "GitHub", url: "https://github.com/Joeysuh", box: "0 0 24 24",
      path: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" },
    { id: "linkedin", label: "LinkedIn", url: "https://www.linkedin.com/in/joeysuh1/", box: "0 0 448 512",
      path: "M416 32L31.9 32C14.3 32 0 46.5 0 64.3L0 447.7C0 465.5 14.3 480 31.9 480L416 480c17.6 0 32-14.5 32-32.3l0-383.4C448 46.5 433.6 32 416 32zM135.4 416l-66.4 0 0-213.8 66.5 0 0 213.8-.1 0zM102.2 96a38.5 38.5 0 1 1 0 77 38.5 38.5 0 1 1 0-77zM384.3 416l-66.4 0 0-104c0-24.8-.5-56.7-34.5-56.7-34.6 0-39.9 27-39.9 54.9l0 105.8-66.4 0 0-213.8 63.7 0 0 29.2 .9 0c8.9-16.8 30.6-34.5 62.9-34.5 67.2 0 79.7 44.3 79.7 101.9l0 117.2z" },
    { id: "x", label: "X", url: "https://x.com/6JoeySuh", box: "0 0 448 512",
      path: "M357.2 48L427.8 48 273.6 224.2 455 464 313 464 201.7 318.6 74.5 464 3.8 464 168.7 275.5-5.2 48 140.4 48 240.9 180.9 357.2 48zM332.4 421.8l39.1 0-252.4-333.8-42 0 255.3 333.8z" }
  ];
  var list = document.querySelector("[data-socials]");
  SOCIALS.forEach(function (s) {
    var li = document.createElement("li");
    li.innerHTML = '<a href="' + s.url + '" aria-label="' + s.label + '" title="' + s.label + '" rel="me noopener"><svg viewBox="' + s.box + '" aria-hidden="true"><path d="' + s.path + '"/></svg></a>';
    list.appendChild(li);
  });

  /* ------------------------------------------------------- scripted answers
     Used when the AI endpoint isn't set or can't be reached. Plain text only. */
  var KB = [
    { keys: ["hi", "hello", "hey", "yo"], a: "Hi! Ask me about my projects, Tesla, internships or skills.", weak: true },
    { keys: ["who", "about you", "yourself", "joey", "introduce", "background"], a: "I'm Joey, a Computer Engineering student at Waterloo (class of 2027), currently at Tesla. I work close to the hardware: firmware, real-time systems and hardware acceleration." },
    { keys: ["tesla", "now", "currently", "right now"], a: "I'm at Tesla right now." },
    { keys: ["waterloo", "school", "university", "degree", "graduate", "graduating", "major", "study"], a: "Computer Engineering at the University of Waterloo, class of 2027." },
    { keys: ["projects", "project", "built", "build", "building", "made", "portfolio", "working on", "work on"], a: "A bare-metal RTOS, ALIVE (a biometric wearable), RTL for the BitWave accelerator, a 16-lane multi-precision dot-product unit and a pipelined FPGA matrix-vector multiplier." },
    { keys: ["rtos", "scheduler", "edf", "kernel", "real-time", "heap", "allocator", "bare-metal", "bare metal", "stm32"], a: "My RTOS runs on an STM32F401RE with no vendor OS. It schedules by earliest deadline first and has its own heap allocator with corruption checks." },
    { keys: ["alive", "capstone", "wearable", "biometric", "unreal", "ue5", "esp32", "sensor", "sensors"], a: "ALIVE is my capstone: a wearable that drives an adaptive Unreal Engine 5 game. I built the sensing unit, an STM32 and ESP32 reading pulse, motion and skin response." },
    { keys: ["bitwave", "accelerator", "sram", "cocotb", "ece 493"], a: "BitWave is a team build of an accelerator paper. I own memory and integration: SRAM in SystemVerilog, verified with cocotb against a Python model." },
    { keys: ["dot product", "fp8", "fp16", "bf16", "mxfp8", "precision"], a: "A 16-lane dot-product unit from FP16 down to MXFP8 and UINT8, bit-exact against a Python replica." },
    { keys: ["fpga", "matrix", "vector", "multiplier"], a: "A pipelined matrix-vector multiplier with eight parallel lanes in SystemVerilog." },
    { keys: ["experience", "internship", "internships", "intern", "interned", "worked", "jobs", "companies", "co-op"], a: "Tesla now. Before that, Harbinger Motors (OTA firmware, diagnostics, MACsec) and Ford (ECU simulation, CAN and DoIP). I also do BMU firmware for Waterloo FSAE." },
    { keys: ["harbinger", "ota", "macsec", "tcu", "doip", "docan"], a: "At Harbinger Motors I validated over-the-air firmware updates and worked on DoCAN and DoIP diagnostics, MACsec and the TCU." },
    { keys: ["ford", "ecu", "deadlock", "simulation"], a: "At Ford I worked on a multi-threaded ECU simulation, lots of deadlock debugging, plus CAN and DoIP diagnostics." },
    { keys: ["fsae", "formula", "racing", "bmu", "battery", "hil", "sil"], a: "On Waterloo FSAE I do hardware- and software-in-the-loop bring-up and battery management unit firmware." },
    { keys: ["skills", "languages", "language", "stack", "tools", "c++", "python", "systemverilog", "verilog", "rtl"], a: "C, C++, Python and SystemVerilog. STM32, ESP32, RTOS and bare-metal firmware. CAN, DoIP and MACsec. RTL, FPGA and cocotb." },
    { keys: ["contact", "reach", "email", "linkedin", "twitter", "github", "socials", "hire", "resume", "connect"], a: "LinkedIn: https://www.linkedin.com/in/joeysuh1/ · X: https://x.com/6JoeySuh · GitHub: https://github.com/Joeysuh" },
    { keys: ["thanks", "thank you", "cool", "nice"], a: "Thanks for stopping by!" }
  ];
  function scripted(q) {
    var text = " " + q.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9+#.\- ]+/g, " ").replace(/\s+/g, " ").trim() + " ";
    var best = null, bestScore = 0;
    KB.forEach(function (e) {
      var score = 0;
      e.keys.forEach(function (k) {
        if (text.indexOf(" " + k + " ") !== -1 || (k.indexOf(" ") !== -1 && text.indexOf(k) !== -1)) score += k.indexOf(" ") !== -1 ? 3 : 1.5;
      });
      if (e.weak && score) score = 0.6;
      if (score > bestScore) { bestScore = score; best = e; }
    });
    return best ? best.a : "I can only talk about my work. Try asking about my projects or experience.";
  }

  /* ------------------------------------------------------------------ chat */
  var log = document.querySelector(".log");
  var form = document.querySelector(".ask");
  var input = document.getElementById("q");
  var sendBtn = form.querySelector(".send");
  var note = document.querySelector("[data-note]");
  var history = [];
  var busy = false;

  note.textContent = CHAT_ENDPOINT ? "AI answers about my work. It can make mistakes." : "Answers about my work only.";

  /* render text safely: plain text, with http(s) links turned into anchors */
  function fill(el, text) {
    el.textContent = "";
    text.split(/(https?:\/\/[^\s]+)/g).forEach(function (part, i) {
      if (i % 2 === 1) {
        var url = part.replace(/[.,)]+$/, "");
        var a = document.createElement("a");
        a.href = url; a.rel = "noopener"; a.target = "_blank";
        a.textContent = url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
        el.appendChild(a);
        if (url.length < part.length) el.appendChild(document.createTextNode(part.slice(url.length)));
      } else if (part) {
        el.appendChild(document.createTextNode(part));
      }
    });
  }
  function line(who, text) {
    var div = document.createElement("p");
    div.className = "msg msg-" + who;
    if (text != null) fill(div, text);
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }

  function askAI(q) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 15000);
    return fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history.slice(-8) }),
      signal: ctrl.signal
    }).then(function (r) {
      clearTimeout(timer);
      return r.json().then(function (d) {
        if (r.ok && d.reply) return d.reply;
        if (r.status === 429 || r.status === 400) return d.error || scripted(q);
        throw new Error("chat failed");
      });
    });
  }

  function ask(q) {
    q = q.trim().slice(0, 400);
    if (!q || busy) return;
    busy = true; sendBtn.disabled = true;
    line("me", q);
    history.push({ role: "user", content: q });
    var wait = line("ai", "…");
    wait.classList.add("msg-wait");
    wait.setAttribute("aria-label", "Thinking");

    var answer = CHAT_ENDPOINT
      ? askAI(q).catch(function () { return scripted(q); })
      : new Promise(function (res) { setTimeout(function () { res(scripted(q)); }, 300); });

    answer.then(function (text) {
      wait.classList.remove("msg-wait");
      wait.removeAttribute("aria-label");
      fill(wait, text);
      history.push({ role: "assistant", content: text });
      log.scrollTop = log.scrollHeight;
      busy = false; sendBtn.disabled = false;
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var q = input.value;
    input.value = "";
    ask(q);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && document.activeElement !== input) { e.preventDefault(); input.focus(); }
  });
})();
