(function (SC) {
  "use strict";

  const reduced = Boolean(
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  if (!reduced) document.documentElement.classList.add("has-motion");

  const pending = new Set();
  let timer = 0;

  function flush() {
    timer = 0;
    if (!pending.size) return;
    const limit = window.innerHeight * 0.96;
    pending.forEach((node) => {
      if (!node.isConnected) {
        pending.delete(node);
        return;
      }
      const rect = node.getBoundingClientRect();
      if (rect.top < limit) {
        node.classList.add("is-in");
        grow(node);
        pending.delete(node);
      }
    });
  }

  function schedule() {
    if (timer) return;
    timer = window.setTimeout(flush, 60);
  }

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  document.addEventListener("visibilitychange", schedule);

  function grow(scope) {
    SC.dom.qsa("[data-grow]", scope).forEach((node) => {
      const value = Number(node.dataset.grow);
      if (!Number.isFinite(value)) return;
      node.style.setProperty("--v", `${SC.fmt.clamp(value, 0, 100)}%`);
    });
  }

  function stagger(scope) {
    SC.dom.qsa("[data-stagger]", scope).forEach((host) => {
      const step = Number(host.dataset.stagger) || 55;
      Array.prototype.forEach.call(host.children, (child, index) => {
        child.style.setProperty("--d", `${index * step}ms`);
      });
    });
  }

  function wake(scope) {
    const root = scope || document;
    stagger(root);
    const nodes = SC.dom.qsa("[data-rise]", root);
    if (reduced) {
      nodes.forEach((node) => {
        node.classList.add("is-in");
        grow(node);
      });
      return;
    }
    nodes.forEach((node) => {
      if (!node.classList.contains("is-in")) pending.add(node);
    });
    schedule();
  }

  function count(node) {
    const to = Number(node.dataset.count);
    if (!Number.isFinite(to)) return;
    const shape = (value) => SC.fmt.number(Math.round(value));
    if (reduced) {
      node.textContent = shape(to);
      return;
    }
    const from = Number(String(node.textContent).replace(/[^\d-]/g, "")) || 0;
    if (from === to) {
      node.textContent = shape(to);
      return;
    }
    const started = performance.now();
    const span = 620;

    function frame(now) {
      const progress = Math.min(1, (now - started) / span);
      const eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = shape(from + (to - from) * eased);
      if (progress < 1) window.requestAnimationFrame(frame);
      else node.textContent = shape(to);
    }

    window.requestAnimationFrame(frame);
  }

  function countAll(scope) {
    SC.dom.qsa("[data-count]", scope || document).forEach(count);
  }

  function pop(node) {
    if (!node || reduced) return;
    node.classList.remove("is-pop");
    void node.offsetWidth;
    node.classList.add("is-pop");
  }

  function spotlight(scope) {
    SC.dom.qsa("[data-spot]", scope || document).forEach((host) => {
      if (host.dataset.spot === "on") return;
      host.dataset.spot = "on";
      host.addEventListener("pointermove", (event) => {
        const rect = host.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        host.style.setProperty("--mx", `${((event.clientX - rect.left) / rect.width) * 100}%`);
        host.style.setProperty("--my", `${((event.clientY - rect.top) / rect.height) * 100}%`);
        host.classList.add("is-lit");
      });
      host.addEventListener("pointerleave", () => host.classList.remove("is-lit"));
    });
  }

  function magnet(scope) {
    SC.dom.qsa("[data-magnet]", scope || document).forEach((node) => {
      if (node.dataset.magnet === "on") return;
      node.dataset.magnet = "on";
      node.classList.add("is-magnet");
      node.addEventListener("pointermove", (event) => {
        const rect = node.getBoundingClientRect();
        const dx = (event.clientX - (rect.left + rect.width / 2)) / rect.width;
        const dy = (event.clientY - (rect.top + rect.height / 2)) / rect.height;
        node.style.transform = `translate(${(dx * 6).toFixed(2)}px, ${(dy * 4).toFixed(2)}px)`;
      });
      node.addEventListener("pointerleave", () => {
        node.style.transform = "";
      });
    });
  }

  function loops(scope) {
    SC.dom.qsa("[data-loop]", scope || document).forEach((node) => {
      if (node.dataset.loop === "on") return;
      node.dataset.loop = "on";
      const half = node.innerHTML;
      node.innerHTML = half + half;
    });
  }

  function fresh(scope) {
    const rows = SC.dom.qsa(".is-fresh", scope || document);
    if (!rows.length) return;
    window.setTimeout(() => rows.forEach((row) => row.classList.remove("is-fresh")), 420);
  }

  function progress(node) {
    if (!node) return;
    const bar = node.firstElementChild;
    if (!bar) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? SC.fmt.clamp(window.scrollY / max, 0, 1) : 0;
    bar.style.transform = `scaleX(${ratio.toFixed(4)})`;
  }

  SC.motion = {
    reduced,
    wake,
    count,
    countAll,
    pop,
    grow,
    stagger,
    spotlight,
    magnet,
    loops,
    fresh,
    progress,
  };
})(window.SC || (window.SC = {}));
