/**
 * MCC.access — who is signed in, and how.
 * -------------------------------------------------------------------------
 * The dashboard runs in two very different places:
 *
 *   Deployed    Static Web Apps has already checked identity before the page
 *               was served. Whoever is looking at it is allowed to. We only
 *               ask /.auth/me to find out their name and role.
 *
 *   file://     A copy opened from disk for a demo. There is no platform, so
 *               the built-in browser sign-in in js/auth.js stands in.
 *
 * The page never has to know which it is; it calls guard() and gets an answer.
 */
(function (window) {
  "use strict";

  var ME = "/.auth/me";
  var LOGIN = "/.auth/login/aad";
  var LOGOUT = "/.auth/logout";

  /** file:// has no platform behind it, so fall back to the local sign-in. */
  function isOffline() {
    return window.location.protocol === "file:";
  }

  function loginUrl(returnTo) {
    return LOGIN + "?post_login_redirect_uri=" +
      encodeURIComponent(returnTo || window.location.pathname);
  }

  /** @returns {Promise<{name,roles,provider}|null>} */
  function whoAmI() {
    if (isOffline()) return Promise.resolve(null);
    return fetch(ME, { credentials: "include" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (payload) {
        var p = payload && payload.clientPrincipal;
        if (!p) return null;
        return {
          name: p.userDetails,
          provider: p.identityProvider,
          roles: p.userRoles || []
        };
      })["catch"](function () { return null; });
  }

  /**
   * Allow the page to render, or send the visitor somewhere better.
   *
   * @param {object} opts
   *   roles        roles permitted here, e.g. ["owner","helper"]
   *   localRole    the js/auth.js role to use when running offline
   *   localLogin   the offline sign-in page
   * @returns {Promise<{mode:"swa"|"local", name:string, role:string}>}
   *   A rejected promise means a redirect is already under way; stop rendering.
   */
  function guard(opts) {
    opts = opts || {};
    var wanted = opts.roles || ["owner"];

    if (isOffline()) {
      var A = window.MCC && window.MCC.auth;
      var session = A && A.currentSession(opts.localRole);
      if (!session) {
        window.location.replace(opts.localLogin || "login.html");
        return Promise.reject(new Error("redirecting to the local sign-in"));
      }
      return Promise.resolve({
        mode: "local", name: session.user, role: opts.localRole || "owner"
      });
    }

    return whoAmI().then(function (me) {
      // Static Web Apps should have caught this already; belt and braces in
      // case a route rule is ever missing.
      if (!me) {
        window.location.replace(loginUrl());
        return Promise.reject(new Error("redirecting to Microsoft sign-in"));
      }
      var role = me.roles.filter(function (r) { return wanted.indexOf(r) > -1; })[0];
      if (!role) {
        // Signed in, but not invited. Sending them back to the login would
        // loop, so explain instead.
        window.location.replace("no-access.html");
        return Promise.reject(new Error("signed in without an assigned role"));
      }
      return { mode: "swa", name: me.name, role: role };
    });
  }

  function signOut(localRole) {
    if (isOffline()) {
      var A = window.MCC && window.MCC.auth;
      if (A) A.signOut(localRole);
      window.location.replace(localRole === "helper" ? "acceso.html" : "login.html");
      return;
    }
    window.location.href = LOGOUT + "?post_logout_redirect_uri=" +
      encodeURIComponent("/index.html");
  }

  window.MCC = window.MCC || {};
  window.MCC.access = {
    guard: guard, whoAmI: whoAmI, signOut: signOut,
    isOffline: isOffline, loginUrl: loginUrl
  };
})(window);
