(function (SC) {
  "use strict";

  SC.config = {
    brand: "QuickBite",
    prefix: "A",
    servers: { min: 1, max: 3, defaultValue: 2 },
    tickMs: 3000,
    readyGrace: 3,
    openHour: 9,
    closeHour: 14,
    binMinutes: 30,
    startClock: 11 * 60 + 52,
    seedTickets: 13,
    store: "quickbite.v1",
    keys: {
      catalog: "quickbite.catalog.v1",
      cart: "quickbite.cart.v1",
      board: "quickbite.board.v1",
    },
    labels: {
      WAITING: { text: "MENUNGGU", tone: "wait" },
      PROCESSING: { text: "DIPROSES", tone: "process" },
      READY: { text: "SIAP", tone: "ready" },
      COMPLETED: { text: "SELESAI", tone: "done" },
      CANCELLED: { text: "DIBATALKAN", tone: "cancel" },
    },
  };
})(window.SC || (window.SC = {}));
