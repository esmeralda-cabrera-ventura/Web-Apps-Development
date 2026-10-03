/**
 * MCC.errorLang — which language an error page should speak.
 *
 * An error page is shared: there is one 404 and one 403 for the whole site, so
 * neither can be pre-rendered in a language. It has to work out for itself
 * whether the person who hit it was on the Spanish site or the English one.
 *
 * Three signals, most reliable first:
 *
 *   1. The language of the last real page they were on. Every page records
 *      this, so it survives a redirect that loses the referrer.
 *   2. The referrer's path. Covers a first visit that lands straight on an
 *      error, e.g. a mistyped Spanish URL shared in a message.
 *   3. The browser's own language. Last resort, and the weakest: plenty of
 *      Spanish speakers run an English phone.
 */
(function (window) {
  "use strict";

  var KEY = "mcc.lang";
  // Every Spanish page, so a referrer can be matched without guessing.
  var ES_PAGES = /(index-es|servicios|reservar|admin-es|acceso)\.html/i;

  function stored() {
    try {
      var v = window.localStorage.getItem(KEY);
      return v === "es" || v === "en" ? v : null;
    } catch (e) { return null; }
  }

  function fromReferrer() {
    var ref = document.referrer || "";
    if (!ref) return null;
    if (ES_PAGES.test(ref)) return "es";
    if (/\?.*lang=es|&lang=es/i.test(ref)) return "es";
    // A known English page tells us just as much as a Spanish one.
    if (/(index|services|book|admin|helper|login)\.html/i.test(ref)) return "en";
    return null;
  }

  function fromBrowser() {
    var langs = navigator.languages || [navigator.language || "en"];
    for (var i = 0; i < langs.length; i++) {
      if (String(langs[i]).toLowerCase().indexOf("es") === 0) return "es";
    }
    return "en";
  }

  /** @returns {"es"|"en"} */
  function detect() {
    return stored() || fromReferrer() || fromBrowser();
  }

  /** Called by every normal page so the next error page knows where we were. */
  function remember(lang) {
    try { window.localStorage.setItem(KEY, lang === "es" ? "es" : "en"); } catch (e) {}
  }

  function set(lang) {
    remember(lang);
    return lang;
  }

  window.MCC = window.MCC || {};
  window.MCC.errorLang = { detect: detect, remember: remember, set: set };
})(window);
