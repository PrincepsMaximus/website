// Small enhancements for all pages. Loaded with `defer`, so the page is
// fully parsed when this runs. Every part checks whether its elements exist.

// ---------------------------------------------------------------------------
// Home page: highlight the nav link of the section in view
// ---------------------------------------------------------------------------
(() => {
  const navLinks = document.querySelectorAll(".nav-link");
  if (!navLinks.length) return;

  const sections = Array.from(document.querySelectorAll("section[id]"));
  const activeClasses = [
    "text-indigo-600",
    "dark:text-indigo-400",
    "font-semibold",
    "border-indigo-600",
    "dark:border-indigo-400",
  ];
  const inactiveClasses = [
    "border-transparent",
    "text-slate-600",
    "dark:text-slate-400",
  ];

  function updateNav() {
    const scrollPosition = window.scrollY + 200;
    let currentId = "";

    sections.forEach((section) => {
      const sectionTop = section.getBoundingClientRect().top + window.scrollY;
      if (sectionTop <= scrollPosition) currentId = section.id;
    });

    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 50) {
      currentId = sections[sections.length - 1].id;
    }

    navLinks.forEach((link) => {
      const active = currentId && link.hash === `#${currentId}`;
      link.classList.remove(...(active ? inactiveClasses : activeClasses));
      link.classList.add(...(active ? activeClasses : inactiveClasses));
    });
  }

  window.addEventListener("scroll", updateNav, { passive: true });
  updateNav();
})();

// ---------------------------------------------------------------------------
// "On this page": links to the sections of a subpage or the headings of a
// post, in the sidebar and in the mobile menu.
//   <main data-toc-source="section[id]" data-toc-numbered>  what to list
//   <div data-toc="link classes">                           where to list it
//   <div data-toc-wrapper class="hidden">                   shown if non-empty
// ---------------------------------------------------------------------------
(() => {
  const source = document.querySelector("[data-toc-source]");
  if (!source) return;

  const numbered = source.hasAttribute("data-toc-numbered");
  const items = Array.from(source.querySelectorAll(source.dataset.tocSource))
    .map((el) => {
      const heading = el.matches("h2") ? el : el.querySelector("h2");
      if (!heading || !el.id) return null;
      let text = heading.textContent.trim();
      if (numbered) {
        // "01. Thesis supervision" -> "Thesis supervision"
        text = text.replace(/^[0-9]+\.\s*/, "");
        text = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
      }
      return { id: el.id, text };
    })
    .filter(Boolean);
  if (!items.length) return;

  document.querySelectorAll("[data-toc]").forEach((container) => {
    items.forEach(({ id, text }) => {
      const link = document.createElement("a");
      link.href = `#${id}`;
      link.className = container.dataset.toc;
      link.textContent = text;
      container.appendChild(link);
    });
  });
  document
    .querySelectorAll("[data-toc-wrapper]")
    .forEach((wrapper) => wrapper.classList.remove("hidden"));
})();

// ---------------------------------------------------------------------------
// Collapsible panels (past courses, mobile menu). A button with
// aria-controls="<id>" and aria-expanded opens/closes the panel with that id
// by toggling its data-open attribute; the animation is pure CSS.
//   data-close-on-link  on the panel: close after a link inside is clicked
// ---------------------------------------------------------------------------
document.querySelectorAll("button[aria-controls][aria-expanded]").forEach((button) => {
  const panel = document.getElementById(button.getAttribute("aria-controls"));
  if (!panel) return;

  const setOpen = (open) => {
    button.setAttribute("aria-expanded", String(open));
    panel.toggleAttribute("data-open", open);
    panel.inert = !open;
  };

  button.addEventListener("click", () =>
    setOpen(button.getAttribute("aria-expanded") !== "true"),
  );

  if (panel.hasAttribute("data-close-on-link")) {
    panel.addEventListener("click", (event) => {
      if (event.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setOpen(false);
    });
  }
});

// ---------------------------------------------------------------------------
// Talks: the site is static, so "upcoming" is first decided at build time.
// This redoes it with the visitor's date, so talks move to "past" by
// themselves without rebuilding the site.
// ---------------------------------------------------------------------------
(() => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const isUpcoming = (date) => date >= today;

  // Countdown labels: "Today", "Tomorrow", "In 12 days"
  document.querySelectorAll("[data-countdown]").forEach((el) => {
    const [y, m, d] = el.dataset.countdown.split("-").map(Number);
    const days = Math.round(
      (Date.UTC(y, m - 1, d) -
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) /
        86400000,
    );
    el.textContent =
      days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`;
  });

  // Home page: upcoming talks first (soonest first), then past talks (most
  // recent first); four in total
  const grid = document.getElementById("talks-grid");
  if (grid) {
    const cards = Array.from(grid.querySelectorAll("[data-talk]"));
    cards.sort((a, b) => {
      const ua = isUpcoming(a.dataset.date);
      const ub = isUpcoming(b.dataset.date);
      if (ua !== ub) return ua ? -1 : 1;
      return ua
        ? a.dataset.date.localeCompare(b.dataset.date)
        : b.dataset.date.localeCompare(a.dataset.date);
    });
    cards.forEach((card, i) => {
      const upcoming = isUpcoming(card.dataset.date);
      grid.appendChild(card);
      card.classList.toggle("hidden", i >= 4);
      card.toggleAttribute("data-upcoming", upcoming);
    });
  }

  // Talks page: every talk that was upcoming at build time also has a
  // (hidden) card in the past list; swap them once the date has passed
  document.querySelectorAll("[data-upcoming-talk]").forEach((card) => {
    const past = !isUpcoming(card.dataset.date);
    card.classList.toggle("hidden", past);
    document
      .querySelector(`[data-past-talk="${card.dataset.upcomingTalk}"]`)
      ?.classList.toggle("hidden", !past);
  });
  const hideIfEmpty = (container, selector) =>
    container?.classList.toggle("hidden", !container.querySelector(selector));
  document
    .querySelectorAll("[data-year-group]")
    .forEach((group) => hideIfEmpty(group, "[data-past-talk]:not(.hidden)"));
  hideIfEmpty(
    document.getElementById("upcoming-talks"),
    "[data-upcoming-talk]:not(.hidden)",
  );
  hideIfEmpty(
    document.getElementById("past-talks"),
    "[data-past-talk]:not(.hidden)",
  );
})();
