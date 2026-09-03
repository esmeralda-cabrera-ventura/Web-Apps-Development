/* =========================================================================
   Floating soap bubbles
   -------------------------------------------------------------------------
   Drawn on a fixed <canvas> that sits behind all page content with
   pointer-events:none, so it can never block a click, a tap, or text
   selection. Pauses when the tab is hidden and switches off entirely for
   anyone who prefers reduced motion.
   ========================================================================= */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduce.matches) return;

  var canvas = document.createElement("canvas");
  canvas.id = "bubbles";
  canvas.setAttribute("aria-hidden", "true");
  document.body.insertBefore(canvas, document.body.firstChild);

  var ctx = canvas.getContext("2d");
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0, bubbles = [], raf = null, running = true;

  /* Fewer bubbles on small screens — phones have less GPU headroom. */
  function targetCount() {
    var area = window.innerWidth * window.innerHeight;
    return Math.max(10, Math.min(34, Math.round(area / 42000)));
  }

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  function makeBubble(seeded) {
    var r = 6 + Math.random() * 26;
    return {
      x: Math.random() * W,
      y: seeded ? Math.random() * H : H + r + Math.random() * 120,
      r: r,
      speed: 0.18 + Math.random() * 0.55 + r * 0.006,
      drift: (Math.random() - 0.5) * 0.35,
      phase: Math.random() * Math.PI * 2,
      wobble: 0.004 + Math.random() * 0.012,
      alpha: 0.20 + Math.random() * 0.32,
      hue: Math.random() < 0.45 ? 205 : 188   // royal blue / aqua, from the logo
    };
  }

  function build() {
    var n = targetCount();
    bubbles = [];
    for (var i = 0; i < n; i++) bubbles.push(makeBubble(true));
  }

  function draw(b) {
    var g = ctx.createRadialGradient(
      b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.1,
      b.x, b.y, b.r
    );
    g.addColorStop(0, "hsla(" + b.hue + ", 90%, 88%, " + (b.alpha * 0.9) + ")");
    g.addColorStop(0.65, "hsla(" + b.hue + ", 85%, 68%, " + (b.alpha * 0.32) + ")");
    g.addColorStop(1, "hsla(" + b.hue + ", 80%, 62%, 0)");

    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();

    // thin rim
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * 0.94, 0, Math.PI * 2);
    ctx.strokeStyle = "hsla(" + b.hue + ", 90%, 76%, " + (b.alpha * 0.55) + ")";
    ctx.lineWidth = 1;
    ctx.stroke();

    // specular highlight — what makes it read as a bubble rather than a dot
    ctx.beginPath();
    ctx.arc(b.x - b.r * 0.33, b.y - b.r * 0.36, Math.max(1, b.r * 0.17), 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255," + Math.min(0.75, b.alpha * 2) + ")";
    ctx.fill();
  }

  function tick() {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < bubbles.length; i++) {
      var b = bubbles[i];
      b.y -= b.speed;
      b.phase += b.wobble;
      b.x += Math.sin(b.phase) * 0.55 + b.drift * 0.25;

      if (b.y + b.r < -20 || b.x < -80 || b.x > W + 80) {
        bubbles[i] = makeBubble(false);
        continue;
      }
      draw(b);
    }
    raf = window.requestAnimationFrame(tick);
  }

  function start() { if (!running) { running = true; tick(); } }
  function stop() { running = false; if (raf) window.cancelAnimationFrame(raf); raf = null; }

  /* Don't burn cycles on a tab nobody is looking at. */
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop(); else start();
  });

  var resizeTimer;
  window.addEventListener("resize", function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 200);
  });

  /* If the visitor turns on reduced motion mid-session, honour it. */
  if (reduce.addEventListener) {
    reduce.addEventListener("change", function (e) {
      if (e.matches) { stop(); canvas.remove(); }
    });
  }

  resize();
  tick();
})();
