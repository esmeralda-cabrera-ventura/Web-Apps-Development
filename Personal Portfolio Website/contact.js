/* =========================================================================
   CONTACT FORM
   Collects first name, last name, email, phone, LinkedIn, city and message,
   and delivers them to esmeralda.cabrera-ventura@outlook.com.

   -------------------------------------------------------------------------
   DELIVERY - PASTE YOUR LAMBDA URL BELOW BEFORE THIS WILL SEND
   -------------------------------------------------------------------------
   The site is static (S3 + CloudFront), so the browser cannot send mail on
   its own, and it cannot call Amazon SES directly either: that would require
   AWS credentials, and anything in this file is readable by anyone who views
   the page source.

   So the form posts to a small AWS Lambda function that holds the
   credentials server-side and calls SES on your behalf. The function code is
   included at lambda/contact-form/index.mjs, and the click-by-click setup is
   in lambda/README-CONTACT-DEPLOY.md.

   ONE THING TO EDIT: once the Lambda has a Function URL, paste it into
   ENDPOINT below and re-upload this file. Until then the form will tell the
   visitor plainly that it could not send, and hand them a pre-filled mail
   draft so nothing they wrote is lost.

   NOTE ON FAILURE DETECTION: an HTTP 200 is not proof of delivery. The
   Lambda reports its own outcome in a "success" field in the response body,
   and the handler below checks that too, so the form can never claim a send
   that did not happen.
   ========================================================================= */

