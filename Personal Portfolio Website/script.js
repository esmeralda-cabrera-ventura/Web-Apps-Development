document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector(".site-header");

  // -------------------------------------------------------------------------
  // Smooth scroll + active-nav state for in-page anchor links
  // -------------------------------------------------------------------------
  let clickLockTarget = null;
  let clickLockExpiry = 0;

  const anchorLinks = document.querySelectorAll('a[href^="#"]');
  anchorLinks.forEach(link => {
    link.addEventListener("click", event => {
      const href = link.getAttribute("href");
      if (!href || href === "#") return;
      const targetId = href.slice(1);
      const targetEl = document.getElementById(targetId);
      if (!targetEl) return;

      event.preventDefault();

      // Lock the active state on the clicked target while the smooth scroll
      // animation runs so we do not flash through intermediate sections.
      clickLockTarget = targetId;
      clickLockExpiry = Date.now() + 1200;
      applyActiveNav(targetId);

      const headerHeight = header ? header.offsetHeight : 0;
      const targetTop =
        window.scrollY +
        targetEl.getBoundingClientRect().top -
        headerHeight -
        8;

      window.scrollTo({ top: targetTop, behavior: "smooth" });
    });
  });

  const navLinks = Array.from(document.querySelectorAll(".main-nav a[href^='#']"));
  const sections = document.querySelectorAll("section[id]");

  // Multiple nav elements can point to the same anchor (e.g. the Contact
  // link and the Let's Connect button). Group them so we activate them all
  // together rather than only the last one in the DOM.
  const navMap = {};
  navLinks.forEach(link => {
    const id = link.getAttribute("href").slice(1);
    if (!navMap[id]) navMap[id] = [];
    navMap[id].push(link);
  });

  const applyActiveNav = (activeId) => {
    navLinks.forEach(link => link.classList.remove("active"));
    if (activeId && navMap[activeId]) {
      navMap[activeId].forEach(link => link.classList.add("active"));
    }
  };

  const detectActiveSection = () => {
    const offset = (header ? header.offsetHeight : 0) + 40;
    let currentId = null;
    sections.forEach(sec => {
      const rect = sec.getBoundingClientRect();
      if (rect.top <= offset && rect.bottom > offset) {
        currentId = sec.id;
      }
    });
    const atBottom =
      window.innerHeight + window.scrollY >= document.body.offsetHeight - 4;
    if (atBottom && sections.length) {
      currentId = sections[sections.length - 1].id;
    }
    return currentId;
  };

  const setActiveNav = () => {
    if (clickLockTarget && Date.now() < clickLockExpiry) {
      applyActiveNav(clickLockTarget);
      return;
    }
    clickLockTarget = null;
    applyActiveNav(detectActiveSection());
  };

  window.addEventListener("scroll", setActiveNav, { passive: true });
  ["wheel", "touchmove"].forEach(evt => {
    window.addEventListener(evt, () => {
      clickLockTarget = null;
      clickLockExpiry = 0;
    }, { passive: true });
  });
  setActiveNav();

  // -------------------------------------------------------------------------
  // Scroll-reveal animations
  //
  // Cards and content sections start invisible/translated, then fade and
  // slide into place as they enter the viewport. The IntersectionObserver
  // marks each element only once, so it stays visible after revealing.
  // -------------------------------------------------------------------------
  const revealSelectors = [
    ".about-col",
    ".portfolio-card",
    ".contact-card",
    ".hero-photo-wrapper",
    ".video-panel",
    ".services-panel",
    ".feature",
    ".section-heading",
    ".portfolio-note",
    ".veteran-badge",
    ".hero-title-wrap",
    ".hero-subtitle",
    ".hero-tagline",
    ".hero-actions"
  ];

  const revealEls = document.querySelectorAll(revealSelectors.join(","));
  revealEls.forEach((el, idx) => {
    el.classList.add("reveal");
    // Slight stagger so groups of cards cascade in rather than appearing
    // all at once. Cards inside the same row share an index range so they
    // come in sequentially. Capped so later items do not feel sluggish.
    const stagger = Math.min(idx * 30, 240);
    el.style.setProperty("--reveal-delay", stagger + "ms");
  });

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  revealEls.forEach(el => observer.observe(el));

  // -------------------------------------------------------------------------
  // Video resume: the poster frame lifts and glows on hover (see style.css).
  // Once playback starts we flag the wrapper so the frame stays put and the
  // controls are not moving under the cursor mid-video.
  // -------------------------------------------------------------------------
  const videoPlayer = document.querySelector(".video-player");
  const videoWrap = document.querySelector(".video-player-wrap");
  if (videoPlayer && videoWrap) {
    const setPlayingState = (isPlaying) => {
      videoWrap.classList.toggle("is-playing", isPlaying);
    };
    videoPlayer.addEventListener("play", () => setPlayingState(true));
    videoPlayer.addEventListener("pause", () => setPlayingState(false));
    videoPlayer.addEventListener("ended", () => setPlayingState(false));
  }

  // If the page loads scrolled below the top (e.g. anchor in URL or refresh
  // at scroll position), reveal anything already in view immediately.
  // The IntersectionObserver handles this naturally, but for visual polish
  // we ensure the hero block is visible without delay on first paint.
  requestAnimationFrame(() => {
    document.querySelectorAll(
      ".hero-title-wrap, .hero-subtitle, .hero-tagline, .hero-actions, .hero-photo-wrapper, .feature"
    ).forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.classList.add("reveal-visible");
      }
    });
  });
});
