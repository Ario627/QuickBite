(function (SC) {
  "use strict";

  const views = (SC.views = SC.views || {});
  const { esc } = SC.dom;
  const PRICE_FORMAT = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

  function displayPrice(value) {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 6);
    return digits ? PRICE_FORMAT.format(Number(digits)) : "";
  }

  function productRow(product, index) {
    const available = product.available;
    return `<li class="ctrow" style="--d:${index * 35}ms" data-stock-row="${esc(product.id)}">
      <span class="ctrow__art">${SC.ui.art(product, { thumb: true })}</span>
      <span class="ctrow__body">
        <strong>${esc(product.name)}</strong>
        <span>${esc(SC.data.categoryOf(product.category).label)} &middot; ${SC.fmt.currency(product.price)} &middot; ${SC.fmt.number(product.sold)} terjual</span>
      </span>
      <span class="pill ${available ? "pill--on" : "pill--off"}">${available ? "Tersedia" : "Habis"}</span>
      <span class="ctrow__act">
        <button class="btn btn--link" type="button" data-edit-menu="${esc(product.id)}">Ubah</button>
        <button class="btn btn--link" type="button" data-toggle-stock="${esc(product.id)}">${available ? "Tandai habis" : "Aktifkan"}</button>
        ${product.id.startsWith("custom-") ? `<button class="btn btn--link ctrow__del" type="button" data-delete-menu="${esc(product.id)}">Hapus</button>` : ""}
      </span>
    </li>`;
  }

  function editorMarkup(product) {
    const current = product || { name: "", category: "makanan", price: "", description: "" };
    const editing = Boolean(product);

    return `<section class="editor" data-editor>
      <header class="editor__head">
        <div>
          <p class="eyebrow">${editing ? "Sunting katalog" : "Entri katalog"}</p>
          <h2>${editing ? "Ubah menu" : "Tambah menu"}</h2>
        </div>
        <button class="btn btn--link" type="button" data-cancel-editor>Batal</button>
      </header>
      <form class="menu-form" data-menu-form data-product-id="${editing ? esc(product.id) : ""}" novalidate>
        <div class="menu-form__grid">
          <div class="menu-form__name">
            <label class="field-label" for="menu-name">Nama menu</label>
            <input class="field" id="menu-name" name="name" maxlength="48" autocomplete="off" required value="${esc(current.name)}" placeholder="Contoh: Nasi ayam sambal matah">
          </div>
          <div>
            <label class="field-label" for="menu-category">Kategori</label>
            <select class="field" id="menu-category" name="category" required>
              ${SC.data.categories
                .filter((category) => category.id !== "semua")
                .map((category) => `<option value="${category.id}"${category.id === current.category ? " selected" : ""}>${esc(category.label)}</option>`)
                .join("")}
            </select>
          </div>
          <div>
            <label class="field-label" for="menu-price">Harga / rupiah</label>
            <input class="field" id="menu-price" name="price" type="text" inputmode="numeric" required value="${current.price ? PRICE_FORMAT.format(Number(current.price)) : ""}" placeholder="12.000">
          </div>
          <div class="menu-form__description">
            <label class="field-label" for="menu-description">Deskripsi</label>
            <textarea class="field" id="menu-description" name="description" rows="3" maxlength="180" required placeholder="Bahan utama dan detail penyajian">${esc(current.description)}</textarea>
            <span class="menu-form__counter" data-description-count>${current.description.length}/180</span>
          </div>
        </div>
        <p class="menu-form__error" data-menu-error hidden></p>
        <div class="menu-form__footer">
          <span>Harga Rp500–Rp250.000 &middot; Deskripsi 8–180 karakter</span>
          <button class="btn btn--solid" type="submit">${editing ? "Simpan perubahan" : "Tambah ke katalog"}</button>
        </div>
      </form>
    </section>`;
  }

  views.menuAdmin = function menuAdminView() {
    let filter = "semua";
    let query = "";
    let editingId = null;
    const el = SC.dom.html('<div class="kit"></div>');

    function paint() {
      const selected = SC.data.list({ category: filter, query, sort: "nama" });
      const unavailable = SC.data.products.filter((product) => !product.available).length;

      el.innerHTML = `<header class="kit__head">
          <div data-reveal>
            <p class="eyebrow">Panel kantin / katalog</p>
            <h1 class="kit__title">Kelola menu</h1>
            <p class="kit__lead">Perbarui nama, harga, ketersediaan, dan deskripsi papan menu kantin.</p>
          </div>
          <div class="kit__side">
            <button class="btn btn--solid" type="button" data-new-menu>Tambah menu</button>
          </div>
        </header>
        ${editorMarkup(editingId ? SC.data.byId(editingId) : null)}
        <section class="panel" data-reveal>
          <div class="ctools">
            <label class="search">
              <span class="live-label">Cari menu</span>
              <input class="field" type="search" data-menu-search aria-label="Cari menu" placeholder="Cari menu" value="${esc(query)}">
            </label>
            <div class="chips" role="group" aria-label="Filter kategori">${SC.ui.chipRow(SC.data.categories, filter, "menu-filter")}</div>
          </div>
          <p class="ctools__sum">${SC.fmt.number(SC.data.products.length)} menu terdaftar &middot; ${SC.fmt.number(unavailable)} habis &middot; ${SC.fmt.number(SC.data.products.length - unavailable)} tersedia</p>
          ${
            selected.length
              ? `<ol class="ctable">${selected.map(productRow).join("")}</ol>`
              : '<p class="panel__empty">Menu tidak ditemukan. Coba kata kunci atau kategori lain.</p>'
          }
        </section>
        <footer class="kit__note"><span>CanteenFlow AI / kelola katalog</span><span>Katalog tersimpan di peramban ini</span></footer>`;

      SC.motion.reveal(el);
    }

    SC.dom.on(el, "input", "[data-menu-search]", (event, node) => {
      query = node.value.trim();
      const top = window.scrollY;
      paint();
      const nextSearch = el.querySelector("[data-menu-search]");
      nextSearch.focus();
      nextSearch.setSelectionRange(query.length, query.length);
      window.scrollTo(0, top);
    });

    SC.dom.on(el, "click", "[data-menu-filter]", (event, node) => {
      filter = node.dataset.menuFilter;
      query = el.querySelector("[data-menu-search]").value.trim();
      const top = window.scrollY;
      paint();
      window.scrollTo(0, top);
    });

    SC.dom.on(el, "input", "[name='price']", (event, node) => {
      node.value = displayPrice(node.value);
    });

    SC.dom.on(el, "input", "[name='description']", (event, node) => {
      const counter = el.querySelector("[data-description-count]");
      if (counter) counter.textContent = `${node.value.length}/180`;
    });

    SC.dom.on(el, "click", "[data-new-menu]", () => {
      editingId = null;
      paint();
      const field = el.querySelector("#menu-name");
      if (field) field.focus();
    });

    SC.dom.on(el, "click", "[data-edit-menu]", (event, node) => {
      editingId = node.dataset.editMenu;
      paint();
      const field = el.querySelector("#menu-name");
      if (field) field.focus();
    });

    SC.dom.on(el, "click", "[data-cancel-editor]", () => {
      editingId = null;
      paint();
    });

    SC.dom.on(el, "submit", "[data-menu-form]", (event, form) => {
      event.preventDefault();
      const data = new FormData(form);
      const result = SC.data.saveProduct(
        {
          name: data.get("name"),
          category: data.get("category"),
          price: Number(String(data.get("price")).replace(/\D/g, "")),
          description: data.get("description"),
        },
        form.dataset.productId || null
      );

      const error = el.querySelector("[data-menu-error]");
      if (result.error) {
        error.textContent = result.error;
        error.hidden = false;
        return;
      }

      const wasEditing = Boolean(form.dataset.productId);
      editingId = null;
      filter = "semua";
      query = "";
      paint();
      SC.layout.toast(wasEditing ? "Perubahan menu disimpan" : "Menu baru ditambahkan");
      const search = el.querySelector("[data-menu-search]");
      if (search) search.focus();
    });

    SC.dom.on(el, "click", "[data-toggle-stock]", (event, node) => {
      const product = SC.data.byId(node.dataset.toggleStock);
      if (!product) return;
      SC.data.setAvailability(product.id, !product.available);
      SC.layout.toast(`${product.name}: ${product.available ? "tersedia" : "habis"}`);
    });

    SC.dom.on(el, "click", "[data-delete-menu]", (event, node) => {
      const result = SC.data.removeProduct(node.dataset.deleteMenu);
      if (result.error) {
        SC.layout.toast(result.error);
        return;
      }
      editingId = null;
      paint();
      SC.layout.toast(`${result.product.name} dihapus dari katalog`);
    });

    const stopInventory = SC.data.subscribeInventory(() => paint());

    paint();

    return {
      name: "menuAdmin",
      title: "Kelola katalog — CanteenFlow AI",
      announce: "Pengelolaan katalog kantin",
      el,
      destroy() {
        stopInventory();
      },
    };
  };
})(window.SC || (window.SC = {}));
