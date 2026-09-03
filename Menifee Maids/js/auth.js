/* =========================================================================
   MCC.auth — owner sign-in
   -------------------------------------------------------------------------
   IMPORTANT, READ BEFORE LAUNCH
   This is a browser-side gate. It hashes the password with a per-install salt,
   locks out after repeated failures and expires the session, which stops a
   casual visitor from opening the dashboard. It is NOT real security: anyone
   who views source can read this file, and the customer data lives in the same
   browser storage regardless.

   Before this goes on a live domain, put admin.html and login.html behind
   hosting-level password protection (Netlify and Cloudflare Pages both do this
   for free) or a real server-side login. See README -> "Protect the dashboard".
   ========================================================================= */
(function (window) {
  "use strict";

  /* Two separate accounts. The owner runs the English dashboard and controls
     settings; the helper gets the Spanish dashboard, which has no settings at
     all. Different credentials, different sessions, different lockouts — one
     signing in does not sign the other in. */
  var KEYS = {
    owner:  { cred: "mcc.cred.v1",        session: "mcc.session.v1",        lock: "mcc.lock.v1" },
    helper: { cred: "mcc.cred.helper.v1", session: "mcc.session.helper.v1", lock: "mcc.lock.helper.v1" }
  };
  function K(role) { return KEYS[role === "helper" ? "helper" : "owner"]; }

  var SESSION_MINUTES = 120;   // idle sign-out
  var MAX_ATTEMPTS = 5;
  var LOCK_MINUTES = 10;

  /* First-run credentials — PLACEHOLDERS ONLY.
     -------------------------------------------------------------------------
     These are seed values for a fresh install. They are written to localStorage
     the first time the dashboard is opened, and the dashboard nags until the
     owner changes them through Settings.

     Because this file is served to the browser, whatever is written here is
     public. That is fine for placeholders and NOT fine for a live password:
     never commit the real one. On a live install, sign in once with the values
     below and immediately change both accounts, or edit this file locally
     (it is listed in .gitignore-worthy territory — see SECURITY.md).

     The real protection for a deployed site is the hosting-level auth described
     in the header comment above, not this gate. */
  var DEFAULTS = {
    owner:  { user: "owner",  pass: "CHANGE-ME-owner-2026" },
    helper: { user: "helper", pass: "CHANGE-ME-helper-2026" }
  };
  function defaultsFor(role) { return DEFAULTS[role === "helper" ? "helper" : "owner"]; }

  /* ---- compact SHA-256 (works on file:// where crypto.subtle may not) ---- */
  function sha256(ascii) {
    function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
    var maxWord = Math.pow(2, 32), i, j, result = "";
    var words = [], asciiBitLength = ascii.length * 8;
    var hash = sha256.h = sha256.h || [];
    var k = sha256.k = sha256.k || [];
    var primeCounter = k.length, isComposite = {};
    for (var candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (i = 0; i < 313; i += candidate) isComposite[i] = candidate;
        hash[primeCounter] = (Math.pow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    ascii += "\x80";
    while (ascii.length % 64 - 56) ascii += "\x00";
    for (i = 0; i < ascii.length; i++) {
      j = ascii.charCodeAt(i);
      if (j >> 8) return null;
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words.length] = (asciiBitLength / maxWord) | 0;
    words[words.length] = asciiBitLength;

    var h = hash.slice(0);
    for (j = 0; j < words.length;) {
      var w = words.slice(j, j += 16);
      var oldHash = h.slice(0);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2];
        var a = h[0], e = h[4];
        var temp1 = h[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) +
                    ((e & h[5]) ^ (~e & h[6])) + k[i] +
                    (w[i] = (i < 16) ? w[i] : (
                      w[i - 16] +
                      (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) +
                      w[i - 7] +
                      (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10)) | 0
                    ));
        var temp2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) +
                    ((a & h[1]) ^ (a & h[2]) ^ (h[1] & h[2]));
        h = [(temp1 + temp2) | 0].concat(h);
        h[4] = (h[4] + temp1) | 0;
      }
      for (i = 0; i < 8; i++) h[i] = (h[i] + oldHash[i]) | 0;
    }
    for (i = 0; i < 8; i++) {
      for (j = 3; j + 1; j--) {
        var b = (h[i] >> (j * 8)) & 255;
        result += ((b < 16) ? 0 : "") + b.toString(16);
      }
    }
    return result;
  }

  function randomSalt() {
    var chars = "abcdefghijklmnopqrstuvwxyz0123456789", out = "";
    if (window.crypto && window.crypto.getRandomValues) {
      var a = new Uint8Array(16);
      window.crypto.getRandomValues(a);
      for (var i = 0; i < a.length; i++) out += chars[a[i] % chars.length];
    } else {
      for (var j = 0; j < 16; j++) out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
  }

  /** Auth runs before i18n on some pages, so look the helper up lazily. */
  function M(text, vars) {
    var i18n = window.MCC && window.MCC.i18n;
    return i18n ? i18n.dashT(text, vars) : text;
  }

  function read(k, f) {
    try { var v = window.localStorage.getItem(k); return v ? JSON.parse(v) : f; }
    catch (e) { return f; }
  }
  function write(k, v) {
    try { window.localStorage.setItem(k, JSON.stringify(v)); return true; }
    catch (e) { return false; }
  }

  /** Creates the default credentials the first time the dashboard is opened. */
  function getCred(role) {
    var k = K(role), d = defaultsFor(role);
    var c = read(k.cred, null);
    if (!c) {
      var salt = randomSalt();
      c = {
        user: d.user,
        salt: salt,
        hash: sha256(salt + d.pass),
        isDefault: true,
        role: role === "helper" ? "helper" : "owner",
        createdAt: new Date().toISOString()
      };
      write(k.cred, c);
    }
    return c;
  }

  function usingDefaultPassword(role) { return !!getCred(role).isDefault; }

  /* ---- lockout ---- */
  function lockState(role) { return read(K(role).lock, { fails: 0, until: 0 }); }
  function lockedFor(role) {
    var l = lockState(role);
    var remaining = l.until - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 60000) : 0;
  }
  function noteFailure(role) {
    var l = lockState(role);
    l.fails = (l.fails || 0) + 1;
    if (l.fails >= MAX_ATTEMPTS) {
      l.until = Date.now() + LOCK_MINUTES * 60000;
      l.fails = 0;
    }
    write(K(role).lock, l);
    return l;
  }
  function clearFailures(role) { write(K(role).lock, { fails: 0, until: 0 }); }
  function attemptsLeft(role) {
    return Math.max(0, MAX_ATTEMPTS - (lockState(role).fails || 0));
  }

  /* ---- session ---- */
  function startSession(user, role) {
    try {
      window.sessionStorage.setItem(K(role).session, JSON.stringify({
        user: user, role: role === "helper" ? "helper" : "owner", at: Date.now()
      }));
    } catch (e) {}
  }
  function currentSession(role) {
    try {
      var raw = window.sessionStorage.getItem(K(role).session);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (Date.now() - s.at > SESSION_MINUTES * 60000) { signOut(role); return null; }
      s.at = Date.now();
      window.sessionStorage.setItem(K(role).session, JSON.stringify(s));
      return s;
    } catch (e) { return null; }
  }
  function signOut(role) {
    try { window.sessionStorage.removeItem(K(role).session); } catch (e) {}
  }

  /* ---- the two calls pages actually make ---- */
  function signIn(user, pass, role) {
    var wait = lockedFor(role);
    if (wait) {
      return { ok: false, reason: "locked",
               message: M(wait > 1 ? "Too many failed attempts. Try again in {n} minutes."
                                   : "Too many failed attempts. Try again in {n} minute.", { n: wait }) };
    }
    var c = getCred(role);
    var typed = sha256(c.salt + String(pass || ""));
    if (String(user || "").trim().toLowerCase() === c.user.toLowerCase() && typed === c.hash) {
      clearFailures(role);
      startSession(c.user, role);
      return { ok: true };
    }
    noteFailure(role);
    var left = attemptsLeft(role);
    return {
      ok: false, reason: "bad",
      message: M("That username and password don't match.") +
        (left > 0 && left <= 2
          ? " " + M(left > 1 ? "{n} attempts left before a 10 minute lockout."
                             : "{n} attempt left before a 10 minute lockout.", { n: left })
          : "")
    };
  }

  function changePassword(currentPass, newUser, newPass, role) {
    var c = getCred(role);
    if (sha256(c.salt + String(currentPass || "")) !== c.hash) {
      return { ok: false, message: M("Your current password isn't right.") };
    }
    if (String(newPass || "").length < 10) {
      return { ok: false, message: M("Use at least 10 characters.") };
    }
    writeCred(role, String(newUser || c.user).trim() || c.user, newPass, c.createdAt);
    return { ok: true };
  }

  function writeCred(role, user, pass, createdAt) {
    var salt = randomSalt();
    write(K(role).cred, {
      user: user, salt: salt, hash: sha256(salt + pass),
      isDefault: false, role: role === "helper" ? "helper" : "owner",
      createdAt: createdAt || new Date().toISOString(),
      changedAt: new Date().toISOString()
    });
  }

  /** The owner sets the helper's sign-in; no current password needed. */
  function setHelperCredentials(user, pass) {
    user = String(user || "").trim();
    if (!user) return { ok: false, message: M("Enter a username for the helper.") };
    if (String(pass || "").length < 10) return { ok: false, message: M("Use at least 10 characters.") };
    writeCred("helper", user, pass);
    return { ok: true };
  }

  function helperUsername() { return getCred("helper").user; }

  /** Drop-in guard for protected pages. Redirects when there's no session. */
  function requireSession(redirectTo, role) {
    if (currentSession(role)) return true;
    window.location.replace(redirectTo || "login.html");
    return false;
  }

  window.MCC = window.MCC || {};
  window.MCC.auth = {
    signIn: signIn, signOut: signOut, currentSession: currentSession,
    requireSession: requireSession, changePassword: changePassword,
    usingDefaultPassword: usingDefaultPassword, lockedFor: lockedFor,
    setHelperCredentials: setHelperCredentials, helperUsername: helperUsername,
    defaults: DEFAULTS.owner, defaultsFor: defaultsFor,
    sha256: sha256
  };
})(window);
