(function (SC) {
  "use strict";

  function remaining(ticket, clock) {
    if (!ticket) return 0;
    if (ticket.status === "PROCESSING") {
      return Math.max(0.5, ticket.service * (ticket.pace || 1) - (clock - ticket.startedAt));
    }
    return ticket.service * (ticket.pace || 1);
  }

  function position(ticket) {
    if (!ticket) return 0;
    if (ticket.status === "PROCESSING") return 1;
    if (ticket.status === "READY" || ticket.status === "COMPLETED") return 0;
    return SC.queue.ahead(ticket).length + 1;
  }

  function rawWait(ticket) {
    if (!ticket) return 0;
    const summary = SC.queue.summary();
    if (ticket.status === "PROCESSING" || ticket.status === "READY" || ticket.status === "COMPLETED") return 0;
    const total = SC.queue
      .ahead(ticket)
      .reduce((sum, other) => sum + remaining(other, summary.clock), 0);
    const factor = SC.analytics.calibration().factor;
    return (total * factor) / summary.servers;
  }

  function wait(ticket) {
    return Math.round(rawWait(ticket) * 2) / 2;
  }

  function range(ticket) {
    const base = rawWait(ticket);
    if (base <= 0) return [0, 0];
    return [Math.max(0.5, Math.round(base * 0.8 * 2) / 2), Math.max(1, Math.round(base * 1.25 * 2) / 2)];
  }

  function arrivalWait() {
    const summary = SC.queue.summary();
    const active = SC.queue.active();
    if (!active.length) return 0;
    const factor = SC.analytics.calibration().factor;
    const total = active.reduce((sum, ticket) => sum + remaining(ticket, summary.clock), 0);
    return Math.round(((total * factor) / summary.servers) * 2) / 2;
  }

  function serviceEstimate(items) {
    const list = Array.isArray(items) ? items : SC.cart.items();
    const factor = SC.analytics.calibration().factor;
    const total = list.reduce((sum, item) => sum + (item.serviceTotal || item.service * item.qty), 0);
    return Math.round(total * factor * 2) / 2;
  }

  function crowd() {
    const summary = SC.queue.summary();
    const eta = arrivalWait();
    const waiting = summary.waiting.length;
    let level = "normal";
    if (waiting <= 2 && summary.processing.length <= 1) level = "sepi";
    else if (waiting > 6 || eta > 12) level = "ramai";

    const meta = {
      sepi: { label: "SEPI", tone: "mint", advice: "Antrean longgar. Waktu paling enak untuk ambil nomor." },
      normal: { label: "NORMAL", tone: "amber", advice: "Arus antrean stabil, estimasi masih wajar." },
      ramai: { label: "RAMAI", tone: "coral", advice: "Antrean menumpuk. Pertimbangkan datang beberapa menit lagi." },
    }[level];

    return {
      level,
      label: meta.label,
      tone: meta.tone,
      advice: meta.advice,
      eta,
      waiting,
      processing: summary.processing.length,
      servers: summary.servers,
      ready: summary.ready.length,
    };
  }

  function recommendation() {
    const state = crowd();
    if (state.level !== "ramai") {
      return {
        crowded: false,
        now: { label: SC.fmt.clock(SC.queue.minutesOfDay()), wait: state.eta },
        best: null,
        text: state.advice,
      };
    }
    const slots = SC.analytics.forecast(6);
    if (!slots.length) {
      return { crowded: true, now: { label: SC.fmt.clock(SC.queue.minutesOfDay()), wait: state.eta }, best: null, text: state.advice };
    }
    const best = slots.reduce((winner, slot) => (slot.wait < winner.wait ? slot : winner), slots[0]);
    return {
      crowded: true,
      now: { label: SC.fmt.clock(SC.queue.minutesOfDay()), wait: state.eta },
      best,
      text: `Datang sekitar ${best.label} — perkiraan tunggu turun ke ${SC.fmt.minutes(best.wait)}.`,
    };
  }

  function ticketState(ticket) {
    if (!ticket) return { text: "TIDAK DITEMUKAN", tone: "dim" };
    if (ticket.status === "PROCESSING") return { text: "SEDANG DISIAPKAN", tone: "amber" };
    if (ticket.status === "READY") return { text: "SIAP DIAMBIL", tone: "mint" };
    if (ticket.status === "COMPLETED") return { text: "SELESAI", tone: "dim" };
    if (ticket.status === "CANCELLED") return { text: "DIBATALKAN", tone: "coral" };
    const pos = position(ticket);
    if (pos === 1) return { text: "KAMU BERIKUTNYA", tone: "amber" };
    if (pos <= 3) return { text: "SEBENTAR LAGI", tone: "amber" };
    return { text: "MENUNGGU", tone: "wait" };
  }

  function notify(ticket) {
    if (!ticket) return null;
    if (ticket.status === "PROCESSING") return "Pesananmu sedang disiapkan di dapur.";
    if (ticket.status === "READY") return "Pesanan siap. Silakan menuju meja pengambilan.";
    if (ticket.status === "WAITING") {
      const pos = position(ticket);
      if (pos === 1) return "Bersiap. Kamu berikutnya dipanggil.";
      if (pos === 2) return `Tinggal satu orang lagi di depanmu.`;
      if (pos <= 4) return `Sebentar lagi giliranmu. Posisi ${pos} dari ${SC.queue.summary().activeCount}.`;
    }
    return null;
  }

  SC.estimator = {
    position,
    wait,
    range,
    arrivalWait,
    serviceEstimate,
    crowd,
    recommendation,
    ticketState,
    notify,
    remaining,
  };
})(window.SC || (window.SC = {}));
