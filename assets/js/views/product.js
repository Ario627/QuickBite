(function (SC) {
  "use strict";

  const views = (SC.views = SC.views || {});
  const { esc, qs, replace } = SC.dom;

  views.product = function product(ctx) {
    const item = SC.data.byId(ctx.params.id);
    if (!item) return views.notFound(ctx);

    const category = SC.data.categoryOf(item.category);
    const recs = SC.recommend.forProduct(item.id, 3);
    const related = SC.data
      .list({ category: item.category, sort: "populer" })
      .filter((candidate) => candidate.id !== item.id)
      .slice(0, 4);

    let qty = 1;

    const el = SC.dom.html(`<div data-product>
      <section class="shell page pd">
        <div class="pd__grid">
          <div class="pd__plate" data-reveal>
            ${SC.ui.art(item)}
            <dl class="pd__facts">
              <div><dt>Kode menu</dt><dd>${esc(SC.data.code(item.id))}</dd></div>
              <div><dt>Kategori</dt><dd>${esc(category.label)}</dd></div>
              <div><dt>Terjual</dt><dd>${SC.fmt.number(item.sold)} porsi</dd></div>
              <div><dt>Status</dt><dd>${item.available ? "tersedia" : "habis hari ini"}</dd></div>
            </dl>
          </div>
          <div class="pd__main" data-reveal>
            <a class="back" href="#/menu">&larr; Papan menu</a>
            <h1 class="pd__title">${esc(item.name)}</h1>
            <p class="pd__price" data-price>${SC.fmt.currency(item.price)}</p>
            <p class="pd__desc">${esc(item.description)}</p>
            ${
              item.available
                ? ""
                : `<p class="notice">Menu ini habis hari ini. Pengelola biasanya menambah stok di jam istirahat berikutnya.</p>`
            }
            <div class="pd__buy">
              <span class="stepper stepper--lg">
                <button type="button" data-qty="-1" aria-label="Kurangi jumlah">&minus;</button>
                <span data-qty-value>1</span>
                <button type="button" data-qty="1" aria-label="Tambah jumlah">+</button>
              </span>
              <button class="btn btn--solid btn--wide" type="button" data-submit${item.available ? "" : " disabled"} data-submit-label>
                Tambahkan &middot; ${SC.fmt.currency(item.price)}
              </button>
            </div>
            <div class="pd__note">
              <label class="field-label" for="note">Catatan untuk dapur</label>
              <textarea class="field" id="note" maxlength="${SC.cart.NOTE_LIMIT}" rows="2" placeholder="Contoh: tanpa sayur, sambal dipisah" data-note></textarea>
              <p class="pd__note-meta"><span>Opsional</span><span><span data-note-count>0</span>/${SC.cart.NOTE_LIMIT}</span></p>
            </div>
          </div>
        </div>
      </section>

      ${
        recs.length
          ? `<section class="band band--paper">
              <div class="shell">
                ${SC.ui.sectionHead({
                  eyebrow: "Rekomendasi AI",
                  title: "Sering dibeli bersama",
                  hint: "Dihitung dari co-occurrence pada data transaksi kantin.",
                })}
                ${SC.ui.recList(recs)}
              </div>
            </section>`
          : ""
      }

      ${
        related.length
          ? `<section class="band">
              <div class="shell">
                ${SC.ui.sectionHead({
                  eyebrow: "Kategori " + category.label.toLowerCase(),
                  title: "Menu lain di kategori ini",
                  action: { path: "/menu", label: "Semua menu" },
                })}
                <ol class="mrows mrows--board" data-reveal>${SC.ui.menuRows(related)}</ol>
              </div>
            </section>`
          : ""
      }
    </div>`);

    const qtyValue = qs("[data-qty-value]", el);
    const priceNode = qs("[data-price]", el);
    const submit = qs("[data-submit]", el);
    const note = qs("[data-note]", el);
    const noteCount = qs("[data-note-count]", el);

    function paint() {
      qtyValue.textContent = String(qty);
      replace(priceNode, SC.fmt.currency(item.price * qty));
      if (submit) {
        replace(submit, `Tambahkan &middot; ${SC.fmt.currency(item.price * qty)}`);
      }
    }

    SC.dom.on(el, "click", "[data-qty]", (event, node) => {
      qty = SC.fmt.clamp(qty + Number(node.dataset.qty), 1, SC.cart.MAX_QTY);
      paint();
      SC.motion.pop(qtyValue);
    });

    SC.dom.on(el, "input", "[data-note]", () => {
      noteCount.textContent = String(note.value.length);
    });

    SC.dom.on(el, "click", "[data-submit]", () => {
      const key = SC.cart.add(item.id, { note: note.value, qty });
      if (!key) return;
      note.value = "";
      noteCount.textContent = "0";
      qty = 1;
      paint();
      SC.layout.toast(`${item.name} ditambahkan ke keranjang`);
    });

    return {
      name: "product",
      title: `${item.name} — CanteenFlow AI`,
      announce: `Detail menu ${item.name}`,
      el,
    };
  };
})(window.SC || (window.SC = {}));