(function () {
  "use strict";

  /* Shown to visitors as the fallback address, and used to build the
     pre-filled mail draft if delivery fails. */
  var TO_ADDRESS = "esmeralda.cabrera-ventura@outlook.com";

  /* Subject line for the fallback mail draft. The Lambda sets its own
     subject on the real email. */
  var SUBJECT = "New message from your portfolio contact form";

  /* >>> PASTE YOUR LAMBDA FUNCTION URL HERE <<<
     It looks like:
       https://abc123xyz.lambda-url.us-west-1.on.aws/
     Keep the trailing slash. Until this is filled in, the form will not
     send and will say so honestly. */
  var ENDPOINT = "";

  /* ---------------------------------------------------------------- utils */
  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* Deliberately permissive: 7+ digits after stripping punctuation. Phone
     formats vary by country and rejecting a valid number is worse than
     accepting a malformed one. */
  function validPhone(v) {
    return v.replace(/[^\d]/g, "").length >= 7;
  }

  function validUrl(v) {
    try {
      var u = new URL(v.indexOf("://") === -1 ? "https://" + v : v);
      return !!u.hostname && u.hostname.indexOf(".") !== -1;
    } catch (e) {
      return false;
    }
  }

  var RULES = {
    firstName: { required: true, label: "first name" },
    lastName:  { required: true, label: "last name" },
    email:     { required: true, label: "email", test: EMAIL_RE.test.bind(EMAIL_RE),
                 hint: "Enter a valid email address, such as you@company.com." },
    phone:     { test: validPhone, hint: "Enter a phone number with at least 7 digits, or leave it blank." },
    linkedin:  { test: validUrl,   hint: "Enter a full profile link, such as linkedin.com/in/yourname." },
    city:      {},
    message:   { required: true, label: "message", min: 10,
                 hint: "Tell me a little more \u2014 at least 10 characters." }
  };

  function fieldError(name, msg) {
    var el = document.querySelector('[data-error-for="' + name + '"]');
    var input = document.getElementById(name);
    if (el) el.textContent = msg || "";
    if (input) {
      input.classList.toggle("has-error", !!msg);
      input.setAttribute("aria-invalid", msg ? "true" : "false");
    }
  }

  function validateField(name) {
    var rule = RULES[name];
    if (!rule) return true;
    var input = document.getElementById(name);
    if (!input) return true;
    var value = input.value.trim();

    if (!value) {
      if (rule.required) {
        fieldError(name, "Please enter your " + rule.label + ".");
        return false;
      }
      fieldError(name, "");
      return true;
    }

    if (rule.min && value.length < rule.min) {
      fieldError(name, rule.hint);
      return false;
    }

    if (rule.test && !rule.test(value)) {
      fieldError(name, rule.hint);
      return false;
    }

    fieldError(name, "");
    return true;
  }

  function collect() {
    var get = function (id) {
      var el = document.getElementById(id);
      return el ? el.value.trim() : "";
    };
    return {
      firstName: get("firstName"),
      lastName: get("lastName"),
      email: get("email"),
      phone: get("phone"),
      linkedin: get("linkedin"),
      city: get("city"),
      message: get("message")
    };
  }

  /* Readable in an inbox, and identical in the API payload and the mailto
     fallback so a message reads the same however it arrived. */
  function asText(d) {
    return [
      "Name:     " + d.firstName + " " + d.lastName,
      "Email:    " + d.email,
      "Phone:    " + (d.phone || "\u2014"),
      "LinkedIn: " + (d.linkedin || "\u2014"),
      "City:     " + (d.city || "\u2014"),
      "",
      "Message:",
      d.message,
      "",
      "\u2014 Sent from the contact form at " + location.origin
    ].join("\n");
  }

  function mailtoHref(d) {
    return "mailto:" + TO_ADDRESS +
      "?subject=" + encodeURIComponent(SUBJECT + " \u2014 " + d.firstName + " " + d.lastName) +
      "&body=" + encodeURIComponent(asText(d));
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function status(kind, html) {
    var box = $("#formStatus");
    box.className = "form-status is-shown is-" + kind;
    box.innerHTML = html;
  }

  /* ----------------------------------------------------------------- init */
  document.addEventListener("DOMContentLoaded", function () {
    var form = $("#contactForm");
    var sendBtn = $("#sendBtn");
    var message = $("#message");
    var charCount = $("#charCount");

    if (!form) return;

    /* Real typing, as opposed to a script setting .value or the browser
       autofilling. isTrusted is only true for events the user really caused. */
    var humanInput = false;
    form.addEventListener("keydown", function (ev) {
      if (ev.isTrusted) humanInput = true;
    }, true);
    form.addEventListener("pointerdown", function (ev) {
      if (ev.isTrusted) humanInput = true;
    }, true);

    /* Validate on blur, and clear the error as soon as they start fixing it. */
    Object.keys(RULES).forEach(function (name) {
      var input = document.getElementById(name);
      if (!input) return;
      input.addEventListener("blur", function () { validateField(name); });
      input.addEventListener("input", function () {
        if (input.classList.contains("has-error")) fieldError(name, "");
      });
    });

    if (message && charCount) {
      var updateCount = function () {
        var n = message.value.length;
        charCount.textContent = n + (n === 1 ? " character" : " characters");
      };
      message.addEventListener("input", updateCount);
      updateCount();
    }

    /* Opening the page straight off the hard drive (file:///C:/...) means
       there is no website for the mail service to trust, and it will refuse
       every message. Say so up front rather than after a failed send. */
    if (location.protocol === "file:") {
      status("warn",
        "<strong>This page is open as a file on your computer, so the form " +
        "can't send yet.</strong> It will work once the site is published " +
        "online. Until then, write to " +
        "<a href=\"mailto:" + TO_ADDRESS + "\">" + TO_ADDRESS + "</a>.");
    }

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();

      /* Bot check. The honeypot sits off-screen, so a person cannot fill it
         by hand - but a browser's autofill can, and Edge did exactly that
         when the field was still labelled "Company". A real visitor was then
         treated as a bot and shown a success message for a send that never
         happened, which is the worst possible outcome.

         So a filled honeypot is only treated as a bot when the visitor never
         actually typed anything. If they did type, it was autofill: clear the
         field and carry on with the send. */
      var honey = document.getElementById("hp_ref_code");
      if (honey && honey.value) {
        if (humanInput) {
          console.info("[contact form] honeypot was autofilled by the browser; ignoring it.");
          honey.value = "";
        } else {
          console.warn("[contact form] submission dropped: honeypot filled, no typing detected.");
          form.reset();
          return;
        }
      }

      var names = Object.keys(RULES);
      var firstBad = null;
      names.forEach(function (n) {
        if (!validateField(n) && !firstBad) firstBad = n;
      });

      if (firstBad) {
        status("error",
          "<strong>A few details are missing.</strong> " +
          "Please check the highlighted boxes above, then send again.");
        var el = document.getElementById(firstBad);
        if (el) { el.focus(); el.scrollIntoView({ block: "center", behavior: "smooth" }); }
        return;
      }

      var data = collect();

      /* Not wired up yet. Fail honestly and immediately rather than firing a
         request at an empty URL and reporting a confusing network error. */
      if (!ENDPOINT) {
        status("warn",
          "<strong>The form isn't connected yet.</strong> Please write to " +
          "<a href=\"mailto:" + TO_ADDRESS + "\">" + TO_ADDRESS + "</a> " +
          "or <a href=\"" + mailtoHref(data) + "\">send this message from your " +
          "own email app</a> - everything you typed will already be filled in.");
        console.warn("[contact form] ENDPOINT is empty in contact.js - paste the Lambda Function URL there.");
        return;
      }

      sendBtn.disabled = true;
      sendBtn.classList.add("is-sending");
      var originalLabel = sendBtn.innerHTML;
      sendBtn.textContent = "Sending\u2026";
      status("pending", "Sending your message\u2026");


      /* The Lambda takes these field names verbatim; see
         lambda/contact-form/index.mjs. */
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(data)
      })
        .then(function (res) {
          return res.text().then(function (text) {
            var body = {};
            try { body = JSON.parse(text); } catch (e) { /* not JSON */ }

            /* A 200 is not proof of delivery - the Lambda reports its own
               outcome in the body, so the body decides. */
            var refused = String(body.success) === "false" || body.success === false;
            if (!res.ok || refused) {
              throw new Error(body.message || ("The mail service returned " + res.status + "."));
            }
            return body;
          });
        })
        .then(function () {
          status("ok",
            "<strong>Message sent.</strong> Thank you, " +
            escapeHtml(data.firstName) + ". I'll reply to " +
            escapeHtml(data.email) + " soon.");
          form.reset();
          if (charCount) charCount.textContent = "0 characters";
          $$(".field-error").forEach(function (e) { e.textContent = ""; });
        })
        .catch(function (err) {
          /* Never dead-end, and never claim a send that did not happen.
             The visitor gets one plain sentence and a way through; the
             technical reason is for whoever maintains the site, so it goes
             to the console rather than onto the page. */
          status("warn",
            "<strong>Your message didn't go through.</strong> Nothing was lost \u2014 " +
            "<a href=\"" + mailtoHref(data) + "\">send it from your own email app</a> " +
            "and everything you typed will already be filled in. You can also " +
            "write to <a href=\"mailto:" + TO_ADDRESS + "\">" + TO_ADDRESS + "</a>.");
          console.warn("[contact form] delivery failed:", err && err.message ? err.message : err);
        })
        .then(function () {
          sendBtn.disabled = false;
          sendBtn.classList.remove("is-sending");
          sendBtn.innerHTML = originalLabel;
        });
    });

  });
})();
