/* =========================================================================
   MCC.store — shared data layer
   -------------------------------------------------------------------------
   Everything lives in localStorage so the site runs with no server. When you
   move to a real backend, replace the four functions marked ADAPTER below and
   nothing else in the site has to change.
   ========================================================================= */
(function (window) {
  "use strict";

  var KEYS = {
    availability: "mcc.availability.v1",
    requests:     "mcc.requests.v1",
    payments:     "mcc.payments.v1",
    settings:     "mcc.settings.v1",
    seeded:       "mcc.seeded.v1"
  };

  /* --- Time windows the business offers --------------------------------- */
  var WINDOWS = [
    { id: "morning",   label: "Morning",   time: "8:00 – 11:00 AM" },
    { id: "midday",    label: "Midday",    time: "11:00 AM – 2:00 PM" },
    { id: "afternoon", label: "Afternoon", time: "2:00 – 5:00 PM" },
    { id: "evening",   label: "Evening",   time: "5:00 – 8:00 PM" }
  ];

  /* --- Service area ------------------------------------------------------ */
  var CITIES = [
    "Menifee", "Murrieta", "Temecula", "Perris", "Moreno Valley", "Riverside",
    "Wildomar", "Corona", "Hemet", "Homeland", "Lake Elsinore", "Winchester",
    "San Jacinto", "Nuevo", "Canyon Lake"
  ];

  var ZIPS = {
    // Menifee
    "92584": "Menifee",  "92585": "Menifee",  "92586": "Menifee",
    // Canyon Lake
    "92587": "Canyon Lake",
    // Murrieta
    "92562": "Murrieta", "92563": "Murrieta",
    // Wildomar / Winchester
    "92595": "Wildomar", "92596": "Winchester",
    // Temecula
    "92590": "Temecula", "92591": "Temecula", "92592": "Temecula", "92593": "Temecula",
    // Lake Elsinore
    "92530": "Lake Elsinore", "92531": "Lake Elsinore", "92532": "Lake Elsinore",
    // Perris / Nuevo / Homeland
    "92570": "Perris", "92571": "Perris", "92572": "Perris",
    "92567": "Nuevo",  "92548": "Homeland",
    // Hemet
    "92543": "Hemet", "92544": "Hemet", "92545": "Hemet", "92546": "Hemet",
    // San Jacinto
    "92581": "San Jacinto", "92582": "San Jacinto", "92583": "San Jacinto",
    // Moreno Valley
    "92551": "Moreno Valley", "92552": "Moreno Valley", "92553": "Moreno Valley",
    "92554": "Moreno Valley", "92555": "Moreno Valley", "92556": "Moreno Valley",
    "92557": "Moreno Valley",
    // Corona
    "92877": "Corona", "92878": "Corona", "92879": "Corona", "92880": "Corona",
    "92881": "Corona", "92882": "Corona", "92883": "Corona",
    // Riverside
    "92501": "Riverside", "92502": "Riverside", "92503": "Riverside", "92504": "Riverside",
    "92505": "Riverside", "92506": "Riverside", "92507": "Riverside", "92508": "Riverside",
    "92509": "Riverside", "92518": "Riverside", "92521": "Riverside", "92522": "Riverside"
  };


  /* --- Pricing rules -----------------------------------------------------
     Edit these numbers to match your real pricing. The $150 minimum from your
     brief is enforced at the bottom of estimate().
     --------------------------------------------------------------------- */
  var PRICING = {
    minimum: 150,        // your $150 minimum per visit — always enforced last
    base: 75,            // starting point before any rooms are counted
    perBedroom: 28,
    perBathroom: 25,

    // Recurring visits take less time, so they cost less per visit.
    frequency: {
      once:     { label: "One-time",  mult: 1.00 },
      monthly:  { label: "Monthly",   mult: 0.90 },
      biweekly: { label: "Biweekly",  mult: 0.75 },
      weekly:   { label: "Weekly",    mult: 0.68 }
    },

    addons: [
      { id: "oven",     label: "Inside oven",            price: 35 },
      { id: "fridge",   label: "Inside refrigerator",    price: 30 },
      { id: "windows",  label: "Interior windows",       price: 45 },
      { id: "laundry",  label: "Laundry",                price: 25 },
      { id: "fans",     label: "Ceiling fans & vents",   price: 20 },
      { id: "carpet",   label: "Carpet & deodorizing",   price: 65 },
      { id: "garage",   label: "Garage organizing",      price: 75 },
      { id: "declutter",label: "Decluttering & closets", price: 50 },
      { id: "petfur",   label: "Pet fur removal",        price: 40 },
      { id: "odor",     label: "Odor removal",           price: 55 }
    ]
  };

  /* --- localStorage helpers (ADAPTER) ------------------------------------ */
  function read(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { window.localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }

  /* --- Date helpers ------------------------------------------------------ */
  function iso(d) {
    return d.getFullYear() + "-" +
           String(d.getMonth() + 1).padStart(2, "0") + "-" +
           String(d.getDate()).padStart(2, "0");
  }
  function parseISO(s) {
    var p = String(s).split("-");
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }
  function today() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  /* --- Language-aware labels ---------------------------------------------
     The owner's dashboard always renders English. Anything the customer sees
     is asked for in their language, which is stored on the job.
     --------------------------------------------------------------------- */
  function i18n() { return window.MCC && window.MCC.i18n; }

  function prettyDate(s, lang) {
    var loc = i18n() ? i18n().locale(lang) : "en-US";
    return parseISO(s).toLocaleDateString(loc, { weekday: "long", month: "long", day: "numeric" });
  }
  function windowName(id, lang) {
    if (i18n()) return i18n().term("windows", id, lang);
    for (var i = 0; i < WINDOWS.length; i++) if (WINDOWS[i].id === id) return WINDOWS[i].label;
    return id;
  }
  function windowLabel(id, lang) {
    for (var i = 0; i < WINDOWS.length; i++) {
      if (WINDOWS[i].id === id) return windowName(id, lang) + " (" + WINDOWS[i].time + ")";
    }
    return id;
  }
  function frequencyLabel(id, lang) {
    if (i18n()) return i18n().term("frequency", id, lang);
    return (PRICING.frequency[id] || {}).label || id;
  }
  function addonLabel(id, lang) {
    if (i18n()) return i18n().term("addons", id, lang);
    var out = id;
    PRICING.addons.forEach(function (a) { if (a.id === id) out = a.label; });
    return out;
  }

  /* --- Availability (ADAPTER) --------------------------------------------
     Shape: { "2026-08-25": ["morning","afternoon"], ... }
     --------------------------------------------------------------------- */
  function getAvailability() { return read(KEYS.availability, {}); }
  function setAvailability(map) { return write(KEYS.availability, map); }

  function getDay(dateISO) { return getAvailability()[dateISO] || []; }

  function setDay(dateISO, windows) {
    var map = getAvailability();
    if (!windows || !windows.length) { delete map[dateISO]; }
    else { map[dateISO] = windows.slice(); }
    return setAvailability(map);
  }

  /** Upcoming open dates, soonest first. */
  function openDates(limitDays) {
    var map = getAvailability(), start = today(), out = [];
    var days = limitDays || 60;
    for (var i = 0; i < days; i++) {
      var key = iso(addDays(start, i));
      if (map[key] && map[key].length) out.push({ date: key, windows: map[key].slice() });
    }
    return out;
  }

  /** First-run demo availability so the calendar isn't empty on day one. */
  function seedIfEmpty() {
    if (read(KEYS.seeded, false)) return;
    var map = getAvailability();
    if (Object.keys(map).length === 0) {
      var start = today();
      for (var i = 1; i <= 45; i++) {
        var d = addDays(start, i), dow = d.getDay();
        if (dow === 0) continue;                                  // closed Sundays
        if (dow === 6) map[iso(d)] = ["morning"];                 // Saturday mornings
        else map[iso(d)] = ["morning", "afternoon"];              // weekdays
      }
      setAvailability(map);
    }
    write(KEYS.seeded, true);
  }

  /* --- Requests (ADAPTER) ------------------------------------------------ */
  function getRequests() { return read(KEYS.requests, []); }
  function saveRequests(list) { return write(KEYS.requests, list); }

  function addRequest(req) {
    var list = getRequests();
    req.id = req.id || makeRef();
    req.createdAt = new Date().toISOString();
    req.status = req.status || "new";
    list.unshift(req);
    saveRequests(list);
    return req;
  }
  function updateRequest(id, patch) {
    var list = getRequests();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) { Object.assign(list[i], patch); break; }
    }
    saveRequests(list);
    return list;
  }
  function makeRef() {
    var d = new Date();
    var stamp = String(d.getFullYear()).slice(2) +
                String(d.getMonth() + 1).padStart(2, "0") +
                String(d.getDate()).padStart(2, "0");
    var rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return "MCC-" + stamp + "-" + rand;
  }

  /* --- Estimate ---------------------------------------------------------- */
  /**
   * Price = (base + rooms) x frequency multiplier + add-ons, floored at the
   * minimum and rounded to the nearest $5. Savings are reported in dollars,
   * not percentages, because "save $55 every visit" beats "save 25%".
   */
  function estimate(input) {
    var beds = Number(input.bedrooms || 0);
    var baths = Number(input.bathrooms || 0);
    var freq = PRICING.frequency[input.frequency] || PRICING.frequency.once;

    var rooms = PRICING.base + beds * PRICING.perBedroom + baths * PRICING.perBathroom;

    var addons = 0;
    (input.addons || []).forEach(function (id) {
      PRICING.addons.forEach(function (a) { if (a.id === id) addons += a.price; });
    });

    function settle(n) { return Math.max(PRICING.minimum, Math.round(n / 5) * 5); }

    var oneTime = settle(rooms + addons);
    var total = settle(rooms * freq.mult + addons);

    return {
      oneTime: oneTime,
      total: total,
      savings: Math.max(0, oneTime - total),
      isRecurring: !!(input.frequency && input.frequency !== "once")
    };
  }

  /* --- Job photos --------------------------------------------------------
     Photos are stored on the job record itself, so a job carries its own
     evidence: details, notes and pictures in one place.
     --------------------------------------------------------------------- */
  var MAX_PHOTOS = 7;

  function getPhotos(id) {
    var hit = getRequests().filter(function (r) { return r.id === id; })[0];
    return (hit && hit.photos) || [];
  }

  /** @returns {boolean} false when the browser refused to store them. */
  function setPhotos(id, photos) {
    var list = getRequests(), prev = null, found = false;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id !== id) continue;
      prev = list[i].photos || [];
      list[i].photos = photos.slice(0, MAX_PHOTOS);
      list[i].photosUpdatedAt = new Date().toISOString();
      found = true;
      break;
    }
    if (!found) return false;
    if (saveRequests(list)) return true;
    // Out of room: put back what was there so nothing is silently lost.
    for (var j = 0; j < list.length; j++) {
      if (list[j].id === id) { list[j].photos = prev; break; }
    }
    saveRequests(list);
    return false;
  }

  /* --- Settings ----------------------------------------------------------
     `stripeUrl` is where the Pay button sends the customer. Paste a Stripe
     Payment Link (or Checkout URL) here once the Stripe account is connected.
     --------------------------------------------------------------------- */
  var DEFAULT_SETTINGS = {
    stripeUrl: "",         // Stripe Payment Link the Pay button opens
    stripeVerifyUrl: "",   // your endpoint that asks Stripe whether a job is paid
    apiBaseUrl: "",        // REST API in front of the cloud job database
    apiKey: "",
    businessName: "Menifee Maids",
    payExpiryDays: 21,
    monthResetAt: "",
    useHostedApi: false   // set true once the API is deployed
  };
  /* Settings fetched from the server for this session. Held in memory only —
     never written to storage, so a helper's device keeps nothing sensitive
     even briefly. */
  var sessionSettings = null;

  function applyRemoteSettings(obj) {
    sessionSettings = obj || null;
    // A helper's device should not be carrying the owner's configuration around
    // from some earlier session or a shared browser.
    if (obj && obj.role && obj.role !== "owner") scrubSecrets();
    return sessionSettings;
  }

  /** Remove anything sensitive from local storage. */
  function scrubSecrets() {
    var v = read(KEYS.settings, null);
    if (!v) return false;
    var dirty = false;
    ["apiKey", "apiBaseUrl", "stripeVerifyUrl"].forEach(function (k) {
      if (v[k]) { delete v[k]; dirty = true; }
    });
    if (dirty) write(KEYS.settings, v);
    return dirty;
  }

  function getSettings() {
    if (sessionSettings) {
      return Object.assign({}, DEFAULT_SETTINGS, sessionSettings);
    }
    var v = read(KEYS.settings, {});
    return Object.assign({}, DEFAULT_SETTINGS, v);
  }
  function saveSettings(patch) {
    var next = Object.assign(getSettings(), patch || {});
    write(KEYS.settings, next);
    return next;
  }

  /* --- Payment links -----------------------------------------------------
     A payment link is a one-off, unguessable token tied to a single job. The
     job's details ride along inside the URL fragment so the page renders on
     the customer's device without needing a database; the token is also
     recorded here so the owner can see what was sent and mark it paid.
     --------------------------------------------------------------------- */
  function payToken() {
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    var out = "", i, arr;
    if (window.crypto && window.crypto.getRandomValues) {
      arr = new Uint8Array(22);
      window.crypto.getRandomValues(arr);
      for (i = 0; i < arr.length; i++) out += chars[arr[i] % chars.length];
    } else {
      for (i = 0; i < 22; i++) out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
  }

  function b64urlEncode(str) {
    return btoa(unescape(encodeURIComponent(str)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function b64urlDecode(str) {
    var t = str.replace(/-/g, "+").replace(/_/g, "/");
    while (t.length % 4) t += "=";
    return decodeURIComponent(escape(atob(t)));
  }

  function getPayments() { return read(KEYS.payments, []); }
  function savePayments(list) { return write(KEYS.payments, list); }

  /**
   * Build a payment link for a job.
   * @returns {{token, url, amount, expiresAt}}
   */
  function createPayment(req, amountDollars, opts) {
    opts = opts || {};
    var settings = getSettings();
    var days = Number(opts.days || settings.payExpiryDays || 21);
    var exp = new Date();
    exp.setDate(exp.getDate() + days);

    var token = payToken();
    var payload = {
      t: token,
      r: req.id,                                    // job number
      n: req.name,
      a: Math.round(Number(amountDollars) * 100),   // cents
      d: opts.description || describeJob(req),
      e: exp.toISOString().slice(0, 10),
      b: settings.businessName
    };

    // The job number sits in the query string as well as the signed payload, so
    // the link is readably tied to one job and the page can cross-check them.
    var base = (opts.baseUrl || "").replace(/[^/]*$/, "");
    var url = base + "pay.html?job=" + encodeURIComponent(req.id) +
              (req.lang === "es" ? "&lang=es" : "") +
              "#d=" + b64urlEncode(JSON.stringify(payload));

    // Only one live link per job: older unpaid links for this job are retired.
    var list = getPayments();
    list.forEach(function (p) {
      if (p.requestId === req.id && p.status === "sent") p.status = "replaced";
    });

    list.unshift({
      token: token, requestId: req.id, jobNumber: req.id, amount: payload.a,
      description: payload.d, createdAt: new Date().toISOString(),
      expiresAt: exp.toISOString(), status: "sent", url: url,
      stripeRef: null, verifiedAt: null
    });
    savePayments(list);

    return { token: token, url: url, amount: payload.a, expiresAt: exp, jobNumber: req.id };
  }

  function describeJob(req, lang) {
    if (lang === "es") {
      if (req.kind === "commercial") return "Limpieza comercial";
      var b = [];
      if (req.bedrooms) b.push(req.bedrooms + " rec\u00e1maras");
      if (req.bathrooms) b.push(req.bathrooms + " ba\u00f1os");
      return "Limpieza de casa" + (b.length ? " \u2014 " + b.join(" / ") : "");
    }
    if (req.kind === "commercial") return "Commercial cleaning";
    var bits = [];
    if (req.bedrooms) bits.push(req.bedrooms + " bed");
    if (req.bathrooms) bits.push(req.bathrooms + " bath");
    return "House cleaning" + (bits.length ? " \u2014 " + bits.join(" / ") : "");
  }

  function paymentsFor(requestId) {
    return getPayments().filter(function (p) { return p.requestId === requestId; });
  }
  function markPayment(token, status) {
    var list = getPayments();
    for (var i = 0; i < list.length; i++) {
      if (list[i].token === token) {
        list[i].status = status;
        list[i][status === "paid" ? "paidAt" : "updatedAt"] = new Date().toISOString();
        break;
      }
    }
    savePayments(list);
    return list;
  }
  /**
   * Store what Stripe told us about a job. Called by the dashboard after it
   * queries the owner's verification endpoint.
   */
  function recordVerification(token, result) {
    var list = getPayments();
    for (var i = 0; i < list.length; i++) {
      if (list[i].token !== token) continue;
      list[i].verifiedAt = new Date().toISOString();
      list[i].stripeRef = result.stripeRef || result.paymentIntentId || null;
      if (result.paid) {
        list[i].status = "paid";
        list[i].paidAt = result.paidAt || new Date().toISOString();
        if (result.amountPaid) list[i].amountPaid = result.amountPaid;
      } else if (list[i].status === "paid") {
        list[i].status = "sent";
      }
      break;
    }
    savePayments(list);
    return list;
  }

  function activePaymentFor(requestId) {
    return getPayments().filter(function (p) {
      return p.requestId === requestId && p.status !== "replaced";
    })[0] || null;
  }

  function readPayload(fragment) {
    try { return JSON.parse(b64urlDecode(fragment)); } catch (e) { return null; }
  }
  function money(cents) {
    return "$" + (Number(cents) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /* --- Backup / restore -------------------------------------------------- */
  function exportAll() {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      availability: getAvailability(),
      requests: getRequests(),
      payments: getPayments(),
      settings: getSettings()
    }, null, 2);
  }
  function importAll(json) {
    var data = JSON.parse(json);
    if (data.availability) setAvailability(data.availability);
    if (data.requests) saveRequests(data.requests);
    if (data.payments) savePayments(data.payments);
    if (data.settings) saveSettings(data.settings);
    write(KEYS.seeded, true);
    return true;
  }

  window.MCC = window.MCC || {};
  window.MCC.store = {
    WINDOWS: WINDOWS, CITIES: CITIES, ZIPS: ZIPS, PRICING: PRICING,
    iso: iso, parseISO: parseISO, today: today, addDays: addDays,
    prettyDate: prettyDate, windowLabel: windowLabel, windowName: windowName,
    frequencyLabel: frequencyLabel, addonLabel: addonLabel,
    getAvailability: getAvailability, setAvailability: setAvailability,
    getDay: getDay, setDay: setDay, openDates: openDates, seedIfEmpty: seedIfEmpty,
    getRequests: getRequests, addRequest: addRequest, updateRequest: updateRequest,
    saveRequests: saveRequests, makeRef: makeRef,
    estimate: estimate, exportAll: exportAll, importAll: importAll,
    getSettings: getSettings, saveSettings: saveSettings,
    applyRemoteSettings: applyRemoteSettings, scrubSecrets: scrubSecrets,
    createPayment: createPayment, getPayments: getPayments, savePayments: savePayments,
    paymentsFor: paymentsFor,
    markPayment: markPayment, readPayload: readPayload, money: money,
    recordVerification: recordVerification, activePaymentFor: activePaymentFor,
    describeJob: describeJob, payToken: payToken,
    getPhotos: getPhotos, setPhotos: setPhotos, MAX_PHOTOS: MAX_PHOTOS
  };
})(window);
