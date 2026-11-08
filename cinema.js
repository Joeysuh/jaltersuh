(function () {
  "use strict";

  /* Director's cut, the parts that need a script: ending (or skipping) the
     opening credits, and the pointer leaning the camera around the frame.
     Everything else is CSS or lives with the paintings in horizon.js. */

  var root = document.documentElement;
  var still = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ------------------------------------------------------------ opening
     The head script adds .opening-on before first paint (once per session,
     never under reduced motion). CSS plays it in ~2.5s; a click, tap or key
     skips straight to the bars sliding away. */
  if (root.classList.contains("opening-on")) {
    var opening = document.querySelector(".opening"), finished = false;
    var end = function () {
      if (finished) return;
      finished = true;
      root.classList.remove("opening-on", "opening-skip");
      document.removeEventListener("keydown", skip);
    };
    var skip = function () {
      if (finished || root.classList.contains("opening-skip")) return;
      root.classList.add("opening-skip");
      setTimeout(end, 480);
    };
    if (opening) {
      opening.addEventListener("click", skip);
      opening.addEventListener("touchstart", skip, { passive: true });
    }
    document.addEventListener("keydown", skip);
    setTimeout(end, 2700);
  }

  /* ---------------------------------------------------------- the lean
     Moving the pointer leans the camera a few pixels around the frame
     (eased in CSS). Mouse and trackpad only; off under reduced motion. */
  var band = document.querySelector("[data-horizon]");
  if (!band || still.matches || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  var nx = 0, ny = 0, raf = 0;
  function apply() {
    raf = 0;
    band.style.setProperty("--lean-x", nx.toFixed(3));
    band.style.setProperty("--lean-y", ny.toFixed(3));
  }
  window.addEventListener("pointermove", function (e) {
    nx = e.clientX / window.innerWidth * 2 - 1;
    ny = e.clientY / window.innerHeight * 2 - 1;
    if (!raf) raf = requestAnimationFrame(apply);
  }, { passive: true });
  document.addEventListener("pointerleave", function () { nx = ny = 0; if (!raf) raf = requestAnimationFrame(apply); });
})();
