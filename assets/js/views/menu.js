(function (SC) {
  "use strict";

  const views = (SC.views = SC.views || {});
  const { esc } = SC.dom;

  const SORTS = [
    { id: "populer", label: "Populer" },
    { id: "cepat", label: "Tercepat" },
    { id: "murah", label: "Termurah" },
    { id: "nama", label: "A-Z" },
  ];

  views.menu = function menu() {
    const state = { category: "semua", sort: "populer", query: "" };
    let selected = null;
    let qty = 1;

    const el = SC.dom.html(`<div>
      <div class="shell">
        <header class="page__head">
          <p class="eyebrow">Menu kantin</p>
          <h1 class="page__title">Setiap menu punya waktu layannya sendiri</h1>
          <p class="page__sub">Campuran pesanan menentukan lama dapur bekerja. Pilih menu, atur porsi, lalu kunci nomor antreanmu.</p>
        </header>
        <div class="menubar">
          <div class="menubar__row">
            <label class="search">
              <span>cari</span>
              <input type="search" placeholder="Burger, mie, es teh&hellip;" data-q autocomplete="off" />
            </label>
            <label class="pick">
              <span>urut</span>
              <select data-sort-select>
                ${SORTS.map((sort) => `<option value="${sort.id}">${esc(sort.label)}</option>`).join("")}
              </select>
            </label>
          </div>
          <div class="seg" role="group" aria-label="Kategori" data-cats>
            ${SC.data.categories
              .map(
                (category) =>
                  `<button type="button" data-cat="${esc(category.id)}" aria-pressed="${category.id === "semua"}">${esc(category.label)}</button>`
              )
              .join("")}
            <span class="tag" data-count-label></span>
          </div>
        </div>
        <ul class="menulist" data-list></ul>
        <div class="hintline">
          <span>Waktu layan = perkiraan dapur mengerjakan satu porsi.</span>
          <span>Model belajar dari pesanan selesai hari ini.</span>
        </div>
      </div>
      <div class="tray" data-tray data-open="false">
        <div class="tray__info">
          <span class="tray__count" data-tray-count>keranjang kosong</span>
          <span class="tray__svc" data-tray-svc></span>
        </div>
        <a class="btn btn--solid btn--sm" href="#/keranjang">Atur &amp; ambil nomor</a>
      </div>
      <dialog class="sheet" data-sheet>
        <div class="sheet__grip"></div>
        <div class="sheet__body" data-sheet-body></div>
        <div class="sheet__foot">
          <div class="stepper">
            <button type="button" data-sheet-minus aria-label="Kurangi porsi">&minus;</button>
            <output data-sheet-qty>1</output>
            <button type="button" data-sheet-plus aria-label="Tambah porsi">+</button>
          </div>
          <button type="button" class="btn btn--solid" data-sheet-add>Tambah ke keranjang</button>
        </div>
      </dialog>
    </div>`);

    const listNode = SC.dom.qs("[data-list]", el);
    const countLabel = SC.dom.qs("[data-count-label]", el);
    const tray = SC.dom.qs("[data-tray]", el);
    const sheet = SC.dom.qs("[data-sheet]", el);
    const sheetBody = SC.dom.qs("[data-sheet-body]", el);
    const sheetQty = SC.dom.qs("[data-sheet-qty]", el);
    const searchInput = SC.dom.qs("[data-q]", el);

    function current() {
      return SC.data.list(state);
    }

    function renderList() {
      const items = current();
      countLabel.textContent = `${items.length} menu`;
      listNode.innerHTML = items.length        ? items.map((product, index) => SC.parts.menuRow(product, index + 1)).join("")
        : `<li class="empty"><p class="empty__title">Tidak ada hasil</p><p>Coba kata kunci lain atau ubah kategori.</p></li>`;
    }

    function renderTray() {
      const count = SC.cart.count();
      tray.dataset.open = String(count > 0);
      SC.dom.qs("[data-tray-count]", el).textContent = count ? `${count} porsi dipilih` : "keranjang kosong";
      const service = SC.estimator.serviceEstimate();
      SC.dom.qs("[data-tray-svc]", el).textContent = count ? `waktu layan ± ${SC.fmt.minutes(service)}` : "";
    }

    function openSheet(id) {
      const product = SC.data.byId(id);
      if (!product || !product.available) return;
      selected = product;
      qty = 1;
      const pairs = SC.analytics
        .pairs(8)
        .filter((pair) => pair.a.id === product.id || pair.b.id === product.id)
        .slice(0, 2);
      sheetBody.innerHTML = `<h2 class="sheet__title">${esc(product.name)}</h2>
        <p class="sheet__desc">${esc(product.description)}</p>
        <div class="sheet__specs">
          <span class="chip" data-tone="process">&plusmn; ${SC.fmt.minutes(product.service)} layan</span>
          <span class="chip">${esc(SC.fmt.currency(product.price))}</span>
          <span class="chip">${esc(SC.data.category(product.category).label)}</span>
        </div>
        ${
          pairs.length
            ? `<p class="panel__hint mt-1">Sering dipesan bersama</p>
               <div class="stack stack--sm mt-05">
                 ${pairs
                   .map((pair) => {
                     const other = pair.a.id === product.id ? pair.b : pair.a;
                     return `<div class="pair">
                       <div class="pair__names"><span>${esc(other.name)}</span><em>+ ${esc(SC.fmt.currency(other.price))}</em></div>
                       <div class="pair__foot">
                         <span class="pair__conf">${SC.fmt.percent(pair.confidence)}</span>
                         <span class="meter" data-tone="mint"><i style="--v:${Math.round(pair.confidence * 100)}%"></i></span>
                         <button type="button" class="btn btn--line btn--sm" data-add="${esc(other.id)}">Tambah</button>
                       </div>
                     </div>`;
                   })
                   .join("")}
               </div>`
            : ""
        }`;
      sheetQty.textContent = "1";
      sheet.showModal();
    }

    SC.dom.on(el, "click", "[data-cat]", (event, node) => {
      state.category = node.dataset.cat;
      SC.dom.qsa("[data-cat]", el).forEach((button) => button.setAttribute("aria-pressed", String(button === node)));
      renderList();
    });

    SC.dom.on(el, "click", "[data-sort]", (event, node) => {
      state.sort = node.dataset.sort;
      SC.dom.qsa("[data-sort]", el).forEach((button) => button.setAttribute("aria-pressed", String(button === node)));
      renderList();
    });

    const sortSelect = SC.dom.qs("[data-sort-select]", el);
    sortSelect.value = state.sort;
    sortSelect.addEventListener("change", () => {
      state.sort = sortSelect.value;
      renderList();
    });

    SC.dom.on(el, "click", ".mrow", (event, node) => {
      if (event.target.closest("[data-add]")) return;
      openSheet(node.dataset.row);
    });

    SC.dom.on(el, "click", "[data-sheet-minus]", () => {
      qty = Math.max(1, qty - 1);
      sheetQty.textContent = String(qty);
    });

    SC.dom.on(el, "click", "[data-sheet-plus]", () => {
      qty = Math.min(20, qty + 1);
      sheetQty.textContent = String(qty);
    });

    SC.dom.on(el, "click", "[data-sheet-add]", () => {
      if (!selected) return;
      SC.cart.add(selected.id, qty);
      sheet.close();
      SC.layout.toast(`${selected.name} × ${qty} masuk keranjang`);
    });

    sheet.addEventListener("click", (event) => {
      if (event.target === sheet) sheet.close();
    });

    let timer = 0;
    searchInput.addEventListener("input", () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        state.query = searchInput.value;
        renderList();
      }, 120);
    });

    let unsubscribe = null;

    return {
      name: "menu",
      title: "Menu & waktu layan — QuickBite",
      announce: "Halaman menu",
      el,
      mount() {
        renderList();
        renderTray();
        unsubscribe = SC.cart.subscribe(renderTray);
      },
      destroy() {
        if (unsubscribe) unsubscribe();
      },
    };
  };
})(window.SC || (window.SC = {}));
