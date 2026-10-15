/* =========================================================================
   CREDENTIAL WALLET — LOGIC
   Reads CREDENTIALS + CATEGORIES from credentials-data.js and builds the
   page. Edit the data file, not this one.

   What this handles:
     • live search across name, issuer, skills, category and credential ID
     • category / status / skill filtering with live counts
     • sorting and a grid ⇄ timeline view switch
     • a detail dialog with the full verification record
     • copy-to-clipboard for IDs and for every verification link at once
     • shareable URLs — the filter state lives in the query string
     • schema.org JSON-LD so the credentials are machine-readable
   ========================================================================= */

(function () {
  "use strict";

  /* ---------------------------------------------------------------- utils */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const esc = (str) =>
    String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const MONTHS = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  function parseDate(iso) {
    if (!iso) return null;
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }

  function formatDate(iso) {
    const dt = parseDate(iso);
    if (!dt) return "—";
    return MONTHS[dt.getMonth()] + " " + dt.getDate() + ", " + dt.getFullYear();
  }

  function formatShort(iso) {
    const dt = parseDate(iso);
    if (!dt) return "—";
    return MONTHS[dt.getMonth()].slice(0, 3) + " " + dt.getFullYear();
  }

  const DAY = 86400000;

  /* Resolve the badge a credential should carry right now. "active" plus an
     expiry inside six months becomes "expiring" so nothing lapses quietly. */
  function resolveStatus(cred) {
    if (cred.status === "in-progress") return "in-progress";
    if (!cred.expires) return "lifetime";
    const days = Math.round((parseDate(cred.expires) - new Date()) / DAY);
    if (days < 0) return "expired";
    if (days <= 180) return "expiring";
    return "active";
  }

  function statusText(cred) {
    const s = resolveStatus(cred);
    if (s === "lifetime") return "Lifetime";
    if (s === "in-progress") return "In progress";
    if (s === "expired") return "Expired " + formatShort(cred.expires);
    if (s === "expiring") return "Expires " + formatShort(cred.expires);
    return "Expires " + parseDate(cred.expires).getFullYear();
  }

  /* Status chips group expiring/active/expired together under one control —
     a recruiter cares whether it is current, not which bucket it fell in. */
  function statusGroup(cred) {
    const s = resolveStatus(cred);
    if (s === "in-progress") return "in-progress";
    if (s === "lifetime") return "lifetime";
    return "active";
  }

  /* --------------------------------------------------------------- state */
  const state = {
    q: "",
    cats: new Set(),
    statuses: new Set(),
    skill: null,
    sort: "newest",
    view: "grid"
  };

  const DATA = (typeof CREDENTIALS !== "undefined" ? CREDENTIALS : []).map((c) => {
    const cats = c.categories || [];
    return Object.assign({}, c, {
      categories: cats,
      skills: c.skills || [],
      _search: [
        c.name, c.issuer, c.issuerShort, c.summary, c.credentialId,
        c.credentialNo, c.credits, c.coursePeriod,
        (c.skills || []).join(" "),
        cats.map((k) => (CATEGORIES[k] ? CATEGORIES[k].full + " " + CATEGORIES[k].label : k)).join(" ")
      ].filter(Boolean).join(" ").toLowerCase().replace(/&amp;/g, "&")
    });
  });

  /* ------------------------------------------------------------- filtering */
  function matches(cred, opts) {
    const o = opts || {};
    if (!o.ignoreQuery && state.q) {
      const terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
      if (!terms.every((t) => cred._search.indexOf(t) !== -1)) return false;
    }
    if (!o.ignoreCats && state.cats.size) {
      if (!cred.categories.some((k) => state.cats.has(k))) return false;
    }
    if (!o.ignoreStatus && state.statuses.size) {
      if (!state.statuses.has(statusGroup(cred))) return false;
    }
    if (!o.ignoreSkill && state.skill) {
      if (!cred.skills.some((s) => s.toLowerCase() === state.skill.toLowerCase())) return false;
    }
    return true;
  }

  const SORTS = {
    newest: (a, b) => (b.issued || "").localeCompare(a.issued || "") || a.name.localeCompare(b.name),
    oldest: (a, b) => (a.issued || "").localeCompare(b.issued || "") || a.name.localeCompare(b.name),
    issuer: (a, b) => a.issuer.localeCompare(b.issuer) || (b.issued || "").localeCompare(a.issued || ""),
    name: (a, b) => a.name.localeCompare(b.name)
  };

  function visible() {
    const list = DATA.filter((c) => matches(c));
    list.sort(SORTS[state.sort] || SORTS.newest);
    /* Featured credentials float to the top, but only in the default view —
       once someone sorts deliberately, respect the sort they chose. */
    if (state.sort === "newest") {
      list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }
    return list;
  }

  /* ------------------------------------------------------------- rendering */
  function renderLedger() {
    const issuers = new Set(DATA.map((c) => c.issuer));
    const fields = Object.keys(CATEGORIES).filter((k) =>
      DATA.some((c) => c.categories.indexOf(k) !== -1)
    );
    const verifiable = DATA.filter((c) => c.verifyUrl).length;
    const latest = DATA.filter((c) => c.status !== "in-progress")
      .map((c) => c.issued).sort().pop();

    const issuerNames = Array.from(
      new Set(DATA.map((c) => c.issuerShort || c.issuer))
    ).join(" · ");
    const fieldNames = fields.map((k) => CATEGORIES[k].label).join(" · ");

    const cells = [
      {
        value: DATA.length,
        label: "Credentials",
        sub: latest ? "Most recent · " + formatShort(latest) : ""
      },
      { value: issuers.size, label: "Issuers", sub: issuerNames },
      { value: fields.length, label: "Fields", sub: fieldNames },
      {
        value: verifiable,
        label: "Independently verifiable",
        sub: "Each links to the issuer's own record"
      }
    ];

    $("#walletLedger").innerHTML = cells.map((c) => `
      <div class="ledger-cell">
        <span class="ledger-value">${c.value}</span>
        <span class="ledger-label">${esc(c.label)}</span>
        <span class="ledger-sub" title="${esc(c.sub)}">${esc(c.sub)}</span>
      </div>`).join("");
  }

  function renderCategoryChips() {
    const host = $("#categoryChips");
    const total = DATA.filter((c) => matches(c, { ignoreCats: true })).length;

    let html = `
      <button type="button" class="chip chip-cat" data-cat=""
              aria-pressed="${state.cats.size === 0}">
        All <span class="chip-count">${total}</span>
      </button>`;

    Object.keys(CATEGORIES).forEach((key) => {
      const count = DATA.filter(
        (c) => c.categories.indexOf(key) !== -1 && matches(c, { ignoreCats: true })
      ).length;
      const owned = DATA.some((c) => c.categories.indexOf(key) !== -1);
      if (!owned && !SHOW_EMPTY_CATEGORIES) return;

      html += `
        <button type="button" class="chip chip-cat" data-cat="${esc(key)}"
                aria-pressed="${state.cats.has(key)}"
                ${owned ? "" : "disabled"}
                title="${esc(CATEGORIES[key].blurb)}">
          ${CATEGORIES[key].label} <span class="chip-count">${count}</span>
        </button>`;
    });

    host.innerHTML = html;
  }

  function renderStatusChips() {
    const host = $("#statusChips");
    const defs = [
      { key: "lifetime", label: "Lifetime" },
      { key: "active", label: "Active" },
      { key: "in-progress", label: "In progress" }
    ];

    host.innerHTML = defs.map((d) => {
      const count = DATA.filter(
        (c) => statusGroup(c) === d.key && matches(c, { ignoreStatus: true })
      ).length;
      if (!count && d.key === "in-progress") return "";
      return `
        <button type="button" class="chip chip-status" data-status="${d.key}"
                aria-pressed="${state.statuses.has(d.key)}"
                ${count ? "" : "disabled"}>
          ${d.label} <span class="chip-count">${count}</span>
        </button>`;
    }).join("");
  }

  function skillTagsHtml(cred, limit) {
    const shown = limit ? cred.skills.slice(0, limit) : cred.skills;
    let html = shown.map((s) => `
      <button type="button" class="skill-tag" data-skill="${esc(s)}"
              aria-pressed="${state.skill && state.skill.toLowerCase() === s.toLowerCase()}"
              title="Filter by ${esc(s)}">${esc(s)}</button>`).join("");
    if (limit && cred.skills.length > limit) {
      html += `<span class="skill-tag is-more">+${cred.skills.length - limit}</span>`;
    }
    return html;
  }

  function cardHtml(cred) {
    const st = resolveStatus(cred);
    const isProgress = st === "in-progress";
    const fit = cred.thumbFit === "contain" ? " fit-contain" : "";

    const thumb = cred.thumb
      ? `<img src="${esc(cred.thumb)}" alt="${esc(cred.name)} certificate" class="${fit.trim()}" loading="lazy" />`
      : `<div class="cred-thumb-empty">
           <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
         </div>`;

    const meta = [formatShort(cred.issued)];
    if (cred.credits) meta.push(esc(cred.credits));
    if (cred.credentialId && !isProgress) meta.push("ID " + esc(cred.credentialId.slice(0, 8)));

    const verify = cred.verifyUrl
      ? `<a class="cred-action cred-action-verify" href="${esc(cred.verifyUrl)}"
            target="_blank" rel="noopener noreferrer"
            data-stop
            aria-label="Verify ${esc(cred.name)} with ${esc(cred.issuer)}">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
           Verify
         </a>`
      : `<span class="cred-action cred-action-ghost" style="flex:1;justify-content:center;">Not yet issued</span>`;

    const cert = cred.certificate
      ? `<a class="cred-action cred-action-ghost" href="${esc(cred.certificate)}"
            target="_blank" rel="noopener noreferrer" data-stop
            aria-label="Open the ${esc(cred.name)} certificate">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
           Certificate
         </a>`
      : "";

    /* The card is an <article> with a button role rather than a real
       <button>. A <button> cannot legally contain the Verify link or the
       skill buttons inside it — the parser would tear the card apart. */
    return `
      <article class="cred-card${isProgress ? " is-progress" : ""}"
              data-id="${esc(cred.id)}"
              role="button" tabindex="0"
              ${cred.verifyUrl ? `data-verify="${esc(cred.verifyUrl)}"` : ""}
              aria-label="Open details for ${esc(cred.name)}">
        <div class="cred-thumb">
          ${thumb}
          <span class="status-pill" data-status="${st}">${esc(statusText(cred))}</span>
          <span class="issuer-tag">${esc(cred.issuerShort || cred.issuer)}</span>
        </div>
        <div class="cred-body">
          <h3 class="cred-name">${esc(cred.name)}</h3>
          <p class="cred-issuer">${esc(cred.issuer)}</p>
          <div class="cred-meta">${meta.join('<span class="dot-sep">·</span>')}</div>
          <div class="cred-skills">${skillTagsHtml(cred, 4)}</div>
          <div class="cred-actions">${verify}${cert}</div>
        </div>
      </article>`;
  }

  function timelineHtml(list) {
    /* Timeline is always chronological regardless of the sort control —
       a timeline sorted by issuer name would not be a timeline. */
    const ordered = list.slice().sort(SORTS.newest);
    const years = [];
    const byYear = {};

    ordered.forEach((c) => {
      const y = (c.issued || "").slice(0, 4) || "Undated";
      if (!byYear[y]) { byYear[y] = []; years.push(y); }
      byYear[y].push(c);
    });

    return years.map((y) => `
      <section class="tl-year">
        <div class="tl-year-head">
          <span class="tl-year-label">${esc(y)}</span>
          <span class="tl-year-rule"></span>
          <span class="tl-year-count">${byYear[y].length} credential${byYear[y].length === 1 ? "" : "s"}</span>
        </div>
        ${byYear[y].map((c) => {
          const st = resolveStatus(c);
          return `
          <button type="button" class="tl-item${st === "in-progress" ? " is-progress" : ""}"
                  data-id="${esc(c.id)}" aria-label="Open details for ${esc(c.name)}">
            <span class="tl-date">${esc(formatDate(c.issued))}</span>
            <span class="tl-rail"><span class="tl-node"></span></span>
            <span class="tl-body">
              <span class="tl-name">${esc(c.name)}</span>
              <span class="tl-sub">
                <span>${esc(c.issuer)}</span>
                <span class="tl-chip">${esc(statusText(c))}</span>
              </span>
            </span>
          </button>`;
        }).join("")}
      </section>`).join("");
  }

  /* Cards are grouped under a category header, then split by issuer inside
     it. A credential can carry several categories; the first one in its
     list is the one it files under, so nothing appears twice. When exactly
     one category filter is active the whole result set is shown under that
     single header instead, which keeps a filtered view from scattering
     matches across headers the visitor did not ask for. */
  function groupsHtml(list) {
    const order = state.cats.size === 1
      ? [Array.from(state.cats)[0]]
      : Object.keys(CATEGORIES);

    return order.map((key) => {
      const cat = CATEGORIES[key];
      if (!cat) return "";

      const inCat = state.cats.size === 1
        ? list
        : list.filter((c) => c.categories[0] === key);
      if (!inCat.length) return "";

      /* Issuers appear in the order the active sort produced them, so the
         sort control still means something inside each group. */
      const issuers = [];
      const byIssuer = {};
      inCat.forEach((c) => {
        if (!byIssuer[c.issuer]) { byIssuer[c.issuer] = []; issuers.push(c.issuer); }
        byIssuer[c.issuer].push(c);
      });

      return `
        <section class="cat-group">
          <div class="cat-head">
            <h2 class="cat-title">${cat.full}</h2>
            <span class="cat-rule"></span>
            <span class="cat-count">${inCat.length} credential${inCat.length === 1 ? "" : "s"}</span>
          </div>
          <p class="cat-blurb">${esc(cat.blurb)}</p>
          ${issuers.map((iss) => `
            <div class="issuer-block">
              <h3 class="issuer-head">
                ${esc(iss)}
                <span class="issuer-count">${byIssuer[iss].length}</span>
              </h3>
              <div class="cred-grid">${byIssuer[iss].map(cardHtml).join("")}</div>
            </div>`).join("")}
        </section>`;
    }).join("");
  }

  function renderResults() {
    const list = visible();
    $("#credGrid").innerHTML = groupsHtml(list);
    $("#credTimeline").innerHTML = timelineHtml(list);

    const bar = $("#resultBar");
    const filtered = list.length !== DATA.length;
    const bits = [];
    if (state.q) bits.push(`matching “${esc(state.q)}”`);
    if (state.cats.size) {
      bits.push("in " + Array.from(state.cats).map((k) => CATEGORIES[k].label).join(", "));
    }
    if (state.skill) bits.push(`with ${esc(state.skill)}`);
    if (state.statuses.size) bits.push("marked " + Array.from(state.statuses).join(", "));

    bar.innerHTML = `
      <span><span class="result-count">${list.length}</span> of
      <span class="result-count">${DATA.length}</span> credentials${
        bits.length ? " " + bits.join(" · ") : ""
      }</span>
      ${filtered ? '<button type="button" class="reset-link" id="resetFilters">Clear filters</button>' : ""}`;

    $("#walletEmpty").classList.toggle("is-shown", list.length === 0);
    document.body.dataset.view = state.view;
  }

  function renderChrome() {
    renderCategoryChips();
    renderStatusChips();
  }

  function renderAll() {
    renderChrome();
    renderResults();
    syncUrl();
  }

  /* ------------------------------------------------------------------ url */
  function syncUrl() {
    const p = new URLSearchParams();
    if (state.q) p.set("q", state.q);
    if (state.cats.size) p.set("cat", Array.from(state.cats).join(","));
    if (state.statuses.size) p.set("status", Array.from(state.statuses).join(","));
    if (state.skill) p.set("skill", state.skill);
    if (state.sort !== "newest") p.set("sort", state.sort);
    if (state.view !== "grid") p.set("view", state.view);
    const qs = p.toString();
    history.replaceState(null, "", qs ? "?" + qs : location.pathname);
  }

  function readUrl() {
    const p = new URLSearchParams(location.search);
    state.q = p.get("q") || "";
    (p.get("cat") || "").split(",").filter(Boolean).forEach((k) => {
      if (CATEGORIES[k]) state.cats.add(k);
    });
    (p.get("status") || "").split(",").filter(Boolean).forEach((s) => state.statuses.add(s));
    state.skill = p.get("skill") || null;
    if (SORTS[p.get("sort")]) state.sort = p.get("sort");
    if (p.get("view") === "timeline") state.view = "timeline";
    return p.get("cred");
  }

  /* ---------------------------------------------------------------- modal */
  let lastFocus = null;

  function openModal(id) {
    const cred = DATA.find((c) => c.id === id);
    if (!cred) return;
    lastFocus = document.activeElement;

    const st = resolveStatus(cred);
    const rows = [];

    rows.push(["Issuer", esc(cred.issuer), ""]);
    rows.push(["Credential", esc(cred.name), ""]);
    if (cred.coursePeriod) rows.push(["Program dates", esc(cred.coursePeriod), ""]);
    rows.push([st === "in-progress" ? "Target date" : "Issue date", formatDate(cred.issued), ""]);
    rows.push([
      "Expiration",
      cred.expires ? formatDate(cred.expires) : "Does not expire",
      ""
    ]);
    if (cred.credits) rows.push(["Credit", esc(cred.credits), ""]);
    if (cred.credentialId) {
      rows.push([
        "Credential ID",
        `${esc(cred.credentialId)}<button type="button" class="copy-btn" data-copy="${esc(cred.credentialId)}">Copy</button>`,
        "mono"
      ]);
    }
    if (cred.credentialNo) {
      rows.push([
        "Certification no.",
        `${esc(cred.credentialNo)}<button type="button" class="copy-btn" data-copy="${esc(cred.credentialNo)}">Copy</button>`,
        "mono"
      ]);
    }
    if (cred.verifyUrl) {
      rows.push([
        "Verification",
        `<a href="${esc(cred.verifyUrl)}" target="_blank" rel="noopener noreferrer">${esc(cred.verifyUrl)}</a>`,
        "mono"
      ]);
    }
    rows.push([
      "Status",
      `<span class="status-pill" data-status="${st}" style="position:static;display:inline-flex;">${esc(statusText(cred))}</span>`,
      ""
    ]);

    const visual = cred.thumb
      ? `<div class="modal-img-frame" data-lightbox="${esc(cred.certificate && /\.(jpe?g|png|webp|gif)$/i.test(cred.certificate) ? cred.certificate : cred.thumb)}">
           <img src="${esc(cred.thumb)}" alt="${esc(cred.name)} certificate" />
         </div>
         <p class="modal-visual-note">${cred.certificate ? "Click to enlarge · full certificate hosted on this site" : "Click to enlarge"}</p>`
      : `<div class="modal-img-frame" style="cursor:default;padding:48px 20px;">
           <div class="cred-thumb-empty" style="height:auto;padding:40px 0;">
             <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
           </div>
         </div>
         <p class="modal-visual-note">Certificate image added once this credential is awarded.</p>`;

    $("#modalBody").innerHTML = `
      <div class="modal-grid">
        <div class="modal-visual">${visual}</div>
        <div class="modal-detail">
          <p class="modal-issuer">${esc(cred.issuerShort || cred.issuer)}</p>
          <h2 class="modal-name" id="credModalTitle">${esc(cred.name)}</h2>
          ${cred.summary ? `<p class="modal-summary">${esc(cred.summary)}</p>` : ""}

          <div class="modal-table">
            ${rows.map((r) => `
              <div class="modal-row">
                <span class="modal-key">${r[0]}</span>
                <span class="modal-val ${r[2]}">${r[1]}</span>
              </div>`).join("")}
          </div>

          <p class="modal-key" style="margin-bottom:10px;">Skills demonstrated</p>
          <div class="modal-skills">${skillTagsHtml(cred)}</div>

          <div class="modal-actions">
            ${cred.verifyUrl ? `
              <a class="cred-action cred-action-verify" href="${esc(cred.verifyUrl)}" target="_blank" rel="noopener noreferrer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                ${esc(cred.verifyLabel || "Verify with " + (cred.issuerShort || cred.issuer))}
              </a>` : ""}
            ${cred.certificate ? `
              <a class="cred-action cred-action-ghost" href="${esc(cred.certificate)}" target="_blank" rel="noopener noreferrer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Open certificate
              </a>` : ""}
            <button type="button" class="cred-action cred-action-ghost" data-share="${esc(cred.id)}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              Copy link
            </button>
          </div>
        </div>
      </div>`;

    const modal = $("#credModal");
    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";
    $("#modalClose").focus();
  }

  function closeModal() {
    $("#credModal").classList.remove("is-open");
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ------------------------------------------------------------- lightbox */
  function openLightbox(src) {
    $("#lightboxImg").src = src;
    $("#lightbox").classList.add("is-open");
  }

  function closeLightbox() {
    $("#lightbox").classList.remove("is-open");
    $("#lightboxImg").src = "";
  }

  /* ---------------------------------------------------------------- toast */
  let toastTimer;
  function toast(msg) {
    const el = $("#walletToast");
    el.textContent = msg;
    el.classList.add("is-shown");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-shown"), 2200);
  }

  function copyText(text, done) {
    const finish = () => { if (done) done(); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(finish, fallback);
    } else {
      fallback();
    }
    function fallback() {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (e) { /* clipboard unavailable */ }
      document.body.removeChild(ta);
      finish();
    }
  }

  /* ----------------------------------------------------------- structured */
  function injectJsonLd() {
    const items = DATA.filter((c) => c.status !== "in-progress").map((c) => ({
      "@type": "EducationalOccupationalCredential",
      name: c.name,
      credentialCategory: c.credentialCategory || "certificate",
      dateCreated: c.issued,
      identifier: c.credentialId || undefined,
      url: c.verifyUrl || undefined,
      competencyRequired: c.skills,
      recognizedBy: { "@type": "Organization", name: c.issuer }
    }));

    const graph = {
      "@context": "https://schema.org",
      "@type": "Person",
      name: "Esmeralda Celeste Cabrera Ventura",
      url: location.origin + "/index.html",
      hasCredential: items
    };

    const tag = document.createElement("script");
    tag.type = "application/ld+json";
    tag.textContent = JSON.stringify(graph);
    document.head.appendChild(tag);
  }

  /* ----------------------------------------------------------------- init */
  document.addEventListener("DOMContentLoaded", function () {
    const deepCred = readUrl();

    const searchInput = $("#credSearch");
    const searchWrap = $("#searchWrap");
    searchInput.value = state.q;
    searchWrap.classList.toggle("has-value", !!state.q);
    $("#sortSelect").value = state.sort;

    renderLedger();
    renderAll();
    injectJsonLd();

    if (deepCred) openModal(deepCred);

    /* --- search (debounced so long lists stay smooth) --- */
    let searchTimer;
    searchInput.addEventListener("input", function () {
      clearTimeout(searchTimer);
      const val = this.value;
      searchWrap.classList.toggle("has-value", !!val);
      searchTimer = setTimeout(() => {
        state.q = val.trim();
        renderAll();
      }, 110);
    });

    $("#searchClear").addEventListener("click", function () {
      searchInput.value = "";
      state.q = "";
      searchWrap.classList.remove("has-value");
      searchInput.focus();
      renderAll();
    });

    /* --- sort + view --- */
    $("#sortSelect").addEventListener("change", function () {
      state.sort = this.value;
      renderResults();
      syncUrl();
    });

    $$(".view-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        state.view = this.dataset.view;
        $$(".view-btn").forEach((b) =>
          b.setAttribute("aria-pressed", String(b.dataset.view === state.view))
        );
        renderResults();
        syncUrl();
      });
      btn.setAttribute("aria-pressed", String(btn.dataset.view === state.view));
    });

    /* --- one delegated click handler for the whole page --- */
    document.addEventListener("click", function (ev) {
      const catChip = ev.target.closest(".chip-cat");
      if (catChip && !catChip.disabled) {
        const key = catChip.dataset.cat;
        if (!key) state.cats.clear();
        else if (state.cats.has(key)) state.cats.delete(key);
        else state.cats.add(key);
        renderAll();
        return;
      }

      const statusChip = ev.target.closest(".chip-status");
      if (statusChip && !statusChip.disabled) {
        const key = statusChip.dataset.status;
        if (state.statuses.has(key)) state.statuses.delete(key);
        else state.statuses.add(key);
        renderAll();
        return;
      }

      const skill = ev.target.closest(".skill-tag[data-skill]");
      if (skill) {
        ev.stopPropagation();
        const val = skill.dataset.skill;
        state.skill = state.skill && state.skill.toLowerCase() === val.toLowerCase() ? null : val;
        if ($("#credModal").classList.contains("is-open")) closeModal();
        renderAll();
        window.scrollTo({ top: $("#walletResults").offsetTop - 140, behavior: "smooth" });
        return;
      }

      if (ev.target.closest("#resetFilters") || ev.target.closest("#emptyReset")) {
        state.q = "";
        state.cats.clear();
        state.statuses.clear();
        state.skill = null;
        searchInput.value = "";
        searchWrap.classList.remove("has-value");
        renderAll();
        return;
      }

      const copyBtn = ev.target.closest("[data-copy]");
      if (copyBtn) {
        ev.stopPropagation();
        copyText(copyBtn.dataset.copy, function () {
          copyBtn.classList.add("is-done");
          copyBtn.textContent = "Copied";
          toast("Credential ID copied");
          setTimeout(() => {
            copyBtn.classList.remove("is-done");
            copyBtn.textContent = "Copy";
          }, 1800);
        });
        return;
      }

      const shareBtn = ev.target.closest("[data-share]");
      if (shareBtn) {
        const url = location.origin + location.pathname + "?cred=" + shareBtn.dataset.share;
        copyText(url, () => toast("Link to this credential copied"));
        return;
      }

      const frame = ev.target.closest("[data-lightbox]");
      if (frame) {
        const src = frame.dataset.lightbox;
        if (/\.pdf$/i.test(src)) window.open(src, "_blank", "noopener");
        else openLightbox(src);
        return;
      }

      /* Links inside a card must not also trigger the card's dialog */
      if (ev.target.closest("[data-stop]")) {
        ev.stopPropagation();
        return;
      }

      const card = ev.target.closest(".cred-card, .tl-item");
      if (card) {
        openModal(card.dataset.id);
        return;
      }

      if (ev.target.closest("#modalClose") || ev.target.closest("#modalBackdrop")) {
        closeModal();
        return;
      }

      if (ev.target.closest("#lightbox")) closeLightbox();
    });

    /* --- keyboard --- */
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") {
        if ($("#lightbox").classList.contains("is-open")) return closeLightbox();
        if ($("#credModal").classList.contains("is-open")) return closeModal();
        if (state.q) {
          searchInput.value = "";
          state.q = "";
          searchWrap.classList.remove("has-value");
          renderAll();
        }
        return;
      }

      /* Cards use role="button", so Enter and Space have to be wired up
         by hand the way a real <button> would give us for free. */
      if (ev.key === "Enter" || ev.key === " ") {
        const card = ev.target.closest && ev.target.closest('.cred-card[role="button"]');
        if (card && card === document.activeElement) {
          ev.preventDefault();
          openModal(card.dataset.id);
          return;
        }
      }

      /* "/" jumps to search, the way it does in a code host */
      if (ev.key === "/" && document.activeElement !== searchInput) {
        const tag = (document.activeElement.tagName || "").toLowerCase();
        if (tag !== "input" && tag !== "textarea" && tag !== "select") {
          ev.preventDefault();
          searchInput.focus();
          searchInput.select();
        }
      }
    });
  });
})();
