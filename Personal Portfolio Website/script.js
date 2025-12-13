// script.js
document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector(".site-header");
  const navLinks = document.querySelectorAll(".main-nav a[href^='#']");

  // 1) Smooth scroll with header offset so sections land exactly under the nav
  navLinks.forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();

      const targetId = link.getAttribute("href").slice(1); // remove "#"
      const targetEl = document.getElementById(targetId);
      if (!targetEl) return;

      const headerHeight = header.offsetHeight || 0;

      // Where we want to scroll: section’s top minus header height and a tiny buffer
      const targetTop =
        window.scrollY +
        targetEl.getBoundingClientRect().top -
        headerHeight -
        8; // small extra spacing

      window.scrollTo({
        top: targetTop,
        behavior: "smooth",
      });
    });
  });

  // 2) Highlight the active nav link based on scroll position (dynamic behavior)
  const sections = document.querySelectorAll("section[id]");
  const navMap = {};
  navLinks.forEach(link => {
    const id = link.getAttribute("href").slice(1);
    navMap[id] = link;
  });

  const setActiveNav = () => {
    let currentId = null;

    sections.forEach(sec => {
      const rect = sec.getBoundingClientRect();
      // "Active" if section top is above the header and not too far up
      if (rect.top <= header.offsetHeight + 40 && rect.bottom > header.offsetHeight + 40) {
        currentId = sec.id;
      }
    });

    navLinks.forEach(link => link.classList.remove("active"));
    if (currentId && navMap[currentId]) {
      navMap[currentId].classList.add("active");
    }
  };

  window.addEventListener("scroll", setActiveNav);
  setActiveNav(); // run once on load

  // 3) Reveal-on-scroll animation for key elements (extra JS dynamics)
  const revealEls = document.querySelectorAll(
    ".about-main, .info-card, .portfolio-card, .contact-card, .hero-photo-wrapper"
  );

  revealEls.forEach(el => {
    el.classList.add("reveal"); // base hidden state
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
    {
      threshold: 0.15,
    }
  );

  revealEls.forEach(el => observer.observe(el));
});
