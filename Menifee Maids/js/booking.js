/* =========================================================================
   Book a Service — request-and-confirm flow
   Nothing is booked and nothing is charged here. The customer picks two
   preferred windows; the owner confirms from admin.html.
   ========================================================================= */
(function () {
  "use strict";

  var S = window.MCC.store;
  var BUSINESS_EMAIL = "info.menifeemaids@outlook.com";
  var root = document.querySelector("[data-flow]");
  if (!root) return;

  S.seedIfEmpty();

  /* --- State ------------------------------------------------------------- */
  var state = {
    kind: null,            // "residential" | "commercial"
    zip: "", city: "",
    bedrooms: 3, bathrooms: 2,
    frequency: "biweekly",
    addons: [],
    facility: "", sqft: "", nights: "", scope: "",
    slot1: { date: null, window: null },
    slot2: { date: null, window: null },
    name: "", phone: "", email: "", company: "", access: "",
    street: "", unit: "", city2: "", state: "CA", zip2: "",
    photoConsent: true,
    smsConsent: true
  };

  var STEPS_HOME = ["area", "home", "when", "contact", "review"];
  var STEPS_BIZ  = ["area", "business", "when", "contact", "review"];
  var T = window.MCC.i18n.T;
  var LANG = window.MCC.i18n.lang();
  function stepLabel(id) { return T("step." + id); }
  var idx = 0;

  function steps() { return state.kind === "commercial" ? STEPS_BIZ : STEPS_HOME; }
  function current() { return steps()[idx]; }

  /* --- Elements ---------------------------------------------------------- */
  var elSteps    = root.querySelector("[data-steps]");
  var elNext     = root.querySelector("[data-next]");
  var elBack     = root.querySelector("[data-back]");
  var elNavBar   = root.querySelector("[data-nav-bar]");
  var elEstimate = root.querySelector("[data-estimate]");
  var panels     = {};
  Array.prototype.forEach.call(root.querySelectorAll("[data-panel]"), function (p) {
    panels[p.getAttribute("data-panel")] = p;
  });

  /* --- Helpers ----------------------------------------------------------- */
  function money(n) { return "$" + Number(n).toLocaleString("en-US"); }
  function err(key, msg) {
    var el = root.querySelector('[data-error="' + key + '"]');
    if (!el) return;
    el.textContent = msg || "";
    el.classList.toggle("is-shown", !!msg);
    var input = document.getElementById(key);
    if (input) input.setAttribute("aria-invalid", msg ? "true" : "false");
  }
  function clearErrors() {
    Array.prototype.forEach.call(root.querySelectorAll(".field-error"), function (e) {
      e.textContent = ""; e.classList.remove("is-shown");
    });
  }

  /* --- Step rail --------------------------------------------------------- */
  function renderSteps() {
    var list = steps();
    elSteps.innerHTML = list.map(function (id, i) {
      var cls = i === idx ? "is-active" : (i < idx ? "is-done" : "");
      var mark = i < idx ? "&#10003;" : (i + 1);
      return '<span class="flow__step ' + cls + '" role="listitem">' + mark + " " + stepLabel(id) + "</span>";
    }).join("");
  }

  /* --- Panel switching ---------------------------------------------------- */
  function show() {
    Object.keys(panels).forEach(function (k) { panels[k].classList.remove("is-active"); });
    var key = current();
    if (panels[key]) panels[key].classList.add("is-active");
    renderSteps();
    hideErrorBanner();
    elBack.hidden = idx === 0;
    elNext.textContent = key === "review" ? T("btn.send") : T("btn.continue");
    renderEstimate();
    validate();
    if (key === "when") renderSlots();
    if (key === "review") renderSummary();
    if (key === "contact") {
      var cf = root.querySelector("[data-company-field]");
      if (cf) cf.hidden = state.kind !== "commercial";
      var lbl = root.querySelector("[data-address-label]");
      if (lbl) lbl.textContent = T(state.kind === "commercial" ? "addr.facility" : "addr.service");
      fillCityOptions();
    }
    window.scrollTo({ top: root.offsetTop - 90, behavior: "smooth" });
  }

  /* --- ZIP gate ----------------------------------------------------------- */
  var zipInput = document.getElementById("zip");
  var zipResult = root.querySelector("[data-zip-result]");
  var fork = root.querySelector("[data-fork]");

  zipInput.addEventListener("input", function () {
    var v = zipInput.value.replace(/\D/g, "").slice(0, 5);
    zipInput.value = v;
    err("zip", "");
    if (v.length < 5) {
      zipResult.innerHTML = ""; fork.hidden = true; state.zip = ""; state.city = "";
      validate(); return;
    }
    var city = S.ZIPS[v];
    if (city) {
      state.zip = v; state.city = city;
      zipResult.innerHTML =
        '<div class="notice notice--ok" style="margin-top:1rem">' +
        '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 10.5 7.5 14.5 16.5 5"/></svg>' +
        "<span>" + T("area.inServiceArea", { city: city }) + "</span></div>";
      fork.hidden = false;
    } else {
      state.zip = ""; state.city = "";
      zipResult.innerHTML =
        '<div class="notice notice--warn" style="margin-top:1rem">' +
        '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="10" cy="10" r="7.5"/><path d="M10 6v5M10 13.5v.4"/></svg>' +
        "<span>" + T("area.outOfArea") + "</span></div>";
      fork.hidden = true;
    }
    validate();
  });

  Array.prototype.forEach.call(root.querySelectorAll("[data-choose-kind]"), function (btn) {
    btn.addEventListener("click", function () {
      state.kind = btn.getAttribute("data-choose-kind");
      Array.prototype.forEach.call(root.querySelectorAll("[data-choose-kind]"), function (b) {
        b.setAttribute("aria-pressed", b === btn ? "true" : "false");
      });
      renderSteps();
      validate();
    });
  });

  /* --- Residential inputs -------------------------------------------------- */
  function chipRow(container, values, key, formatter) {
    container.innerHTML = values.map(function (v) {
      var pressed = String(state[key]) === String(v);
      return '<button type="button" class="chip" data-val="' + v + '" aria-pressed="' + pressed + '">' +
             (formatter ? formatter(v) : v) + "</button>";
    }).join("");
    container.addEventListener("click", function (e) {
      var b = e.target.closest(".chip");
      if (!b) return;
      state[key] = isNaN(Number(b.getAttribute("data-val"))) ? b.getAttribute("data-val") : Number(b.getAttribute("data-val"));
      Array.prototype.forEach.call(container.querySelectorAll(".chip"), function (c) {
        c.setAttribute("aria-pressed", c === b ? "true" : "false");
      });
      renderEstimate();
    });
  }

  chipRow(root.querySelector('[data-chips="bedrooms"]'), [1, 2, 3, 4, 5], "bedrooms",
    function (v) { return v === 5 ? "5+" : v; });
  chipRow(root.querySelector('[data-chips="bathrooms"]'), [1, 2, 3, 4], "bathrooms",
    function (v) { return v === 4 ? "4+" : v; });

  function optionRow(container, map, key) {
    container.innerHTML = Object.keys(map).map(function (id) {
      var o = map[id];
      var pressed = state[key] === id;
      return '<button type="button" class="option" data-val="' + id + '" aria-pressed="' + pressed + '">' +
             '<span class="option__title">' + o.label + "</span>" +
             '<span class="option__meta">' + (o.note || "") + "</span></button>";
    }).join("");
    container.addEventListener("click", function (e) {
      var b = e.target.closest(".option");
      if (!b) return;
      state[key] = b.getAttribute("data-val");
      Array.prototype.forEach.call(container.querySelectorAll(".option"), function (c) {
        c.setAttribute("aria-pressed", c === b ? "true" : "false");
      });
      renderEstimate();
    });
  }

  // frequency options need a savings note, built after we know the base price
  var freqMap = {};
  Object.keys(S.PRICING.frequency).forEach(function (id) {
    freqMap[id] = { label: S.frequencyLabel(id), note: "" };
  });
  optionRow(root.querySelector('[data-options="frequency"]'), freqMap, "frequency");

  // add-ons (multi-select)
  var addonBox = root.querySelector('[data-chips="addons"]');
  addonBox.innerHTML = S.PRICING.addons.map(function (a) {
    return '<button type="button" class="chip" data-val="' + a.id + '" aria-pressed="false">' +
           S.addonLabel(a.id) + '<span class="chip__price">+$' + a.price + "</span></button>";
  }).join("");
  addonBox.addEventListener("click", function (e) {
    var b = e.target.closest(".chip");
    if (!b) return;
    var id = b.getAttribute("data-val");
    var i = state.addons.indexOf(id);
    if (i > -1) { state.addons.splice(i, 1); b.setAttribute("aria-pressed", "false"); }
    else { state.addons.push(id); b.setAttribute("aria-pressed", "true"); }
    renderEstimate();
  });

  /* --- Commercial inputs --------------------------------------------------- */
  optionRow(root.querySelector('[data-options="facility"]'), {
    office:       { label: T("fac.office"),       note: T("fac.office.note") },
    retail:       { label: T("fac.retail"),       note: T("fac.retail.note") },
    medical:      { label: T("fac.medical"),      note: T("fac.medical.note") },
    construction: { label: T("fac.construction"), note: T("fac.construction.note") },
    other:        { label: T("fac.other"),        note: T("fac.other.note") }
  }, "facility");

  ["sqft", "nights", "scope"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("input", function () { state[id] = el.value; validate(); });
  });

  /* --- Live estimate ------------------------------------------------------- */
  function renderEstimate() {
    if (state.kind !== "residential" || ["home", "when", "contact", "review"].indexOf(current()) === -1) {
      elEstimate.innerHTML = "";
      elEstimate.hidden = true;
      return;
    }
    elEstimate.hidden = false;
    var q = S.estimate(state);
    elEstimate.innerHTML =
      '<div class="estimate"><div>' +
      '<div class="estimate__label">' + T("est.label") + "</div>" +
      '<div class="estimate__num">' + money(q.total) +
        " <span style='font-size:.95rem;font-weight:600;color:var(--muted);-webkit-text-fill-color:var(--muted)'>" +
        T("est.perVisit") + "</span></div>" +
      (q.savings > 0
        ? '<div class="estimate__save">' +
          T("est.saving", { amount: money(q.savings), oneTime: money(q.oneTime) }) + "</div>"
        : "") +
      "</div></div>";

    // refresh frequency notes with real dollar deltas
    var freqBox = root.querySelector('[data-options="frequency"]');
    if (freqBox) {
      Array.prototype.forEach.call(freqBox.querySelectorAll(".option"), function (b) {
        var id = b.getAttribute("data-val");
        var test = Object.assign({}, state, { frequency: id });
        var price = S.estimate(test).total;
        var meta = b.querySelector(".option__meta");
        if (meta) meta.textContent = T("est.each", { amount: money(price) });
      });
    }
  }

  /* --- Slot picker --------------------------------------------------------- */
  function renderSlots() {
    var box = root.querySelector("[data-slots]");
    var title = root.querySelector("[data-when-title]");
    if (title) {
      title.textContent = T(state.kind === "commercial" ? "when.bizTitle" : "when.homeTitle");
    }

    var open = S.openDates(60);
    if (!open.length) {
      box.innerHTML =
        '<div class="notice notice--warn">' +
        '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="10" cy="10" r="7.5"/><path d="M10 5.5V10l3 2"/></svg>' +
        "<span>" + T("when.none") + "</span></div>";
      return;
    }

    box.innerHTML =
      block("slot1", T("when.first"), open) +
      block("slot2", T("when.backup"), open);

    Array.prototype.forEach.call(box.querySelectorAll("[data-slot]"), function (group) {
      var key = group.getAttribute("data-slot");
      group.addEventListener("click", function (e) {
        var d = e.target.closest(".datebtn");
        if (d) {
          state[key].date = d.getAttribute("data-date");
          state[key].window = null;
          Array.prototype.forEach.call(group.querySelectorAll(".datebtn"), function (x) {
            x.setAttribute("aria-pressed", x === d ? "true" : "false");
          });
          paintWindows(group, key, open);
          validate();
          return;
        }
        var w = e.target.closest(".chip");
        if (w) {
          state[key].window = w.getAttribute("data-window");
          Array.prototype.forEach.call(group.querySelectorAll(".chip"), function (x) {
            x.setAttribute("aria-pressed", x === w ? "true" : "false");
          });
          validate();
        }
      });
      if (state[key].date) paintWindows(group, key, open);
    });

    function block(key, legend, dates) {
      var strip = dates.map(function (d) {
        var dt = S.parseISO(d.date);
        var pressed = state[key].date === d.date;
        return '<button type="button" class="datebtn" data-date="' + d.date + '" aria-pressed="' + pressed + '">' +
          '<span class="datebtn__dow">' + dt.toLocaleDateString(window.MCC.i18n.locale(), { weekday: "short" }) + "</span>" +
          '<span class="datebtn__day">' + dt.getDate() + "</span>" +
          '<span class="datebtn__mon">' + dt.toLocaleDateString(window.MCC.i18n.locale(), { month: "short" }) + "</span>" +
          "</button>";
      }).join("");
      return '<div class="slotpick" data-slot="' + key + '">' +
             '<p class="slotpick__legend">' + legend + "</p>" +
             '<div class="datestrip">' + strip + "</div>" +
             '<div class="chips" data-windows style="margin-top:.85rem"></div></div>';
    }
  }

  function paintWindows(group, key, open) {
    var target = group.querySelector("[data-windows]");
    var chosen = state[key].date;
    var day = null;
    open.forEach(function (d) { if (d.date === chosen) day = d; });
    if (!day) { target.innerHTML = ""; return; }
    target.innerHTML = day.windows.map(function (wid) {
      var w = null;
      S.WINDOWS.forEach(function (x) { if (x.id === wid) w = x; });
      if (!w) return "";
      var pressed = state[key].window === wid;
      return '<button type="button" class="chip" data-window="' + wid + '" aria-pressed="' + pressed + '">' +
             S.windowName(wid) + '<span class="chip__price">' + w.time + "</span></button>";
    }).join("");
  }

  /* --- Address fields -------------------------------------------------------
     Split into separate inputs so a typo in one part can be caught on its own
     rather than being buried in a single free-text line.
     ----------------------------------------------------------------------- */
  var cityFilled = false;
  function fillCityOptions() {
    var sel = document.getElementById("city");
    if (!sel) return;
    if (!cityFilled) {
      sel.innerHTML = '<option value="">Choose a city</option>' +
        S.CITIES.map(function (c) { return "<option>" + c + "</option>"; }).join("");
      cityFilled = true;
    }
    // Carry over whatever the ZIP step already told us.
    if (!state.city2 && state.city) { state.city2 = state.city; sel.value = state.city; }
    var z = document.getElementById("zip2");
    if (z && !state.zip2 && state.zip) { state.zip2 = state.zip; z.value = state.zip; }
  }

  /** One tidy line built from the parts, for emails and the job record. */
  function composedAddress() {
    var line1 = state.street + (state.unit ? ", " + state.unit : "");
    return [line1, state.city2, "CA " + state.zip2].filter(Boolean).join(", ");
  }

  /* --- Contact fields ------------------------------------------------------ */
  ["name", "phone", "email", "company", "street", "unit", "access"].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", function () { state[id] = el.value.trim(); err(id, ""); validate(); });
  });
  var citySel = document.getElementById("city");
  if (citySel) citySel.addEventListener("change", function () {
    state.city2 = citySel.value; err("city", ""); validate();
  });
  var zip2El = document.getElementById("zip2");
  if (zip2El) zip2El.addEventListener("input", function () {
    zip2El.value = zip2El.value.replace(/\D/g, "").slice(0, 5);
    state.zip2 = zip2El.value; err("zip2", ""); validate();
  });

  var consent = document.getElementById("photoConsent");
  if (consent) consent.addEventListener("change", function () { state.photoConsent = consent.checked; });

  // Carrier rules require a per-customer record of who agreed to be texted and
  // when, so this is stored on the job rather than assumed.
  var smsOk = document.getElementById("smsConsent");
  if (smsOk) smsOk.addEventListener("change", function () { state.smsConsent = smsOk.checked; });

  /* --- Validation ---------------------------------------------------------- */
  function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }
  function isPhone(v) { return v.replace(/\D/g, "").length >= 10; }

  /**
   * Returns [] when the current step is complete, otherwise a list of
   * [fieldKey, message] pairs describing exactly what is missing.
   */
  function collectErrors() {
    var key = current(), out = [];

    if (key === "area") {
      if (!state.zip) out.push(["zip", T("err.zip")]);
      if (state.zip && !state.kind) out.push(["kind", T("err.kind")]);
    }

    if (key === "business") {
      if (!state.facility) out.push(["facility", T("err.facility")]);
    }

    if (key === "when") {
      if (!state.slot1.date) out.push(["slots", T("err.slot1date")]);
      else if (!state.slot1.window) out.push(["slots", T("err.slot1window")]);
      if (!state.slot2.date) out.push(["slots", T("err.slot2date")]);
      else if (!state.slot2.window) out.push(["slots", T("err.slot2window")]);
    }

    if (key === "contact") {
      if (!state.name) out.push(["name", T("err.name")]);
      if (!state.phone) out.push(["phone", T("err.phoneMissing")]);
      else if (!isPhone(state.phone)) out.push(["phone", T("err.phoneShort")]);
      if (!state.email) out.push(["email", T("err.emailMissing")]);
      else if (!isEmail(state.email)) out.push(["email", T("err.emailBad")]);
      if (state.kind === "commercial" && !state.company) out.push(["company", T("err.company")]);
      if (!state.street) out.push(["street", T("err.street")]);
      if (!state.city2) out.push(["city", T("err.city")]);
      if (!state.zip2) out.push(["zip2", T("err.zip2Missing")]);
      else if (state.zip2.length !== 5) out.push(["zip2", T("err.zip2Short")]);
      else if (!S.ZIPS[state.zip2]) out.push(["zip2", T("err.zip2Unserved")]);
      else if (state.city2 && S.ZIPS[state.zip2] !== state.city2) {
        out.push(["zip2", T("err.zipCityMismatch",
          { zip: state.zip2, actual: S.ZIPS[state.zip2], chosen: state.city2 })]);
      }
    }

    return out;
  }

  /** Paint the summary banner, the inline field errors, and focus the first gap. */
  function showErrors(errors) {
    var panel = panels[current()];
    if (!panel) return;

    var banner = panel.querySelector("[data-flow-error]");
    if (!banner) {
      banner = document.createElement("div");
      banner.className = "notice notice--error";
      banner.setAttribute("data-flow-error", "");
      banner.setAttribute("role", "alert");
      banner.setAttribute("tabindex", "-1");
      panel.insertBefore(banner, panel.firstChild);
    }

    var heading = T(errors.length === 1 ? "err.oneThing" : "err.fewThings");

    banner.innerHTML =
      '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round">' +
      '<circle cx="10" cy="10" r="7.5"/><path d="M10 6v5M10 13.5v.4"/></svg>' +
      "<div><strong>" + heading + "</strong><ul>" +
      errors.map(function (e) { return "<li>" + e[1] + "</li>"; }).join("") +
      "</ul></div>";
    banner.hidden = false;

    errors.forEach(function (e) { err(e[0], e[1]); });

    // Move focus so screen readers announce it and keyboard users land in place.
    banner.focus();
    var first = document.getElementById(errors[0][0]);
    if (first) { try { first.focus({ preventScroll: true }); } catch (x) { first.focus(); } }
  }

  function hideErrorBanner() {
    var panel = panels[current()];
    if (!panel) return;
    var banner = panel.querySelector("[data-flow-error]");
    if (banner) banner.hidden = true;
  }

  /* The Continue button always stays clickable — a disabled button tells the
     visitor nothing about what is wrong. Validation happens on click instead. */
  function validate() {
    if (!collectErrors().length) { clearErrors(); hideErrorBanner(); }
  }

  /* --- Summary ------------------------------------------------------------- */
  function renderSummary() {
    var rows = [];
    rows.push([T("rev.service"), T(state.kind === "commercial" ? "rev.commercial" : "rev.house")]);
    rows.push([T("rev.location"), state.city + " " + state.zip]);

    if (state.kind === "residential") {
      rows.push([T("rev.property"), T("rev.bedbath", { bed: state.bedrooms, bath: state.bathrooms })]);
      rows.push([T("rev.frequency"), S.frequencyLabel(state.frequency)]);
      if (state.addons.length) {
        rows.push([T("rev.addons"), state.addons.map(function (id) {
          return S.addonLabel(id);
        }).join(", ")]);
      }
    } else {
      rows.push([T("rev.facility"), state.facility]);
      if (state.sqft) rows.push([T("rev.size"), state.sqft + " sq ft"]);
      if (state.nights) rows.push([T("rev.perWeek"), state.nights]);
    }

    rows.push([T("rev.first"), S.prettyDate(state.slot1.date) + " &middot; " + S.windowLabel(state.slot1.window)]);
    rows.push([T("rev.backup"), S.prettyDate(state.slot2.date) + " &middot; " + S.windowLabel(state.slot2.window)]);
    rows.push([T("rev.name"), state.name]);
    if (state.company) rows.push([T("rev.company"), state.company]);
    rows.push([T("rev.phone"), state.phone]);
    rows.push([T("rev.email"), state.email]);
    rows.push([T("rev.address"), composedAddress()]);

    var q = state.kind === "residential" ? S.estimate(state) : null;
    var html = '<ul class="summary">' + rows.map(function (r) {
      return "<li><span class='k'>" + r[0] + "</span><span class='v'>" + r[1] + "</span></li>";
    }).join("") + "</ul>";

    if (q) {
      html += '<div class="pricebox" style="margin-bottom:1.25rem">' +
        '<div><div class="pricebox__num">' + money(q.total) + "</div>" +
        '<div style="font-family:var(--mono);font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">' +
        T("rev.estimateCap") + "</div></div>" +
        '<div class="pricebox__body"><p style="margin:0">' + T("rev.estimateNote") + "</p></div></div>";
    } else {
      html += '<div class="notice notice--info"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="10" cy="10" r="7.5"/><path d="M10 9v5M10 6.5v.5"/></svg>' +
        "<span>" + T("rev.bizNote") + "</span></div>";
    }

    root.querySelector("[data-summary]").innerHTML = html;
  }

  /* --- Submit -------------------------------------------------------------- */
  /** Live on Static Web Apps the API is same-origin; from a file:// copy it isn't. */
  function apiBase() {
    return window.location.protocol === "file:" ? "" : window.location.origin + "/api";
  }

  /**
   * Send the request to the server. Resolves with a reference number, or
   * rejects so the caller can fall back to the email path — a booking must
   * never be lost because an endpoint was unreachable.
   */
  function postBooking(payload) {
    var base = apiBase();
    if (!base) return Promise.reject(new Error("no api"));
    return fetch(base + "/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (r) {
      if (!r.ok) throw new Error("api " + r.status);
      return r.json();
    });
  }

  function submit() {
    var q = state.kind === "residential" ? S.estimate(state) : null;
    var req = S.addRequest({
      kind: state.kind,
      zip: state.zip, city: state.city,
      bedrooms: state.bedrooms, bathrooms: state.bathrooms,
      frequency: state.frequency, addons: state.addons.slice(),
      facility: state.facility, sqft: state.sqft, nights: state.nights, scope: state.scope,
      slot1: state.slot1, slot2: state.slot2,
      name: state.name, phone: state.phone, email: state.email,
      company: state.company, access: state.access,
      street: state.street, unit: state.unit,
      addressCity: state.city2, addressState: "CA", addressZip: state.zip2,
      address: composedAddress(),
      photoConsent: state.photoConsent,
      smsConsent: state.smsConsent,
      lang: LANG,
      estimate: q ? q.total : null
    });

    var lines = [
      T(state.kind === "commercial" ? "mail.headerBiz" : "mail.headerHome"),
      "Reference: " + req.id,
      "",
      T("rev.name") + ": " + state.name,
      state.company ? T("rev.company") + ": " + state.company : "",
      T("rev.phone") + ": " + state.phone,
      T("rev.email") + ": " + state.email,
      T("rev.address") + ": " + composedAddress(),
      T("rev.location") + ": " + state.city + " " + state.zip,
      "",
      T("rev.first") + ": " + S.prettyDate(state.slot1.date) + " - " + S.windowLabel(state.slot1.window),
      T("rev.backup") + ": " + S.prettyDate(state.slot2.date) + " - " + S.windowLabel(state.slot2.window),
      ""
    ];
    if (state.kind === "residential") {
      lines.push(T("rev.property") + ": " + T("rev.bedbath", { bed: state.bedrooms, bath: state.bathrooms }));
      lines.push(T("rev.frequency") + ": " + S.frequencyLabel(state.frequency));
      lines.push(T("rev.addons") + ": " + (state.addons.map(function (id) {
        return S.addonLabel(id);
      }).join(", ") || T("mail.none")));
      lines.push(T("est.label") + ": $" + q.total);
    } else {
      lines.push(T("rev.facility") + ": " + state.facility);
      lines.push(T("rev.size") + ": " + (state.sqft || T("mail.notGiven")));
      lines.push(T("rev.perWeek") + ": " + (state.nights || T("mail.notGiven")));
      lines.push("Scope: " + (state.scope || T("mail.notGiven")));
    }
    if (state.access) { lines.push(""); lines.push("Notes: " + state.access); }

    var mailto = "mailto:" + BUSINESS_EMAIL +
      "?subject=" + encodeURIComponent(T("mail.subject",
        { id: req.id, name: state.name, city: state.city })) +
      "&body=" + encodeURIComponent(lines.filter(Boolean).join("\n"));

    // Try the server first. Whatever happens the customer sees a confirmation,
    // because the request is already saved locally by this point.
    postBooking(Object.assign({}, req, { lang: S.lang ? S.lang() : (document.documentElement.lang || "en") }))
      .then(function (res) {
        if (res && res.reference) {
          S.updateRequest(req.id, { serverRef: res.reference, confirmationSent: !!res.confirmationSent });
        }
        var note = root.querySelector("[data-sent-note]");
        if (note) {
          note.className = "notice notice--ok";
          note.textContent = (document.documentElement.lang === "es")
            ? "Te enviamos un correo de confirmaci\u00f3n. Rev\u00edsalo en unos minutos."
            : "A confirmation email is on its way \u2014 check your inbox in a moment.";
          note.hidden = false;
        }
      })["catch"](function () {
        var note = root.querySelector("[data-sent-note]");
        if (note) {
          note.className = "notice notice--warn";
          note.textContent = (document.documentElement.lang === "es")
            ? "Guardamos tu solicitud. Si no recibes el correo, ll\u00e1manos al 951-464-8147."
            : "Your request is saved. If no email arrives, call us on 951-464-8147.";
          note.hidden = false;
        }
      });

    idx = steps().length - 1;
    Object.keys(panels).forEach(function (k) { panels[k].classList.remove("is-active"); });
    panels.done.classList.add("is-active");
    elNavBar.hidden = true;
    elSteps.innerHTML = "";

    root.querySelector("[data-done]").innerHTML =
      '<div style="text-align:center;max-width:56ch;margin:0 auto;padding:1rem 0 .5rem">' +
      '<div style="width:56px;height:56px;border-radius:50%;background:var(--tint-aqua);display:grid;place-items:center;margin:0 auto 1.25rem">' +
      '<svg width="26" height="26" viewBox="0 0 20 20" fill="none" stroke="#17877a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 10.5 7.5 14.5 16.5 5"/></svg></div>' +
      "<h2 style='font-size:1.7rem'>" + T("done.title") + "</h2>" +
      "<p class='lede'>" + T("done.body", { first: state.name.split(" ")[0] }) + "</p>" +
      "<p style='font-family:var(--mono);font-size:.85rem;color:var(--muted)'>" + T("done.ref", { id: req.id }) + "</p>" +
      '<div class="notice" data-sent-note hidden style="text-align:left"></div>' +
      "<div style='display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap;margin-top:1.5rem'>" +
      "<a class='btn btn--primary' href=\"" + mailto + "\">" + T("done.email") + "</a>" +
      "<a class='btn btn--ghost' href='tel:9514648147'>" + T("done.call") + "</a></div>" +
      "<p style='font-size:.86rem;color:var(--muted);margin-top:1.5rem'>" + T("done.nocharge") + "</p></div>";

    window.scrollTo({ top: root.offsetTop - 90, behavior: "smooth" });
  }

  /* --- Navigation ---------------------------------------------------------- */
  elNext.addEventListener("click", function () {
    clearErrors();
    var errors = collectErrors();
    if (errors.length) { showErrors(errors); return; }
    hideErrorBanner();
    if (current() === "review") { submit(); return; }
    idx++;
    show();
  });
  elBack.addEventListener("click", function () {
    clearErrors();
    hideErrorBanner();
    if (idx > 0) idx--;
    show();
  });

  /* --- Go ------------------------------------------------------------------ */
  renderEstimate();
  show();
})();
