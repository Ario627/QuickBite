(function (SC) {
  "use strict";

  const root = document.documentElement;
  const reduced = Boolean(
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  const pending = new Set();
  let ticking = 0;

  if (!reduced) root.classList.add("has-motion");

  function settle(node) {
    node.classList.add("is-in");
    pending.delete(node);
  }

  function flush() {
    ticking = 0;
    if (!pending.size) return;
    const limit = window.innerHeight * 0.94;
    pending.forEach((node) => {
      if (!node.isConnected) {
        pending.delete(node);
        return;
      }
      const rect = node.getBoundingClientRect();
      if (rect.top < limit && rect.bottom > 0) settle(node);
    });
  }

  function schedule() {
    if (ticking) return;
    ticking = window.setTimeout(flush, 80);
  }

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });

  function reveal(scope) {
    const nodes = SC.dom.qsa("[data-reveal]", scope || document);
    if (!nodes.length) return;

    if (reduced) {
      nodes.forEach((node) => node.classList.add("is-in"));
      return;
    }

    nodes.forEach((node) => {
      if (!node.classList.contains("is-in")) pending.add(node);
    });
    schedule();
  }

  function enter(node) {
    if (!node || reduced) return;
    node.classList.remove("is-enter");
    void node.offsetWidth;
    node.classList.add("is-enter");
  }

  function pop(node) {
    if (!node || reduced) return;
    node.classList.remove("is-pop");
    void node.offsetWidth;
    node.classList.add("is-pop");
  }

  function flip(node) {
    if (!node || reduced) return;
    node.classList.remove("is-flip");
    void node.offsetWidth;
    node.classList.add("is-flip");
  }

  function format(value) {
    return SC.fmt.number(Math.round(value));
  }

  function count(node) {
    const to = Number(node.dataset.count);
    if (!Number.isFinite(to)) return;
    if (reduced) {
      node.textContent = format(to);
      return;
    }
    const from = Number(String(node.textContent).replace(/[^\d-]/g, "")) || 0;
    if (from === to) {
      node.textContent = format(to);
      return;
    }
    const started = Date.now();
    const span = 520;
    node.classList.add("is-counting");

    const timer = window.setInterval(() => {
      const progress = Math.min(1, (Date.now() - started) / span);
      const eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = format(from + (to - from) * eased);
      if (progress >= 1) {
        window.clearInterval(timer);
        node.textContent = format(to);
        node.classList.remove("is-counting");
      }
    }, 24);
  }

  function countAll(scope) {
    SC.dom.qsa("[data-count]", scope || document).forEach(count);
  }

  function marquee(node) {
    if (!node || node.dataset.loop === "true") return;
    node.dataset.loop = "true";
    const half = node.innerHTML;
    node.innerHTML = half + half;
  }

  function marquees(scope) {
    SC.dom.qsa("[data-marquee]", scope || document).forEach(marquee);
  }

  function awake(scope) {
    reveal(scope);
    countAll(scope);
    marquees(scope);
  }

  SC.motion = { reduced, reveal, enter, pop, flip, count, countAll, marquee, marquees, awake };
})(window.SC || (window.SC = {}));
