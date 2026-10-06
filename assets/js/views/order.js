(function (SC) {
  "use strict";

  const views = (SC.views = SC.views || {});
  const { esc } = SC.dom;

  function timeline(order) {
    const reached = new Map(order.history.map((entry) => [entry.status, entry.at]));
    const current = SC.orders.FLOW.indexOf(order.status);

    return `<ol class="tl">
      ${SC.orders.FLOW.map((status, index) => {
        const meta = SC.ui.STATUS[status];
        const at = reached.get(status);
        const state = index < current ? "done" : index === current ? "current" : "future";
        return `<li class="tl__item is-${state}" style="--i:${index}">
          <span class="tl__dot" aria-hidden="true"></span>
          <span class="tl__body">
            <strong>${esc(meta.label)}</strong>
            ${at ? `<time>${SC.fmt.clock(new Date(at))}</time>` : ""}
          </span>
        </li>`;
      }).join("")}
    </ol>`;
  }

  function queueStrip(order) {
    const position = SC.orders.position(order.id);
    if (!position) return "";
    const queued = SC.orders.board().queued;

    return `<div class="qstrip">
      <p class="qstrip__label">Posisi antrean <strong>${position.index}</strong> dari ${position.total}</p>
      <ol class="qstrip__list">
        ${queued
          .map((row, index) => `<li class="${row.id === order.id ? "is-mine" : ""}" style="--i:${index}">${esc(row.number)}</li>`)
          .join("")}
      </ol>
      <p class="qstrip__note">${
        position.index === 1
          ? "Pesananmu paling depan. Dapur akan segera memprosesnya."
          : `Dapur memproses berurutan (FIFO). ${position.index - 1} pesanan di depanmu.`
      }</p>
    </div>`;
  }

  function zone(order) {
    if (order.status === "WAITING_PAYMENT") {
      return `<div class="zone zone--waiting">
        <p class="zone__eyebrow">Belum dibayar</p>
        <p class="zone__title">Tunjukkan kode bayar ke kasir</p>
        <p class="zone__code">${esc(order.code)}</p>
        <dl class="zone__rows">
          <div><dt>Total</dt><dd>${SC.fmt.currency(order.total)}</dd></div>
          <div><dt>Metode</dt><dd>${order.method === "QRIS" ? "QRIS" : "Tunai"}</dd></div>
        </dl>
        <p class="zone__note">Nomor antrean terbit otomatis setelah kasir menerima pembayaran.</p>
        <p class="zone__demo">Mode demo: buka <a href="#/admin">panel kantin</a> untuk menerima pembayaran ini.</p>
      </div>`;
    }

    if (order.status === "QUEUED") return queueStrip(order);

    if (order.status === "PROCESSING") {
      return `<div class="zone zone--processing">
        <p class="zone__eyebrow">Nomor ${esc(order.number)}</p>
        <p class="zone__title">Pesananmu sedang disiapkan</p>
        <p class="zone__note">Dapur sedang mengerjakan pesanan ini. Tetap di sekitar kantin agar cepat diambil.</p>
      </div>`;
    }

    if (order.status === "READY") {
      return `<div class="zone zone--ready">
        <p class="zone__eyebrow">Nomor ${esc(order.number)}</p>
        <p class="zone__title">Pesanan siap diambil</p>
        <p class="zone__note">Datang ke meja pengambilan dan tunjukkan nomor ini ke petugas.</p>
      </div>`;
    }

    if (order.status === "COMPLETED") {
      return `<div class="zone zone--completed">
        <p class="zone__eyebrow">Nomor ${esc(order.number)}</p>
        <p class="zone__title">Pesanan selesai</p>
        <p class="zone__note">Terima kasih. Pesanan ditutup ${
          order.completedAt ? `pukul ${SC.fmt.clock(new Date(order.completedAt))}` : ""
        }.</p>
      </div>`;
    }

    return "";
  }

  function viewFor(order) {
    const paid = Number.isFinite(new Date(order.paidAt).getTime());

    return `<div class="track" data-reveal>
      <div class="track__topline">
        <a class="back" href="#/orders">&larr; Pesanan saya</a>
        <a class="back" href="#/queue">Layar antrean &rarr;</a>
      </div>
      <header class="track__head">
        <p class="eyebrow">Pelacakan pesanan</p>
        <p class="track__token">${esc(order.number || order.code)}</p>
        <div class="track__meta">
          ${SC.ui.statusPill(order.status)}
          <span>${esc(order.customer.name)} &middot; ${esc(order.customer.grade)}</span>
          <span>${SC.fmt.clock(new Date(order.createdAt))}</span>
        </div>
        ${order.status === "READY" ? '<span class="gostamp">siap diambil</span>' : ""}
      </header>
      <div class="track__grid">
        <section class="panel">
          <div class="block-head"><h2>Status pesanan</h2><span>7 tahap</span></div>
          ${timeline(order)}
          ${zone(order)}
        </section>
        <aside class="panel">
          <div class="block-head"><h2>Rincian</h2><span>${order.units} porsi</span></div>
          <ol class="oitems">
            ${order.items
              .map(
                (item) => `<li class="oitem">
                  <span class="oitem__qty">${item.qty}&times;</span>
                  <span class="oitem__body"><strong>${esc(item.name)}</strong>${item.note ? `<small>${esc(item.note)}</small>` : ""}</span>
                  <span class="oitem__price">${SC.fmt.currency(item.price * item.qty)}</span>
                </li>`
              )
              .join("")}
          </ol>
          <dl class="ledger-rows">
            <div><dt>Kode bayar</dt><dd>${esc(order.code)}</dd></div>
            <div><dt>Nomor antrean</dt><dd>${order.number ? esc(order.number) : "belum terbit"}</dd></div>
            <div><dt>Metode</dt><dd>${order.method === "QRIS" ? "QRIS" : "Tunai di kasir"}</dd></div>
            <div><dt>Pembayaran</dt><dd>${paid ? "Lunas" : "Belum dibayar"}</dd></div>
            <div><dt>Total</dt><dd>${SC.fmt.currency(order.total)}</dd></div>
          </dl>
        </aside>
      </div>
    </div>`;
  }

  views.order = function orderView(ctx) {
    let current = SC.orders.byId(ctx.params.id);
    let stop = null;
    let lastStatus = current ? current.status : null;

    const el = SC.dom.html('<section class="shell page"></section>');

    function paint() {
      current = SC.orders.byId(ctx.params.id);
      el.innerHTML = current
        ? viewFor(current)
        : SC.ui.empty({
            title: "Pesanan tidak ditemukan",
            note: "Nomor ini tidak tersimpan di peramban saat ini. Pastikan kamu membuka tautan pada perangkat yang sama.",
            action: { label: "Lihat papan menu", attr: 'data-link="/menu"' },
          });

      if (current) {
        if (lastStatus && lastStatus !== current.status) {
          const node = SC.dom.qs(".track__meta .st", el);
          if (node) SC.motion.pop(node);
        }
        lastStatus = current.status;
      }
      SC.motion.reveal(el);
    }

    SC.dom.on(el, "click", "[data-link]", (event, node) => {
      SC.router.go(node.dataset.link);
    });

    paint();

    return {
      name: "order",
      title: current ? `Pesanan ${current.number || current.code} — CanteenFlow AI` : "Pesanan tidak ditemukan",
      announce: current ? `Pelacakan pesanan ${current.number || current.code}` : "Pesanan tidak ditemukan",
      el,
      mount() {
        stop = SC.orders.subscribe(paint);
      },
      destroy() {
        if (stop) stop();
      },
    };
  };
})(window.SC || (window.SC = {}));
