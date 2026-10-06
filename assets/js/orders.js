(function (SC) {
  "use strict";

  const STORE = SC.config.keys.orders;
  const COUNTER = SC.config.keys.counter;
  const SEED_FLAG = SC.config.keys.seed;
  const LIMIT = 120;
  const FLOW = ["CREATED", "WAITING_PAYMENT", "PAID", "QUEUED", "PROCESSING", "READY", "COMPLETED"];
  const listeners = new Set();

  function safe(fn) {
    try {
      return fn();
    } catch {
      return null;
    }
  }

  function dayKey(date) {
    const value = date instanceof Date ? date : new Date(date);
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }

  function iso(value) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
  }

  function sanitizeHistory(raw, status, createdAt) {
    const entries = (Array.isArray(raw) ? raw : [])
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        if (!FLOW.includes(entry.status)) return null;
        const at = iso(entry.at);
        return at ? { status: entry.status, at } : null;
      })
      .filter(Boolean);

    const seen = new Map();
    entries
      .sort((a, b) => new Date(a.at) - new Date(b.at))
      .forEach((entry) => {
        if (!seen.has(entry.status)) seen.set(entry.status, entry.at);
      });

    const limit = FLOW.indexOf(status);
    const ordered = FLOW.slice(0, limit + 1)
      .filter((step) => seen.has(step))
      .map((step) => ({ status: step, at: seen.get(step) }));

    if (!ordered.length || ordered[ordered.length - 1].status !== status) {
      ordered.push({ status, at: createdAt });
    }
    return ordered;
  }

  function normalizeOrder(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    if (typeof value.id !== "string" || typeof value.code !== "string") return null;
    if (!value.customer || typeof value.customer !== "object" || !Array.isArray(value.items)) return null;
    if (!FLOW.includes(value.status)) return null;
    if (!["QRIS", "CASH"].includes(value.method)) return null;
    const createdAt = iso(value.createdAt);
    if (!createdAt) return null;

    const customer = {
      name: String(value.customer.name || "").trim().slice(0, 40),
      grade: String(value.customer.grade || "").trim().slice(0, 16),
    };
    if (!customer.name || !customer.grade) return null;

    const items = value.items
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const product = SC.data.byId(item.productId);
        const qty = Math.floor(Number(item.qty));
        if (!product || qty < 1 || qty > 20) return null;
        return {
          productId: product.id,
          name: product.name,
          price: product.price,
          qty,
          note: String(item.note || "").trim().slice(0, 80),
        };
      })
      .filter(Boolean);
    if (!items.length) return null;

    const status = value.status;
    const number = typeof value.number === "string" && value.number ? value.number.slice(0, 16) : null;
    const order = {
      id: value.id.slice(0, 80),
      code: value.code.slice(0, 12),
      number: FLOW.indexOf(status) >= FLOW.indexOf("PAID") ? number : null,
      customer,
      items,
      units: items.reduce((total, item) => total + item.qty, 0),
      total: items.reduce((total, item) => total + item.price * item.qty, 0),
      method: value.method,
      status,
      history: sanitizeHistory(value.history, status, createdAt),
      createdAt,
    };

    ["paidAt", "queuedAt", "readyAt", "completedAt"].forEach((field) => {
      const at = iso(value[field]);
      if (at) order[field] = at;
    });
    if (value.demo === true) order.demo = true;
    return order;
  }

  function read() {
    const value = safe(() => JSON.parse(window.localStorage.getItem(STORE) || "[]"));
    return Array.isArray(value) ? value.map(normalizeOrder).filter(Boolean).slice(0, LIMIT) : [];
  }

  let orders = read();

  function persist() {
    safe(() => window.localStorage.setItem(STORE, JSON.stringify(orders)));
  }

  function emit() {
    persist();
    listeners.forEach((listener) => listener(list()));
  }

  function orderCode() {
    let code = "";
    do {
      code = `CF-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    } while (orders.some((order) => order.code === code));
    return code;
  }

  function queueNumber() {
    const stored = safe(() => JSON.parse(window.localStorage.getItem(COUNTER) || "null"));
    const today = dayKey(new Date());
    const existing = orders
      .filter((order) => order.number && order.createdAt.slice(0, 10) === today)
      .reduce((max, order) => {
        const match = new RegExp(`^${SC.config.orderPrefix}(\\d+)$`).exec(order.number);
        return match ? Math.max(max, Number(match[1])) : max;
      }, 0);
    const step = Math.max(stored && stored.day === today ? Number(stored.step) || 0 : 0, existing);
    const next = step + 1;
    safe(() => window.localStorage.setItem(COUNTER, JSON.stringify({ day: today, step: next })));
    return `${SC.config.orderPrefix}${String(next).padStart(3, "0")}`;
  }

  function create(draft) {
    if (!draft || !draft.customer || !Array.isArray(draft.items)) {
      throw new TypeError("Data pesanan tidak valid");
    }

    const customer = {
      name: String(draft.customer.name || "").trim().slice(0, 40),
      grade: String(draft.customer.grade || "").trim().slice(0, 16),
    };
    if (customer.name.length < 2 || !customer.grade) {
      throw new TypeError("Data pemesan belum lengkap");
    }

    const items = draft.items.map((item) => {
      const product = item && SC.data.byId(item.productId);
      const qty = Math.floor(Number(item && item.qty));
      if (!product || !product.available || qty < 1 || qty > 20) {
        throw new TypeError("Item pesanan tidak valid atau tidak tersedia");
      }
      return {
        productId: product.id,
        name: product.name,
        price: product.price,
        qty,
        note: String(item.note || "").trim().slice(0, 80),
      };
    });
    if (!items.length || items.length > 30) throw new TypeError("Jumlah item pesanan tidak valid");
    if (!["QRIS", "CASH"].includes(draft.method)) throw new TypeError("Metode pembayaran tidak valid");

    const now = new Date().toISOString();
    const order = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      code: orderCode(),
      number: null,
      customer,
      items,
      units: items.reduce((total, item) => total + item.qty, 0),
      total: items.reduce((total, item) => total + item.price * item.qty, 0),
      method: draft.method,
      status: "WAITING_PAYMENT",
      history: [
        { status: "CREATED", at: now },
        { status: "WAITING_PAYMENT", at: now },
      ],
      createdAt: now,
    };

    orders = [order].concat(orders).slice(0, LIMIT);
    emit();
    return order;
  }

  function list() {
    return orders.slice();
  }

  function byId(id) {
    return orders.find((order) => order.id === id) || null;
  }

  function today() {
    const todayKey = dayKey(new Date());
    return orders.filter((order) => dayKey(order.createdAt) === todayKey);
  }

  function sortQueued(a, b) {
    const diff = new Date(a.queuedAt || a.paidAt || a.createdAt) - new Date(b.queuedAt || b.paidAt || b.createdAt);
    if (diff !== 0) return diff;
    return String(a.number).localeCompare(String(b.number), "id");
  }

  function board() {
    const active = orders.filter((order) => order.status !== "COMPLETED");
    const processing = active.filter((order) => order.status === "PROCESSING").sort(sortQueued);
    const ready = active.filter((order) => order.status === "READY").sort(sortQueued);
    const queued = active.filter((order) => order.status === "QUEUED").sort(sortQueued);
    const waiting = active
      .filter((order) => order.status === "WAITING_PAYMENT")
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const activeCount = active.length;
    const eta = activeCount
      ? Math.max(1, Math.round((queued.length + processing.length * 0.6) * SC.config.serveSeconds / 60))
      : 0;

    return { processing, ready, queued, waiting, activeCount, eta };
  }

  function front() {
    return board().queued[0] || null;
  }

  function position(id) {
    const { queued } = board();
    const index = queued.findIndex((order) => order.id === id);
    return index === -1 ? null : { index: index + 1, total: queued.length };
  }

  function advance(order, status, stamp) {
    const at = new Date().toISOString();
    order.status = status;
    order.history.push({ status, at });
    if (stamp) order[stamp] = at;
    emit();
    return order;
  }

  function confirmPayment(id) {
    const order = byId(id);
    if (!order || order.status !== "WAITING_PAYMENT") return null;
    const at = new Date().toISOString();
    order.number = queueNumber();
    order.paidAt = at;
    order.history.push({ status: "PAID", at });
    order.status = "QUEUED";
    order.queuedAt = at;
    order.history.push({ status: "QUEUED", at });
    emit();
    return order;
  }

  function startProcessing(id) {
    const order = byId(id);
    if (!order || order.status !== "QUEUED") return { error: "Pesanan tidak berada di antrean" };
    const head = front();
    if (!head || head.id !== id) {
      return { error: `Antrean FIFO: mulai dari ${head ? head.number : "pesanan terdepan"} lebih dulu` };
    }
    return { order: advance(order, "PROCESSING", null) };
  }

  function markReady(id) {
    const order = byId(id);
    if (!order || order.status !== "PROCESSING") return { error: "Pesanan belum mulai diproses" };
    return { order: advance(order, "READY", "readyAt") };
  }

  function complete(id) {
    const order = byId(id);
    if (!order || order.status !== "READY") return { error: "Pesanan belum siap diambil" };
    return { order: advance(order, "COMPLETED", "completedAt") };
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function ago(minutes) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return new Date(Math.max(start.getTime() + 60000, Date.now() - minutes * 60000)).toISOString();
  }

  function demoOrder(spec) {
    const history = spec.steps.map(([status, minutes]) => ({ status, at: ago(minutes) }));
    const status = history[history.length - 1].status;
    const items = spec.items.map(([productId, qty]) => {
      const product = SC.data.byId(productId);
      return {
        productId,
        name: product ? product.name : productId,
        price: product ? product.price : 0,
        qty,
        note: "",
      };
    });
    const order = {
      id: `demo-${spec.number || "waiting"}`,
      code: spec.code,
      number: spec.number,
      customer: { name: spec.customer[0], grade: spec.customer[1] },
      items,
      units: items.reduce((total, item) => total + item.qty, 0),
      total: items.reduce((total, item) => total + item.price * item.qty, 0),
      method: spec.method,
      status,
      history,
      createdAt: history[0].at,
      demo: true,
    };
    history.forEach((entry) => {
      if (entry.status === "PAID") order.paidAt = entry.at;
      if (entry.status === "QUEUED") order.queuedAt = entry.at;
      if (entry.status === "READY") order.readyAt = entry.at;
      if (entry.status === "COMPLETED") order.completedAt = entry.at;
    });
    return order;
  }

  function seedDemo() {
    if (safe(() => window.localStorage.getItem(SEED_FLAG)) || orders.length) {
      safe(() => window.localStorage.setItem(SEED_FLAG, "1"));
      return;
    }

    const specs = [
      {
        number: "A001",
        code: "CF-DM01",
        customer: ["Raka", "XI IPA 1"],
        method: "QRIS",
        items: [["nasi-goreng", 1], ["es-teh", 1]],
        steps: [
          ["CREATED", 46], ["WAITING_PAYMENT", 46], ["PAID", 44], ["QUEUED", 44],
          ["PROCESSING", 38], ["READY", 34], ["COMPLETED", 31],
        ],
      },
      {
        number: "A002",
        code: "CF-DM02",
        customer: ["Nadia", "X-3"],
        method: "CASH",
        items: [["mie-goreng", 1], ["kerupuk", 1]],
        steps: [
          ["CREATED", 40], ["WAITING_PAYMENT", 40], ["PAID", 38], ["QUEUED", 38],
          ["PROCESSING", 32], ["READY", 28], ["COMPLETED", 25],
        ],
      },
      {
        number: "A003",
        code: "CF-DM03",
        customer: ["Bagas", "XII IPS 2"],
        method: "QRIS",
        items: [["ayam-geprek", 1], ["es-teh", 2]],
        steps: [
          ["CREATED", 33], ["WAITING_PAYMENT", 33], ["PAID", 31], ["QUEUED", 31],
          ["PROCESSING", 24], ["READY", 18],
        ],
      },
      {
        number: "A004",
        code: "CF-DM04",
        customer: ["Sari", "XI IPA 3"],
        method: "CASH",
        items: [["bakso-urat", 1], ["es-jeruk", 1]],
        steps: [
          ["CREATED", 26], ["WAITING_PAYMENT", 26], ["PAID", 24], ["QUEUED", 24],
          ["PROCESSING", 15],
        ],
      },
      {
        number: "A005",
        code: "CF-DM05",
        customer: ["Dewi", "X-1"],
        method: "QRIS",
        items: [["nasi-uduk", 1], ["air-mineral", 1]],
        steps: [["CREATED", 18], ["WAITING_PAYMENT", 18], ["PAID", 16], ["QUEUED", 16]],
      },
      {
        number: "A006",
        code: "CF-DM06",
        customer: ["Fajar", "XII IPA 1"],
        method: "CASH",
        items: [["mie-goreng", 1], ["tahu-isi", 2], ["es-teh", 1]],
        steps: [["CREATED", 12], ["WAITING_PAYMENT", 12], ["PAID", 10], ["QUEUED", 10]],
      },
      {
        number: null,
        code: "CF-DM07",
        customer: ["Intan", "X-2"],
        method: "QRIS",
        items: [["nasi-goreng", 1], ["kerupuk", 1], ["es-teh", 1]],
        steps: [["CREATED", 4], ["WAITING_PAYMENT", 4]],
      },
    ];

    const seeded = specs
      .map(demoOrder)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    orders = seeded.concat(orders).slice(0, LIMIT);
    safe(() => window.localStorage.setItem(SEED_FLAG, "1"));
    safe(() =>
      window.localStorage.setItem(COUNTER, JSON.stringify({ day: dayKey(new Date()), step: 6 }))
    );
    persist();
  }

  seedDemo();

  window.addEventListener("storage", (event) => {
    if (event.key !== STORE) return;
    orders = read();
    listeners.forEach((listener) => listener(list()));
  });

  SC.orders = {
    FLOW,
    create,
    list,
    byId,
    today,
    board,
    front,
    position,
    confirmPayment,
    startProcessing,
    markReady,
    complete,
    subscribe,
  };
})(window.SC || (window.SC = {}));
