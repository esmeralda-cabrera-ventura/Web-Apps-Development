/* =========================================================================
   MCC site chrome — navigation, hero checklist, inquiry form
   ========================================================================= */
(function () {
  "use strict";

  var BUSINESS_EMAIL = "info.menifeemaids@outlook.com";

  /* --- Mobile navigation ------------------------------------------------- */
  var toggle = document.querySelector("[data-nav-toggle]");
  var nav = document.querySelector("[data-nav]");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* --- Footer year -------------------------------------------------------- */
  var yr = document.querySelector("[data-year]");
  if (yr) yr.textContent = new Date().getFullYear();

  /* --- Signature: the hero checklist ticking through real tasks ----------- */
  var list = document.querySelector("[data-checklist]");
  if (list) {
    var items = Array.prototype.slice.call(list.querySelectorAll(".clipboard__item"));
    var counter = document.querySelector("[data-checklist-count]");
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function paint(n) {
      items.forEach(function (li, i) { li.classList.toggle("is-done", i < n); });
      if (counter) counter.textContent = n + " of " + items.length + " complete";
    }

    if (reduce) {
      paint(items.length);
    } else {
      var n = 0;
      paint(0);
      var tick = setInterval(function () {
        n++;
        paint(n);
        if (n >= items.length) {
          clearInterval(tick);
          setTimeout(function () {
            n = 0; paint(0);
            var restart = setInterval(function () {
              n++; paint(n);
              if (n >= items.length) clearInterval(restart);
            }, 900);
          }, 3200);
        }
      }, 900);
    }
  }

  /* --- Inquiry form -------------------------------------------------------
     Static site, so this composes an email. Wire to a real endpoint later —
     see README, "Going live".
     --------------------------------------------------------------------- */
  var inquiry = document.querySelector("[data-inquiry]");
  if (inquiry) {
    inquiry.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = new FormData(inquiry);
      var name = (data.get("name") || "").toString().trim();
      var email = (data.get("email") || "").toString().trim();
      var phone = (data.get("phone") || "").toString().trim();
      var city = (data.get("city") || "").toString().trim();
      var message = (data.get("message") || "").toString().trim();

      var ok = inquiry.querySelector("[data-inquiry-ok]");
      if (!name || !email || !message) {
        if (ok) {
          ok.className = "notice notice--warn";
          ok.textContent = "Add your name, email, and a short message so we can reply.";
          ok.hidden = false;
        }
        return;
      }

      var body =
        "Name: " + name + "\n" +
        "Email: " + email + "\n" +
        "Phone: " + (phone || "not given") + "\n" +
        "City: " + (city || "not given") + "\n\n" +
        message;

      var es = (document.documentElement.lang || "en") === "es";
      var say = {
        sending: es ? "Enviando tu mensaje\u2026" : "Sending your message\u2026",
        sent: es ? "Recibimos tu mensaje. Te respondemos hoy mismo."
                 : "Thanks \u2014 we've got your message and we'll reply today.",
        opening: es ? "Abriendo tu correo con el mensaje listo para enviar."
                    : "Opening your email app with the message ready to send."
      };

      function mailFallback() {
        window.location.href = "mailto:" + BUSINESS_EMAIL +
          "?subject=" + encodeURIComponent("Website inquiry from " + name) +
          "&body=" + encodeURIComponent(body);
        if (ok) { ok.className = "notice notice--warn"; ok.textContent = say.opening; ok.hidden = false; }
      }

      var base = window.location.protocol === "file:" ? "" : window.location.origin + "/api";
      if (!base) { mailFallback(); inquiry.reset(); return; }

      if (ok) { ok.className = "notice notice--info"; ok.textContent = say.sending; ok.hidden = false; }

      fetch(base + "/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name, email: email, phone: phone, city: city, message: message,
          lang: es ? "es" : "en"
        })
      }).then(function (r) {
        if (!r.ok) throw new Error(r.status);
        if (ok) { ok.className = "notice notice--ok"; ok.textContent = say.sent; }
        inquiry.reset();
      })["catch"](mailFallback);
    });
  }
})();
