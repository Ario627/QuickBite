(function (SC) {
  "use strict";

  const reduced = Boolean(
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  function cellMarkup(char) {
    return (
      '<span class="flap__clip flap__clip--top"><span class="flap__g" data-face></span></span>' +
      '<span class="flap__clip flap__clip--bottom"><span class="flap__g" data-base></span></span>' +
      '<span class="flap__clip flap__clip--top flap__leaf flap__leaf--fall"><span class="flap__g" data-fall></span></span>' +
      '<span class="flap__clip flap__clip--bottom flap__leaf flap__leaf--rise"><span class="flap__g" data-rleaf></span></span>' +
      '<span class="flap__seam"></span>'
    );
  }

  function buildCell(char) {
    const cell = document.createElement("span");
    cell.className = "flap__cell";
    cell.dataset.char = char;
    cell.setAttribute("aria-hidden", "true");
    cell.innerHTML = cellMarkup(char);
    cell.querySelector("[data-face]").textContent = char;
    cell.querySelector("[data-base]").textContent = char;
    cell.querySelector("[data-fall]").textContent = char;
    cell.querySelector("[data-rleaf]").textContent = char;
    return cell;
  }

  function paint(cell, char) {
    cell.dataset.char = char;
    cell.querySelector("[data-face]").textContent = char;
    cell.querySelector("[data-base]").textContent = char;
    cell.querySelector("[data-fall]").textContent = char;
    cell.querySelector("[data-rleaf]").textContent = char;
  }

  function flipCell(cell, next) {
    const current = cell.dataset.char;
    if (current === next) return;
    const face = cell.querySelector("[data-face]");
    const base = cell.querySelector("[data-base]");
    const fall = cell.querySelector("[data-fall]");
    const rise = cell.querySelector("[data-rleaf]");

    cell.dataset.char = next;
    fall.textContent = current;
    base.textContent = current;
    face.textContent = next;
    rise.textContent = next;

    if (reduced) {
      paint(cell, next);
      return;
    }

    cell._token = (cell._token || 0) + 1;
    const token = cell._token;

    function settle(event) {
      if (event.animationName !== "flap-drop" || cell._token !== token) return;
      cell.removeEventListener("animationend", settle);
      cell.classList.remove("is-flipping");
      paint(cell, next);
    }

    cell.removeEventListener("animationend", settle);
    cell.classList.remove("is-flipping");
    void cell.offsetWidth;
    cell.classList.add("is-flipping");
    cell.addEventListener("animationend", settle);
  }

  function create(value, options) {
    const settings = options || {};
    const board = document.createElement("span");
    board.className = `flap${settings.className ? ` ${settings.className}` : ""}`;
    board.setAttribute("role", "img");

    let cells = [];
    let current = "";

    function label(text) {
      board.setAttribute("aria-label", text.replace(/-/g, " ").trim() || "kosong");
    }

    function rebuild(text) {
      board.replaceChildren();
      cells = text.split("").map((char) => {
        const cell = buildCell(char);
        board.appendChild(cell);
        return cell;
      });
    }

    function set(text) {
      const next = String(text == null ? "" : text);
      if (!next) return;
      label(next);
      if (next.length !== cells.length) {
        rebuild(next);
        current = next;
        return;
      }
      next.split("").forEach((char, index) => {
        const cell = cells[index];
        cell._target = char;
        const delay = reduced ? 0 : index * (settings.stagger != null ? settings.stagger : 70);
        if (!delay) {
          if (cell._target === char) flipCell(cell, char);
          return;
        }
        window.setTimeout(() => {
          if (cell._target === char) flipCell(cell, char);
        }, delay);
      });
      current = next;
    }

    rebuild(String(value == null ? "" : value));
    label(String(value == null ? "" : value));

    board.set = set;
    Object.defineProperty(board, "value", { get: () => current });

    return board;
  }

  SC.flap = { create };
})(window.SC || (window.SC = {}));
