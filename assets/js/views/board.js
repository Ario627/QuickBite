(function (SC) {
  "use strict";

  const views = (SC.views = SC.views || {});
  const { esc } = SC.dom;

  function rowActions(ticket) {
    if (ticket.status === "WAITING") {
      return `<button type="button" class="btn btn--line btn--sm" data-promote="${esc(ticket.id)}">Panggil</button>
        <button type="button" class="btn btn--ghost btn--sm" data-drop="${esc(ticket.id)}">Batal</button>`;
    }
    if (ticket.status === "PROCESSING") {
      return `<button type="button" class="btn btn--line btn--sm" data-finish="${esc(ticket.id)}">Selesai</button>
        <button type="button" class="btn btn--ghost btn--sm" data-drop="${esc(ticket.id)}">Batal</button>`;
    }
    if (ticket.status === "READY") {
      return `<button type="button" class="btn btn--solid btn--sm" data-take="${esc(ticket.id)}">Diambil</button>`;
    }
    return `<span class="tag">ditutup</span>`;
  }

  views.board = function board(ctx) {
    const el = SC.dom.html(`<div>
      <div class="shell">
        <header class="page__head">
          <p class="eyebrow">Panel kantin</p>
          <h1 class="page__title">Papan antrean dapur</h1>
          <p class="page__sub">Semua tiket bergerak satu arah: menunggu, disiapkan, siap diambil, selesai. Panel ini yang menggerakkan papan siswa.</p>
        </header>
        ${SC.layout.adminNav(ctx.path)}
        <div class="pagemaintoolbar">
          <span class="chip" data-tone="wait" data-v="clock">--:--</span>
          <span class="chip" data-v="crowd">NORMAL</span>
          <span class="chip" data-v="auto">JAM OTOMATIS HIDUP</span>
          <span class="spacer"></span>
          <button type="button" class="btn btn--line btn--sm" data-auto-toggle>Matikan jam</button>
          <button type="button" class="btn btn--ghost btn--sm" data-reset>Reset hari</button>
        </div>
        <dl class="instr" data-cols="4" data-rise>
          <div class="instr__cell"><dt>Menunggu</dt><dd data-v="waiting">0<small>tiket</small></dd></div>
          <div class="instr__cell"><dt>Diproses</dt><dd data-v="processing">0<small>di dapur</small></dd></div>
          <div class="instr__cell"><dt>Siap diambil</dt><dd data-v="ready">0<small>tiket</small></dd></div>
          <div class="instr__cell"><dt>Rata-rata layan</dt><dd data-v="avg">—<small>hari ini</small></dd></div>
        </dl>
        <div class="grid2 mt-1">
          <section class="panel" data-rise>
            <div class="panel__head">
              <div>
                <h2 class="panel__title">Antrean aktif</h2>
                <p class="panel__hint">Urut kedatangan. Panggil boleh dilompati bila perlu, sisanya tetap FIFO.</p>
              </div>
              <button type="button" class="btn btn--solid btn--sm" data-call>Panggil berikutnya</button>
            </div>
            <div class="bwrap">
              <table class="btable">
                <thead>
                  <tr><th>No</th><th>Pesanan</th><th>Tunggu</th><th>Status</th><th></th></tr>
                </thead>
                <tbody data-queue></tbody>
              </table>
            </div>
            <div class="panel__body" data-closed></div>
          </section>
          <div class="stack">
            <section class="panel" data-rise>
              <div class="panel__head">
                <div>
                  <h2 class="panel__title">Sedang dilayani</h2>
                  <p class="panel__hint">Tampilan ini yang dibaca siswa dari layar.</p>
                </div>
              </div>
              <div class="panel__body tk__board" data-now>
                <div data-flap></div>
                <div class="tk__under">
                  <span class="chip" data-tone="process" data-v="now-status">—</span>
                  <span class="chip" data-v="now-detail">—</span>
                </div>
                <div class="hero__cta hero__cta--center">
                  <button type="button" class="btn btn--line btn--sm" data-finish-now>Selesaikan pesanan berjalan</button>
                  <button type="button" class="btn btn--ghost btn--sm" data-step>Maju satu langkah</button>
                </div>
              </div>
            </section>
            <section class="panel" data-rise>
              <div class="panel__head">
                <div>
                  <h2 class="panel__title">Kapasitas &amp; jam</h2>
                  <p class="panel__hint">Jumlah petugas memengaruhi estimasi semua siswa.</p>
                </div>
              </div>
              <div class="panel__body stack stack--sm">
                <div class="seg" role="group" aria-label="Jumlah petugas" data-servers>
                  <button type="button" data-server="1" aria-pressed="false">1 petugas</button>
                  <button type="button" data-server="2" aria-pressed="true">2 petugas</button>
                  <button type="button" data-server="3" aria-pressed="false">3 petugas</button>
                </div>
                <p class="svcnote">Saat ini <b data-v="server-note">2 petugas</b> bekerja paralel. Menambah petugas memotong estimasi tunggu hampir proporsional.</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>`);

    const queueNode = SC.dom.qs("[data-queue]", el);
    const closedNode = SC.dom.qs("[data-closed]", el);
    const flapHost = SC.dom.qs("[data-flap]", el);
    const board = SC.flap.create("A---", { className: "flap--amber" });
    flapHost.appendChild(board);

    let armed = false;
    let armTimer = 0;

    function rows() {
      const active = SC.queue
        .byStatus("WAITING")
        .concat(SC.queue.byStatus("PROCESSING"), SC.queue.byStatus("READY"))
        .sort((a, b) => a.seq - b.seq);
      if (!active.length) {
        return `<tr><td colspan="5"><span class="tag">antrean kosong — papan bersih</span></td></tr>`;
      }
      return active
        .map((ticket) => {
          const wait = ticket.startedAt != null ? ticket.startedAt - ticket.createdAt : SC.queue.minutesOfDay() - ticket.createdAt;
          return `<tr data-tone="${SC.config.labels[ticket.status].tone}" data-mine="${String(ticket.mine)}">
            <td class="btable__no" data-l="No">${esc(ticket.number)}</td>
            <td class="btable__items" data-l="Pesanan">${SC.parts.itemsSummary(ticket)}</td>
            <td class="btable__no" data-l="Tunggu">${SC.fmt.minutes(wait)}</td>
            <td data-l="Status">${SC.parts.chip(ticket.status)}</td>
            <td><div class="btable__act">${rowActions(ticket)}</div></td>
          </tr>`;
        })
        .join("");
    }

    function paint() {
      const summary = SC.queue.summary();
      const today = SC.analytics.today();
      const serving = SC.queue.nowServing();
      queueNode.innerHTML = rows();

      const closed = SC.queue.byStatus("COMPLETED").concat(SC.queue.byStatus("CANCELLED")).sort((a, b) => b.seq - a.seq).slice(0, 4);
      closedNode.innerHTML = closed.length
        ? `<p class="panel__hint">Terakhir ditutup</p><div class="stack stack--sm mt-05">${closed
            .map(
              (ticket) => `<div class="mini__row"><dt>${esc(ticket.number)} · ${SC.parts.itemsSummary(ticket)}</dt><dd>${esc(
                SC.config.labels[ticket.status].text
              )} ${ticket.completedAt != null ? SC.fmt.clock(ticket.completedAt) : ""}</dd></div>`
            )
            .join("")}</div>`
        : "";

      const set = (key, value, small) => {
        const node = SC.dom.qs(`[data-v="${key}"]`, el);
        if (!node) return;
        node.firstChild.textContent = String(value);
        if (small) {
          const smallNode = node.querySelector("small");
          if (smallNode) smallNode.textContent = small;
        }
      };
      set("waiting", summary.waiting.length, "tiket");
      set("processing", summary.processing.length, "di dapur");
      set("ready", summary.ready.length, "tiket");
      set("avg", SC.fmt.minutes(today.service), "hari ini");
      set("clock", SC.fmt.clock(summary.clock));
      const crowd = SC.estimator.crowd();
      set("crowd", `${crowd.label} · ETA ${SC.fmt.minutes(crowd.eta)}`);
      const autoChip = SC.dom.qs('[data-v="auto"]', el);
      if (autoChip) {
        autoChip.textContent = summary.auto ? "JAM OTOMATIS HIDUP" : "JAM OTOMATIS PAUS";
        autoChip.dataset.tone = summary.auto ? "ready" : "wait";
      }
      const toggle = SC.dom.qs("[data-auto-toggle]", el);
      if (toggle) toggle.textContent = summary.auto ? "Matikan jam" : "Hidupkan jam";
      SC.dom.qsa("[data-server]", el).forEach((button) => {
        button.setAttribute("aria-pressed", String(Number(button.dataset.server) === summary.servers));
      });
      set("server-note", `${summary.servers} petugas`);

      const nowStatus = SC.dom.qs('[data-v="now-status"]', el);
      const nowDetail = SC.dom.qs('[data-v="now-detail"]', el);
      if (serving) {
        board.set(serving.number);
        if (nowStatus) {
          nowStatus.textContent = SC.config.labels[serving.status].text;
          nowStatus.dataset.tone = SC.config.labels[serving.status].tone;
        }
        if (nowDetail) {
          nowDetail.textContent = `${serving.mine ? "milikku · " : ""}${SC.parts.itemsSummary(serving)}`;
        }
      } else {
        board.set("A---");
        if (nowStatus) {
          nowStatus.textContent = "TIDAK ADA";
          nowStatus.dataset.tone = "wait";
        }
        if (nowDetail) nowDetail.textContent = "antrean bersih";
      }
    }

    SC.dom.on(el, "click", "[data-call]", () => {
      const ticket = SC.queue.callNext();
      if (ticket) SC.layout.toast(`${ticket.number} mulai diproses`);
    });

    SC.dom.on(el, "click", "[data-promote]", (event, node) => {
      const ticket = SC.queue.promote(node.dataset.promote);
      if (ticket) SC.layout.toast(`${ticket.number} dipanggil lebih dulu`);
    });

    SC.dom.on(el, "click", "[data-finish]", (event, node) => {
      SC.queue.complete(node.dataset.finish);
    });

    SC.dom.on(el, "click", "[data-take]", (event, node) => {
      SC.queue.take(node.dataset.take);
    });

    SC.dom.on(el, "click", "[data-drop]", (event, node) => {
      SC.queue.cancel(node.dataset.drop);
    });

    SC.dom.on(el, "click", "[data-finish-now]", () => {
      const serving = SC.queue.byStatus("PROCESSING")[0];
      if (serving) SC.queue.complete(serving.id);
    });

    SC.dom.on(el, "click", "[data-step]", () => {
      SC.queue.advance();
    });

    SC.dom.on(el, "click", "[data-server]", (event, node) => {
      SC.queue.setServers(Number(node.dataset.server));
    });

    SC.dom.on(el, "click", "[data-auto-toggle]", () => {
      const auto = SC.queue.setAuto(!SC.queue.summary().auto);
      SC.layout.toast(auto ? "Jam otomatis hidup" : "Jam otomatis dijeda");
    });

    SC.dom.on(el, "click", "[data-reset]", (event, node) => {
      if (!armed) {
        armed = true;
        node.textContent = "Tekan sekali lagi";
        window.clearTimeout(armTimer);
        armTimer = window.setTimeout(() => {
          armed = false;
          if (node.isConnected) node.textContent = "Reset hari";
        }, 4000);
        return;
      }
      armed = false;
      SC.queue.reset();
      SC.layout.toast("Papan direset ke kondisi awal hari");
    });

    let unsubscribe = null;

    return {
      name: "papan",
      title: "Papan antrean — QuickBite",
      announce: "Papan antrean kantin",
      el,
      mount() {
        paint();
        unsubscribe = SC.queue.subscribe(paint);
      },
      destroy() {
        window.clearTimeout(armTimer);
        if (unsubscribe) unsubscribe();
      },
    };
  };
})(window.SC || (window.SC = {}));
