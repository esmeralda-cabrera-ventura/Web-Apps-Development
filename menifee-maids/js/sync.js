/* =========================================================================
   Cloud sync for the staff dashboards

   The dashboard reads and writes a working copy in this browser's storage.
   This module keeps that copy in step with Cosmos DB through the /api routes,
   so every staff phone sees the same jobs, payment links, photos and calendar,
   and bookings made on customers' own devices appear in the inbox.

   How it works
   - Pull: fetch jobs, payment links and the calendar, then merge them into the
     local copy. Remote changes win unless this device has an unsent change.
   - Push: any local write is noticed, and after a short pause the changed
     records are sent up. Photos are uploaded to Blob Storage first.
   - A snapshot of what was last agreed with the cloud ("mcc.cloud.v1") is what
     tells a local edit apart from a remote one, and a local deletion apart
     from a record that simply has not arrived yet.

   Only runs on the deployed site. A file:// copy stays fully local.
   ========================================================================= */
(function (window) {
  "use strict";

  if (window.location.protocol === "file:") return;

  var KEYS = {
    requests: "mcc.requests.v1",
    payments: "mcc.payments.v1",
    availability: "mcc.availability.v1"
  };
  var SNAP_KEY = "mcc.cloud.v1";
  var API = "/api";
  var PUSH_DELAY_MS = 1500;
  var PULL_EVERY_MS = 45000;
  var MAX_DELETES_PER_PUSH = 3;   // more than this at once is treated as an accident

  var ES = (document.documentElement.lang || "").slice(0, 2) === "es";
  var TXT = ES
    ? { syncing: "Sincronizando\u2026", ok: "Sincronizado", off: "Sin conexi\u00f3n \u2014 los cambios se guardar\u00e1n al reconectar",
        auth: "Inicia sesi\u00f3n de nuevo para sincronizar", err: "No se pudo sincronizar \u2014 se reintentar\u00e1",
        net: "No se pudo conectar \u2014 si sigue as\u00ed, vuelve a iniciar sesi\u00f3n" }
    : { syncing: "Syncing\u2026", ok: "Synced", off: "Offline \u2014 changes will sync when you reconnect",
        auth: "Sign in again to sync", err: "Couldn't sync \u2014 will retry",
        net: "Can't reach the server \u2014 if this continues, sign in again" };

  /* --- Storage ----------------------------------------------------------- */
  var quiet = 0;   // >0 while this module writes, so its own writes don't trigger a push

  function read(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function write(key, value) {
    quiet++;
    try { window.localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
    finally { quiet--; }
  }
  function snapshot() {
    var s = read(SNAP_KEY, null);
    if (!s || typeof s !== "object") s = {};
    s.jobs = s.jobs || {};
    s.pays = s.pays || {};
    if (!("avail" in s)) s.avail = null;
    return s;
  }
  function saveSnapshot(s) { write(SNAP_KEY, s); }

  /* --- Comparing records ------------------------------------------------- */
  function stable(v) {
    if (v === undefined) return "null";
    if (v === null || typeof v !== "object") return JSON.stringify(v);
    if (Array.isArray(v)) return "[" + v.map(stable).join(",") + "]";
    return "{" + Object.keys(v).sort().filter(function (k) { return v[k] !== undefined; })
      .map(function (k) { return JSON.stringify(k) + ":" + stable(v[k]); }).join(",") + "}";
  }
  /** What a job "is", ignoring signed photo URLs that change on every pull. */
  function canonJob(r) {
    var c = {};
    Object.keys(r || {}).forEach(function (k) {
      if (k === "_cloudUpdatedAt" || k === "photos") return;
      c[k] = r[k];
    });
    c.photos = (r.photos || []).map(function (p) {
      return p.blob ? { id: p.id, blob: p.blob, addedAt: p.addedAt || null }
                    : { id: p.id, dataUrl: p.dataUrl, addedAt: p.addedAt || null };
    });
    return stable(c);
  }
  function canonPay(p) { return stable(p); }

  function windowMonths(fromServer) {
    if (fromServer && fromServer.length) return fromServer.slice();
    var out = [], d = new Date();
    d.setDate(1);
    for (var i = 0; i < 3; i++) {
      out.push(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"));
      d.setMonth(d.getMonth() + 1);
    }
    return out;
  }
  function inWindow(map, months) {
    var out = {};
    Object.keys(map || {}).forEach(function (day) {
      if (months.indexOf(day.slice(0, 7)) > -1 && map[day] && map[day].length) out[day] = map[day].slice();
    });
    return out;
  }

  /* --- Network ----------------------------------------------------------- */
  function call(method, path, body) {
    var opts = { method: method, credentials: "include", headers: {} };
    if (body !== undefined) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    return fetch(API + path, opts).then(function (r) {
      if (r.status === 401 || r.status === 403 || r.redirected) {
        var e = new Error("auth"); e.kind = "auth"; throw e;
      }
      if (!r.ok) { var x = new Error("http " + r.status); x.kind = "server"; throw x; }
      return r.json();
    }, function () {
      var e = new Error("offline"); e.kind = navigator.onLine === false ? "offline" : "network"; throw e;
    });
  }

  /* --- Status pill ------------------------------------------------------- */
  var pill = null;
  function status(kind) {
    if (!pill) {
      pill = document.createElement("div");
      pill.setAttribute("role", "status");
      pill.setAttribute("aria-live", "polite");
      pill.style.cssText =
        "position:fixed;left:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:50;" +
        "font:600 12px/1.3 Inter,system-ui,sans-serif;padding:6px 10px;border-radius:999px;" +
        "box-shadow:0 2px 8px rgba(12,42,56,.15);pointer-events:none;max-width:calc(100vw - 24px)";
      document.body.appendChild(pill);
    }
    var t = new Date().toLocaleTimeString(ES ? "es-US" : "en-US", { hour: "numeric", minute: "2-digit" });
    var look = {
      syncing: ["#E8F4FA", "#0C2A38", TXT.syncing],
      ok:      ["#E6F6EE", "#14532D", TXT.ok + " \u00b7 " + t],
      offline: ["#FFF4E0", "#7A4B00", TXT.off],
      network: ["#FFF4E0", "#7A4B00", TXT.net],
      auth:    ["#FDECEC", "#8A1C1C", TXT.auth],
      server:  ["#FDECEC", "#8A1C1C", TXT.err]
    }[kind] || ["#FDECEC", "#8A1C1C", TXT.err];
    pill.style.background = look[0];
    pill.style.color = look[1];
    pill.textContent = look[2];
  }

  /* --- Photos ------------------------------------------------------------ */
  function dataUrlToBlob(dataUrl) {
    var parts = dataUrl.split(",");
    var mime = (parts[0].match(/:(.*?);/) || [])[1] || "image/jpeg";
    var bin = atob(parts[1]);
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  /** Upload any photo that only exists on this device. Resolves true if anything changed. */
  function uploadPhotos() {
    var list = read(KEYS.requests, []);
    var work = [];
    list.forEach(function (r) {
      var pending = (r.photos || []).filter(function (p) {
        return !p.blob && p.dataUrl && p.dataUrl.indexOf("data:") === 0;
      });
      if (pending.length) work.push({ id: r.id, pending: pending });
    });
    if (!work.length) return Promise.resolve(false);

    var changed = false;
    return work.reduce(function (chain, job) {
      return chain.then(function () {
        return call("POST", "/photos", { jobId: job.id, count: job.pending.length })
          .then(function (res) {
            var slots = res.slots || [];
            return Promise.all(job.pending.map(function (p, i) {
              var slot = slots[i];
              if (!slot) return null;
              return fetch(slot.uploadUrl, {
                method: "PUT",
                headers: { "x-ms-blob-type": "BlockBlob", "Content-Type": "image/jpeg" },
                body: dataUrlToBlob(p.dataUrl)
              }).then(function (r) { return r.ok ? { photoId: p.id, blob: slot.blob } : null; },
                      function () { return null; });
            }));
          })
          .then(function (done) {
            var fresh = read(KEYS.requests, []);
            fresh.forEach(function (r) {
              if (r.id !== job.id) return;
              (done || []).forEach(function (d) {
                if (!d) return;
                (r.photos || []).forEach(function (p) {
                  if (p.id === d.photoId && !p.blob) { p.blob = d.blob; changed = true; }
                });
              });
            });
            if (changed) write(KEYS.requests, fresh);
          });
      });
    }, Promise.resolve()).then(function () { return changed; });
  }

  /* --- Push -------------------------------------------------------------- */
  var lock = Promise.resolve();
  function serial(task) {
    var run = lock.then(task, task);
    lock = run.then(function () {}, function () {});
    return run;
  }

  function push() {
    return serial(function () {
      return uploadPhotos()["catch"](function () { return false; }).then(function () {
        var snap = snapshot();
        var jobs = read(KEYS.requests, []);
        var pays = read(KEYS.payments, []);
        var avail = read(KEYS.availability, {});
        var tasks = [];
        var now = new Date().toISOString();

        // Jobs: new or changed since the cloud last agreed
        var seen = {};
        var touched = false;
        jobs.forEach(function (r) {
          if (!r || !r.id) return;
          seen[r.id] = true;
          if (canonJob(r) === snap.jobs[r.id]) return;
          r._updatedAt = now;
          touched = true;
        });
        if (touched) write(KEYS.requests, jobs);

        jobs.forEach(function (r) {
          if (!r || !r.id || canonJob(r) === snap.jobs[r.id]) return;
          var sent = canonJob(r);
          tasks.push(call("PUT", "/jobs/" + encodeURIComponent(r.id), r).then(function () {
            var s = snapshot(); s.jobs[r.id] = sent; saveSnapshot(s);
          }));
        });

        // Jobs deleted on this device
        var gone = Object.keys(snap.jobs).filter(function (id) { return !seen[id]; });
        if (gone.length > MAX_DELETES_PER_PUSH) {
          // Almost certainly lost storage rather than a decision. Forget the
          // snapshot for these so the next pull restores them from the cloud.
          gone.forEach(function (id) { delete snap.jobs[id]; });
          saveSnapshot(snap);
        } else {
          gone.forEach(function (id) {
            tasks.push(call("DELETE", "/jobs/" + encodeURIComponent(id)).then(function () {
              var s = snapshot(); delete s.jobs[id]; saveSnapshot(s);
            }));
          });
        }

        // Payment links
        pays.forEach(function (p) {
          if (!p || !p.token || !p.requestId) return;
          var c = canonPay(p);
          if (c === snap.pays[p.token]) return;
          tasks.push(call("PUT", "/payments/" + encodeURIComponent(p.token),
            { jobId: p.requestId, record: p }).then(function () {
            var s = snapshot(); s.pays[p.token] = c; saveSnapshot(s);
          }));
        });

        // Calendar (only the months the booking page offers)
        var months = windowMonths(snap.availMonths);
        var mine = inWindow(avail, months);
        var cAvail = stable(mine);
        if (snap.avail !== null && cAvail !== snap.avail) {
          tasks.push(call("PUT", "/availability", { availability: mine, months: months }).then(function () {
            var s = snapshot(); s.avail = cAvail; saveSnapshot(s);
          }));
        }

        if (!tasks.length) return { pushed: 0 };
        status("syncing");
        return Promise.all(tasks).then(function () {
          status("ok");
          return { pushed: tasks.length };
        });
      });
    });
  }

  var pushTimer = null;
  var ready = false;   // no pushing until this device has pulled once
  function schedulePush() {
    if (!ready) return;   // the first pull pushes anything waiting
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () {
      push()["catch"](function (e) { status(e.kind || "server"); });
    }, PUSH_DELAY_MS);
  }

  // Notice every write the dashboard makes to the three synced keys.
  var origSet = window.Storage.prototype.setItem;
  window.Storage.prototype.setItem = function (key, value) {
    origSet.call(this, key, value);
    if (quiet === 0 && this === window.localStorage &&
        (key === KEYS.requests || key === KEYS.payments || key === KEYS.availability)) {
      schedulePush();
    }
  };

  /* --- Pull -------------------------------------------------------------- */
  function newer(a, b) { return String(a || "") > String(b || ""); }

  /** A signed photo URL with more than an hour left on it. */
  function urlFresh(p) {
    if (!p.dataUrl || !/^https:/i.test(p.dataUrl)) return false;
    var m = /[?&]se=([^&]+)/.exec(p.dataUrl);
    if (!m) return true;
    var t = Date.parse(decodeURIComponent(m[1]));
    return isNaN(t) || t - Date.now() > 3600000;
  }

  function mergeJobs(local, cloud, snap) {
    var L = {}, C = {}, out = [], changed = false;
    local.forEach(function (r) { if (r && r.id) L[r.id] = r; });
    cloud.forEach(function (r) { if (r && r.id) C[r.id] = r; });
    var ids = {};
    Object.keys(L).forEach(function (k) { ids[k] = true; });
    Object.keys(C).forEach(function (k) { ids[k] = true; });

    Object.keys(ids).forEach(function (id) {
      var l = L[id], c = C[id], known = snap.jobs[id];
      if (c && !l) {
        if (known !== undefined) return;            // deleted here; the push will delete it there
        out.push(c); snap.jobs[id] = canonJob(c); changed = true; return;
      }
      if (l && !c) {
        if (known !== undefined) {                  // deleted on another device
          delete snap.jobs[id]; changed = true; return;
        }
        out.push(l); return;                        // new here; the push will send it
      }
      var lc = canonJob(l), cc = canonJob(c);
      var localEdited = known !== undefined && lc !== known;
      var cloudEdited = cc !== known;
      if (known === undefined || !localEdited ||
          (cloudEdited && newer(c._updatedAt || c._cloudUpdatedAt, l._updatedAt))) {
        snap.jobs[id] = cc;
        if (lc !== cc) { out.push(c); changed = true; return; }
        // Same job. Only swap in the cloud copy when a photo link here is
        // missing or about to expire; signed links change on every request.
        var stale = (l.photos || []).some(function (ph) { return ph.blob && !urlFresh(ph); });
        if (stale) { out.push(c); changed = true; } else { out.push(l); }
      } else {
        out.push(l);                                // this device's edit is newer; push sends it
      }
    });

    out.sort(function (a, b) { return String(b.createdAt || "").localeCompare(String(a.createdAt || "")); });
    return { list: out, changed: changed };
  }

  function mergePays(local, cloud, snap) {
    var L = {}, C = {}, out = [], changed = false;
    local.forEach(function (p) { if (p && p.token) L[p.token] = p; });
    cloud.forEach(function (p) { if (p && p.token) C[p.token] = p; });
    var ids = {};
    Object.keys(L).forEach(function (k) { ids[k] = true; });
    Object.keys(C).forEach(function (k) { ids[k] = true; });

    Object.keys(ids).forEach(function (t) {
      var l = L[t], c = C[t], known = snap.pays[t];
      if (c && !l) { out.push(c); snap.pays[t] = canonPay(c); changed = true; return; }
      if (l && !c) {
        if (known !== undefined) { delete snap.pays[t]; changed = true; return; }  // job deleted elsewhere
        out.push(l); return;
      }
      var lc = canonPay(l), cc = canonPay(c);
      if (known === undefined || lc === known) {
        if (lc !== cc) changed = true;
        out.push(c); snap.pays[t] = cc;
      } else {
        out.push(l);
      }
    });
    out.sort(function (a, b) { return String(b.createdAt || "").localeCompare(String(a.createdAt || "")); });
    return { list: out, changed: changed };
  }

  function mergeAvail(local, cloudMap, months, snap) {
    var mine = inWindow(local, months);
    var cs = stable(inWindow(cloudMap, months));
    var ms = stable(mine);
    var takeCloud;
    if (snap.avail === null) {
      // First sync on this device: the cloud calendar wins if one exists.
      takeCloud = Object.keys(cloudMap || {}).length > 0;
    } else {
      takeCloud = ms === snap.avail;   // no unsent edit here
    }
    snap.availMonths = months;
    if (!takeCloud) {
      if (snap.avail === null) snap.avail = stable({});   // so the push sends this calendar
      return { map: local, changed: false };
    }
    var next = {};
    Object.keys(local || {}).forEach(function (d) {
      if (months.indexOf(d.slice(0, 7)) === -1) next[d] = local[d];
    });
    Object.keys(cloudMap || {}).forEach(function (d) { next[d] = cloudMap[d]; });
    snap.avail = cs;
    return { map: next, changed: ms !== cs };
  }

  function pull() {
    return serial(function () {
      status("syncing");
      return Promise.all([
        call("GET", "/jobs"),
        call("GET", "/payments"),
        call("GET", "/availability")
      ]).then(function (res) {
        var snap = snapshot();
        var j = mergeJobs(read(KEYS.requests, []), res[0].jobs || [], snap);
        var p = mergePays(read(KEYS.payments, []), res[1].payments || [], snap);
        var a = mergeAvail(read(KEYS.availability, {}), res[2].availability || {},
                           windowMonths(res[2].months), snap);
        if (j.changed) write(KEYS.requests, j.list);
        if (p.changed) write(KEYS.payments, p.list);
        if (a.changed) write(KEYS.availability, a.map);
        saveSnapshot(snap);
        return j.changed || p.changed || a.changed;
      });
    }).then(function (changed) {
      ready = true;
      return push().then(function () { status("ok"); return changed; });
    }, function (e) {
      status(e.kind || "server");
      throw e;
    });
  }

  /* --- Lifecycle --------------------------------------------------------- */
  var rerender = null, pendingRender = false;

  function busy() {
    var a = document.activeElement;
    if (!a) return false;
    var tag = (a.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select";
  }
  function render() {
    if (!rerender) return;
    if (busy()) { pendingRender = true; return; }
    pendingRender = false;
    try { rerender(); } catch (e) { /* a render problem must not stop syncing */ }
  }
  function refresh() {
    return pull().then(function (changed) { if (changed) render(); })["catch"](function () {});
  }

  document.addEventListener("focusout", function () {
    if (pendingRender) setTimeout(function () { if (!busy()) render(); }, 300);
  });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") refresh();
  });
  window.addEventListener("online", refresh);

  var started = false;
  /**
   * Called by the dashboard once the signed-in role is known.
   * @param {function} onChange re-renders the dashboard after new data arrives
   */
  function start(onChange) {
    rerender = onChange;
    if (started) return refresh();
    started = true;
    setInterval(function () {
      if (document.visibilityState === "visible") refresh();
    }, PULL_EVERY_MS);
    return refresh();
  }

  window.MCC = window.MCC || {};
  window.MCC.cloud = { start: start, pull: pull, push: push };
})(window);
