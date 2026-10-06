(function (SC) {
  "use strict";

  const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ESCAPES[char]);
  }

  function html(markup) {
    const template = document.createElement("template");
    template.innerHTML = String(markup).trim();
    return template.content.firstElementChild;
  }

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function on(root, type, selector, handler) {
    root.addEventListener(type, (event) => {
      const node = event.target instanceof Element ? event.target.closest(selector) : null;
      if (node && root.contains(node)) handler(event, node);
    });
  }

  function replace(node, markup) {
    if (node) node.innerHTML = markup;
  }

  function debounce(fn, wait) {
    let timer = 0;
    return function debounced() {
      const args = arguments;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => fn.apply(null, args), wait);
    };
  }

  SC.dom = { esc, html, qs, qsa, on, replace, debounce };
})(window.SC || (window.SC = {}));
