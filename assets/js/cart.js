(function (SC) {
  "use strict";

  const listeners = new Set();
  const lines = new Map();

  function safe(fn) {
    try {
      return fn();
    } catch {
      return null;
    }
  }

  function snapshot() {
    const items = [];
    lines.forEach((qty, id) => {
      const product = SC.data.byId(id);
      if (!product) return;
      items.push({
        id,
        product,
        qty,
        price: product.price,
        total: product.price * qty,
        service: product.service,
        serviceTotal: product.service * qty,
      });
    });
    return items;
  }

  function emit() {
    const items = snapshot();
    listeners.forEach((listener) => listener(items));
  }

  function persist() {
    safe(() => window.localStorage.setItem(SC.config.keys.cart, JSON.stringify(Array.from(lines.entries()))));
  }

  function commit() {
    persist();
    emit();
  }

  function load() {
    const stored = safe(() => JSON.parse(window.localStorage.getItem(SC.config.keys.cart) || "[]"));
    if (!Array.isArray(stored)) return;
    stored.forEach((entry) => {
      if (!Array.isArray(entry) || entry.length !== 2) return;
      const id = String(entry[0]);
      const qty = Math.floor(Number(entry[1]));
      if (!SC.data.byId(id) || !Number.isFinite(qty) || qty < 1) return;
      lines.set(id, Math.min(20, qty));
    });
  }

  load();

  function add(id, qty) {
    const product = SC.data.byId(id);
    if (!product || !product.available) return null;
    const amount = Math.max(1, Math.floor(Number(qty) || 1));
    const next = Math.min(20, (lines.get(id) || 0) + amount);
    lines.set(id, next);
    commit();
    return { id, qty: next };
  }

  function setQty(id, qty) {
    const amount = Math.floor(Number(qty));
    if (!Number.isFinite(amount) || amount < 1) return remove(id);
    if (!SC.data.byId(id)) return null;
    lines.set(id, Math.min(20, amount));
    commit();
    return { id, qty: lines.get(id) };
  }

  function bump(id, delta) {
    const current = lines.get(id) || 0;
    return setQty(id, current + Number(delta));
  }

  function remove(id) {
    const existed = lines.delete(id);
    if (existed) commit();
    return existed;
  }

  function clear() {
    if (!lines.size) return;
    lines.clear();
    commit();
  }

  function count() {
    let total = 0;
    lines.forEach((qty) => {
      total += qty;
    });
    return total;
  }

  function total() {
    let sum = 0;
    lines.forEach((qty, id) => {
      const product = SC.data.byId(id);
      if (product) sum += product.price * qty;
    });
    return sum;
  }

  function service() {
    let sum = 0;
    lines.forEach((qty, id) => {
      const product = SC.data.byId(id);
      if (product) sum += product.service * qty;
    });
    return sum;
  }

  function items() {
    return snapshot();
  }

  function subscription(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  SC.cart = { add, setQty, bump, remove, clear, count, total, service, items, subscribe: subscription };
})(window.SC || (window.SC = {}));
