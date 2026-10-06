(function (SC) {
  "use strict";

  const listeners = new Set();

  const state = {
    clock: SC.config.startClock,
    seq: 0,
    servers: SC.config.servers.defaultValue,
    auto: true,
    tickets: [],
    day: "",
  };

  function todayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${SC.fmt.pad(now.getMonth() + 1, 2)}-${SC.fmt.pad(now.getDate(), 2)}`;
  }

  function rng(seed) {
    let value = seed >>> 0;
    return () => {
      value = (value + 0x6d2b79f5) | 0;
      let t = Math.imul(value ^ (value >>> 15), 1 | value);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function safe(fn) {
    try {
      return fn();
    } catch {
      return null;
    }
  }

  function minutesOfDay() {
    return state.clock;
  }

  function pickItems(random, count, offset) {
    const pool = SC.data.products.filter((product) => product.available);
    const items = [];
    let guard = 0;
    while (items.length < count && guard < 24) {
      guard += 1;
      const product = pool[Math.floor(random() * pool.length)];
      if (!product || items.some((item) => item.id === product.id)) continue;
      const qty = random() > 0.74 ? 2 : 1;
      items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        service: product.service,
        qty,
        total: product.price * qty,
        serviceTotal: product.service * qty,
      });
    }
    if (!items.length && pool[0]) {
      const product = pool[0];
      items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        service: product.service,
        qty: 1,
        total: product.price,
        serviceTotal: product.service,
      });
    }
    const service = items.reduce((sum, item) => sum + item.serviceTotal, 0);
    return { items, service: service + (offset || 0) };
  }

  function makeTicket(seq, status, clock, options) {
    const random = rng(SC.fmt.hash(`quickbite-${state.day}-${seq}`));
    const settings = options || {};
    const picked = pickItems(random, 1 + Math.floor(random() * 2), 0);
    return {
      id: `t${seq}-${SC.fmt.hash(`${state.day}-${seq}`).toString(36).slice(0, 5)}`,
      seq,
      number: SC.fmt.queueNumber(SC.config.prefix, seq),
      mine: Boolean(settings.mine),
      items: picked.items,
      service: picked.service,
      pace: Math.round((0.82 + random() * 0.42) * 100) / 100,
      status,
      createdAt: clock,
      startedAt: status === "WAITING" ? null : clock,
      readyAt: null,
      completedAt: null,
      cancelledAt: null,
    };
  }

  function seed() {
    state.day = todayKey();
    state.clock = SC.config.startClock;
    state.seq = 0;
    state.tickets = [];
    state.servers = SC.config.servers.defaultValue;
    state.auto = true;

    const completed = [
      [11 * 60 + 18, 2],
      [11 * 60 + 22, 4],
      [11 * 60 + 27, 3],
      [11 * 60 + 31, 5],
      [11 * 60 + 36, 2],
      [11 * 60 + 41, 4],
    ];
    completed.forEach((entry) => {
      state.seq += 1;
      const ticket = makeTicket(state.seq, "COMPLETED", entry[0]);
      ticket.startedAt = entry[0] + 1;
      ticket.readyAt = ticket.startedAt + ticket.service * (ticket.pace || 1);
      ticket.completedAt = ticket.readyAt + 2;
      state.tickets.push(ticket);
    });

    const serving = [
      [11 * 60 + 47, 5],
      [11 * 60 + 49, 4],
    ];
    serving.forEach((entry) => {
      state.seq += 1;
      const ticket = makeTicket(state.seq, "PROCESSING", entry[0]);
      ticket.startedAt = entry[0];
      state.tickets.push(ticket);
    });

    for (let index = 0; index < 5; index += 1) {
      state.seq += 1;
      state.tickets.push(makeTicket(state.seq, "WAITING", state.clock - (5 - index) * 2));
    }
  }

  function save() {
    safe(() =>
      window.localStorage.setItem(
        SC.config.keys.board,
        JSON.stringify({
          day: state.day,
          clock: state.clock,
          seq: state.seq,
          servers: state.servers,
          auto: state.auto,
          tickets: state.tickets,
        })
      )
    );
  }

  function load() {
    const stored = safe(() => JSON.parse(window.localStorage.getItem(SC.config.keys.board) || "null"));
    if (!stored || stored.day !== todayKey() || !Array.isArray(stored.tickets)) {
      seed();
      save();
      return;
    }
    state.day = stored.day;
    state.clock = Number(stored.clock) || SC.config.startClock;
    state.seq = Number(stored.seq) || 0;
    state.servers = SC.fmt.clamp(Number(stored.servers) || SC.config.servers.defaultValue, SC.config.servers.min, SC.config.servers.max);
    state.auto = stored.auto !== false;
    state.tickets = stored.tickets
      .filter((ticket) => ticket && typeof ticket === "object" && Array.isArray(ticket.items))
      .map((ticket) => Object.assign({}, ticket));
  }

  load();

  function emit() {
    const payload = {
      tickets: state.tickets.slice(),
      clock: state.clock,
      servers: state.servers,
      auto: state.auto,
      seq: state.seq,
    };
    listeners.forEach((listener) => listener(payload));
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function byId(id) {
    return state.tickets.find((ticket) => ticket.id === String(id)) || null;
  }

  function byStatus(status) {
    return state.tickets.filter((ticket) => ticket.status === status);
  }

  function active() {
    return state.tickets.filter((ticket) => ticket.status === "WAITING" || ticket.status === "PROCESSING");
  }

  function mine(includeFinished) {
    return state.tickets.filter((ticket) => {
      if (!ticket.mine) return false;
      if (includeFinished) return true;
      return ticket.status === "WAITING" || ticket.status === "PROCESSING" || ticket.status === "READY";
    });
  }

  function nowServing() {
    const processing = byStatus("PROCESSING");
    if (processing.length) return processing[0];
    const ready = byStatus("READY");
    if (ready.length) return ready[0];
    const waiting = byStatus("WAITING");
    return waiting[0] || null;
  }

  function ahead(ticket) {
    if (!ticket) return [];
    return state.tickets.filter(
      (other) =>
        other.seq < ticket.seq && (other.status === "WAITING" || other.status === "PROCESSING")
    );
  }

  function records() {
    return state.tickets
      .filter((ticket) => ticket.status === "COMPLETED" && Number.isFinite(ticket.startedAt) && Number.isFinite(ticket.completedAt))
      .map((ticket) => {
        const kitchenDone = Number.isFinite(ticket.readyAt) ? ticket.readyAt : ticket.completedAt;
        return {
          id: ticket.id,
          seq: ticket.seq,
          service: Math.max(0.5, kitchenDone - ticket.startedAt),
          estimate: ticket.service,
          wait: Math.max(0, ticket.startedAt - ticket.createdAt),
          pickup: Math.max(0, ticket.completedAt - kitchenDone),
          items: ticket.items,
          clock: ticket.completedAt,
        };
      });
  }

  function flow() {
    let changed = true;
    let guard = 0;
    while (changed && guard < 40) {
      guard += 1;
      changed = false;
      state.tickets.forEach((ticket) => {
        if (ticket.status !== "PROCESSING") return;
        const done = ticket.startedAt + ticket.service * (ticket.pace || 1);
        if (state.clock >= done) {
          ticket.status = "READY";
          ticket.readyAt = done;
          changed = true;
        }
      });
      state.tickets.forEach((ticket) => {
        if (ticket.status !== "READY") return;
        if (state.clock >= ticket.readyAt + SC.config.readyGrace) {
          ticket.status = "COMPLETED";
          ticket.completedAt = ticket.readyAt + SC.config.readyGrace;
          changed = true;
        }
      });
      while (byStatus("PROCESSING").length < state.servers) {
        const next = state.tickets.find((ticket) => ticket.status === "WAITING");
        if (!next) break;
        next.status = "PROCESSING";
        next.startedAt = state.clock;
        changed = true;
      }
    }
  }

  function arrive() {
    if (state.clock >= SC.config.closeHour * 60) return null;
    if (active().length >= 14) return null;
    const chance = SC.analytics.demandAt(state.clock);
    if (chance <= 0 || Math.random() > chance) return null;
    state.seq += 1;
    const ticket = makeTicket(state.seq, "WAITING", state.clock);
    state.tickets.push(ticket);
    return ticket;
  }

  function tick(step) {
    state.clock += Number(step) || 1;
    if (state.clock > SC.config.closeHour * 60) state.clock = SC.config.closeHour * 60;
    arrive();
    flow();
    save();
    emit();
    return state.clock;
  }

  function advance() {
    const processing = byStatus("PROCESSING")[0];
    if (processing) {
      state.clock = Math.max(state.clock, processing.startedAt + processing.service * (processing.pace || 1));
    } else {
      state.clock += 1;
    }
    flow();
    save();
    emit();
  }

  function enqueue(items) {
    const source = Array.isArray(items) ? items : SC.cart.items();
    if (!source.length) return null;
    state.seq += 1;
    const service = source.reduce((sum, item) => sum + (item.serviceTotal || item.service * item.qty), 0);
    const ticket = {
      id: `u${state.seq}-${Date.now().toString(36)}`,
      seq: state.seq,
      number: SC.fmt.queueNumber(SC.config.prefix, state.seq),
      mine: true,
      items: source.map((item) => ({
        id: item.id,
        name: item.name || (item.product && item.product.name) || item.id,
        price: item.price != null ? item.price : item.product ? item.product.price : 0,
        service: item.service != null ? item.service : item.product ? item.product.service : 2,
        qty: item.qty,
        total: item.total != null ? item.total : (item.price || 0) * item.qty,
        serviceTotal: item.serviceTotal != null ? item.serviceTotal : (item.service || 2) * item.qty,
      })),
      service: Math.max(1, service),
      pace: Math.round((0.88 + Math.random() * 0.28) * 100) / 100,
      status: "WAITING",
      createdAt: state.clock,
      startedAt: null,
      readyAt: null,
      completedAt: null,
      cancelledAt: null,
    };
    state.tickets.push(ticket);
    flow();
    save();
    emit();
    return byId(ticket.id);
  }

  function callNext() {
    const next = state.tickets.find((ticket) => ticket.status === "WAITING");
    if (!next) return null;
    next.status = "PROCESSING";
    next.startedAt = state.clock;
    save();
    emit();
    return next;
  }

  function promote(id) {
    const ticket = byId(id);
    if (!ticket || ticket.status !== "WAITING") return null;
    ticket.status = "PROCESSING";
    ticket.startedAt = state.clock;
    save();
    emit();
    return ticket;
  }

  function complete(id) {
    const ticket = byId(id);
    if (!ticket || ticket.status !== "PROCESSING") return null;
    ticket.status = "READY";
    ticket.readyAt = state.clock;
    flow();
    save();
    emit();
    return ticket;
  }

  function take(id) {
    const ticket = byId(id);
    if (!ticket || ticket.status !== "READY") return null;
    ticket.status = "COMPLETED";
    ticket.completedAt = state.clock;
    save();
    emit();
    return ticket;
  }

  function cancel(id) {
    const ticket = byId(id);
    if (!ticket || (ticket.status !== "WAITING" && ticket.status !== "PROCESSING")) return null;
    ticket.status = "CANCELLED";
    ticket.cancelledAt = state.clock;
    flow();
    save();
    emit();
    return ticket;
  }

  function setServers(count) {
    const next = SC.fmt.clamp(Math.round(Number(count) || state.servers), SC.config.servers.min, SC.config.servers.max);
    if (next === state.servers) return state.servers;
    state.servers = next;
    flow();
    save();
    emit();
    return next;
  }

  function setAuto(enabled) {
    state.auto = Boolean(enabled);
    save();
    emit();
    return state.auto;
  }

  function reset() {
    seed();
    save();
    emit();
  }

  function summary() {
    const waiting = byStatus("WAITING");
    const processing = byStatus("PROCESSING");
    const ready = byStatus("READY");
    const completed = byStatus("COMPLETED");
    return {
      clock: state.clock,
      servers: state.servers,
      auto: state.auto,
      waiting,
      processing,
      ready,
      completed,
      activeCount: waiting.length + processing.length,
      total: state.tickets.length,
    };
  }

  SC.queue = {
    subscribe,
    tick,
    advance,
    enqueue,
    callNext,
    promote,
    complete,
    take,
    cancel,
    setServers,
    setAuto,
    reset,
    byId,
    byStatus,
    active,
    mine,
    ahead,
    nowServing,
    records,
    summary,
    minutesOfDay,
  };
})(window.SC || (window.SC = {}));
