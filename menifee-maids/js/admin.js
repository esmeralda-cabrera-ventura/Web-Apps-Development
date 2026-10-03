/* =========================================================================
   Owner dashboard — availability editor + request inbox
   ========================================================================= */
(function () {
  "use strict";

  var S = window.MCC.store;
  if (!document.querySelector("[data-cal]")) return;

  var I = window.MCC.i18n;
  var TR = I.trHTML, D = I.dash, DT = I.dashT;

  var A = window.MCC.auth;
  var ACCESS = window.MCC.access;
  var IS_ES = I.lang() === "es";
  // The role belongs to the page, not the language: helper.html is English but
  // is still a helper view.
  var ROLE = window.MCC_LOCAL_ROLE || (IS_ES ? "helper" : "owner");

  // Access was already decided before this file ran: deployed, Static Web Apps
  // checked identity at the edge; offline, the local sign-in stood in. If that
  // check failed a redirect is already in flight.
  // Synchronous, before the first render: the page knows whether it is a helper
  // view without asking the server, and the first data request must not go out
  // carrying anything sensitive.
  if (ROLE !== "owner") S.scrubSecrets();

  var READY = window.MCC_READY || Promise.resolve({ mode: "local", role: ROLE });
  var SESSION = { mode: "local", name: "", role: ROLE };

  /* -----------------------------------------------------------------------
     Housekeeping: jobs older than three months are removed automatically.
     The reference date is when the job was done (or was due, or was created).
     ----------------------------------------------------------------------- */
  var RETENTION_MONTHS = 3;

  function purgeOldJobs() {
    var cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - RETENTION_MONTHS);
    var cutISO = S.iso(cutoff);

    var keep = [], dropped = 0;
    S.getRequests().forEach(function (r) {
      var ref = (r.completedAt && r.completedAt.slice(0, 10)) ||
                (r.confirmedSlot && r.confirmedSlot.date) ||
                (r.createdAt && r.createdAt.slice(0, 10)) || "";
      if (ref && ref < cutISO) { dropped++; return; }
      keep.push(r);
    });

    if (dropped) {
      S.saveRequests(keep);
      var pay = S.getPayments().filter(function (p) {
        return keep.some(function (r) { return r.id === p.requestId; });
      });
      S.savePayments(pay);
    }
    return { dropped: dropped, cutoff: cutISO };
  }

  var signOutBtn = document.querySelector("[data-signout]");
  if (signOutBtn) {
    signOutBtn.addEventListener("click", function () { ACCESS.signOut(ROLE); });
  }
  var purge = purgeOldJobs();
  var purgeBox = document.querySelector("[data-purge-note]");
  if (purgeBox) {
    purgeBox.innerHTML = TR(
      '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="10" cy="10" r="7.5"/><path d="M10 6v5M10 13.5v.4"/></svg>' +
      "<span>" + (purge.dropped
        ? "<strong>" + DT(purge.dropped > 1
              ? "{n} jobs older than {m} months were removed just now."
              : "{n} job older than {m} months was removed just now.",
            { n: purge.dropped, m: RETENTION_MONTHS }) + "</strong> " +
          DT("Records are kept for {m} months and then deleted automatically \u2014 export to PDF or CSV before that if you need them.",
             { m: RETENTION_MONTHS })
        : DT("Jobs are kept for {m} months and then deleted automatically.", { m: RETENTION_MONTHS }) + " " +
          DT("Anything scheduled or completed before {date} has already gone. Export to PDF or CSV to keep a copy.",
             { date: "<strong>" + S.prettyDate(purge.cutoff) + "</strong>" })) +
      "</span>");
    purgeBox.hidden = false;
  }

  var nag = document.querySelector("[data-default-pass]");
  if (nag && ACCESS.isOffline() && A.usingDefaultPassword(ROLE)) nag.hidden = false;

  S.seedIfEmpty();

  var view = S.today();
  view.setDate(1);
  var view2 = S.today();
  view2.setDate(1);
  var selected = null;
  var selected2 = null;
  var openEditor = null;   // id of the request whose date/time editor is open
  var openPay = null;      // id of the request whose payment panel is open
  var openDone = null;     // id of the request being completed
  var draftPhotos = {};    // jobId -> [{id, dataUrl, file}] held while the panel is open
  var filter = "all";

  var elCal   = document.querySelector("[data-cal]");
  var elMonth = document.querySelector("[data-month]");
  var elDay   = document.querySelector("[data-daypanel]");
  var elReqs  = document.querySelector("[data-requests]");
  var elCal2   = document.querySelector("[data-cal2]");
  var elMonth2 = document.querySelector("[data-month2]");
  var elBook   = document.querySelector("[data-bookpanel]");
  var elDue    = document.querySelector("[data-due]");
  var elAddForm= document.querySelector("[data-addform]");

  /* Weekday initials in whichever language the dashboard is in. */
  var DOW = (function () {
    var out = [], d = new Date(2026, 7, 2);   // a Sunday
    for (var i = 0; i < 7; i++) {
      out.push(d.toLocaleDateString(I.locale(), { weekday: "short" }).replace(".", ""));
      d.setDate(d.getDate() + 1);
    }
    return out;
  })();

  /* --- Calendar ---------------------------------------------------------- */
  function renderCal() {
    elMonth.textContent = view.toLocaleDateString(I.locale(), { month: "long", year: "numeric" });

    var first = new Date(view.getFullYear(), view.getMonth(), 1);
    var days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    var pad = first.getDay();
    var todayISO = S.iso(S.today());
    var avail = S.getAvailability();

    var html = DOW.map(function (d) { return '<div class="cal__dow">' + d + "</div>"; }).join("");
    for (var i = 0; i < pad; i++) html += "<div></div>";

    for (var d = 1; d <= days; d++) {
      var date = new Date(view.getFullYear(), view.getMonth(), d);
      var key = S.iso(date);
      var past = key < todayISO;
      var windows = avail[key] || [];
      var cls = "cal__day";
      if (windows.length) cls += " is-open";
      if (key === selected) cls += " is-selected";
      var dots = windows.map(function () { return "<i></i>"; }).join("");
      html += '<button class="' + cls + '" data-date="' + key + '"' + (past ? " disabled" : "") +
              ' aria-label="' + date.toLocaleDateString(I.locale(), { weekday: "long", month: "long", day: "numeric" }) +
              (windows.length ? ", " + windows.length + " windows open" : ", closed") + '">' +
              '<span class="cal__num">' + d + "</span>" +
              '<span class="cal__dots">' + dots + "</span></button>";
    }
    elCal.innerHTML = TR(html);
  }

  elCal.addEventListener("click", function (e) {
    var b = e.target.closest(".cal__day");
    if (!b || b.disabled) return;
    selected = b.getAttribute("data-date");
    renderCal();
    renderDayPanel();
  });

  document.querySelector("[data-prev]").addEventListener("click", function () {
    view.setMonth(view.getMonth() - 1); renderCal();
  });
  document.querySelector("[data-next-month]").addEventListener("click", function () {
    view.setMonth(view.getMonth() + 1); renderCal();
  });

  /* --- Day editor -------------------------------------------------------- */
  function renderDayPanel() {
    if (!selected) return;
    var open = S.getDay(selected);
    elDay.innerHTML =
      TR("<h3>" + S.prettyDate(selected) + "</h3>" +
      '<p style="color:var(--muted);font-size:.9rem;margin-bottom:.9rem">' +
      (open.length ? open.length + " window" + (open.length > 1 ? "s" : "") + " open" : "Closed &mdash; customers won't see this day") +
      "</p>" +
      '<div class="chips">' + S.WINDOWS.map(function (w) {
        var on = open.indexOf(w.id) > -1;
        return '<button type="button" class="chip" data-window="' + w.id + '" aria-pressed="' + on + '">' +
               w.label + '<span class="chip__price">' + w.time + "</span></button>";
      }).join("") + "</div>" +
      '<div class="toolbar" style="margin:1rem 0 0">' +
      '<button class="btn btn--ghost btn--sm" data-day-all>Open all day</button>' +
      '<button class="btn btn--ghost btn--sm" data-day-none>Close this day</button>' +
      '<button class="btn btn--ghost btn--sm" data-copy-dow>Apply to every ' +
      S.parseISO(selected).toLocaleDateString(I.locale(), { weekday: "long" }) + " this month</button></div>");
  }

  elDay.addEventListener("click", function (e) {
    if (!selected) return;
    var chip = e.target.closest("[data-window]");
    if (chip) {
      var id = chip.getAttribute("data-window");
      var open = S.getDay(selected);
      var i = open.indexOf(id);
      if (i > -1) open.splice(i, 1); else open.push(id);
      // keep windows in business order
      open.sort(function (a, b) {
        return S.WINDOWS.findIndex(function (w) { return w.id === a; }) -
               S.WINDOWS.findIndex(function (w) { return w.id === b; });
      });
      S.setDay(selected, open);
      renderCal(); renderDayPanel();
      return;
    }
    if (e.target.closest("[data-day-all]")) {
      S.setDay(selected, S.WINDOWS.map(function (w) { return w.id; }));
      renderCal(); renderDayPanel(); return;
    }
    if (e.target.closest("[data-day-none]")) {
      S.setDay(selected, []); renderCal(); renderDayPanel(); return;
    }
    if (e.target.closest("[data-copy-dow]")) {
      var windows = S.getDay(selected);
      var dow = S.parseISO(selected).getDay();
      var days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
      var todayISO = S.iso(S.today());
      for (var d = 1; d <= days; d++) {
        var date = new Date(view.getFullYear(), view.getMonth(), d);
        if (date.getDay() !== dow) continue;
        var key = S.iso(date);
        if (key < todayISO) continue;
        S.setDay(key, windows);
      }
      renderCal(); renderDayPanel();
    }
  });

  /* --- Bulk tools -------------------------------------------------------- */
  document.querySelector('[data-bulk="weekdays"]').addEventListener("click", function () {
    var days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    var todayISO = S.iso(S.today());
    for (var d = 1; d <= days; d++) {
      var date = new Date(view.getFullYear(), view.getMonth(), d);
      var dow = date.getDay();
      if (dow === 0 || dow === 6) continue;
      var key = S.iso(date);
      if (key < todayISO) continue;
      S.setDay(key, ["morning", "afternoon"]);
    }
    renderCal(); if (selected) renderDayPanel();
  });

  document.querySelector('[data-bulk="clear"]').addEventListener("click", function () {
    if (!window.confirm(D("Close every remaining day this month? Customers won't be able to request these dates."))) return;
    var days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    var todayISO = S.iso(S.today());
    for (var d = 1; d <= days; d++) {
      var key = S.iso(new Date(view.getFullYear(), view.getMonth(), d));
      if (key < todayISO) continue;
      S.setDay(key, []);
    }
    renderCal(); if (selected) renderDayPanel();
  });

  /* --- Backup / restore -------------------------------------------------- */
  document.querySelector("[data-export]").addEventListener("click", function () {
    var blob = new Blob([S.exportAll()], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "menifee-cleaning-backup-" + S.iso(new Date()) + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  var fileInput = document.querySelector("[data-import-file]");
  document.querySelector("[data-import]").addEventListener("click", function () { fileInput.click(); });
  fileInput.addEventListener("change", function () {
    var f = fileInput.files && fileInput.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        S.importAll(reader.result);
        renderCal(); renderCal2(); renderBookPanel(); renderDue(); renderRequests();
        if (selected) renderDayPanel();
        window.alert(D("Restored."));
      } catch (e) { window.alert(D("That file couldn't be read. Pick a backup file created by this dashboard.")); }
    };
    reader.readAsText(f);
  });

  /* --- Requests ---------------------------------------------------------- */
  /** Uses the shared rule so a card, a table row and a filter never disagree. */
  function statusPill(job) {
    var d = window.MCC.db.displayFor(job);
    return '<span class="pill ' + d.pill + '">' + d.label + "</span>";
  }

  /** One card, shared by the inbox and the job database so they never diverge. */
  function requestCard(r) {
    var when1 = r.slot1 && r.slot1.date ? S.prettyDate(r.slot1.date) + " &middot; " + S.windowLabel(r.slot1.window) : "&mdash;";
    var when2 = r.slot2 && r.slot2.date ? S.prettyDate(r.slot2.date) + " &middot; " + S.windowLabel(r.slot2.window) : "&mdash;";
    var money = r.estimate ? "$" + r.estimate : D("Quote after walkthrough");

    var paid = S.paymentsFor(r.id).some(function (x) { return x.status === "paid"; });
    var live = S.activePaymentFor(r.id);
    var payFlag = paid
      ? '<span class="pill pill--conf">Paid</span>'
      : (live ? '<span class="pill pill--wait">Link sent</span>' : "");

    var payBtn = '<button class="btn btn--ghost btn--sm" data-act="payopen" data-id="' + r.id + '">' +
      (live ? "Payment link" : "Send payment link") + "</button>";
    var photoBtn = '<button class="btn btn--ghost btn--sm" data-act="photos" data-id="' + r.id + '">' +
      ((r.photos || []).length ? DT("Job photos ({n})", { n: r.photos.length }) : D("Add job photos")) + "</button>";

    var actions;
    if (r.status === "confirmed") {
      actions = payBtn +
        '<button class="btn btn--ghost btn--sm" data-act="reschedule" data-id="' + r.id + '">Change date &amp; time</button>' +
        '<button class="btn btn--ghost btn--sm" data-act="complete" data-id="' + r.id + '">Mark completed</button>';
    } else if (r.status === "done") {
      actions = payBtn + photoBtn +
        (paid
          ? '<button class="btn btn--ghost btn--sm" data-act="pay-unpaid" data-id="' + r.id + '">Mark unpaid</button>'
          : '<button class="btn btn--primary btn--sm" data-act="pay-paid" data-id="' + r.id + '">Mark as paid</button>') +
        '<button class="btn btn--ghost btn--sm" data-act="reopen" data-id="' + r.id + '">Reopen job</button>';
    } else if (r.status === "cancelled") {
      actions = '<button class="btn btn--ghost btn--sm" data-act="reschedule" data-id="' + r.id + '">Rebook this job</button>';
    } else {
      actions = '<button class="btn btn--primary btn--sm" data-act="accept1" data-id="' + r.id + '">Accept first choice</button>' +
        '<button class="btn btn--ghost btn--sm" data-act="accept2" data-id="' + r.id + '">Accept backup</button>' +
        '<button class="btn btn--ghost btn--sm" data-act="reschedule" data-id="' + r.id + '">Change date &amp; time</button>';
    }

    var shots = r.photos || [];
    var gallery = shots.length
      ? '<div class="shotgrid" style="margin-top:1rem">' + shots.map(function (p, i) {
          return '<figure class="shot"><img src="' + p.dataUrl + '" alt="Job photo ' + (i + 1) + '">' +
            '<button class="shot__x" data-act="photo-remove" data-id="' + r.id + '" data-i="' + i +
            '" aria-label="Remove photo ' + (i + 1) + '" title="Remove this photo">&times;</button></figure>';
        }).join("") + "</div>"
      : "";

    return '<div class="req__top"><div>' +
      '<span class="req__name">' + r.name + (r.company ? " &middot; " + r.company : "") + "</span>" +
      '<div class="req__meta">' + (r.kind === "commercial" ? D("Commercial") : D("Residential")) +
      " &middot; " + (r.city || "") + " " + (r.zip || "") + " &middot; " + money + "</div></div>" +
      statusPill(r) + payFlag +
      (langOf(r) === "es" ? '<span class="pill pill--wait" title="This customer booked in Spanish">Espa&ntilde;ol</span>' : "") +
      "</div>" +

      '<ul class="summary" style="margin:.9rem 0 0">' +
      "<li><span class='k'>First choice</span><span class='v'>" + when1 + "</span></li>" +
      "<li><span class='k'>Backup</span><span class='v'>" + when2 + "</span></li>" +
      (r.confirmedSlot ? "<li><span class='k'>Confirmed for</span><span class='v'>" +
        S.prettyDate(r.confirmedSlot.date) + " &middot; " + S.windowLabel(r.confirmedSlot.window) + "</span></li>" : "") +
      (r.completedAt ? "<li><span class='k'>Completed</span><span class='v'>" +
        new Date(r.completedAt).toLocaleDateString(I.locale(), { month: "long", day: "numeric", year: "numeric" }) + "</span></li>" : "") +
      (r.reopenedAt ? "<li><span class='k'>Reopened</span><span class='v'>" +
        new Date(r.reopenedAt).toLocaleDateString(I.locale(), { month: "long", day: "numeric", year: "numeric" }) + "</span></li>" : "") +
      "<li><span class='k'>Phone</span><span class='v'><a href='tel:" + r.phone + "'>" + r.phone + "</a></span></li>" +
      "<li><span class='k'>Email</span><span class='v'><a href='mailto:" + r.email + "'>" + r.email + "</a></span></li>" +
      "<li><span class='k'>Address</span><span class='v'>" + r.address + "</span></li>" +
      (r.access ? "<li><span class='k'>Notes</span><span class='v'>" + r.access + "</span></li>" : "") +
      (r.ownerNotes ? "<li><span class='k'>Your notes</span><span class='v'>" + r.ownerNotes + "</span></li>" : "") +
      (r.scope ? "<li><span class='k'>Scope</span><span class='v'>" + r.scope + "</span></li>" : "") +
      "</ul>" +
      (r.status === "done" && !paid
        ? '<div class="notice notice--warn" style="margin:1rem 0 0"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="10" cy="10" r="7.5"/><path d="M10 6v5M10 13.5v.4"/></svg>' +
          "<span>The work is finished but this job stays open until the payment is in. Mark it paid to close it.</span></div>"
        : "") +
      (r.status === "done" && paid
        ? '<div class="notice notice--ok" style="margin:1rem 0 0"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 10.5 7.5 14.5 16.5 5"/></svg>' +
          "<span>Completed and paid \u2014 this job is closed.</span></div>"
        : "") + gallery +

      '<div class="req__actions">' + actions +
      '<button class="btn btn--ghost btn--sm" data-act="delete" data-id="' + r.id +
        '" style="color:var(--danger);border-color:#F0C4BB">Delete</button></div>' +
      (openEditor === r.id ? rescheduleEditor(r) : "") +
      (openPay === r.id ? paymentPanel(r) : "") +
      (openDone === r.id ? completionPanel(r) : "") +
      '<p style="font-family:ui-monospace,Menlo,monospace;font-size:.7rem;color:var(--muted);margin:.75rem 0 0">' + r.id + "</p>";
  }

  function renderRequests() {
    // Completed and cancelled jobs live in the job database, not the inbox.
    var all = S.getRequests().filter(function (r) {
      return r.status !== "done" && r.status !== "cancelled";
    });
    var list = filter === "all" ? all : all.filter(function (r) { return r.status === filter; });

    if (!list.length) {
      elReqs.innerHTML =
        TR('<li class="card" style="grid-column:1/-1;text-align:center;color:var(--muted)">' +
        "<p style='margin:0'>No live jobs right now. New requests land here, and " +
        "completed ones move down to the <a href='#jobs'>job database</a>.</p></li>");
      return;
    }
    elReqs.innerHTML = TR(list.map(function (r) {
      return '<li class="req">' + requestCard(r) + "</li>";
    }).join(""));
  }

  /* The same card, shown in a dialog for jobs that have left the inbox. */
  var modalJobId = null;

  function renderModalCard() {
    var box = document.querySelector("[data-jobdlg]");
    if (!box || !modalJobId || box.hidden) return;
    var r = S.getRequests().filter(function (x) { return x.id === modalJobId; })[0];
    if (!r) { closeJobModal(); return; }
    box.querySelector("[data-job-title]").textContent = r.name + (r.company ? " \u00b7 " + r.company : "");
    box.querySelector("[data-job-sub]").innerHTML = TR('<code class="dbjob">' + r.id + "</code>");
    box.querySelector("[data-job-body]").innerHTML = TR('<div class="req req--flat">' + requestCard(r) + "</div>");
  }

  function closeJobModal() {
    var box = document.querySelector("[data-jobdlg]");
    if (box) { box.hidden = true; document.body.style.overflow = ""; }
    modalJobId = null;
  }

  /** Both places re-render together, so a card never looks different in one. */
  function refreshCards() { renderRequests(); renderModalCard(); }

  /* =========================================================================
     Messaging helpers
     -------------------------------------------------------------------------
     A static site cannot send a text on its own. These build sms: and mailto:
     links that open the owner's own apps with the message already written.
     Swapping in real automated sending is a server-side job — see README.
     ========================================================================= */
  var BIZ = "Menifee Maids", BIZ_PHONE = "951-464-8147";

  /* Each job remembers the language it was booked in, so a message sent months
     later still reaches the customer in the language they chose. The dashboard
     itself stays in English. */
  function langOf(r) { return r && r.lang === "es" ? "es" : "en"; }

  function smsLink(phone, body) {
    var num = String(phone || "").replace(/[^0-9+]/g, "");
    return "sms:" + num + "?&body=" + encodeURIComponent(body);
  }
  function mailLink(email, subject, body) {
    return "mailto:" + email + "?subject=" + encodeURIComponent(subject) +
           "&body=" + encodeURIComponent(body);
  }
  function firstName(n) { return String(n || "there").split(" ")[0]; }
  function slotText(slot, lang) {
    return S.prettyDate(slot.date, lang) + ", " + S.windowLabel(slot.window, lang);
  }

  function msgConfirm(r) {
    var L = langOf(r);
    if (L === "es") {
      return "Hola " + firstName(r.name) + ", le habla " + BIZ + ". Su limpieza est\u00e1 confirmada para el " +
        slotText(r.confirmedSlot, L) + " en " + r.address + ". Responda aqu\u00ed o llame al " + BIZ_PHONE +
        " si algo cambia. Referencia " + r.id + ".";
    }
    return "Hi " + firstName(r.name) + ", this is " + BIZ + ". Your cleaning is confirmed for " +
      slotText(r.confirmedSlot, L) + " at " + r.address + ". Reply here or call " + BIZ_PHONE +
      " if anything changes. Reference " + r.id + ".";
  }

  function msgReminder(r) {
    var L = langOf(r);
    if (L === "es") {
      return "Hola " + firstName(r.name) + ", un recordatorio de " + BIZ + ": ma\u00f1ana limpiamos, " +
        slotText(r.confirmedSlot, L) + " en " + r.address + ". Responda aqu\u00ed si necesita cambiarlo.";
    }
    return "Hi " + firstName(r.name) + ", a reminder from " + BIZ + ": we're cleaning tomorrow, " +
      slotText(r.confirmedSlot, L) + " at " + r.address + ". Reply here if you need to move it.";
  }

  function msgOnMyWay(r) {
    if (langOf(r) === "es") {
      return "Hola " + firstName(r.name) + ", le habla " + BIZ + " \u2014 vamos en camino a " +
        r.address + ". Llegamos en unos minutos.";
    }
    return "Hi " + firstName(r.name) + ", this is " + BIZ + " \u2014 we're on our way to " +
      r.address + " now. See you shortly.";
  }

  function msgCancel(r, slot) {
    var L = langOf(r);
    if (L === "es") {
      return "Hola " + firstName(r.name) + ",\n\nTuvimos que cancelar su limpieza del " +
        slotText(slot, L) + " en " + r.address + ".\n\nUna disculpa por el aviso tan corto. " +
        "Responda a este correo o llame al " + BIZ_PHONE + " y le reagendamos en un horario que le acomode.\n\n" +
        "Referencia: " + r.id + "\n\nGracias,\n" + BIZ + "\n" + BIZ_PHONE;
    }
    return "Hi " + firstName(r.name) + ",\n\nWe've had to cancel your cleaning scheduled for " +
      slotText(slot, L) + " at " + r.address + ".\n\nWe're sorry for the short notice. Reply to this " +
      "email or call " + BIZ_PHONE + " and we'll get you rebooked at a time that works.\n\n" +
      "Reference: " + r.id + "\n\nThank you,\n" + BIZ + "\n" + BIZ_PHONE;
  }

  /** Inline editor for moving a job or proposing a different slot. */
  function rescheduleEditor(r) {
    var cur = r.confirmedSlot || r.slot1 || {};
    var opts = S.WINDOWS.map(function (w) {
      return '<option value="' + w.id + '"' + (cur.window === w.id ? " selected" : "") + ">" +
             w.label + " (" + w.time + ")</option>";
    }).join("");
    return '<div class="resched">' +
      '<p class="field-label">Move this job or propose a different slot</p>' +
      '<div class="field-row">' +
        '<div class="field"><label for="rs-d-' + r.id + '">Date</label>' +
        '<input class="input" type="date" id="rs-d-' + r.id + '" data-rs-date value="' + (cur.date || "") + '"></div>' +
        '<div class="field"><label for="rs-w-' + r.id + '">Time window</label>' +
        '<select class="input" id="rs-w-' + r.id + '" data-rs-window>' + opts + "</select></div>" +
      "</div>" +
      '<div class="field"><label for="rs-n-' + r.id + '">Note to the customer</label>' +
      '<textarea class="input" id="rs-n-' + r.id + '" data-rs-note placeholder="Optional \u2014 e.g. we can start an hour earlier if that suits you"></textarea></div>' +
      '<div class="req__actions">' +
        '<button class="btn btn--primary btn--sm" data-act="rs-confirm" data-id="' + r.id + '">Save as confirmed</button>' +
        '<button class="btn btn--ghost btn--sm" data-act="rs-propose" data-id="' + r.id + '">Propose to customer</button>' +
        '<button class="btn btn--ghost btn--sm" data-act="rs-cancel" data-id="' + r.id + '">Cancel</button>' +
      "</div></div>";
  }

  /** Payment link panel: set an amount, generate the link, then send it. */
  function paymentPanel(r) {
    var pays = S.paymentsFor(r.id);
    var latest = pays[0];
    var suggested = r.estimate || "";
    var settings = S.getSettings();

    var history = "";
    if (latest) {
      var exp = new Date(latest.expiresAt);
      history =
        '<ul class="summary" style="margin:.9rem 0">' +
        "<li><span class='k'>Amount</span><span class='v'>" + S.money(latest.amount) + "</span></li>" +
        "<li><span class='k'>Status</span><span class='v'>" + (latest.status === "paid" ? "Paid" : "Link sent, unpaid") + "</span></li>" +
        "<li><span class='k'>Expires</span><span class='v'>" + exp.toLocaleDateString(I.locale(), { month: "long", day: "numeric", year: "numeric" }) + "</span></li>" +
        "</ul>" +
        '<div class="field"><label for="pl-url-' + r.id + '">The link</label>' +
        '<input class="input" id="pl-url-' + r.id + '" data-pl-url readonly value="' + latest.url + '"></div>' +
        '<div class="req__actions" style="margin-bottom:.4rem">' +
          '<button class="btn btn--primary btn--sm" data-act="pay-email" data-id="' + r.id + '">Email the link</button>' +
          '<button class="btn btn--ghost btn--sm" data-act="pay-text" data-id="' + r.id + '">Text the link</button>' +
          '<button class="btn btn--ghost btn--sm" data-act="pay-copy" data-id="' + r.id + '">Copy link</button>' +
          '<button class="btn btn--ghost btn--sm" data-act="pay-verify" data-id="' + r.id + '">Check with Stripe</button>' +
          (latest.status === "paid"
            ? '<button class="btn btn--ghost btn--sm" data-act="pay-unpaid" data-id="' + r.id + '">Mark unpaid</button>'
            : '<button class="btn btn--ghost btn--sm" data-act="pay-paid" data-id="' + r.id + '">Mark as paid</button>') +
        "</div>" +
        (latest.verifiedAt
          ? '<p class="dbsub" style="margin:.15rem 0 .6rem">Last checked with Stripe ' +
            new Date(latest.verifiedAt).toLocaleString(I.locale(), { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) +
            (latest.stripeRef ? " \u00b7 " + latest.stripeRef : "") + "</p>"
          : "");
    }

    var warn = (settings.stripeUrl || settings.paymentsConfigured) ? "" :
      '<div class="notice notice--warn" style="margin:.9rem 0 0"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="10" cy="10" r="7.5"/><path d="M10 6v5M10 13.5v.4"/></svg><span>' +
      (document.getElementById("set-stripe")
        ? D("No Stripe link saved yet, so the Pay button will tell the customer card payments aren\u2019t on.") +
          ' <a href="#settings">' + D("Add it in Settings.") + "</a>"
        : D("No Stripe link saved yet, so the Pay button will tell the customer card payments aren\u2019t on. Ask the owner to add it.")) +
      "</span></div>";

    return '<div class="resched">' +
      '<p class="field-label">' + (latest ? "Payment link" : "Create a payment link") + "</p>" +
      history +
      '<div class="field-row">' +
        '<div class="field"><label for="pl-amt-' + r.id + '">Amount to charge (USD)</label>' +
        '<input class="input" type="number" min="1" step="1" id="pl-amt-' + r.id + '" data-pl-amount placeholder="' +
        (suggested || "210") + '" value="' + suggested + '"></div>' +
        '<div class="field"><label for="pl-desc-' + r.id + '">What it\u2019s for</label>' +
        '<input class="input" id="pl-desc-' + r.id + '" data-pl-desc value="' + S.describeJob(r) + '"></div>' +
      "</div>" +
      '<div class="req__actions">' +
        '<button class="btn btn--primary btn--sm" data-act="pay-create" data-id="' + r.id + '">' +
        (latest ? "Create a new link" : "Create the link") + "</button>" +
        '<button class="btn btn--ghost btn--sm" data-act="pay-close" data-id="' + r.id + '">Close</button>' +
      "</div>" + warn + "</div>";
  }

  /* =========================================================================
     Completing a job: photos from the phone, then confirmation to the customer
     ========================================================================= */

  function completionPanel(r) {
    var shots = draftPhotos[r.id] || (r.photos || []).map(function (p) { return p; });
    var thumbs = shots.length
      ? '<div class="shotgrid">' + shots.map(function (p, i) {
          return '<figure class="shot"><img src="' + p.dataUrl + '" alt="Job photo ' + (i + 1) + '">' +
                 '<button class="shot__x" data-act="shot-remove" data-id="' + r.id + '" data-i="' + i +
                 '" aria-label="Remove photo ' + (i + 1) + '">&times;</button></figure>';
        }).join("") + "</div>"
      : '<p class="shotempty">No photos yet. Tap the button above to take them or pick them from your phone.</p>';

    var full = shots.length >= S.MAX_PHOTOS;

    return '<div class="resched">' +
      '<p class="field-label">Finish this job</p>' +
      '<p class="dbsub" style="margin:-.3rem 0 .8rem">Add up to ' + S.MAX_PHOTOS +
        ' photos of the finished work. They are saved to this job\u2019s record and stay available in the job database.</p>' +

      '<input type="file" accept="image/*" capture="environment" multiple hidden data-shot-input data-id="' + r.id + '">' +
      '<div class="req__actions" style="margin-top:0">' +
        '<button class="btn btn--ghost btn--sm" data-act="shot-add" data-id="' + r.id + '"' + (full ? " disabled" : "") + '>' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h3l2-3h8l2 3h3v11H3z"/><circle cx="12" cy="13" r="3.5"/></svg>' +
          "Upload job completion photos</button>" +
        '<span class="shotcount">' + DT("{n} of {max}", { n: shots.length, max: S.MAX_PHOTOS }) + "</span>" +
      "</div>" +
      thumbs +

      '<div class="field" style="margin-top:1rem"><label for="cm-' + r.id + '">Message to the customer</label>' +
      '<textarea class="input" id="cm-' + r.id + '" data-done-note>' +
      (langOf(r) === "es"
        ? "Terminamos en " + r.address + ". Todo lo de la lista qued\u00f3 hecho \u2014 \u00a1gracias por elegirnos!"
        : "All finished at " + r.address + ". Everything on the checklist is done \u2014 thank you for choosing us!") +
      "</textarea></div>" +

      '<div class="req__actions">' +
        '<button class="btn btn--primary btn--sm" data-act="done-share" data-id="' + r.id + '">Complete &amp; send photos</button>' +
        '<button class="btn btn--ghost btn--sm" data-act="done-email" data-id="' + r.id + '">Complete &amp; email</button>' +
        '<button class="btn btn--ghost btn--sm" data-act="done-save" data-id="' + r.id + '">Complete without sending</button>' +
        '<button class="btn btn--ghost btn--sm" data-act="done-cancel" data-id="' + r.id + '">Cancel</button>' +
      "</div></div>";
  }

  /** Shrink and re-encode on the phone: keeps storage sane and drops EXIF (and GPS) with it. */
  function shrink(file, maxPx, quality) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error("Couldn't read that photo.")); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error("That file isn't an image.")); };
        img.onload = function () {
          var w = img.width, h = img.height;
          var scale = Math.min(1, maxPx / Math.max(w, h));
          var cw = Math.round(w * scale), ch = Math.round(h * scale);
          var c = document.createElement("canvas");
          c.width = cw; c.height = ch;
          c.getContext("2d").drawImage(img, 0, 0, cw, ch);
          resolve(c.toDataURL("image/jpeg", quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function dataUrlToFile(dataUrl, name) {
    var parts = dataUrl.split(",");
    var mime = (parts[0].match(/:(.*?);/) || [])[1] || "image/jpeg";
    var bin = atob(parts[1]);
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new File([arr], name, { type: mime });
  }

  function finishJob(r, note, mode) {
    var shots = (draftPhotos[r.id] || []).map(function (p) {
      return { id: p.id, dataUrl: p.dataUrl, addedAt: p.addedAt };
    });

    var stored = S.setPhotos(r.id, shots);
    if (!stored && shots.length) {
      window.alert(D("This browser ran out of storage room, so the photos couldn't be saved.\n\n" +
        "The job will still be marked completed. Remove a few photos from older jobs, or move to the cloud " +
        "database (Settings) where photos aren't limited by the browser."));
    }

    S.updateRequest(r.id, { status: "done", completedAt: new Date().toISOString() });
    openDone = null;
    delete draftPhotos[r.id];
    refreshAll();

    if (mode === "email") {
      window.location.href = mailLink(r.email, "Your cleaning is complete \u2014 " + r.id,
        "Hi " + firstName(r.name) + ",\n\n" + note + "\n\n" +
        (shots.length ? "We took " + shots.length + " photo" + (shots.length > 1 ? "s" : "") +
          " of the finished work and they're on file with your job record. Just ask if you'd like them sent over.\n\n" : "") +
        "Job number: " + r.id + "\n\nThank you,\n" + BIZ + "\n" + BIZ_PHONE);
    }
    return { stored: stored, count: shots.length };
  }

  /* ---------------------------------------------------------------------
     Sending the completion message to the customer's own phone or email.
     Photos attach properly through the phone's share sheet. On a desktop no
     browser can attach a file to a mail client, so there we hand the owner the
     photos as downloads and open the message ready for them to attach.
     --------------------------------------------------------------------- */
  var sendCtx = null;

  function openSendDialog(r, note, shots) {
    sendCtx = { job: r, note: note, shots: shots || [] };
    var box = document.querySelector("[data-senddlg]");
    if (!box) return;

    var files = sendCtx.shots.map(function (p, i) {
      return dataUrlToFile(p.dataUrl, r.id + "-" + (i + 1) + ".jpg");
    });
    sendCtx.files = files;
    var n = sendCtx.shots.length;
    box.querySelector("[data-send-body]").innerHTML =
      TR('<p class="dbsub" style="margin:0 0 1rem">Job ' + r.id + " is completed and " + n +
        " photo" + (n === 1 ? " is" : "s are") + " saved to its record. Send them to " +
        firstName(r.name) + "?</p>" +

      '<ul class="summary" style="margin-bottom:1.1rem">' +
        "<li><span class='k'>Their mobile</span><span class='v'>" + (r.phone || "\u2014") + "</span></li>" +
        "<li><span class='k'>Their email</span><span class='v'>" + (r.email || "\u2014") + "</span></li>" +
      "</ul>" +

      (n
        ? '<div class="notice notice--info"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="10" cy="10" r="7.5"/><path d="M10 9v5M10 6.5v.5"/></svg>' +
          "<span><strong>Email with photos</strong> saves the " + n + " photo" + (n === 1 ? "" : "s") +
          " to your device and opens your email app with the message ready. Attach them from your downloads or camera roll before you send.</span></div>"
        : "") +

      '<div class="req__actions" style="margin-top:.4rem">' +
        '<button class="btn btn--primary btn--sm" data-send="email">Email with photos</button>' +
        '<button class="btn btn--ghost btn--sm" data-send="text">Text the message</button>' +
      "</div>");

    box.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeSendDialog() {
    var box = document.querySelector("[data-senddlg]");
    if (box) { box.hidden = true; document.body.style.overflow = ""; }
    sendCtx = null;
  }

  (function wireSend() {
    var box = document.querySelector("[data-senddlg]");
    if (!box) return;
    box.addEventListener("click", function (e) {
      if (e.target === box) { closeSendDialog(); return; }
      var b = e.target.closest("[data-send]");
      if (!b || !sendCtx) return;
      var mode = b.getAttribute("data-send");
      var r = sendCtx.job, note = sendCtx.note, files = sendCtx.files, shots = sendCtx.shots;

      if (mode === "skip") { closeSendDialog(); return; }

      if (mode === "text") {
        closeSendDialog();
        window.location.href = smsLink(r.phone, note + " Job number: " + r.id +
          (shots.length ? " Photos of the finished work are on file \u2014 just ask." : ""));
        return;
      }

      // Email: hand over the photos as downloads, then open the message.
      shots.forEach(function (p, i) {
        var a = document.createElement("a");
        a.href = p.dataUrl;
        a.download = r.id + "-" + (i + 1) + ".jpg";
        document.body.appendChild(a); a.click(); a.remove();
      });
      closeSendDialog();
      window.setTimeout(function () {
        window.location.href = mailLink(r.email, "Your cleaning is complete \u2014 " + r.id,
          "Hi " + firstName(r.name) + ",\n\n" + note + "\n\n" +
          (shots.length ? "Photos of the finished work are attached.\n\n" : "") +
          "Job number: " + r.id + "\n\nThank you,\n" + BIZ + "\n" + BIZ_PHONE);
      }, shots.length ? 700 : 0);
    });
  })();

  function payMessage(r, p, short) {
    var L = langOf(r);
    if (L === "es") {
      if (short) {
        return "Hola " + firstName(r.name) + ", le habla " + BIZ + ". Su factura de " +
          S.money(p.amount) + " est\u00e1 lista: " + p.url;
      }
      return "Hola " + firstName(r.name) + ",\n\nGracias por dejarnos ir a su casa. Su factura de " +
        S.money(p.amount) + " (" + p.description + ") est\u00e1 lista y puede pagarla de forma segura aqu\u00ed:\n\n" +
        p.url + "\n\nEl enlace funciona hasta el " +
        new Date(p.expiresAt).toLocaleDateString("es-US", { month: "long", day: "numeric", year: "numeric" }) +
        ". Si prefiere pagar en efectivo o con cheque, no hay problema \u2014 solo av\u00edsenos.\n\n" +
        "Referencia: " + r.id + "\n\nGracias,\n" + BIZ + "\n" + BIZ_PHONE;
    }
    if (short) {
      return "Hi " + firstName(r.name) + ", this is " + BIZ + ". Your invoice for " +
        S.money(p.amount) + " is ready: " + p.url;
    }
    return "Hi " + firstName(r.name) + ",\n\nThank you for having us out. Your invoice for " +
      S.money(p.amount) + " (" + p.description + ") is ready and you can pay it securely here:\n\n" +
      p.url + "\n\nThe link works until " +
      new Date(p.expiresAt).toLocaleDateString(I.locale(), { month: "long", day: "numeric", year: "numeric" }) +
      ". If you would rather pay by cash or check that is absolutely fine \u2014 just let us know.\n\n" +
      "Reference: " + r.id + "\n\nThank you,\n" + BIZ + "\n" + BIZ_PHONE;
  }

  function readEditor(id) {
    var card = document.querySelector('[data-act="rs-confirm"][data-id="' + id + '"]');
    if (!card) return null;
    var box = card.closest(".resched");
    return {
      date: box.querySelector("[data-rs-date]").value,
      window: box.querySelector("[data-rs-window]").value,
      note: box.querySelector("[data-rs-note]").value.trim()
    };
  }

  /* ================= Confirmed bookings calendar ================= */

  /** Jobs keyed by their confirmed date. Fed automatically by the inbox. */
  function bookedMap() {
    var map = {};
    S.getRequests().forEach(function (r) {
      if (r.status !== "confirmed" && r.status !== "done") return;
      if (!r.confirmedSlot || !r.confirmedSlot.date) return;
      (map[r.confirmedSlot.date] = map[r.confirmedSlot.date] || []).push(r);
    });
    Object.keys(map).forEach(function (k) {
      map[k].sort(function (a, b) {
        var order = S.WINDOWS.map(function (w) { return w.id; });
        return order.indexOf(a.confirmedSlot.window) - order.indexOf(b.confirmedSlot.window);
      });
    });
    return map;
  }

  /** Jobs happening within the next ~36 hours that haven't been reminded yet. */
  function remindersDue() {
    var now = new Date();
    var horizon = new Date(now.getTime() + 36 * 3600 * 1000);
    return S.getRequests().filter(function (r) {
      if (r.status !== "confirmed" || !r.confirmedSlot || !r.confirmedSlot.date) return false;
      if (r.remindedAt) return false;
      var d = S.parseISO(r.confirmedSlot.date);
      d.setHours(23, 59, 0, 0);
      var start = S.parseISO(r.confirmedSlot.date);
      return start >= S.today() && d <= horizon;
    });
  }

  function renderDue() {
    if (!elDue) return;
    var due = remindersDue();
    if (!due.length) { elDue.innerHTML = TR(""); return; }
    elDue.innerHTML = TR('<div class="duebox"><h3>Reminders due</h3>' +
      '<p style="margin:0;font-size:.9rem;color:var(--text-warn)">' + due.length +
      " job" + (due.length > 1 ? "s are" : " is") +
      " happening within the next day and hasn't had a reminder text yet.</p><ul>" +
      due.map(function (r) {
        return "<li><span><strong>" + r.name + "</strong> &middot; " +
          slotText(r.confirmedSlot) + "</span>" +
          '<span style="display:flex;gap:.4rem;flex-wrap:wrap">' +
          '<button class="btn btn--primary btn--sm" data-remind="send" data-id="' + r.id + '">Send reminder text</button>' +
          '<button class="btn btn--ghost btn--sm" data-remind="skip" data-id="' + r.id + '">Mark as sent</button>' +
          "</span></li>";
      }).join("") + "</ul></div>");
  }

  if (elDue) {
    elDue.addEventListener("click", function (e) {
      var b = e.target.closest("[data-remind]");
      if (!b) return;
      var id = b.getAttribute("data-id");
      var r = S.getRequests().filter(function (x) { return x.id === id; })[0];
      if (!r) return;
      S.updateRequest(id, { remindedAt: new Date().toISOString() });
      if (b.getAttribute("data-remind") === "send") {
        window.location.href = smsLink(r.phone, msgReminder(r));
      }
      refreshAll();
    });
  }

  /* ================= Manual booking ================= */
  function renderAddForm() {
    if (!elAddForm) return;
    var opts = S.WINDOWS.map(function (w) {
      return '<option value="' + w.id + '">' + w.label + " (" + w.time + ")</option>";
    }).join("");
    elAddForm.innerHTML =
      TR('<h3 style="font-size:1.1rem;margin-top:0">Add a booking</h3>' +
      '<p style="color:var(--muted);font-size:.9rem">For jobs booked over the phone or in person. It goes straight onto your calendar as confirmed.</p>' +
      '<div class="field-row">' +
        '<div class="field"><label for="ab-name">Customer name</label><input class="input" id="ab-name"></div>' +
        '<div class="field"><label for="ab-phone">Mobile number</label><input class="input" id="ab-phone" type="tel" placeholder="951-555-0148"></div>' +
      "</div>" +
      '<div class="field-row">' +
        '<div class="field"><label for="ab-email">Email</label><input class="input" id="ab-email" type="email"></div>' +
        '<div class="field"><label for="ab-kind">Type</label><select class="input" id="ab-kind">' +
        '<option value="residential">Residential</option><option value="commercial">Commercial</option></select></div>' +
      "</div>" +
      '<fieldset class="addrset"><legend>Service address</legend>' +
        '<div class="field"><label for="ab-street">Street address</label><input class="input" id="ab-street" placeholder="2841 Newport Rd"></div>' +
        '<div class="field"><label for="ab-unit">Apartment, suite or unit <span class="hint">optional</span></label><input class="input" id="ab-unit"></div>' +
        '<div class="field-row">' +
          '<div class="field"><label for="ab-city">City</label><select class="input" id="ab-city"><option value="">Choose</option>' +
          S.CITIES.map(function (c) { return "<option>" + c + "</option>"; }).join("") + "</select></div>" +
          '<div class="field"><label for="ab-state">State</label><input class="input" id="ab-state" value="CA" readonly></div>' +
          '<div class="field"><label for="ab-zip">ZIP code</label><input class="input" id="ab-zip" inputmode="numeric" maxlength="5"></div>' +
        "</div></fieldset>" +
      '<div class="field-row">' +
        '<div class="field"><label for="ab-date">Date</label><input class="input" type="date" id="ab-date" value="' + S.iso(S.today()) + '"></div>' +
        '<div class="field"><label for="ab-win">Time window</label><select class="input" id="ab-win">' + opts + "</select></div>" +
      "</div>" +
      '<div class="field"><label for="ab-price">Agreed price <span class="hint">optional</span></label><input class="input" id="ab-price" inputmode="numeric" placeholder="210"></div>' +
      '<div class="field"><label for="ab-notes">Notes</label><textarea class="input" id="ab-notes" placeholder="Gate code, pets, parking, anything to remember"></textarea></div>' +
      '<p class="field-error" data-error="addform"></p>' +
      '<div class="req__actions">' +
        '<button class="btn btn--primary btn--sm" data-addsave>Add to calendar</button>' +
        '<button class="btn btn--ghost btn--sm" data-addcancel>Cancel</button>' +
      "</div>");
  }

  var addBtn = document.querySelector("[data-addbooking]");
  if (addBtn) {
    addBtn.addEventListener("click", function () {
      if (elAddForm.hidden) { renderAddForm(); elAddForm.hidden = false; }
      else { elAddForm.hidden = true; }
    });
    elAddForm.addEventListener("click", function (e) {
      if (e.target.closest("[data-addcancel]")) { elAddForm.hidden = true; return; }
      if (!e.target.closest("[data-addsave]")) return;

      var v = function (id) { return (document.getElementById(id).value || "").trim(); };
      var missing = [];
      if (!v("ab-name")) missing.push("a customer name");
      if (!v("ab-phone")) missing.push("a mobile number");
      if (!v("ab-street")) missing.push("a street address");
      if (!v("ab-city")) missing.push("a city");
      if (!v("ab-zip")) missing.push("a ZIP code");
      if (!v("ab-date")) missing.push("a date");
      var errEl = elAddForm.querySelector('[data-error="addform"]');
      if (missing.length) {
        errEl.textContent = "Still need " + missing.join(", ") + ".";
        errEl.classList.add("is-shown");
        return;
      }
      errEl.classList.remove("is-shown");

      var price = v("ab-price").replace(/[^0-9]/g, "");
      var d = v("ab-date"), w = v("ab-win");
      S.addRequest({
        kind: v("ab-kind"), name: v("ab-name"), phone: v("ab-phone"),
        email: v("ab-email"),
        street: v("ab-street"), unit: v("ab-unit"),
        addressCity: v("ab-city"), addressState: "CA", addressZip: v("ab-zip"),
        address: [v("ab-street") + (v("ab-unit") ? ", " + v("ab-unit") : ""),
                  v("ab-city"), "CA " + v("ab-zip")].filter(Boolean).join(", "),
        city: v("ab-city"), zip: v("ab-zip"), source: "manual",
        slot1: { date: d, window: w }, slot2: { date: d, window: w },
        confirmedSlot: { date: d, window: w },
        ownerNotes: v("ab-notes"),
        estimate: price ? Number(price) : null,
        status: "confirmed"
      });
      elAddForm.hidden = true;
      selected2 = d;
      view2 = S.parseISO(d); view2.setDate(1);
      refreshAll();
    });
  }

  function renderCal2() {
    if (!elCal2) return;
    elMonth2.textContent = view2.toLocaleDateString(I.locale(), { month: "long", year: "numeric" });

    var first = new Date(view2.getFullYear(), view2.getMonth(), 1);
    var days = new Date(view2.getFullYear(), view2.getMonth() + 1, 0).getDate();
    var pad = first.getDay();
    var todayISO = S.iso(S.today());
    var booked = bookedMap();

    var html = DOW.map(function (d) { return '<div class="cal__dow">' + d + "</div>"; }).join("");
    for (var i = 0; i < pad; i++) html += "<div></div>";

    for (var d = 1; d <= days; d++) {
      var date = new Date(view2.getFullYear(), view2.getMonth(), d);
      var key = S.iso(date);
      var jobs = booked[key] || [];
      var cls = "cal__day";
      if (jobs.length) cls += " is-booked";
      if (key === selected2) cls += " is-selected";
      if (key === todayISO) cls += " is-today";
      var dots = jobs.slice(0, 4).map(function () { return "<i></i>"; }).join("");
      html += '<button class="' + cls + '" data-date2="' + key + '"' +
              (jobs.length ? "" : " disabled") +
              ' aria-label="' + date.toLocaleDateString(I.locale(), { weekday: "long", month: "long", day: "numeric" }) +
              (jobs.length ? ", " + jobs.length + " job" + (jobs.length > 1 ? "s" : "") + " booked" : ", nothing booked") + '">' +
              '<span class="cal__num">' + d + "</span>" +
              '<span class="cal__dots">' + dots + "</span></button>";
    }
    elCal2.innerHTML = TR(html);
  }

  function renderBookPanel() {
    if (!elBook) return;
    if (!selected2) {
      elBook.innerHTML = TR('<p style="color:var(--muted);margin:0;font-size:.94rem">Click a highlighted day to see the jobs booked for it.</p>');
      return;
    }
    var jobs = bookedMap()[selected2] || [];
    if (!jobs.length) {
      elBook.innerHTML = TR("<h3>" + S.prettyDate(selected2) + "</h3>" +
        '<p style="color:var(--muted);margin:0;font-size:.94rem">Nothing booked on this day.</p>');
      return;
    }
    elBook.innerHTML = TR("<h3>" + S.prettyDate(selected2) + "</h3>" +
      '<p style="color:var(--muted);font-size:.88rem;margin-bottom:.9rem">' +
      DT(jobs.length > 1 ? "{n} jobs booked" : "{n} job booked", { n: jobs.length }) + "</p>" +
      '<ul class="booklist">' + jobs.map(function (r) {
        var opts = S.WINDOWS.map(function (w) {
          return '<option value="' + w.id + '"' + (r.confirmedSlot.window === w.id ? " selected" : "") +
                 ">" + w.label + " (" + w.time + ")</option>";
        }).join("");
        return '<li class="bookjob">' +
          '<div class="bookjob__name">' + r.name + (r.company ? " &middot; " + r.company : "") + "</div>" +
          '<div class="bookjob__meta">' + (r.kind === "commercial" ? D("Commercial") : D("Residential")) +
          " &middot; " + r.address + "</div>" +
          '<div class="bookjob__meta"><a href="tel:' + r.phone + '">' + r.phone + "</a> &middot; " +
          '<a href="mailto:' + r.email + '">' + r.email + "</a></div>" +
          (r.access ? '<div class="bookjob__note"><strong>From the customer:</strong> ' + r.access + "</div>" : "") +
          '<div class="field-row" style="margin-top:.8rem">' +
            '<div class="field"><label for="bk-d-' + r.id + '">Date</label>' +
            '<input class="input" type="date" id="bk-d-' + r.id + '" data-bk-date value="' + r.confirmedSlot.date + '"></div>' +
            '<div class="field"><label for="bk-w-' + r.id + '">Time window</label>' +
            '<select class="input" id="bk-w-' + r.id + '" data-bk-window>' + opts + "</select></div>" +
          "</div>" +
          '<div class="field"><label for="bk-n-' + r.id + '">Notes for this job</label>' +
          '<textarea class="input" id="bk-n-' + r.id + '" data-bk-note placeholder="Gate code, pets, parking, anything to remember">' +
          (r.ownerNotes || "") + "</textarea></div>" +
          '<div class="req__actions">' +
            '<button class="btn btn--primary btn--sm" data-bk="save" data-id="' + r.id + '">Save changes</button>' +
            '<button class="btn btn--ghost btn--sm" data-bk="notify" data-id="' + r.id + '">Save and email customer</button>' +
            '<button class="btn btn--ghost btn--sm" data-bk="cancel" data-id="' + r.id + '">Cancel booking</button>' +
          "</div>" +
          '<div class="comms">' +
            '<button class="btn btn--primary btn--sm" data-bk="omw" data-id="' + r.id + '">On my way</button>' +
            '<button class="btn btn--ghost btn--sm" data-bk="omw-email" data-id="' + r.id + '">On my way &mdash; email</button>' +
            '<button class="btn btn--ghost btn--sm" data-bk="text-confirm" data-id="' + r.id + '">Text confirmation</button>' +
            '<button class="btn btn--ghost btn--sm" data-bk="text-remind" data-id="' + r.id + '">Text reminder</button>' +
            (r.enRouteAt ? '<span class="bookjob__flag">On the way since ' +
              new Date(r.enRouteAt).toLocaleTimeString(I.locale(), { hour: "numeric", minute: "2-digit" }) + "</span>" : "") +
            (r.remindedAt ? '<span class="bookjob__flag">Reminder sent</span>' : "") +
          "</div></li>";
      }).join("") + "</ul>");
  }

  if (elCal2) {
    elCal2.addEventListener("click", function (e) {
      var b = e.target.closest(".cal__day");
      if (!b || b.disabled) return;
      selected2 = b.getAttribute("data-date2");
      renderCal2(); renderBookPanel();
    });
    document.querySelector("[data-prev2]").addEventListener("click", function () {
      view2.setMonth(view2.getMonth() - 1); renderCal2();
    });
    document.querySelector("[data-next2]").addEventListener("click", function () {
      view2.setMonth(view2.getMonth() + 1); renderCal2();
    });
  }

  if (elBook) {
    elBook.addEventListener("click", function (e) {
      var b = e.target.closest("[data-bk]");
      if (!b) return;
      var id = b.getAttribute("data-id");
      var act = b.getAttribute("data-bk");
      var req = S.getRequests().filter(function (r) { return r.id === id; })[0];
      if (!req) return;

      // Message-only actions: no data is edited, just open the right app.
      if (act === "omw" || act === "omw-email" || act === "text-confirm" || act === "text-remind") {
        if (act === "omw") {
          S.updateRequest(id, { enRouteAt: new Date().toISOString() });
          refreshAll();
          window.location.href = smsLink(req.phone, msgOnMyWay(req));
        } else if (act === "omw-email") {
          S.updateRequest(id, { enRouteAt: new Date().toISOString() });
          refreshAll();
          window.location.href = mailLink(req.email, "We're on our way",
            "Hi " + firstName(req.name) + ",\n\nWe're on our way to " + req.address +
            " now and should be with you shortly.\n\nThank you,\n" + BIZ + "\n" + BIZ_PHONE);
        } else if (act === "text-confirm") {
          window.location.href = smsLink(req.phone, msgConfirm(req));
        } else {
          S.updateRequest(id, { remindedAt: new Date().toISOString() });
          refreshAll();
          window.location.href = smsLink(req.phone, msgReminder(req));
        }
        return;
      }

      if (act === "cancel") {
        if (!window.confirm(D("Cancel this booking? It moves back to the inbox as a new request and opens a cancellation email."))) return;
        var was = req.confirmedSlot;
        S.updateRequest(id, {
          status: "new", confirmedSlot: null,
          enRouteAt: null, remindedAt: null, cancelledAt: new Date().toISOString()
        });
        selected2 = null;
        refreshAll();
        window.location.href = mailLink(req.email,
          "Your cleaning on " + S.prettyDate(was.date) + " has been cancelled",
          msgCancel(req, was));
        return;
      }

      var li = b.closest(".bookjob");
      var newDate = li.querySelector("[data-bk-date]").value;
      var newWin = li.querySelector("[data-bk-window]").value;
      var notes = li.querySelector("[data-bk-note]").value.trim();
      if (!newDate) { window.alert(D("Pick a date for this job.")); return; }

      S.updateRequest(id, {
        confirmedSlot: { date: newDate, window: newWin },
        ownerNotes: notes
      });
      if (selected2 !== newDate) selected2 = newDate;

      if (act === "notify") {
        window.location.href = "mailto:" + req.email +
          "?subject=" + encodeURIComponent("Updated cleaning appointment - " + S.prettyDate(newDate)) +
          "&body=" + encodeURIComponent(
            "Hi " + req.name.split(" ")[0] + ",\n\n" +
            "Your cleaning is now set for " + S.prettyDate(newDate) + ", " + S.windowLabel(newWin) + ".\n\n" +
            "Address: " + req.address + "\n" +
            "Reference: " + req.id + "\n\nThank you,\nMenifee Maids\n951-464-8147");
      }
      refreshAll();
    });
  }

  function refreshAll() { renderCal(); renderCal2(); renderBookPanel(); renderDue(); refreshCards(); refreshDb(); }

  function handleCardAction(e) {
    var b = e.target.closest("[data-act]");
    if (!b) return;
    var id = b.getAttribute("data-id");
    var act = b.getAttribute("data-act");
    var req = S.getRequests().filter(function (r) { return r.id === id; })[0];
    if (!req) return;

    if (act === "reopen") {
      var wasPaid = S.paymentsFor(id).some(function (x) { return x.status === "paid"; });
      if (!window.confirm(D("Reopen job " + id + "?\n\n" +
        "It goes back to your inbox as confirmed work so you can reschedule it, add photos " +
        "or send it out again. Photos and notes are kept" +
        (wasPaid ? ", and the payment stays marked paid \u2014 use Mark unpaid if you're refunding." : ".")
      ))) return;
      S.updateRequest(id, {
        status: "confirmed",
        reopenedAt: new Date().toISOString(),
        completedAt: null
      });
      if (modalJobId === id) closeJobModal();
      filter = "all";
      Array.prototype.forEach.call(document.querySelectorAll("[data-filter]"), function (x) {
        x.setAttribute("aria-pressed", x.getAttribute("data-filter") === "all" ? "true" : "false");
      });
      refreshAll();
      window.setTimeout(function () {
        var cards = elReqs.querySelectorAll(".req");
        for (var i = 0; i < cards.length; i++) {
          if (cards[i].textContent.indexOf(id) > -1) {
            cards[i].scrollIntoView({ behavior: "smooth", block: "center" });
            cards[i].classList.add("is-flash");
            window.setTimeout(function (c) { return function () { c.classList.remove("is-flash"); }; }(cards[i]), 2400);
            return;
          }
        }
      }, 120);
      return;
    }

    if (act === "photos") {
      openDone = (openDone === id) ? null : id;
      openEditor = null; openPay = null;
      if (openDone && !draftPhotos[id]) draftPhotos[id] = (S.getPhotos(id) || []).slice();
      refreshCards();
      return;
    }
    if (act === "photo-remove") {
      var kept = S.getPhotos(id).slice();
      kept.splice(Number(b.getAttribute("data-i")), 1);
      S.setPhotos(id, kept);
      if (draftPhotos[id]) draftPhotos[id] = kept.slice();
      refreshAll();
      return;
    }

    if (act === "complete") {
      openDone = (openDone === id) ? null : id;
      openEditor = null; openPay = null;
      if (openDone && !draftPhotos[id]) {
        draftPhotos[id] = (S.getPhotos(id) || []).slice();
      }
      refreshCards();
      return;
    }
    if (act === "done-cancel") { openDone = null; delete draftPhotos[id]; refreshCards(); return; }

    if (act === "shot-add") {
      var inp = document.querySelector('[data-shot-input][data-id="' + id + '"]');
      if (inp) inp.click();
      return;
    }
    if (act === "shot-remove") {
      var idx = Number(b.getAttribute("data-i"));
      (draftPhotos[id] || []).splice(idx, 1);
      refreshCards();
      return;
    }

    if (act === "done-save" || act === "done-email" || act === "done-share") {
      var noteEl = document.querySelector('[data-done-note]');
      var note = noteEl ? noteEl.value.trim() : "";
      var shotsForShare = (draftPhotos[id] || []).slice();

      if (act === "done-share") {
        finishJob(req, note, "none");
        openSendDialog(req, note, shotsForShare);
        return;
      }

      finishJob(req, note, act === "done-email" ? "email" : "none");
      return;
    }

    if (act === "payopen") { openPay = (openPay === id) ? null : id; openEditor = null; refreshCards(); return; }
    if (act === "pay-close") { openPay = null; refreshCards(); return; }

    if (act === "pay-create") {
      var card = document.querySelector('[data-act="pay-create"][data-id="' + id + '"]').closest(".resched");
      var amt = parseFloat(card.querySelector("[data-pl-amount]").value);
      var desc = card.querySelector("[data-pl-desc]").value.trim();
      if (!amt || amt <= 0) { window.alert(D("Enter the amount to charge, in dollars.")); return; }
      S.createPayment(req, amt, {
        description: desc || S.describeJob(req),
        baseUrl: window.location.href.split("#")[0].split("?")[0]
      });
      refreshAll();
      return;
    }

    if (act === "pay-email" || act === "pay-text" || act === "pay-copy") {
      var p0 = S.paymentsFor(id)[0];
      if (!p0) { window.alert(D("Create the link first.")); return; }
      if (act === "pay-copy") {
        var input = document.querySelector('[data-act="pay-copy"][data-id="' + id + '"]')
                          .closest(".resched").querySelector("[data-pl-url]");
        input.select(); input.setSelectionRange(0, 99999);
        try { document.execCommand("copy"); window.alert(D("Link copied.")); }
        catch (x) { window.alert(D("Copy it from the box above.")); }
        return;
      }
      if (act === "pay-text") {
        window.location.href = smsLink(req.phone, payMessage(req, p0, true));
      } else {
        window.location.href = mailLink(req.email,
          "Your invoice from " + BIZ + " \u2014 " + S.money(p0.amount),
          payMessage(req, p0, false));
      }
      return;
    }

    if (act === "pay-verify") {
      var pv = S.activePaymentFor(id);
      if (!pv) { window.alert(D("Create the link first.")); return; }
      var cfgv = S.getSettings();
      if (!cfgv.stripeVerifyUrl) {
        window.alert(D("No Stripe check endpoint saved. Add it in Settings \u2014 sample code is in the server/ folder."));
        return;
      }
      var u = cfgv.stripeVerifyUrl.replace(/\/+$/, "");
      u += (u.indexOf("?") > -1 ? "&" : "?") + "job=" + encodeURIComponent(id) + "&token=" + encodeURIComponent(pv.token);
      fetch(u, { headers: cfgv.apiKey ? { "x-api-key": cfgv.apiKey } : {} })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (res) {
          S.recordVerification(pv.token, res);
          refreshAll();
          window.alert(res.paid
            ? "Stripe confirms job " + id + " was paid" + (res.amountPaid ? " (" + S.money(res.amountPaid) + ")" : "") + "."
            : "Stripe has no completed payment for job " + id + " yet.");
        })
        ["catch"](function () { window.alert(D("Couldn't reach the Stripe check endpoint. Confirm the address in Settings.")); });
      return;
    }

    if (act === "pay-paid" || act === "pay-unpaid") {
      var p1 = S.activePaymentFor(id) || S.paymentsFor(id)[0];
      if (p1) {
        S.markPayment(p1.token, act === "pay-paid" ? "paid" : "sent");
      } else if (act === "pay-paid") {
        // Cash or check: record the payment so the job can close without a link.
        var amt = window.prompt("How much was paid, in dollars?", req.estimate || "");
        if (amt === null) return;
        amt = parseFloat(String(amt).replace(/[^0-9.]/g, ""));
        if (!amt || amt <= 0) { window.alert(D("Enter an amount greater than zero.")); return; }
        var made = S.createPayment(req, amt, {
          baseUrl: window.location.href.split("#")[0].split("?")[0],
          description: S.describeJob(req) + " (paid directly)"
        });
        S.markPayment(made.token, "paid");
      }
      refreshAll();
      return;
    }

    if (act === "reschedule") {
      openEditor = (openEditor === id) ? null : id;
      refreshCards();
      return;
    }
    if (act === "rs-cancel") { openEditor = null; refreshCards(); return; }
    if (act === "rs-confirm" || act === "rs-propose") {
      var edit = readEditor(id);
      if (!edit || !edit.date) { window.alert(D("Pick a date first.")); return; }
      var confirming = act === "rs-confirm";
      S.updateRequest(id, {
        status: confirming ? "confirmed" : "awaiting",
        confirmedSlot: confirming ? { date: edit.date, window: edit.window } : req.confirmedSlot || null,
        proposedSlot: confirming ? null : { date: edit.date, window: edit.window }
      });
      openEditor = null;
      var line = confirming
        ? "Your cleaning is confirmed for " + S.prettyDate(edit.date) + ", " + S.windowLabel(edit.window) + "."
        : "We'd like to move your cleaning to " + S.prettyDate(edit.date) + ", " + S.windowLabel(edit.window) +
          ". Just reply to let us know if that works.";
      window.location.href = "mailto:" + req.email +
        "?subject=" + encodeURIComponent((confirming ? "Your cleaning is confirmed - " : "About your cleaning - ") + S.prettyDate(edit.date)) +
        "&body=" + encodeURIComponent(
          "Hi " + req.name.split(" ")[0] + ",\n\n" + line + "\n\n" +
          (edit.note ? edit.note + "\n\n" : "") +
          "Address: " + req.address + "\nReference: " + req.id +
          "\n\nThank you,\nMenifee Maids\n951-464-8147");
      refreshAll();
      return;
    }
    if (act === "accept1" || act === "accept2") {
      var slot = act === "accept1" ? req.slot1 : req.slot2;
      S.updateRequest(id, { status: "confirmed", confirmedSlot: slot });
      window.setTimeout(function () {
        if (window.confirm(D("Confirmation email opened.\n\nAlso text the confirmation to " + req.phone + "?"))) {
          var fresh = S.getRequests().filter(function (x) { return x.id === id; })[0];
          window.location.href = smsLink(fresh.phone, msgConfirm(fresh));
        }
      }, 900);
      var body = "Hi " + req.name.split(" ")[0] + ",\n\n" +
        "You're confirmed for " + S.prettyDate(slot.date) + ", " + S.windowLabel(slot.window) + ".\n\n" +
        "Address: " + req.address + "\n" +
        (req.estimate ? "Estimated total: $" + req.estimate + "\n" : "") +
        "\nReference: " + req.id + "\n\nThank you,\nMenifee Maids\n951-464-8147";
      window.location.href = "mailto:" + req.email +
        "?subject=" + encodeURIComponent("Your cleaning is confirmed - " + S.prettyDate(slot.date)) +
        "&body=" + encodeURIComponent(body);
    } else if (act === "awaiting") {
      S.updateRequest(id, { status: "awaiting" });
      window.location.href = "mailto:" + req.email +
        "?subject=" + encodeURIComponent("About your cleaning request " + req.id) +
        "&body=" + encodeURIComponent("Hi " + req.name.split(" ")[0] +
          ",\n\nThanks for your request. Neither of those windows works on our end " +
          "- could you do one of these instead?\n\n1) \n2) \n\nMenifee Maids\n951-464-8147");
    } else if (act === "done") {
      S.updateRequest(id, { status: "done" });
    } else if (act === "delete") {
      if (!window.confirm(D("Delete this request permanently?"))) return;
      S.saveRequests(S.getRequests().filter(function (r) { return r.id !== id; }));
      if (openEditor === id) openEditor = null;
      if (openPay === id) openPay = null;
      if (openDone === id) openDone = null;
      if (modalJobId === id) closeJobModal();
    }
    refreshAll();
  }

  elReqs.addEventListener("click", handleCardAction);

  document.addEventListener("change", function (e) {
    var inp = e.target.closest("[data-shot-input]");
    if (!inp) return;
    var id = inp.getAttribute("data-id");
    var chosen = Array.prototype.slice.call(inp.files || []);
    if (!chosen.length) return;

    var room = S.MAX_PHOTOS - (draftPhotos[id] || []).length;
    if (room <= 0) { window.alert(D("That's the maximum of " + S.MAX_PHOTOS + " photos.")); return; }
    if (chosen.length > room) {
      window.alert(D("Only " + room + " more photo" + (room > 1 ? "s" : "") + " will fit, so the first " + room + " were added."));
      chosen = chosen.slice(0, room);
    }

    Promise.all(chosen.map(function (f) { return shrink(f, 1400, 0.72); }))
      .then(function (urls) {
        draftPhotos[id] = (draftPhotos[id] || []).concat(urls.map(function (u, i) {
          return { id: "ph_" + Date.now() + "_" + i, dataUrl: u, addedAt: new Date().toISOString() };
        }));
        refreshCards();
      })
      ["catch"](function (err) { window.alert(err.message || "Those photos couldn't be added."); });
  });

  Array.prototype.forEach.call(document.querySelectorAll("[data-filter]"), function (b) {
    b.addEventListener("click", function () {
      filter = b.getAttribute("data-filter");
      Array.prototype.forEach.call(document.querySelectorAll("[data-filter]"), function (x) {
        x.setAttribute("aria-pressed", x === b ? "true" : "false");
      });
      renderRequests();
    });
  });

  /* --- Sample request so the inbox isn't empty on first look -------------- */
  document.querySelector("[data-demo]").addEventListener("click", function () {
    var open = S.openDates(30);
    if (open.length < 2) { window.alert(D("Open a couple of days on the calendar first.")); return; }
    S.addRequest({
      kind: "residential", zip: "92584", city: "Menifee",
      bedrooms: 3, bathrooms: 2, serviceType: "deep", frequency: "biweekly",
      addons: ["oven", "fridge"],
      slot1: { date: open[0].date, window: open[0].windows[0] },
      slot2: { date: open[1].date, window: open[1].windows[0] },
      name: "Sample Customer", phone: "951-555-0148",
      email: "sample@example.com", address: "123 Newport Rd, Menifee, CA 92584",
      access: "Dog in the backyard, gate code 4417",
      estimate: 295
    });
    refreshAll();
  });

  /* =========================================================================
     Job database: search, Stripe verification, CSV export
     ========================================================================= */
  var DB = window.MCC.db;
  var dbFilter = { q: "", bucket: "present", status: "", paid: "", from: "", to: "" };
  var dbRows = [];
  var DB_PAGE = 10;
  var dbShown = DB_PAGE;

  function el(sel) { return document.querySelector(sel); }

  /** Revenue collected and distinct days worked, for the month we're in. */
  function renderMonthStats() {
    var box = document.querySelector("[data-month-stats]");
    if (!box) return;
    var now = new Date();
    var pref = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");

    // A reset just moves the "counting from" line; nothing is deleted.
    var since = S.getSettings().monthResetAt || "";

    var revenue = 0;
    S.getPayments().forEach(function (p) {
      if (p.status !== "paid") return;
      var stamp = p.paidAt || p.createdAt || "";
      if (stamp.slice(0, 7) !== pref) return;
      if (since && stamp <= since) return;
      revenue += (p.amountPaid || p.amount || 0);
    });

    var todayISO = S.iso(S.today());
    var days = {}, closed = 0;

    S.getRequests().forEach(function (r) {
      // A finished job counts on the day it was finished; a confirmed one on
      // the day it is booked for. Either way, only days that have arrived count
      // as worked — a booking three weeks out isn't a day you've worked yet.
      var dayKey = (r.status === "done" && r.completedAt)
        ? r.completedAt.slice(0, 10)
        : (r.confirmedSlot && r.confirmedSlot.date) || "";

      if ((r.status === "done" || r.status === "confirmed") &&
          dayKey && dayKey <= todayISO && dayKey.slice(0, 7) === pref &&
          !(since && dayKey <= since.slice(0, 10))) {
        days[dayKey] = true;
      }

      // A job only counts as closed once it is both finished and paid.
      if (window.MCC.db.isClosed(r)) {
        var stamp = r.completedAt ||
          (r.confirmedSlot && r.confirmedSlot.date ? r.confirmedSlot.date + "T23:59:59.000Z" : "");
        if (stamp.slice(0, 7) === pref && !(since && stamp <= since)) closed++;
      }
    });
    var worked = Object.keys(days).length;

    box.innerHTML =
      TR('<div class="monthbox__t">' + now.toLocaleDateString(I.locale(), { month: "long", year: "numeric" }) +
        (since ? " \u00b7 since " + S.prettyDate(since.slice(0, 10)) : "") + "</div>" +
      '<div class="monthbox__row">' +
        '<div><div class="monthbox__n">' + S.money(revenue) + '</div><div class="monthbox__l">Revenue collected</div></div>' +
        '<div><div class="monthbox__n">' + worked + '</div><div class="monthbox__l">Days worked</div></div>' +
        '<div><div class="monthbox__n">' + closed + '</div><div class="monthbox__l">Jobs closed</div></div>' +
      "</div>" +
      '<div class="monthbox__acts">' +
        '<button class="monthbox__btn" data-month-reset>Reset counters</button>' +
        (since ? '<button class="monthbox__btn" data-month-unreset>Undo reset</button>' : "") +
      "</div>");

    var rb = box.querySelector("[data-month-reset]");
    if (rb) rb.addEventListener("click", function () {
      if (!window.confirm(D("Reset this month's revenue, days worked and jobs closed to zero?\n\n" +
        "Nothing is deleted \u2014 the counters just start again from now, and you can undo it."))) return;
      S.saveSettings({ monthResetAt: new Date().toISOString() });
      renderMonthStats();
    });
    var ub = box.querySelector("[data-month-unreset]");
    if (ub) ub.addEventListener("click", function () {
      S.saveSettings({ monthResetAt: "" });
      renderMonthStats();
    });
  }

  function renderDbStats() {
    var box = el("[data-db-stats]");
    if (!box) return;
    DB.stats().then(function (st) {
      box.innerHTML =
        TR('<div class="dbstat"><span class="dbstat__n">' + st.present + '</span><span class="dbstat__l">Open jobs</span></div>' +
        '<div class="dbstat"><span class="dbstat__n">' + st.past + '</span><span class="dbstat__l">Closed jobs</span></div>' +
        '<div class="dbstat"><span class="dbstat__n">' + S.money(st.unpaidValue) + '</span><span class="dbstat__l">Outstanding</span></div>' +
        '<div class="dbstat"><span class="dbstat__n">' + S.money(st.paidValue) + '</span><span class="dbstat__l">Collected</span></div>');
    })["catch"](function (e) {
      box.innerHTML = TR('<p class="field-error is-shown">' + e.message + "</p>");
    });
  }

  function payBadge(j) {
    if (j.paid) {
      return '<span class="pill pill--conf">Paid</span>' +
        (j.stripeRef ? '<span class="dbref" title="Stripe reference">' + j.stripeRef + "</span>" : "");
    }
    if (j.paymentStatus === "sent") return '<span class="pill pill--wait">Link sent</span>';
    return '<span class="pill pill--new">Unpaid</span>';
  }

  function renderDbResults() {
    var box = el("[data-db-results]");
    var count = el("[data-db-count]");
    if (!box) return;
    box.innerHTML = TR('<p style="color:var(--muted);margin:0">Searching&hellip;</p>');

    DB.search(dbFilter).then(function (rows) {
      dbRows = rows;
      var visible = rows.slice(0, dbShown);
      count.textContent = rows.length === 0
        ? D("No jobs match those filters.")
        : DT(rows.length > 1 ? "Showing {a} of {b} jobs" : "Showing {a} of {b} job",
             { a: visible.length, b: rows.length });

      if (!rows.length) {
        box.innerHTML = TR('<p class="dbempty">Nothing here yet. Try widening the dates, clearing the search box, or switching tabs.</p>');
        return;
      }

      box.innerHTML =
        TR('<table class="dbt"><thead><tr>' +
        "<th>Job number</th><th>Customer</th><th>Scheduled</th><th>Status</th><th>Amount</th><th>Payment</th><th>Photos</th><th></th>" +
        "</tr></thead><tbody>" +
        visible.map(function (j) {
          var meta = j.display;
          var when = j.scheduledFor
            ? S.prettyDate(j.scheduledFor) + (j.window ? " &middot; " + S.WINDOWS.filter(function (w) { return w.id === j.window; }).map(function (w) { return w.label; })[0] : "")
            : "<span style='color:var(--muted)'>Not scheduled</span>";
          return "<tr>" +
            '<td><code class="dbjob">' + j.id + "</code></td>" +
            "<td><strong>" + j.name + "</strong>" + (j.company ? "<br><span class='dbsub'>" + j.company + "</span>" : "") +
              "<br><span class='dbsub'>" + (j.city || j.address || "") + "</span></td>" +
            "<td>" + when + "</td>" +
            '<td><span class="pill ' + meta.pill + '">' + meta.label + "</span></td>" +
            "<td>" + (j.amount ? S.money(j.amount) : "&mdash;") + "</td>" +
            "<td>" + payBadge(j) + "</td>" +
            "<td>" + (j.photoCount
              ? '<button class="btn btn--ghost btn--sm" data-db-photos="' + j.id + '">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h3l2-3h8l2 3h3v11H3z"/><circle cx="12" cy="13" r="3.5"/></svg>' +
                j.photoCount + "</button>"
              : '<span class="dbsub">&mdash;</span>') + "</td>" +
            '<td><button class="btn btn--ghost btn--sm" data-db-open="' + j.id + '">Open</button></td>' +
            "</tr>";
        }).join("") + "</tbody></table>" +
        (rows.length > visible.length
          ? '<div class="dbmore"><button class="btn btn--ghost" data-db-more>' +
            DT("Show {n} more ({left} remaining)", { n: Math.min(DB_PAGE, rows.length - visible.length),
                left: rows.length - visible.length }) + "</button></div>"
          : (rows.length > DB_PAGE
              ? '<div class="dbmore"><button class="btn btn--ghost btn--sm" data-db-less>Show fewer</button></div>'
              : "")));
    })["catch"](function (e) {
      box.innerHTML = TR('<p class="field-error is-shown">' + e.message + "</p>");
      count.textContent = "";
    });
  }

  function refreshDb() { renderMonthStats(); renderDbStats(); renderDbResults(); }

  /* ---- Opening a job from the database ----
     A live job scrolls to its real card in the inbox. A finished or cancelled
     job has no inbox card, so the identical card opens in a dialog instead. ---- */
  function openJobDetail(id) {
    var r = S.getRequests().filter(function (x) { return x.id === id; })[0];
    if (!r) { window.alert(D("That job is no longer in the database.")); return; }

    if (r.status !== "done" && r.status !== "cancelled") {
      filter = "all";
      Array.prototype.forEach.call(document.querySelectorAll("[data-filter]"), function (x) {
        x.setAttribute("aria-pressed", x.getAttribute("data-filter") === "all" ? "true" : "false");
      });
      renderRequests();
      window.setTimeout(function () {
        var cards = elReqs.querySelectorAll(".req");
        for (var i = 0; i < cards.length; i++) {
          if (cards[i].textContent.indexOf(id) > -1) {
            cards[i].scrollIntoView({ behavior: "smooth", block: "center" });
            cards[i].classList.add("is-flash");
            window.setTimeout(function (c) { return function () { c.classList.remove("is-flash"); }; }(cards[i]), 2400);
            return;
          }
        }
      }, 80);
      return;
    }

    var box = document.querySelector("[data-jobdlg]");
    if (!box) return;
    modalJobId = id;
    box.hidden = false;
    document.body.style.overflow = "hidden";
    renderModalCard();
    box.querySelector("[data-job-close]").focus();
  }

  (function wireJobDlg() {
    var box = document.querySelector("[data-jobdlg]");
    if (!box) return;
    box.addEventListener("click", function (e) {
      if (e.target === box || e.target.closest("[data-job-close]")) { closeJobModal(); return; }
      handleCardAction(e);          // exactly the same actions as the inbox
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !box.hidden) closeJobModal();
    });
  })();

  /* ---- Photo viewer, opened from the job database ---- */
  var lb = document.querySelector("[data-lightbox]");
  function showPhotos(jobId) {
    if (!lb) return;
    var job = S.getRequests().filter(function (r) { return r.id === jobId; })[0];
    var shots = (job && job.photos) || [];
    if (!shots.length) { window.alert(D("No photos on this job.")); return; }

    lb.querySelector("[data-lb-title]").textContent = job.name + " \u2014 " + shots.length +
      " photo" + (shots.length > 1 ? "s" : "");
    lb.querySelector("[data-lb-sub]").textContent = jobId + " \u00b7 " + (job.address || "") +
      (job.completedAt ? " \u00b7 completed " +
        new Date(job.completedAt).toLocaleDateString(I.locale(), { month: "long", day: "numeric", year: "numeric" }) : "");
    lb.querySelector("[data-lb-grid]").innerHTML = TR(shots.map(function (p, i) {
      return '<a class="shot" href="' + p.dataUrl + '" download="' + jobId + "-" + (i + 1) +
             '.jpg" title="Click to download"><img src="' + p.dataUrl + '" alt="Job photo ' + (i + 1) + '"></a>';
    }).join(""));
    lb.hidden = false;
    document.body.style.overflow = "hidden";
    lb.querySelector("[data-lb-close]").focus();
  }
  function hidePhotos() { if (lb) { lb.hidden = true; document.body.style.overflow = ""; } }
  if (lb) {
    lb.addEventListener("click", function (e) {
      if (e.target === lb || e.target.closest("[data-lb-close]")) hidePhotos();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !lb.hidden) hidePhotos();
    });
  }

  (function wireDb() {
    if (!el("[data-db-results]")) return;

    var t;
    el("[data-db-q]").addEventListener("input", function (e) {
      dbFilter.q = e.target.value;
      dbShown = DB_PAGE;
      window.clearTimeout(t);
      t = window.setTimeout(renderDbResults, 180);
    });
    ["status", "paid", "from", "to"].forEach(function (k) {
      el("[data-db-" + k + "]").addEventListener("change", function (e) {
        dbFilter[k] = e.target.value;
        dbShown = DB_PAGE;
        renderDbResults();
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-bucket]"), function (b) {
      b.addEventListener("click", function () {
        dbFilter.bucket = b.getAttribute("data-bucket");
        dbShown = DB_PAGE;
        Array.prototype.forEach.call(document.querySelectorAll("[data-bucket]"), function (x) {
          x.classList.toggle("is-on", x === b);
          x.setAttribute("aria-selected", x === b ? "true" : "false");
        });
        renderDbResults();
      });
    });
    el("[data-db-clear]").addEventListener("click", function () {
      dbFilter = { q: "", bucket: dbFilter.bucket, status: "", paid: "", from: "", to: "" };
      dbShown = DB_PAGE;
      el("[data-db-q]").value = "";
      ["status", "paid", "from", "to"].forEach(function (k) { el("[data-db-" + k + "]").value = ""; });
      renderDbResults();
    });

    el("[data-db-results]").addEventListener("click", function (e) {
      var ph = e.target.closest("[data-db-photos]");
      if (ph) { showPhotos(ph.getAttribute("data-db-photos")); return; }
      var more = e.target.closest("[data-db-more]");
      if (more) { dbShown += DB_PAGE; renderDbResults(); return; }
      var less = e.target.closest("[data-db-less]");
      if (less) { dbShown = DB_PAGE; renderDbResults(); return; }

      var b = e.target.closest("[data-db-open]");
      if (!b) return;
      openJobDetail(b.getAttribute("data-db-open"));
    });

    el("[data-db-export]").addEventListener("click", function () {
      if (!dbRows.length) { window.alert(D("Nothing to export with these filters.")); return; }
      var head = ["Job number", "Status", "Bucket", "Customer", "Company", "Phone", "Email",
                  "Address", "City", "Scheduled", "Amount", "Payment", "Stripe reference"];
      var rows = dbRows.map(function (j) {
        return [j.id, j.display.label, j.bucket, j.name, j.company, j.phone,
                j.email, j.address, j.city, j.scheduledFor || "",
                j.amount ? (j.amount / 100).toFixed(2) : "",
                j.paid ? "Paid" : (j.paymentStatus === "sent" ? "Link sent" : "Unpaid"),
                j.stripeRef || ""];
      });
      var csv = [head].concat(rows).map(function (r) {
        return r.map(function (c) { return '"' + String(c == null ? "" : c).replace(/"/g, '""') + '"'; }).join(",");
      }).join("\r\n");
      var blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "menifee-maids-jobs-" + S.iso(new Date()) + ".csv";
      a.click();
      URL.revokeObjectURL(a.href);
    });

    el("[data-db-sync]").addEventListener("click", function () { syncStripe(this); });
    el("[data-db-pdf]").addEventListener("click", exportPdf);
  })();

  /**
   * PDF of every job matching the current filters, in the order shown.
   * Built as a print document and handed to the browser's own PDF writer, so
   * there's no library to load and it works offline.
   */
  function exportPdf() {
    if (!dbRows.length) { window.alert(D("Nothing to export with these filters.")); return; }

    var bucketName = { present: "Open jobs", past: "Closed jobs", all: "All jobs" }[dbFilter.bucket];
    var bits = [];
    if (dbFilter.q) bits.push('matching "' + dbFilter.q + '"');
    if (dbFilter.status) bits.push("status: " + DB.statusMeta(dbFilter.status).label);
    if (dbFilter.paid) bits.push(dbFilter.paid === "paid" ? "paid only" : "unpaid only");
    if (dbFilter.from) bits.push("from " + S.prettyDate(dbFilter.from));
    if (dbFilter.to) bits.push("to " + S.prettyDate(dbFilter.to));

    var totalAmount = dbRows.reduce(function (a, j) { return a + (j.amount || 0); }, 0);
    var totalPaid = dbRows.reduce(function (a, j) { return a + (j.paid ? (j.amount || 0) : 0); }, 0);

    var rows = dbRows.map(function (j) {
      return "<tr>" +
        "<td class='mono'>" + j.id + "</td>" +
        "<td><strong>" + esc(j.name) + "</strong>" + (j.company ? "<br>" + esc(j.company) : "") +
          "<br><span class='sub'>" + esc(j.phone || "") + "</span></td>" +
        "<td>" + esc(j.address || "") + "</td>" +
        "<td>" + (j.scheduledFor ? S.prettyDate(j.scheduledFor) : "\u2014") + "</td>" +
        "<td>" + j.display.label + "</td>" +
        "<td class='num'>" + (j.amount ? S.money(j.amount) : "\u2014") + "</td>" +
        "<td>" + (j.paid ? "Paid" : (j.paymentStatus === "sent" ? "Unpaid" : "\u2014")) + "</td>" +
        "<td class='num'>" + (j.photoCount || 0) + "</td>" +
        "</tr>";
    }).join("");

    var w = window.open("", "_blank", "width=1024,height=760");
    if (!w) { window.alert(D("Your browser blocked the export window. Allow pop-ups for this page and try again.")); return; }

    w.document.write(
      "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Menifee Maids \u2014 job records</title><style>" +
      "*{box-sizing:border-box}" +
      "body{font:12px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#0C2A38;margin:28px}" +
      "h1{font-size:20px;margin:0 0 4px}" +
      ".meta{color:#6B8189;font-size:11px;margin:0 0 4px}" +
      ".totals{margin:14px 0 18px;padding:10px 12px;background:#E0F7FB;border-radius:8px;font-size:12px}" +
      ".totals strong{font-size:14px}" +
      "table{width:100%;border-collapse:collapse}" +
      "th{text-align:left;font-size:9.5px;letter-spacing:.06em;text-transform:uppercase;color:#6B8189;" +
        "border-bottom:1.5px solid #0C2A38;padding:6px 6px}" +
      "td{padding:7px 6px;border-bottom:1px solid #E1ECF0;vertical-align:top}" +
      "tr{page-break-inside:avoid}" +
      "thead{display:table-header-group}" +
      ".mono{font-family:ui-monospace,Menlo,monospace;font-size:10.5px;white-space:nowrap}" +
      ".num{text-align:right;white-space:nowrap}" +
      ".sub{color:#7595A2;font-size:10.5px}" +
      "footer{margin-top:20px;font-size:10px;color:#7595A2;border-top:1px solid #E1ECF0;padding-top:8px}" +
      "@page{size:landscape;margin:12mm}" +
      "</style></head><body>" +
      "<h1>Menifee Maids \u2014 job records</h1>" +
      "<p class='meta'>" + bucketName + (bits.length ? " \u00b7 " + bits.join(" \u00b7 ") : "") + "</p>" +
      "<p class='meta'>" + dbRows.length + " record" + (dbRows.length > 1 ? "s" : "") +
        " \u00b7 generated " + new Date().toLocaleString(I.locale(),
          { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) + "</p>" +
      "<div class='totals'>Invoiced <strong>" + S.money(totalAmount) + "</strong> &nbsp;\u00b7&nbsp; " +
        "Collected <strong>" + S.money(totalPaid) + "</strong> &nbsp;\u00b7&nbsp; " +
        "Outstanding <strong>" + S.money(totalAmount - totalPaid) + "</strong></div>" +
      "<table><thead><tr><th>Job number</th><th>Customer</th><th>Address</th><th>Scheduled</th>" +
      "<th>Status</th><th class='num'>Amount</th><th>Payment</th><th class='num'>Photos</th></tr></thead>" +
      "<tbody>" + rows + "</tbody></table>" +
      "<footer>Menifee Maids \u00b7 951-464-8147 \u00b7 info.menifeemaids@outlook.com" +
      " &nbsp;\u2014&nbsp; records are retained for 3 months and then deleted automatically.</footer>" +
      "</body></html>");
    w.document.close();
    w.focus();
    window.setTimeout(function () { w.print(); }, 350);
  }

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* ---------------------------------------------------------------------
     Ask Stripe whether outstanding jobs have been paid.
     The browser can never hold a Stripe secret key, so this calls an endpoint
     the owner deploys; sample code lives in server/verify-payment.
     --------------------------------------------------------------------- */
  function syncStripe(btn) {
    var cfg = S.getSettings();
    if (!cfg.stripeVerifyUrl) {
      window.alert(D("No Stripe check endpoint saved yet.\n\n" +
        "Stripe can only be queried with a secret key, and a secret key can never live in a web page — " +
        "anyone could read it. So this asks a small endpoint you host instead.\n\n" +
        "There's ready-made code in the server/ folder. Deploy it, then paste its address into " +
        "Settings \u2192 Stripe check endpoint."));
      return;
    }

    var pending = S.getPayments().filter(function (p) { return p.status === "sent"; });
    if (!pending.length) { window.alert(D("No unpaid payment links to check.")); return; }

    var original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Checking " + pending.length + "\u2026";

    var base = cfg.stripeVerifyUrl.replace(/\/+$/, "");
    var done = 0, newlyPaid = 0, failed = 0;

    function finish() {
      btn.disabled = false;
      btn.textContent = original;
      refreshAll();
      var msg = newlyPaid
        ? newlyPaid + " job" + (newlyPaid > 1 ? "s" : "") + " came back paid and " +
          (newlyPaid > 1 ? "have" : "has") + " been updated."
        : "Checked " + done + " job" + (done > 1 ? "s" : "") + " \u2014 none have been paid yet.";
      if (failed) msg += "\n\n" + failed + " couldn't be checked. Confirm the endpoint address in Settings.";
      window.alert(msg);
    }

    pending.forEach(function (p) {
      var url = base + (base.indexOf("?") > -1 ? "&" : "?") +
                "job=" + encodeURIComponent(p.requestId) + "&token=" + encodeURIComponent(p.token);
      fetch(url, { headers: cfg.apiKey ? { "x-api-key": cfg.apiKey } : {} })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (res) {
          S.recordVerification(p.token, res);
          if (res.paid) newlyPaid++;
        })
        ["catch"](function () { failed++; })
        .then(function () { done++; if (done === pending.length) finish(); });
    });
  }

  /* ================= Settings ================= */
  (function settings() {
    var stripeEl = document.getElementById("set-stripe");
    if (!stripeEl) return;
    var expiryEl = document.getElementById("set-expiry");
    var verifyEl = document.getElementById("set-verify");
    var apiEl = document.getElementById("set-api");
    var keyEl = document.getElementById("set-apikey");
    var modeBox = document.querySelector("[data-db-mode]");
    var cur = S.getSettings();
    stripeEl.value = cur.stripeUrl || "";
    verifyEl.value = cur.stripeVerifyUrl || "";
    apiEl.value = cur.apiBaseUrl || "";
    keyEl.value = cur.apiKey || "";
    expiryEl.value = String(cur.payExpiryDays || 21);

    function showMode() {
      modeBox.textContent = DB.isRemote()
        ? "Connected to your cloud job database."
        : "Jobs are stored in this browser. Add an API base URL to move them to the cloud.";
      modeBox.className = DB.isRemote() ? "notice notice--ok" : "notice notice--warn";
      modeBox.hidden = false;
    }
    showMode();

    var okBox = document.querySelector("[data-settings-ok]");
    var errBox = document.querySelector('[data-error="settings"]');

    document.querySelector("[data-save-settings]").addEventListener("click", function () {
      var url = stripeEl.value.trim();
      errBox.classList.remove("is-shown"); okBox.hidden = true;
      var vurl = verifyEl.value.trim(), aurl = apiEl.value.trim();
      var badUrl = [["Stripe payment link", url], ["Stripe check endpoint", vurl], ["API base URL", aurl]]
        .filter(function (pair) { return pair[1] && !/^https:\/\//i.test(pair[1]); })[0];
      if (badUrl) {
        errBox.textContent = "The " + badUrl[0] + " needs to start with https://";
        errBox.classList.add("is-shown");
        return;
      }
      var patch = {
        stripeUrl: url, stripeVerifyUrl: vurl,
        apiBaseUrl: aurl, apiKey: keyEl.value.trim(),
        payExpiryDays: Number(expiryEl.value)
      };
      S.saveSettings(patch);

      // Deployed, configuration belongs on the server so every device sees it
      // and no device has to store it.
      if (!ACCESS.isOffline()) {
        fetch("/api/settings", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stripeUrl: url, stripeVerifyUrl: vurl,
            payExpiryDays: Number(expiryEl.value)
          })
        })["catch"](function () { /* saved locally regardless */ });
      }
      showMode();
      okBox.textContent = url
        ? "Saved. New payment links will send customers to your Stripe checkout."
        : "Saved. Add a Stripe link when you're ready to take cards.";
      okBox.hidden = false;
      refreshAll();
    });

    /* The owner sets the helper's credentials outright — the helper has no
       settings screen of their own to change them from. */
    var hUserEl = document.getElementById("hp-user");
    if (hUserEl) {
      var hName = document.querySelector("[data-helper-user]");
      var hOk = document.querySelector("[data-helper-ok]");
      var hErr = document.querySelector('[data-error="helper"]');
      function showHelper() {
        hName.textContent = A.helperUsername();
        hUserEl.value = A.helperUsername();
      }
      showHelper();
      document.querySelector("[data-save-helper]").addEventListener("click", function () {
        hErr.classList.remove("is-shown"); hOk.hidden = true;
        var res = A.setHelperCredentials(hUserEl.value, document.getElementById("hp-new").value);
        if (!res.ok) { hErr.textContent = res.message; hErr.classList.add("is-shown"); return; }
        document.getElementById("hp-new").value = "";
        showHelper();
        hOk.textContent = "Helper sign-in updated. They'll use the new details next time.";
        hOk.hidden = false;
      });
    }

    if (!ACCESS.isOffline()) {
      Array.prototype.forEach.call(
        document.querySelectorAll("[data-local-auth-only]"),
        function (el) { el.hidden = true; }
      );
    }

    var pOk = document.querySelector("[data-pass-ok]");
    var pErr = document.querySelector('[data-error="pass"]');
    document.getElementById("pw-user").value = (A.currentSession(ROLE) || {}).user || "";

    document.querySelector("[data-save-pass]").addEventListener("click", function () {
      pErr.classList.remove("is-shown"); pOk.hidden = true;
      var res = A.changePassword(
        document.getElementById("pw-current").value,
        document.getElementById("pw-user").value,
        document.getElementById("pw-new").value,
        ROLE
      );
      if (!res.ok) { pErr.textContent = res.message; pErr.classList.add("is-shown"); return; }
      document.getElementById("pw-current").value = "";
      document.getElementById("pw-new").value = "";
      if (nag) nag.hidden = true;
      pOk.textContent = "Sign-in updated. You'll use the new details next time.";
      pOk.hidden = false;
    });
  })();

  /**
   * Business configuration comes from the server, projected for the role. A
   * helper is sent no URLs and no keys at all, so there is nothing sensitive in
   * their browser to find.
   */
  function loadSettings() {
    if (ACCESS.isOffline()) return Promise.resolve(null);
    return fetch("/api/settings", { credentials: "include" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (payload) {
        if (payload && payload.settings) S.applyRemoteSettings(payload.settings);
        return payload && payload.settings;
      })["catch"](function () { return null; });
  }

  READY.then(function (who) {
    if (who) SESSION = who;
    // Belt and braces: even before the fetch returns, a helper session clears
    // anything sensitive a shared or previously-owner browser might hold.
    if (SESSION.role !== "owner") S.scrubSecrets();
    return loadSettings();
  }).then(function () {
    refreshAll();
  })["catch"](function () { /* redirecting */ });

  READY.then(function (who) {
    if (who) SESSION = who;
    var badge = document.querySelector("[data-signed-in-as]");
    if (badge && SESSION.name) { badge.textContent = SESSION.name; badge.hidden = false; }
    if (SESSION.role === "helper") {
      var settings = document.getElementById("settings");
      if (settings) settings.hidden = true;

      // The Spanish dashboard's English link points at admin.html, which is
      // owner-only — a helper following it would land on a 403. Send them to
      // the English helper view instead.
      var sw = document.querySelector(".langswitch");
      if (sw && /admin\.html$/.test(sw.getAttribute("href") || "")) {
        sw.setAttribute("href", "helper.html");
      }
    }
  })["catch"](function () { /* redirecting */ });

  /* --- Go ---------------------------------------------------------------- */
  renderCal();
  renderCal2();
  renderBookPanel();
  renderDue();
  renderRequests();
  refreshDb();
  renderMonthStats();
})();
