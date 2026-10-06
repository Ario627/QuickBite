(function (SC) {
  "use strict";

  const views = (SC.views = SC.views || {});
  const { esc, qs } = SC.dom;

  function since(iso) {
    const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    return minutes < 1 ? "baru saja" : `${SC.fmt.number(minutes)} mnt lalu`;
  }

  function itemsPreview(order) {
    const merged = new Map();
    order.items.forEach((item) => {
      merged.set(item.name, (merged.get(item.name) || 0) + item.qty);
    });
    return Array.from(merged.entries())
      .map(([name, qty]) => `${qty}× ${name}`)
      .join(" · ");
  }

  function paymentTicket(order, index) {
    return `<li class="pt" style="--i:${index}">
      <div class="pt__head">
        <p class="pt__code">${esc(order.code)}</p>
        <span class="pt__method">${order.method === "QRIS" ? "QRIS" : "tunai"}</span>
      </div>
      <p class="pt__meta">${esc(order.customer.name)} &middot; ${esc(order.customer.grade)} &middot; ${since(order.createdAt)}</p>
      <p class="pt__items">${esc(itemsPreview(order))}</p>
      <div class="pt__foot">
        <span class="pt__total">${SC.fmt.currency(order.total)}</span>
        <button class="btn btn--solid" type="button" data-accept="${esc(order.id)}">Terima pembayaran</button>
      </div>
    </li>`;
  }

  function kitchenTicket(order, isFront, index) {
    const meta = SC.ui.STATUS[order.status];
    let action = "";
    let hint = "";

    if (order.status === "QUEUED") {
      if (isFront) {
        action = `<button class="btn btn--solid" type="button" data-start="${esc(order.id)}">Mulai proses</button>`;
        hint = `<span class="kt__hint">giliran berikutnya</span>`;
      } else {
        action = `<button class="btn btn--line" type="button" disabled>Mulai proses</button>`;
        hint = `<span class="kt__hint kt__hint--muted">menunggu FIFO</span>`;
      }
    } else if (order.status === "PROCESSING") {
      action = `<button class="btn btn--solid" type="button" data-ready="${esc(order.id)}">Tandai siap</button>`;
    } else if (order.status === "READY") {
      action = `<button class="btn btn--line" type="button" data-done="${esc(order.id)}">Selesaikan</button>`;
    }

    const stamp = order.status === "READY" ? order.readyAt : order.queuedAt;

    return `<li class="kt kt--${meta.tone}" style="--i:${index}">
      <header class="kt__head">
        <p class="kt__num">${esc(order.number)}</p>
        <p class="kt__time">${stamp ? since(stamp) : "sedang dikerjakan"}</p>
      </header>
      <p class="kt__items">${esc(itemsPreview(order))}</p>
      <p class="kt__meta">${esc(order.customer.name)} &middot; ${esc(order.customer.grade)}${order.items.some((item) => item.note) ? " &middot; ada catatan" : ""}</p>
      <footer class="kt__foot">${hint}<span class="kt__total">${SC.fmt.currency(order.total)}</span>${action}</footer>
    </li>`;
  }

  function completedRow(order, index) {
    return `<li class="lrow lrow--done" style="--d:${index * 40}ms">
      <span class="lrow__token">${esc(order.number)}</span>
      <span class="lrow__body">
        <span class="lrow__top"><time>${order.completedAt ? SC.fmt.clock(new Date(order.completedAt)) : "-"}</time></span>
        <span class="lrow__items">${esc(order.customer.name)} &middot; ${esc(order.customer.grade)}</span>
      </span>
      <span class="lrow__go">${SC.fmt.currency(order.total)}</span>
    </li>`;
  }

  views.admin = function adminView() {
    let stop = null;
    let clockTimer = 0;

    const el = SC.dom.html('<div class="kit"></div>');

    function metricsMarkup(board, today, paid, revenue) {
      return `<div class="mstrip">
        <article class="metric">
          <p class="metric__label">Pesanan hari ini</p>
          <p class="metric__value" data-count="${today.length}">${SC.fmt.number(today.length)}</p>
          <p class="metric__note">${SC.fmt.number(paid.length)} sudah dibayar</p>
        </article>
        <article class="metric">
          <p class="metric__label">Menunggu bayar</p>
          <p class="metric__value" data-count="${board.waiting.length}">${SC.fmt.number(board.waiting.length)}</p>
          <p class="metric__note">di kasir</p>
        </article>
        <article class="metric">
          <p class="metric__label">Di dapur</p>
          <p class="metric__value" data-count="${board.queued.length + board.processing.length}">${SC.fmt.number(board.queued.length + board.processing.length)}</p>
          <p class="metric__note">${board.queued.length} antre &middot; ${board.processing.length} disiapkan</p>
        </article>
        <article class="metric">
          <p class="metric__label">Siap diambil</p>
          <p class="metric__value" data-count="${board.ready.length}">${SC.fmt.number(board.ready.length)}</p>
          <p class="metric__note">menunggu diambil</p>
        </article>
        <article class="metric metric--money">
          <p class="metric__label">Pendapatan lunas</p>
          <p class="metric__value">${SC.fmt.currency(revenue)}</p>
          <p class="metric__note">dari ${SC.fmt.number(paid.length)} transaksi</p>
        </article>
      </div>`;
    }

    function paint() {
      const board = SC.orders.board();
      const today = SC.orders.today();
      const paid = today.filter((order) => order.paidAt);
      const revenue = paid.reduce((total, order) => total + order.total, 0);
      const completed = today
        .filter((order) => order.status === "COMPLETED")
        .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));
      const front = board.queued[0] || null;
      const dateLabel = new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date());

      el.innerHTML = `<header class="kit__head">
          <div data-reveal>
            <p class="eyebrow">Panel kantin / kasir &amp; dapur</p>
            <h1 class="kit__title">Operasional hari ini</h1>
            <p class="kit__lead">Terima pembayaran di kasir, lalu jalankan dapur berurutan lewat kolom antrean FIFO.</p>
          </div>
          <div class="kit__side">
            <p class="kit__date">${esc(dateLabel)}</p>
            <time class="kit__clock" data-admin-clock>${SC.fmt.clock(new Date())}</time>
            <a class="btn btn--line" href="#/queue">Buka layar antrean</a>
          </div>
        </header>
        ${metricsMarkup(board, today, paid, revenue)}
        <section class="panel" data-reveal>
          ${SC.ui.sectionHead({
            eyebrow: "Kasir",
            title: "Konfirmasi pembayaran",
            hint: "Cocokkan kode bayar, terima QRIS atau tunai, nomor antrean terbit otomatis.",
          })}
          ${
            board.waiting.length
              ? `<ol class="paystack">${board.waiting.map(paymentTicket).join("")}</ol>`
              : '<p class="panel__empty">Tidak ada pembayaran yang menunggu.</p>'
          }
        </section>
        <section class="panel" data-reveal>
          ${SC.ui.sectionHead({
            eyebrow: "Dapur",
            title: "Jalur FIFO",
            hint: front ? `Diproses berurutan. Giliran berikutnya ${front.number}.` : "Antrean sedang kosong.",
          })}
          <div class="kan">
            <section class="kan__col">
              <header class="kan__head"><h3>Antrean</h3><span>${String(board.queued.length).padStart(2, "0")}</span></header>
              ${
                board.queued.length
                  ? `<ol class="kan__list">${board.queued.map((order, index) => kitchenTicket(order, front && order.id === front.id, index)).join("")}</ol>`
                  : '<p class="panel__empty">Tidak ada pesanan mengantre.</p>'
              }
            </section>
            <section class="kan__col">
              <header class="kan__head"><h3>Dapur</h3><span>${String(board.processing.length).padStart(2, "0")}</span></header>
              ${
                board.processing.length
                  ? `<ol class="kan__list">${board.processing.map((order, index) => kitchenTicket(order, false, index)).join("")}</ol>`
                  : '<p class="panel__empty">Dapur sedang kosong.</p>'
              }
            </section>
            <section class="kan__col">
              <header class="kan__head"><h3>Siap diambil</h3><span>${String(board.ready.length).padStart(2, "0")}</span></header>
              ${
                board.ready.length
                  ? `<ol class="kan__list">${board.ready.map((order, index) => kitchenTicket(order, false, index)).join("")}</ol>`
                  : '<p class="panel__empty">Belum ada yang siap.</p>'
              }
            </section>
          </div>
        </section>
        <section class="panel" data-reveal>
          ${SC.ui.sectionHead({
            eyebrow: "Riwayat",
            title: "Selesai hari ini",
            hint: completed.length ? `${SC.fmt.number(completed.length)} pesanan ditutup` : "",
          })}
          ${
            completed.length
              ? `<ol class="ledger">${completed.map(completedRow).join("")}</ol>`
              : '<p class="panel__empty">Belum ada pesanan selesai hari ini.</p>'
          }
        </section>
        <footer class="kit__note"><span>CanteenFlow AI / panel kantin</span><span>Data tersimpan di peramban ini</span></footer>`;

      SC.motion.reveal(el);
      SC.motion.countAll(el);
    }

    SC.dom.on(el, "click", "[data-accept]", (event, node) => {
      const order = SC.orders.confirmPayment(node.dataset.accept);
      if (order) SC.layout.toast(`Pembayaran ${order.code} diterima · nomor ${order.number}`);
      else SC.layout.toast("Pembayaran tidak dapat dikonfirmasi");
    });

    SC.dom.on(el, "click", "[data-start]", (event, node) => {
      const result = SC.orders.startProcessing(node.dataset.start);
      if (result.error) SC.layout.toast(result.error);
      else SC.layout.toast(`${result.order.number} mulai diproses`);
    });

    SC.dom.on(el, "click", "[data-ready]", (event, node) => {
      const result = SC.orders.markReady(node.dataset.ready);
      if (result.error) SC.layout.toast(result.error);
      else SC.layout.toast(`${result.order.number} siap diambil`);
    });

    SC.dom.on(el, "click", "[data-done]", (event, node) => {
      const result = SC.orders.complete(node.dataset.done);
      if (result.error) SC.layout.toast(result.error);
      else SC.layout.toast(`${result.order.number} selesai`);
    });

    return {
      name: "admin",
      title: "Panel kantin — CanteenFlow AI",
      announce: "Panel kantin",
      el,
      mount() {
        paint();
        stop = SC.orders.subscribe(() => {
          paint();
        });
        clockTimer = window.setInterval(() => {
          const clock = qs("[data-admin-clock]", el);
          if (clock) clock.textContent = SC.fmt.clock(new Date());
        }, 30000);
      },
      destroy() {
        if (stop) stop();
        window.clearInterval(clockTimer);
      },
    };
  };
})(window.SC || (window.SC = {}));
