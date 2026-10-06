(function (SC) {
  "use strict";

  const views = (SC.views = SC.views || {});
  const { esc } = SC.dom;

  views.activity = function activity() {
    const el = SC.dom.html(`<div>
      <div class="shell">
        <header class="page__head">
          <p class="eyebrow">Riwayat perangkat ini</p>
          <h1 class="page__title">Semua tiket yang pernah kamu kunci</h1>
          <p class="page__sub">Catatan ini yang dipakai model untuk mengoreksi estimasi berikutnya: berapa lama menunggu, berapa lama dapur bekerja.</p>
        </header>
        <dl class="instr mt-1" data-cols="4" data-rise>
          <div class="instr__cell"><dt>Tiket hari ini</dt><dd data-v="count">0<small>nomor terbit</small></dd></div>
          <div class="instr__cell"><dt>Total tunggu</dt><dd data-v="wait">0<small>menit simulasi</small></dd></div>
          <div class="instr__cell"><dt>Total dilayani</dt><dd data-v="served">0<small>menit simulasi</small></dd></div>
          <div class="instr__cell"><dt>Rata-rata layan</dt><dd data-v="avg">—<small>per tiket selesai</small></dd></div>
        </dl>
        <section class="panel mt-1" data-rise="lift">
          <div class="panel__head">
            <div>
              <h2 class="panel__title">Daftar tiket</h2>
              <p class="panel__hint">Urut dari yang terbaru. Ketuk untuk membuka detail dan status terkini.</p>
            </div>
            <a class="btn btn--line btn--sm" href="#/menu">Tiket baru</a>
          </div>
          <div class="act" data-list></div>
        </section>
      </div>
    </div>`);

    const listNode = SC.dom.qs("[data-list]", el);

    function paint() {
      const tickets = SC.queue.mine(true).sort((a, b) => b.seq - a.seq);
      if (!tickets.length) {
        listNode.innerHTML = `<div class="empty">
          <p class="empty__title">Belum ada tiket</p>
          <p>Setelah kamu mengunci nomor, semua tiket tersimpan di sini beserta durasi layanannya.</p>
          <a class="btn btn--solid" href="#/menu">Pilih menu</a>
        </div>`;
      } else {
        listNode.innerHTML = tickets
          .map((ticket) => {
            const meta = [];
            meta.push(`terbit ${SC.fmt.clock(ticket.createdAt)}`);
            if (ticket.startedAt != null) meta.push(`dilayani ${SC.fmt.clock(ticket.startedAt)}`);
            if (ticket.completedAt != null) meta.push(`selesai ${SC.fmt.clock(ticket.completedAt)}`);
            if (ticket.cancelledAt != null) meta.push(`dibatalkan ${SC.fmt.clock(ticket.cancelledAt)}`);
            const service = ticket.readyAt != null && ticket.startedAt != null ? ticket.readyAt - ticket.startedAt : null;
            const wait = ticket.startedAt != null ? ticket.startedAt - ticket.createdAt : null;
            return `<div class="act__row${ticket.status === "WAITING" || ticket.status === "PROCESSING" || ticket.status === "READY" ? " act__row--mine" : ""}">
              <span class="act__no">${esc(ticket.number)}</span>
              <div class="act__body">
                <p class="act__items">${SC.parts.itemsSummary(ticket)}</p>
                <p class="act__meta">${esc(meta.join(" · "))}</p>
              </div>
              <div class="act__side">
                ${
                  service != null
                    ? `<span class="tag">layan ${SC.fmt.minutes(service)}</span><span class="tag">tunggu ${SC.fmt.minutes(wait)}</span>`
                    : ""
                }
                ${SC.parts.chip(ticket.status)}
                <a class="btn btn--line btn--sm" href="#/tiket/${esc(ticket.id)}">detail</a>
              </div>
            </div>`;
          })
          .join("");
      }

      const records = SC.queue.records();
      const mineRecords = records.filter((record) => tickets.some((ticket) => ticket.id === record.id));
      const wait = tickets.reduce((sum, ticket) => sum + (ticket.startedAt != null ? ticket.startedAt - ticket.createdAt : 0), 0);
      const served = tickets.reduce(
        (sum, ticket) => sum + (ticket.readyAt != null && ticket.startedAt != null ? ticket.readyAt - ticket.startedAt : 0),
        0
      );
      const set = (key, value) => {
        const node = SC.dom.qs(`[data-v="${key}"]`, el);
        if (node) node.firstChild.textContent = String(value);
      };
      set("count", tickets.length);
      set("wait", Math.round(wait));
      set("served", Math.round(served));
      set("avg", mineRecords.length ? SC.fmt.minutes(served / mineRecords.length) : "—");
    }

    let unsubscribe = null;

    return {
      name: "aktivitas",
      title: "Riwayat tiket — QuickBite",
      announce: "Halaman riwayat tiket",
      el,
      mount() {
        paint();
        unsubscribe = SC.queue.subscribe(paint);
      },
      destroy() {
        if (unsubscribe) unsubscribe();
      },
    };
  };
})(window.SC || (window.SC = {}));
