(function (SC) {
  "use strict";

  const views = (SC.views = SC.views || {});
  const { esc } = SC.dom;

  function lane(title, orders, tone, empty, limit) {
    const shown = limit ? orders.slice(0, limit) : orders;
    return `<section class="qb__lane qb__lane--${tone}">
      <header class="qb__lane-head">
        <h2>${esc(title)}</h2>
        <span>${String(orders.length).padStart(2, "0")}</span>
      </header>
      ${
        shown.length
          ? `<ol class="qb__list">${shown
              .map(
                (order, index) =>
                  `<li class="qb__chip" style="--i:${index}"><span class="qb__chip-num">${esc(order.number)}</span><span class="qb__chip-name">${esc(order.customer.name)}</span></li>`
              )
              .join("")}</ol>`
          : `<p class="qb__empty">${esc(empty)}</p>`
      }
    </section>`;
  }

  views.queue = function queueView() {
    let stopOrders = null;
    let clockTimer = 0;
    let lastNow = null;

    const el = SC.dom.html('<div class="qb" data-queue-board></div>');
    let stage = null;

    function paint() {
      const board = SC.orders.board();
      const processing = board.processing[0] || null;
      const upNext = board.processing.slice(1);

      el.innerHTML = `<header class="qb__head">
          ${SC.layout.brandMarkup()}
          <span class="qb__label">Layar antrean kantin</span>
          <time class="qb__clock" data-clock>${SC.fmt.clock(new Date())}</time>
          <button class="qb__fs" type="button" data-fullscreen>Mode layar penuh</button>
        </header>
        <main class="qb__main">
          <section class="qb__now" aria-label="Nomor yang sedang disiapkan">
            <p class="qb__eyebrow">Sedang disiapkan</p>
            <p class="qb__number${processing ? "" : " qb__number--empty"}" data-now>${processing ? esc(processing.number) : "&mdash;"}</p>
            <p class="qb__detail">${
              processing
                ? `${esc(processing.customer.name)} &middot; ${esc(processing.customer.grade)}`
                : "Dapur siap menerima pesanan baru"
            }</p>
            ${
              upNext.length
                ? `<p class="qb__detail qb__detail--muted">Berikutnya: ${upNext.map((order) => esc(order.number)).join(" &middot; ")}</p>`
                : ""
            }
          </section>
          <div class="qb__lanes">
            ${lane("Siap diambil", board.ready, "ready", "Belum ada pesanan siap", 6)}
            ${lane("Dalam antrean", board.queued, "queued", "Antrean sedang kosong", 8)}
          </div>
        </main>
        ${SC.ui.stageMarkup("belt")}
        <footer class="qb__foot">
          <span><strong>${SC.fmt.number(board.activeCount)}</strong> pesanan aktif</span>
          <span>Estimasi tunggu <strong>${board.activeCount ? `\u00b1 ${SC.fmt.number(board.eta)} menit` : "&mdash;"}</strong></span>
          <span>Diperbarui ${SC.fmt.clock(new Date())}</span>
        </footer>`;

      const now = SC.dom.qs("[data-now]", el);
      if (now && processing && lastNow !== processing.number) SC.motion.flip(now);
      lastNow = processing ? processing.number : null;
      if (stage) stage.refresh();
    }

    function syncFullscreenLabel() {
      const button = SC.dom.qs("[data-fullscreen]", el);
      if (!button) return;
      button.textContent = document.fullscreenElement ? "Keluar layar penuh" : "Mode layar penuh";
    }

    SC.dom.on(el, "click", "[data-fullscreen]", () => {
      if (document.fullscreenElement) {
        if (document.exitFullscreen) document.exitFullscreen();
      } else if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    });

    document.addEventListener("fullscreenchange", syncFullscreenLabel);
    paint();

    return {
      name: "queue",
      title: "Layar antrean — CanteenFlow AI",
      announce: "Layar antrean kantin",
      el,
      mount() {
        document.body.dataset.screen = "queue";
        stopOrders = SC.orders.subscribe(paint);
        clockTimer = window.setInterval(() => {
          const clock = SC.dom.qs("[data-clock]", el);
          if (clock) clock.textContent = SC.fmt.clock(new Date());
        }, 1000);
        stage = SC.ui.attachStage(SC.dom.qs("[data-stage]", el), () => SC.ui.fifoShape(SC.orders.board()));
      },
      destroy() {
        delete document.body.dataset.screen;
        document.removeEventListener("fullscreenchange", syncFullscreenLabel);
        if (stopOrders) stopOrders();
        window.clearInterval(clockTimer);
        if (stage) stage.destroy();
      },
    };
  };
})(window.SC || (window.SC = {}));
