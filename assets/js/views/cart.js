(function (SC) {
  "use strict";

  const views = (SC.views = SC.views || {});
  const { esc, qs } = SC.dom;

  function lineMarkup(line, index) {
    const item = SC.data.byId(line.productId);
    const total = item.price * line.qty;
    return `<li class="rline" style="--d:${index * 45}ms">
      <span class="rline__qty">${line.qty}&times;</span>
      <span class="rline__body">
        <a class="rline__name" href="#/menu/${esc(item.id)}">${esc(item.name)}</a>
        <span class="rline__meta">${SC.fmt.currency(item.price)} per porsi${line.note ? ` · catatan: ${esc(line.note)}` : ""}</span>
      </span>
      <span class="rline__sum">${SC.fmt.currency(total)}</span>
      <span class="rline__act">
        <span class="stepper stepper--mini">
          <button type="button" data-bump="-1" data-key="${esc(line.key)}" aria-label="Kurangi ${esc(item.name)}">&minus;</button>
          <span>${line.qty}</span>
          <button type="button" data-bump="1" data-key="${esc(line.key)}" aria-label="Tambah ${esc(item.name)}">+</button>
        </span>
        <button type="button" class="rline__del" data-remove="${esc(line.key)}">hapus</button>
      </span>
    </li>`;
  }

  function receiptMarkup(lines) {
    const units = SC.cart.count();
    const subtotal = SC.cart.subtotal();
    return `<div class="receipt" data-reveal>
      <header class="receipt__head">
        <p class="receipt__brand">CanteenFlow AI &middot; kantin sekolah</p>
        <p class="receipt__title">Struk pesanan</p>
        <p class="receipt__meta">${SC.fmt.number(lines.length)} jenis · ${SC.fmt.number(units)} porsi · ${SC.fmt.clock(new Date())}</p>
      </header>
      <ol class="receipt__lines">${lines.map(lineMarkup).join("")}</ol>
      <dl class="receipt__totals">
        <div><dt>Subtotal</dt><dd>${SC.fmt.currency(subtotal)}</dd></div>
        <div><dt>Biaya layanan</dt><dd>tidak ada</dd></div>
      </dl>
      <p class="receipt__grand"><span>Total</span><strong>${SC.fmt.currency(subtotal)}</strong></p>
      <div class="receipt__actions">
        <a class="btn btn--solid btn--wide" href="#/checkout">Konfirmasi pesanan</a>
        <button type="button" class="receipt__clear" data-clear>Kosongkan</button>
      </div>
      <p class="receipt__note">Nomor antrean terbit setelah kasir menerima pembayaran. Simpan kode bayar yang muncul di langkah berikutnya.</p>
    </div>`;
  }

  function upsellMarkup() {
    const recs = SC.recommend.forCart(SC.cart.lines(), 3);
    if (!recs.length) return "";
    return `<aside class="cart__upsell" data-reveal>
      <p class="eyebrow">Rekomendasi AI</p>
      <h2 class="cart__upsell-title">Sering ditambahkan</h2>
      ${SC.ui.recList(recs)}
    </aside>`;
  }

  views.cart = function cart() {
    let armed = false;
    let armTimer = 0;
    let stop = null;

    const el = SC.dom.html('<section class="shell page cartpage"></section>');

    function paint() {
      const lines = SC.cart.lines();

      if (!lines.length) {
        el.innerHTML = `
          <header class="page-head" data-reveal>
            <p class="eyebrow">02 / Keranjang</p>
            <h1 class="page-head__title">Keranjang</h1>
          </header>
          ${SC.ui.empty({
            title: "Keranjang masih kosong",
            note: "Pilih menu lebih dulu, lalu atur jumlah porsi di halaman ini.",
            action: { label: "Buka papan menu", attr: 'data-link="/menu"' },
          })}`;
        SC.ui.syncFeet(el);
        return;
      }

      el.innerHTML = `
        <header class="cart__head" data-reveal>
          <p class="eyebrow">02 / Keranjang</p>
          <h1 class="cart__title">Periksa sebelum bayar</h1>
          <p class="cart__lead">Ubah jumlah porsi lewat tombol pada struk. Catatan dapur ikut tercetak di tiket pesanan.</p>
        </header>
        <div class="cart__grid">
          <div>${receiptMarkup(lines)}</div>
          ${upsellMarkup()}
        </div>`;
      SC.ui.syncFeet(el);
      SC.motion.reveal(el);
    }

    function disarm() {
      armed = false;
      window.clearTimeout(armTimer);
      const button = qs("[data-clear]", el);
      if (button) button.textContent = "Kosongkan";
    }

    SC.dom.on(el, "click", "[data-remove]", (event, node) => {
      const item = SC.cart.lines().find((line) => line.key === node.dataset.remove);
      const product = item ? SC.data.byId(item.productId) : null;
      SC.cart.remove(node.dataset.remove);
      if (product) SC.layout.toast(`${product.name} dihapus dari keranjang`);
    });

    SC.dom.on(el, "click", "[data-clear]", () => {
      if (!armed) {
        armed = true;
        qs("[data-clear]", el).textContent = "Tekan lagi untuk mengosongkan";
        armTimer = window.setTimeout(disarm, 3200);
        return;
      }
      SC.cart.clear();
      disarm();
      SC.layout.toast("Keranjang dikosongkan");
    });

    SC.dom.on(el, "click", "[data-link]", (event, node) => {
      SC.router.go(node.dataset.link);
    });

    return {
      name: "cart",
      title: "Keranjang — CanteenFlow AI",
      announce: "Halaman keranjang",
      el,
      mount() {
        paint();
        stop = SC.cart.subscribe(() => {
          if (armed) disarm();
          paint();
        });
      },
      destroy() {
        if (stop) stop();
        window.clearTimeout(armTimer);
      },
    };
  };
})(window.SC || (window.SC = {}));
