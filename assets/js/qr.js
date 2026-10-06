(function (SC) {
  "use strict";

  function available() {
    return typeof window.qrcode === "function";
  }

  function svg(text, options) {
    if (!available()) return "";
    const settings = options || {};
    const model = window.qrcode(0, settings.level || "M");
    model.addData(text);
    model.make();

    const count = model.getModuleCount();
    const margin = settings.margin == null ? 3 : settings.margin;
    const side = count + margin * 2;
    const cells = [];

    for (let row = 0; row < count; row += 1) {
      for (let col = 0; col < count; col += 1) {
        if (model.isDark(row, col)) {
          cells.push(`M${col + margin} ${row + margin}h1v1h-1z`);
        }
      }
    }

    return `<svg viewBox="0 0 ${side} ${side}" role="img" aria-label="${SC.dom.esc(settings.label || "Kode QR")}" shape-rendering="crispEdges"><rect width="${side}" height="${side}" fill="#ffffff"/><path d="${cells.join("")}" fill="#0f172a"/></svg>`;
  }

  SC.qr = { available, svg };
})(window.SC || (window.SC = {}));
