(function (SC) {
  "use strict";

  const views = (SC.views = SC.views || {});
  const { esc } = SC.dom;

  views.cart = function cart() {
    const el = SC.dom.html(`<div>
      <div class="shell">
        <header class="page__head">
          <p class="eyebrow">Keranjang</p>
          <h1 class="page__title">Periksa pesanan sebelum kunci nomor</h1>
          <p class="page__sub">Nomor antrean baru terbit setelah pesanan dikunci. Sisa waktu layanan pesananmu ikut menentukan arus dapur.</p>
        </header>
        <div class="cartgrid">
          <section class="ticket" data-rise>
            <div class="ticket__body" data-lines></div>
            <div class="ticket__cut"></div>
            <div class="ticket__stub">
              <dl class="mini">
                <div class="mini__row"><dt>Nomor berikutnya</dt><dd data-next>A000</dd></div>
                <div class="mini__row"><dt>Posisi saat ini</dt><dd data-pos>0</dd></div>
                <div class="mini__row"><dt>Jam kantin</dt><dd data-clock>--:--</dd></div>
              </dl>
            </div>
          </section>
          <aside class="panel" data-rise>
            <div class="panel__head">
              <div>
                <h2 class="panel__title">Ringkasan layanan</h2>
                <p class="panel__hint">Waktu layan dijumlah dari tiap menu, lalu dibagi petugas paralel.</p>
              </div>
            </div>
            <div class="panel__body stack">
              <dl class="mini">
                <div class="mini__row"><dt>Total porsi</dt><dd data-count-porsi>0</dd></div>
                <div class="mini__row"><dt>Harga menu</dt><dd data-price>Rp0</dd></div>
                <div class="mini__row"><dt>Waktu layan pesanan</dt><dd data-svc>&plusmn; 0 mnt</dd></div>
                <div class="mini__row"><dt>Antrean di depan</dt><dd data-ahead>0 mnt</dd></div>
                <div class="mini__row"><dt>Perkiraan mulai diproses</dt><dd data-start>&plusmn; 0 mnt</dd></div>
              </dl>
              <p class="svcnote">Item cepat seperti minuman boleh dipisah ke tiket lain supaya pesananmu tidak menahan antrean.</p>
              <div class="stack stack--sm">
                <button type="button" class="btn btn--solid btn--wide" data-commit>Ambil nomor antrean</button>
                <button type="button" class="btn btn--ghost btn--wide" data-clear>Kosongkan keranjang</button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>`);

    const linesNode = SC.dom.qs("[data-lines]", el);

    function paint() {
      const items = SC.cart.items();
      const summary = SC.queue.summary();
      const etaNew = SC.estimator.arrivalWait();
      const ownService = SC.estimator.serviceEstimate(items) / summary.servers;

      if (!items.length) {
        linesNode.innerHTML = `<div class="empty">
          <p class="empty__title">Keranjang kosong</p>
          <p>Belum ada menu yang dipilih. Buka daftar menu untuk mulai menyusun pesanan.</p>
          <a class="btn btn--solid" href="#/menu">Buka menu</a>
        </div>`;
      } else {
        linesNode.innerHTML = items
          .map(
            (item) => `<div class="cartline">
              <div>
                <p class="cartline__name">${esc(item.product.name)}</p>
                <p class="cartline__meta">
                  <span class="cartline__svc">&plusmn; ${SC.fmt.minutes(item.service)} layan / porsi</span>
                  <span>${esc(SC.fmt.currency(item.price))} per porsi</span>
                </p>
              </div>
              <div class="cartline__side">
                <div class="stepper">
                  <button type="button" data-bump="${esc(item.id)}" data-dir="-" data-step="1" aria-label="Kurangi ${esc(item.product.name)}">&minus;</button>
                  <output>${item.qty}</output>
                  <button type="button" data-bump="${esc(item.id)}" data-step="1" aria-label="Tambah ${esc(item.product.name)}">+</button>
                </div>
                <span class="cartline__price">${esc(SC.fmt.currency(item.total))}</span>
                <button type="button" class="btn btn--ghost btn--sm" data-remove="${esc(item.id)}">hapus</button>
              </div>
            </div>`
          )
          .join("");
      }

      const set = (key, text) => {
        const node = SC.dom.qs(`[data-${key}]`, el);
        if (node) node.textContent = text;
      };
      set("next", SC.fmt.queueNumber(SC.config.prefix, summary.seq + 1));
      set("pos", items.length ? String(summary.activeCount + 1) : "0");
      set("clock", SC.fmt.clock(summary.clock));
      set("count-porsi", `${SC.cart.count()} porsi`);
      set("price", SC.fmt.currency(SC.cart.total()));
      set("svc", `± ${SC.fmt.minutes(SC.estimator.serviceEstimate(items))}`);
      set("ahead", SC.fmt.minutes(etaNew));
      set("start", items.length ? `± ${SC.fmt.minutes(etaNew)}` : "—");

      const commit = SC.dom.qs("[data-commit]", el);
      if (commit) commit.disabled = !items.length;
      const clear = SC.dom.qs("[data-clear]", el);
      if (clear) clear.disabled = !items.length;
      SC.motion.countAll(el);
    }

    SC.dom.on(el, "click", "[data-remove]", (event, node) => {
      SC.cart.remove(node.dataset.remove);
    });

    SC.dom.on(el, "click", "[data-clear]", () => {
      SC.cart.clear();
      SC.layout.toast("Keranjang dikosongkan");
    });

    SC.dom.on(el, "click", "[data-commit]", () => {
      const ticket = SC.queue.enqueue();
      if (!ticket) return;
      SC.cart.clear();
      SC.layout.toast(`Nomor ${ticket.number} terbit`);
      SC.router.go(`/tiket/${ticket.id}`);
    });

    let unsubCart = null;
    let unsubQueue = null;

    return {
      name: "keranjang",
      title: "Keranjang — QuickBite",
      announce: "Halaman keranjang",
      el,
      mount() {
        paint();
        unsubCart = SC.cart.subscribe(paint);
        unsubQueue = SC.queue.subscribe(paint);
      },
      destroy() {
        if (unsubCart) unsubCart();
        if (unsubQueue) unsubQueue();
      },
    };
  };
})(window.SC || (window.SC = {}));
