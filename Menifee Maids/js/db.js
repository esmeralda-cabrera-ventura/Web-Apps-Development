/* =========================================================================
   MCC.db — the job database
   -------------------------------------------------------------------------
   Every job lives here, organised by status. Two interchangeable adapters sit
   behind one API:

     LocalAdapter  browser storage. What runs today, with no server.
     RestAdapter   a REST API in front of a cloud database (Azure SQL,
                   PostgreSQL, whatever you host). Switched on by pasting the
                   API base URL into Dashboard -> Settings.

   Every method returns a Promise, so moving from local to cloud changes a
   setting rather than any calling code. The REST contract each endpoint must
   satisfy is documented in server/README.md.
   ========================================================================= */
(function (window) {
  "use strict";

  var S = window.MCC.store;

  /* ---------------------------------------------------------------------
     Status model. `bucket` is what the dashboard's Present/Past tabs use.
     --------------------------------------------------------------------- */
  var STATUSES = {
    "new":       { label: "New request",     bucket: "present", pill: "pill--new",  order: 1 },
    "awaiting":  { label: "Awaiting client", bucket: "present", pill: "pill--wait", order: 2 },
    "confirmed": { label: "Confirmed",       bucket: "present", pill: "pill--conf", order: 3 },
    "done":      { label: "Completed",       bucket: "present", pill: "pill--done", order: 4 },
    "cancelled": { label: "Cancelled",       bucket: "past",    pill: "pill--done", order: 6 }
  };

  /**
   * Closing a job takes two things: the work finished AND the money in.
   * Either one on its own leaves it open, which is why a completed but unpaid
   * job keeps showing as outstanding rather than disappearing into the past.
   */
  function displayFor(job) {
    if (job.status === "cancelled") {
      return { key: "cancelled", label: "Cancelled", pill: "pill--done", bucket: "past" };
    }
    if (job.status === "done") {
      return isPaid(job)
        ? { key: "closed", label: "Closed", pill: "pill--conf", bucket: "past" }
        : { key: "done_unpaid", label: "Done \u2014 unpaid", pill: "pill--new", bucket: "present" };
    }
    var base = STATUSES[job.status] || STATUSES["new"];
    return { key: job.status, label: base.label, pill: base.pill, bucket: "present" };
  }

  function bucketOf(job) { return displayFor(job).bucket; }

  /** True only when both conditions are satisfied. */
  function isClosed(job) { return job.status === "done" && isPaid(job); }

  function isPaid(job) {
    if (job.paidAt) return true;
    return S.paymentsFor(job.id).some(function (p) { return p.status === "paid"; });
  }

  function paymentFor(job) {
    var list = S.paymentsFor(job.id);
    var paidOne = list.filter(function (p) { return p.status === "paid"; })[0];
    return paidOne || list.filter(function (p) { return p.status !== "replaced"; })[0] || null;
  }

  function statusMeta(status) {
    return STATUSES[status] || STATUSES["new"];
  }

  /** A single flat record, whichever adapter it came from. */
  function shape(job) {
    var pay = paymentFor(job);
    return {
      id: job.id,
      status: job.status || "new",
      display: displayFor(job),
      bucket: bucketOf(job),
      paid: isPaid(job),
      closed: isClosed(job),
      kind: job.kind || "residential",
      name: job.name || "",
      company: job.company || "",
      email: job.email || "",
      phone: job.phone || "",
      address: job.address || "",
      city: job.city || "",
      zip: job.zip || "",
      scheduledFor: (job.confirmedSlot && job.confirmedSlot.date) || null,
      window: (job.confirmedSlot && job.confirmedSlot.window) || null,
      createdAt: job.createdAt || null,
      amount: pay ? pay.amount : (job.estimate ? job.estimate * 100 : null),
      paymentStatus: pay ? pay.status : null,
      paymentToken: pay ? pay.token : null,
      stripeRef: pay ? (pay.stripeRef || null) : null,
      verifiedAt: pay ? (pay.verifiedAt || null) : null,
      photoCount: (job.photos || []).length,
      completedAt: job.completedAt || null,
      raw: job
    };
  }

  /* =====================================================================
     Adapters
     ===================================================================== */

  var LocalAdapter = {
    name: "local",
    listAll: function () {
      return Promise.resolve(S.getRequests().map(shape));
    },
    get: function (id) {
      var hit = S.getRequests().filter(function (j) { return j.id === id; })[0];
      return Promise.resolve(hit ? shape(hit) : null);
    },
    save: function (job) {
      S.updateRequest(job.id, job);
      return Promise.resolve(true);
    },
    remove: function (id) {
      S.saveRequests(S.getRequests().filter(function (j) { return j.id !== id; }));
      return Promise.resolve(true);
    }
  };

  function RestAdapter(baseUrl, apiKey) {
    var base = String(baseUrl).replace(/\/+$/, "");
    function headers() {
      var h = { "Content-Type": "application/json" };
      if (apiKey) h["x-api-key"] = apiKey;
      return h;
    }

    /** Errors here are rendered inside the dashboard, so they follow its language. */
    function say(en) {
      var i18n = window.MCC && window.MCC.i18n;
      return i18n ? i18n.dash(en) : en;
    }
    function fail(res) {
      if (res.status === 401) {
        throw new Error(say("The job database refused that API key. Check it in Settings."));
      }
      if (res.status === 403) {
        throw new Error(say("This account doesn't have access to the job database."));
      }
      throw new Error(say("The job database could not be reached. Check the connection and try again."));
    }
    return {
      name: "cloud",
      listAll: function () {
        return fetch(base + "/jobs", { headers: headers() })
          .then(function (r) { return r.ok ? r.json() : fail(r); })
          .then(function (rows) { return (rows.jobs || rows).map(shape); });
      },
      get: function (id) {
        return fetch(base + "/jobs/" + encodeURIComponent(id), { headers: headers() })
          .then(function (r) { return r.ok ? r.json() : fail(r); })
          .then(function (j) { return j ? shape(j.job || j) : null; });
      },
      save: function (job) {
        return fetch(base + "/jobs/" + encodeURIComponent(job.id), {
          method: "PUT", headers: headers(), body: JSON.stringify(job)
        }).then(function (r) { return r.ok ? true : fail(r); });
      },
      remove: function (id) {
        return fetch(base + "/jobs/" + encodeURIComponent(id), {
          method: "DELETE", headers: headers()
        }).then(function (r) { return r.ok ? true : fail(r); });
      }
    };
  }

  /**
   * Deployed on Static Web Apps the API sits at /api on the same origin, so no
   * configuration is needed. Opened from a file:// copy it stays local.
   */
  function defaultApiBase() {
    if (window.location.protocol === "file:") return "";
    return window.location.origin + "/api";
  }

  /**
   * A key is only ever attached to an API on a different origin — a self-hosted
   * backend during development. The deployed API is same-origin and is
   * authenticated by the Static Web Apps cookie, so no key is sent and none
   * needs to exist in the browser.
   */
  function keyFor(baseUrl, cfg) {
    try {
      if (new URL(baseUrl, window.location.href).origin === window.location.origin) return null;
    } catch (e) { return null; }
    return cfg.apiKey || null;
  }

  function adapter() {
    var cfg = S.getSettings();
    if (cfg.apiBaseUrl && /^https:\/\//i.test(cfg.apiBaseUrl)) {
      return RestAdapter(cfg.apiBaseUrl, keyFor(cfg.apiBaseUrl, cfg));
    }
    if (cfg.useHostedApi !== false && defaultApiBase()) {
      // No key on the deployed site: Static Web Apps authenticates the request
      // with its own cookie, so the browser never needs to hold one.
      return RestAdapter(defaultApiBase(), null);
    }
    return LocalAdapter;
  }

  function isRemote() { return adapter().name === "cloud"; }

  /* =====================================================================
     Search
     ===================================================================== */

  function haystack(j) {
    return [j.id, j.name, j.company, j.email, j.phone, j.address, j.city, j.zip]
      .join(" ").toLowerCase();
  }

  /**
   * @param {object} f
   *   q       free text across job number, name, company, contact, address
   *   bucket  "present" | "past" | "all"
   *   status  a specific status, or "" for any
   *   paid    "paid" | "unpaid" | ""
   *   from,to ISO dates bounding the scheduled date
   *   sort    "date" | "name" | "amount"
   */
  function search(f) {
    f = f || {};
    return adapter().listAll().then(function (rows) {
      var q = String(f.q || "").trim().toLowerCase();
      var out = rows.filter(function (j) {
        if (f.bucket && f.bucket !== "all" && j.bucket !== f.bucket) return false;
        if (f.status) {
          var want = f.status;
          var isDerived = want === "closed" || want === "done_unpaid";
          if (isDerived ? j.display.key !== want : j.status !== want) return false;
        }
        if (f.paid === "paid" && !j.paid) return false;
        if (f.paid === "unpaid" && j.paid) return false;
        if (f.from && (!j.scheduledFor || j.scheduledFor < f.from)) return false;
        if (f.to && (!j.scheduledFor || j.scheduledFor > f.to)) return false;
        if (q && haystack(j).indexOf(q) === -1) return false;
        return true;
      });

      var sort = f.sort || "date";
      out.sort(function (a, b) {
        if (sort === "name") return (a.name || "").localeCompare(b.name || "");
        if (sort === "amount") return (b.amount || 0) - (a.amount || 0);
        var ad = a.scheduledFor || a.createdAt || "";
        var bd = b.scheduledFor || b.createdAt || "";
        return bd.localeCompare(ad);
      });
      return out;
    });
  }

  function stats() {
    return adapter().listAll().then(function (rows) {
      var s = { total: rows.length, present: 0, past: 0, unpaidValue: 0, paidValue: 0, byStatus: {} };
      rows.forEach(function (j) {
        s[j.bucket]++;
        s.byStatus[j.status] = (s.byStatus[j.status] || 0) + 1;
        if (j.amount) {
          if (j.paid) s.paidValue += j.amount; else s.unpaidValue += j.amount;
        }
      });
      return s;
    });
  }

  window.MCC.db = {
    STATUSES: STATUSES, statusMeta: statusMeta, bucketOf: bucketOf,
    displayFor: displayFor, isClosed: isClosed,
    isPaid: isPaid, paymentFor: paymentFor, shape: shape,
    search: search, stats: stats, isRemote: isRemote,
    list: function () { return adapter().listAll(); },
    get: function (id) { return adapter().get(id); },
    save: function (j) { return adapter().save(j); },
    remove: function (id) { return adapter().remove(id); }
  };
})(window);
