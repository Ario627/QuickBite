(function (SC) {
  "use strict";

  const KEY = SC.config.keys.cart;
  const MAX_QTY = 20;
  const NOTE_LIMIT = 80;
  const listeners = new Set();

  function safe(fn) {
    try {
      return fn();
    } catch {
      return null;
    }
  }

  function lineKey(productId, note) {
    return note ? `${productId}#${SC.fmt.hash(note)}` : productId;
  }

  function noteOf(value) {
    return typeof value === "string" ? value.trim().slice(0, NOTE_LIMIT) : "";
  }

  function sanitize(raw) {
    if (!raw || typeof raw !== "object") return null;
    const product = SC.data.byId(raw.productId);
    if (!product) return null;
    const note = noteOf(raw.note);
    const qty = SC.fmt.clamp(Math.round(Number(raw.qty) || 0), 0, MAX_QTY);
    if (qty < 1) return null;
    return { key: lineKey(product.id, note), productId: product.id, note, qty };
  }

  function read() {
    const parsed = safe(() => JSON.parse(window.localStorage.getItem(KEY) || "[]"));
    return Array.isArray(parsed) ? parsed.map(sanitize).filter(Boolean) : [];
  }

  let lines = read();

  function write() {
    safe(() => window.localStorage.setItem(KEY, JSON.stringify(lines)));
  }

  function emit() {
    write();
    const payload = list();
    listeners.forEach((listener) => listener(payload));
  }

  window.addEventListener("storage", (event) => {
    if (event.key !== KEY) return;
    lines = read();
    const payload = list();
    listeners.forEach((listener) => listener(payload));
  });

  function list() {
    return lines.slice();
  }

  function lineFor(productId) {
    return lines.find((line) => line.productId === productId && !line.note) || null;
  }

  function find(key) {
    return lines.find((line) => line.key === key) || null;
  }

  function qtyOf(productId) {
    return lines.reduce((total, line) => (line.productId === productId ? total + line.qty : total), 0);
  }

  function count() {
    return lines.reduce((total, line) => total + line.qty, 0);
  }

  function subtotal() {
    return lines.reduce((total, line) => {
      const product = SC.data.byId(line.productId);
      return product ? total + product.price * line.qty : total;
    }, 0);
  }

  function add(productId, options) {
    const product = SC.data.byId(productId);
    if (!product || !product.available) return null;
    const settings = options || {};
    const note = noteOf(settings.note);
    const qty = SC.fmt.clamp(Math.round(Number(settings.qty) || 1), 1, MAX_QTY);
    const key = lineKey(product.id, note);
    const existing = find(key);

    if (existing) existing.qty = SC.fmt.clamp(existing.qty + qty, 1, MAX_QTY);
    else lines.push({ key, productId: product.id, note, qty });

    emit();
    return key;
  }

  function setQty(key, qty) {
    const line = find(key);
    if (!line) return;
    const next = Math.round(Number(qty) || 0);
    if (next < 1) return remove(key);
    line.qty = SC.fmt.clamp(next, 1, MAX_QTY);
    emit();
  }

  function bump(key, delta) {
    const line = find(key);
    if (!line) return;
    setQty(key, line.qty + Math.round(Number(delta) || 0));
  }

  function remove(key) {
    const next = lines.filter((line) => line.key !== key);
    if (next.length === lines.length) return;
    lines = next;
    emit();
  }

  function clear() {
    if (!lines.length) return;
    lines = [];
    emit();
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  SC.cart = {
    lines: list,
    lineFor,
    qtyOf,
    count,
    subtotal,
    add,
    setQty,
    bump,
    remove,
    clear,
    subscribe,
    MAX_QTY,
    NOTE_LIMIT,
  };
})(window.SC || (window.SC = {}));
