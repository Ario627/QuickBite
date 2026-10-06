(function (SC) {
  "use strict";

  const views = (SC.views = SC.views || {});
  const { esc } = SC.dom;

  function facts(ticket) {
    const position = SC.estimator.position(ticket);
    const wait = SC.estimator.wait(ticket);
    const range = SC.estimator.range(ticket);
    const service = ticket.service;
    const etaClock = SC.fmt.clock(SC.queue.minutesOfDay() + wait);
    return `<dl class="tk__facts" data-rise>
      <div class="tk__fact">
        <dt>Posisi</dt>
        <dd data-v="pos">${ticket.status === "PROCESSING" ? "DILAYANI" : position ? `#${position}` : "—"}</dd>
      </div>
      <div class="tk__fact">
        <dt>Estimasi tunggu</dt>
        <dd data-v="eta">${SC.fmt.eta(wait)}</dd>
      </div>
      <div class="tk__fact">
        <dt>Waktu layan pesanan</dt>
        <dd data-v="svc">&plusmn; ${SC.fmt.number(service)} <small>mnt</small></dd>
      </div>
      <div class="tk__fact">
        <dt>Perkiraan giliran</dt>
        <dd data-v="clock">${ticket.status === "WAITING" ? etaClock : SC.fmt.clock(ticket.startedAt || ticket.createdAt)}</dd>
      </div>
    </dl>`;
  }

  function around(ticket) {
    const all = SC.queue
      .byStatus("WAITING")
      .concat(SC.queue.byStatus("PROCESSING"), SC.queue.byStatus("READY"), SC.queue.byStatus("COMPLETED"), SC.queue.byStatus("CANCELLED"))
      .sort((a, b) => a.seq - b.seq);
    const index = all.findIndex((item) => item.id === ticket.id);
    const window = all.slice(Math.max(0, index - 4), index + 4);
    return window
      .map((item) =>
        SC.parts.queueRow(item, { mine: item.id === ticket.id })
      )
      .join("");
  }

  function timeline(ticket) {
    const steps = [
      { key: "created", label: "Diterbitkan", at: ticket.createdAt, done: true },
      { key: "started", label: "Disiapkan", at: ticket.startedAt, done: Boolean(ticket.startedAt) },
      { key: "ready", label: "Siap", at: ticket.readyAt, done: Boolean(ticket.readyAt) },
      { key: "done", label: "Selesai", at: ticket.completedAt, done: Boolean(ticket.completedAt) },
    ];
    let active = false;
    return steps
      .map((step) => {
        let state = "wait";
        if (step.done) state = "done";
        else if (!active) {
          state = "now";
          active = true;
        }
        return `<div class="tl__step" data-state="${state}">
          <span>${esc(step.label)}</span>
          <b>${step.at != null ? SC.fmt.clock(step.at) : "—"}</b>
        </div>`;
      })
      .join("");
  }

  views.ticket = function ticketView(ctx) {
    const requested = ctx.params.id ? SC.queue.byId(ctx.params.id) : SC.queue.mine(false)[0] || null;
    const ticket = requested;

    if (!ticket) {
      const el = SC.dom.html(`<div class="shell">
        <header class="page__head">
          <p class="eyebrow">Tiket antrean</p>
          <h1 class="page__title">Belum ada tiket aktif</h1>
          <p class="page__sub">Ambil nomor dari halaman menu. Tiket yang sedang berjalan akan muncul di sini lengkap dengan posisi dan estimasinya.</p>
        </header>
        <div class="empty">
          <p class="empty__title">Tidak ada antrean berjalan</p>
          <p>Tiket aktif perangkat ini akan ditampilkan pada halaman ini, sedangkan tiket lama tersimpan di riwayat.</p>
          <div class="hero__cta hero__cta--center">
            <a class="btn btn--solid" href="#/menu">Pilih menu</a>
            <a class="btn btn--line" href="#/aktivitas">Lihat riwayat</a>
          </div>
        </div>
      </div>`);
      return { name: "tiket-kosong", title: "Tiket — QuickBite", announce: "Tidak ada tiket aktif", el };
    }

    const el = SC.dom.html(`<div class="shell">
      <div class="tk">
        <section class="tk__board" data-rise>
          <p class="tk__label">nomor antrean kamu</p>
          <div data-flap></div>
          <div class="tk__under">
            <span class="chip" data-tone="wait" data-v="chip">MENUNGGU</span>
            <span class="chip" data-v="around-count">0 tiket lain aktif</span>
          </div>
        </section>
        <div data-notice data-rise></div>
        ${facts(ticket)}
        <div class="grid2">
          <section class="panel" data-rise>
            <div class="panel__head">
              <div>
                <h2 class="panel__title">Papan sekitar kamu</h2>
                <p class="panel__hint">Urutan FIFO berjalan satu arah. Nomor di atasmu diselesaikan lebih dulu.</p>
              </div>
              <span class="tag" data-v="clock-tag">${esc(SC.fmt.clock(SC.queue.minutesOfDay()))}</span>
            </div>
            <ol data-around></ol>
            <div class="panel__body">
              <button type="button" class="btn btn--line btn--wide" data-advance>Simulasikan antrean berjalan</button>
              <p class="hintline"><span>kontrol demo</span><b>satu klik = dapur menyelesaikan satu pesanan</b></p>
            </div>
          </section>
          <div class="stack">
            <section class="panel" data-rise>
              <div class="panel__head">
                <div>
                  <h2 class="panel__title">Rincian pesanan</h2>
                  <p class="panel__hint">${ticket.items.length} baris menu &middot; waktu layan total ${SC.fmt.minutes(ticket.service)}</p>
                </div>
              </div>
              <dl class="mini panel__body">
                ${ticket.items
                  .map(
                    (item) => `<div class="mini__row"><dt>${item.qty}× ${esc(item.name)}</dt><dd>± ${SC.fmt.minutes(item.serviceTotal)}</dd></div>`
                  )
                  .join("")}
              </dl>
            </section>
            <section class="tl" data-tl data-rise>${timeline(ticket)}</section>
            <div class="stack stack--sm" data-actions data-rise></div>
          </div>
        </div>
      </div>
    </div>`);

    const flapHost = SC.dom.qs("[data-flap]", el);
    let board = SC.flap.create("A---", { className: "flap--lg flap--amber", stagger: 90 });
    let intro = true;
    flapHost.appendChild(board);

    let armed = false;
    let armTimer = 0;

    function actions() {
      const host = SC.dom.qs("[data-actions]", el);
      if (ticket.status === "WAITING") {
        host.innerHTML = `<button type="button" class="btn btn--danger btn--wide" data-cancel>Batalkan tiket</button>
          <p class="hintline"><span>pembatalan tidak bisa dibatalkan</span></p>`;
        return;
      }
      if (ticket.status === "PROCESSING") {
        host.innerHTML = `<button type="button" class="btn btn--danger btn--wide" data-cancel>Batalkan tiket</button>`;
        return;
      }
      if (ticket.status === "READY") {
        host.innerHTML = `<button type="button" class="btn btn--solid btn--wide" data-take>Tandai sudah diambil</button>
          <a class="btn btn--line btn--wide" href="#/menu">Tambah pesanan lain</a>`;
        return;
      }
      const wait = ticket.startedAt != null ? ticket.startedAt - ticket.createdAt : 0;
      const kitchen = ticket.readyAt != null && ticket.startedAt != null ? ticket.readyAt - ticket.startedAt : 0;
      host.innerHTML = `<div class="panel">
          <div class="panel__body">
            <dl class="mini">
              <div class="mini__row"><dt>Menunggu giliran</dt><dd>${SC.fmt.minutes(wait)}</dd></div>
              <div class="mini__row"><dt>Dimasak di dapur</dt><dd>${SC.fmt.minutes(kitchen)}</dd></div>
              <div class="mini__row"><dt>Selesai pukul</dt><dd>${ticket.completedAt != null ? SC.fmt.clock(ticket.completedAt) : "—"}</dd></div>
            </dl>
          </div>
        </div>
        <a class="btn btn--solid btn--wide" href="#/menu">Pesan lagi</a>
        <a class="btn btn--line btn--wide" href="#/aktivitas">Buka riwayat</a>`;
    }

    function paint() {
      const current = SC.queue.byId(ticket.id);
      if (!current) return;
      const live = SC.estimator.ticketState(current);
      const notice = SC.estimator.notify(current);
      const chip = SC.dom.qs('[data-v="chip"]', el);
      if (chip) {
        chip.textContent = live.text;
        chip.dataset.tone = live.tone === "amber" ? "process" : live.tone === "mint" ? "ready" : live.tone === "coral" ? "cancel" : live.tone;
      }
      const set = (key, text) => {
        const node = SC.dom.qs(`[data-v="${key}"]`, el);
        if (node) node.textContent = text;
      };
      const position = SC.estimator.position(current);
      const wait = SC.estimator.wait(current);
      set("pos", current.status === "PROCESSING" ? "DILAYANI" : position ? `#${position}` : "—");
      set("eta", current.status === "WAITING" ? SC.fmt.eta(wait) : "tanpa tunggu");
      set("svc", `± ${SC.fmt.number(current.service)} mnt`);
      set("clock", current.status === "WAITING" ? SC.fmt.clock(SC.queue.minutesOfDay() + wait) : SC.fmt.clock(current.startedAt || current.createdAt));
      set("clock-tag", SC.fmt.clock(SC.queue.minutesOfDay()));
      set("around-count", `${Math.max(0, SC.queue.summary().activeCount - 1)} tiket lain aktif`);

      const noticeHost = SC.dom.qs("[data-notice]", el);
      if (noticeHost) {
        noticeHost.innerHTML = notice
          ? `<div class="notice" data-tone="${current.status === "READY" ? "mint" : "amber"}">
              <div>
                <p class="notice__title">${esc(live.text)}</p>
                <p class="notice__body">${esc(notice)}</p>
              </div>
            </div>`
          : "";
      }

      const aroundHost = SC.dom.qs("[data-around]", el);
      if (aroundHost) aroundHost.innerHTML = around(current);
      const tlHost = SC.dom.qs("[data-tl]", el);
      if (tlHost) tlHost.innerHTML = timeline(current);
      actions();

      if (!intro) board.set(current.number);
      document.title = current.status === "WAITING"
        ? `${current.number} · ± ${SC.fmt.number(wait)} mnt — QuickBite`
        : `${current.number} · ${live.text} — QuickBite`;
      SC.layout.announce(`${current.number} ${live.text}`);
    }

    SC.dom.on(el, "click", "[data-advance]", () => {
      SC.queue.advance();
      SC.layout.toast("Antrean maju satu langkah");
    });

    SC.dom.on(el, "click", "[data-take]", () => {
      SC.queue.take(ticket.id);
    });

    SC.dom.on(el, "click", "[data-cancel]", (event, node) => {
      if (!armed) {
        armed = true;
        node.textContent = "Tekan sekali lagi untuk batalkan";
        window.clearTimeout(armTimer);
        armTimer = window.setTimeout(() => {
          armed = false;
          if (node.isConnected) node.textContent = "Batalkan tiket";
        }, 4000);
        return;
      }
      armed = false;
      SC.queue.cancel(ticket.id);
      SC.layout.toast(`Tiket ${ticket.number} dibatalkan`);
    });

    let unsubscribe = null;

    return {
      name: "tiket",
      title: `Tiket ${ticket.number} — QuickBite`,
      announce: `Tiket ${ticket.number}`,
      el,
      mount() {
        paint();
        unsubscribe = SC.queue.subscribe(paint);
        window.setTimeout(() => {
          intro = false;
          board.set(ticket.number);
        }, 320);
      },
      destroy() {
        window.clearTimeout(armTimer);
        if (unsubscribe) unsubscribe();
      },
    };
  };
})(window.SC || (window.SC = {}));
