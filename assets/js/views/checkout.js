(function (SC) {
  "use strict";

  const views = (SC.views = SC.views || {});
  const { esc, qs } = SC.dom;

  const METHODS = [
    { id: "QRIS", title: "QRIS", desc: "Kode QR muncul di tiket, kasir memindainya." },
    { id: "CASH", title: "Tunai", desc: "Bayar uang tunai di kasir, kembalian disiapkan." },
  ];

  function methodNote(method) {
    return method === "QRIS"
      ? `<div class="pnote">
          <p class="pnote__label">QRIS</p>
          <p class="pnote__title">Kasir memindai kode dari tiketmu</p>
          <p class="pnote__body">Tiket berisi kode bayar dan QR simulasi. Tunjukkan ke kasir, tunggu konfirmasi pembayaran, nomor antrean langsung terbit.</p>
        </div>`
      : `<div class="pnote pnote--cash">
          <p class="pnote__label">Tunai</p>
          <p class="pnote__title">Siapkan uang pas di kasir</p>
          <p class="pnote__body">Kode bayar tetap diterbitkan. Kasir mencatat pembayaran, lalu menerbitkan nomor antreanmu dalam satu langkah.</p>
        </div>`;
  }

  function summaryMarkup(status) {
    const lines = SC.cart.lines();
    const subtotal = SC.cart.subtotal();
    const busy = status === "processing";

    return `<aside class="co__sum">
      <h2 class="co__sum-title">Tiket pesanan</h2>
      <ol class="co__sum-lines">
        ${lines
          .map((line) => {
            const item = SC.data.byId(line.productId);
            if (!item) return "";
            return `<li><span><em>${line.qty}&times;</em>${esc(item.name)}</span><span>${SC.fmt.currency(item.price * line.qty)}</span></li>`;
          })
          .join("")}
      </ol>
      <dl class="co__sum-rows">
        <div><dt>Total porsi</dt><dd>${SC.fmt.number(SC.cart.count())}</dd></div>
        <div><dt>Subtotal</dt><dd>${SC.fmt.currency(subtotal)}</dd></div>
      </dl>
      <p class="co__sum-grand"><span>Total</span><strong>${SC.fmt.currency(subtotal)}</strong></p>
      <button class="btn btn--solid btn--wide" type="submit"${busy ? " disabled" : ""}>
        ${busy ? "Menerbitkan kode bayar" : "Konfirmasi pesanan"}
      </button>
      <p class="co__sum-note">Pembayaran dilakukan di kasir. Nomor antrean terbit setelah kasir mengonfirmasi.</p>
    </aside>`;
  }

  function claimMarkup(order) {
    const qris = order.method === "QRIS";
    const payload = `CANTEENFLOW|${order.code}|${order.total}`;
    const code = SC.qr.svg(payload, { label: `Kode pembayaran ${order.code}` });

    return `<section class="shell">
      <div class="claim" data-reveal>
        <p class="claim__stamp">menunggu pembayaran</p>
        <p class="claim__label">Kode bayar</p>
        <p class="claim__code">${esc(order.code)}</p>
        <p class="claim__hint">Tunjukkan kode ini ke kasir. Nomor antrean terbit otomatis begitu pembayaran diterima.</p>
        <div class="claim__perf" aria-hidden="true"></div>
        <dl class="claim__rows">
          <div><dt>Nama</dt><dd>${esc(order.customer.name)} &middot; ${esc(order.customer.grade)}</dd></div>
          <div><dt>Metode</dt><dd>${qris ? "QRIS" : "Tunai"}</dd></div>
          <div><dt>Waktu</dt><dd>${SC.fmt.clock(new Date(order.createdAt))}</dd></div>
          <div><dt>Total</dt><dd>${SC.fmt.currency(order.total)}</dd></div>
        </dl>
        ${
          qris && code
            ? `<div class="claim__qr">
                <div class="claim__qr-code">${code}</div>
                <div>
                  <p class="claim__qr-label">QRIS simulasi</p>
                  <p class="claim__qr-note">Kasir memindai kode ini untuk mencocokkan pesanan dan nominal sebelum menerima pembayaran.</p>
                </div>
              </div>`
            : ""
        }
        <ul class="claim__items">
          ${order.items
            .map(
              (item) =>
                `<li><span>${item.qty}&times; ${esc(item.name)}</span><span>${SC.fmt.currency(item.price * item.qty)}</span></li>`
            )
            .join("")}
        </ul>
        <div class="claim__actions">
          <a class="btn btn--solid" href="#/order/${encodeURIComponent(order.id)}">Lacak pesanan</a>
          <a class="btn btn--line" href="#/menu">Pesan lagi</a>
        </div>
        <p class="claim__demo">Mode demo: buka <a href="#/admin">panel kantin</a> untuk menerima pembayaran ini.</p>
      </div>
    </section>`;
  }

  views.checkout = function checkout() {
    const el = SC.dom.html('<section class="shell page"></section>');

    let name = "";
    let grade = "";
    let method = "QRIS";
    let status = "form";
    let fault = null;
    let order = null;
    let timer = 0;
    let stopCart = null;

    function problem() {
      if (name.trim().length < 2) return { field: "name", message: "Tulis nama minimal 2 karakter." };
      if (grade.trim().length < 1) return { field: "grade", message: "Tulis kelas atau keterangan singkat." };
      return null;
    }

    function blocksMarkup() {
      return `<div class="co__block" data-reveal>
          <div class="block-head"><h2>Data pemesan</h2><span>01</span></div>
          <div class="field-row field-row--two">
            <div>
              <label class="field-label" for="co-name">Nama</label>
              <input class="field" id="co-name" type="text" maxlength="40" autocomplete="name" placeholder="Nama panggilan" value="${esc(name)}" data-name>
              ${fault && fault.field === "name" ? `<p class="field-err">${esc(fault.message)}</p>` : ""}
            </div>
            <div>
              <label class="field-label" for="co-grade">Kelas</label>
              <input class="field" id="co-grade" type="text" maxlength="16" placeholder="Contoh: XI IPA 2" value="${esc(grade)}" data-grade>
              ${fault && fault.field === "grade" ? `<p class="field-err">${esc(fault.message)}</p>` : ""}
            </div>
          </div>
        </div>

        <div class="co__block" data-reveal>
          <div class="block-head"><h2>Metode pembayaran</h2><span>02</span></div>
          <div class="pchoices">
            ${METHODS.map(
              (item) => `<label class="pchoice">
                <input type="radio" name="method" value="${esc(item.id)}"${item.id === method ? " checked" : ""} data-method>
                <span class="pchoice__mark" aria-hidden="true"></span>
                <span class="pchoice__body">
                  <span class="pchoice__title">${esc(item.title)}</span>
                  <span class="pchoice__desc">${esc(item.desc)}</span>
                </span>
              </label>`
            ).join("")}
          </div>
          ${methodNote(method)}
        </div>`;
    }

    function paint() {
      if (status === "done" && order) {
        el.innerHTML = claimMarkup(order);
        SC.motion.reveal(el);
        return;
      }

      if (!SC.cart.lines().length) {
        el.innerHTML = `
          <header class="page-head" data-reveal>
            <p class="eyebrow">03 / Konfirmasi</p>
            <h1 class="page-head__title">Konfirmasi pesanan</h1>
          </header>
          ${SC.ui.empty({
            title: "Belum ada pesanan",
            note: "Keranjang kosong, jadi konfirmasi belum bisa dijalankan. Pilih menu lebih dulu.",
            action: { label: "Buka papan menu", attr: 'data-link="/menu"' },
          })}`;
        SC.motion.reveal(el);
        return;
      }

      el.innerHTML = `
        <header class="co__head" data-reveal>
          <p class="eyebrow">03 / Konfirmasi</p>
          <h1 class="co__title">Konfirmasi pesanan</h1>
          <p class="co__lead">Isi data pengambilan dan pilih metode pembayaran. Kode bayar terbit setelah konfirmasi.</p>
        </header>
        <form class="co__grid" data-form novalidate>
          <div class="co__main">${blocksMarkup()}</div>
          ${summaryMarkup(status)}
        </form>`;
      SC.motion.reveal(el);
    }

    function start() {
      if (status !== "form") return;
      const issue = problem();
      if (issue) {
        fault = issue;
        paint();
        const field = qs(`[data-${issue.field}]`, el);
        if (field) field.focus();
        return;
      }
      fault = null;
      status = "processing";
      paint();
      timer = window.setTimeout(commit, 620);
    }

    function commit() {
      const lines = SC.cart.lines();
      if (!lines.length) return;

      order = SC.orders.create({
        customer: { name: name.trim(), grade: grade.trim() },
        items: lines.map((line) => {
          const item = SC.data.byId(line.productId);
          return {
            productId: line.productId,
            name: item ? item.name : "",
            price: item ? item.price : 0,
            qty: line.qty,
            note: line.note,
          };
        }),
        method,
      });

      status = "done";
      paint();
      SC.cart.clear();
      SC.layout.announce(`Pesanan ${order.code} dibuat, menunggu pembayaran di kasir`);
      window.scrollTo(0, 0);
    }

    SC.dom.on(el, "input", "[data-name]", (event, node) => {
      name = node.value;
      const message = qs(".field-err", node.parentElement);
      if (message) message.remove();
    });

    SC.dom.on(el, "input", "[data-grade]", (event, node) => {
      grade = node.value;
      const message = qs(".field-err", node.parentElement);
      if (message) message.remove();
    });

    SC.dom.on(el, "change", "[data-method]", (event, node) => {
      method = node.value;
      paint();
      const next = qs(`[data-method][value="${method}"]`, el);
      if (next) next.focus();
    });

    SC.dom.on(el, "submit", "[data-form]", (event) => {
      event.preventDefault();
      start();
    });

    SC.dom.on(el, "click", "[data-link]", (event, node) => {
      SC.router.go(node.dataset.link);
    });

    return {
      name: "checkout",
      title: "Konfirmasi pesanan — CanteenFlow AI",
      announce: "Halaman konfirmasi pesanan",
      el,
      mount() {
        paint();
        stopCart = SC.cart.subscribe(() => {
          if (status === "form") paint();
        });
      },
      destroy() {
        window.clearTimeout(timer);
        if (stopCart) stopCart();
      },
    };
  };
})(window.SC || (window.SC = {}));
