(function (SC) {
  "use strict";

  const views = (SC.views = SC.views || {});
  const { esc } = SC.dom;

  views.menuAdmin = function menuAdmin(ctx) {
    let editing = null;

    const el = SC.dom.html(`<div>
      <div class="shell">
        <header class="page__head">
          <p class="eyebrow">Katalog kantin</p>
          <h1 class="page__title">Atur menu &amp; waktu layannya</h1>
          <p class="page__sub">Waktu layan per menu dipakai langsung oleh mesin estimasi. Ubah di sini, estimasi siswa ikut berubah.</p>
        </header>
        ${SC.layout.adminNav(ctx.path)}
        <div class="pagemaintoolbar">
          <span class="chip" data-v="count">0 menu</span>
          <span class="chip" data-v="hidden">0 nonaktif</span>
          <span class="spacer"></span>
          <button type="button" class="btn btn--solid btn--sm" data-new>Tambah menu</button>
          <button type="button" class="btn btn--ghost btn--sm" data-reset>Reset katalog</button>
        </div>
        <section class="panel" data-rise>
          <div class="bwrap">
            <table class="btable">
              <thead>
                <tr><th>No</th><th>Menu</th><th>Kategori</th><th>Harga</th><th>Waktu layan</th><th>Status</th><th></th></tr>
              </thead>
              <tbody data-rows></tbody>
            </table>
          </div>
        </section>
      </div>
      <dialog class="sheet" data-form>
        <div class="sheet__grip"></div>
        <form method="dialog" class="sheet__body stack stack--sm" data-form-body>
          <h2 class="sheet__title" data-form-title>Menu baru</h2>
          <label class="field"><span>Nama menu</span><input name="name" maxlength="48" required /></label>
          <label class="field"><span>Kategori</span>
            <select name="category">
              ${SC.data.categories
                .filter((category) => category.id !== "semua")
                .map((category) => `<option value="${esc(category.id)}">${esc(category.label)}</option>`)
                .join("")}
            </select>
          </label>
          <div class="grid2 grid2--even">
            <label class="field"><span>Harga (Rp)</span><input name="price" type="number" min="500" max="250000" step="500" required /></label>
            <label class="field"><span>Waktu layan (menit)</span><input name="service" type="number" min="0.5" max="30" step="0.5" required /></label>
          </div>
          <label class="field"><span>Deskripsi singkat</span><textarea name="description" rows="3" maxlength="180" required></textarea></label>
          <label class="field"><span>Status</span>
            <select name="available">
              <option value="true">Tersedia</option>
              <option value="false">Sedang habis</option>
            </select>
          </label>
          <p class="svcnote">Contoh: minuman 1 menit, gorengan 3 menit, nasi 5 menit. Angka ini menentukan berapa lama slot dapur terpakai.</p>
        </form>
        <div class="sheet__foot">
          <button type="button" class="btn btn--ghost" data-form-cancel>Batal</button>
          <button type="button" class="btn btn--solid" data-form-save>Simpan</button>
        </div>
      </dialog>
    </div>`);

    const rowsNode = SC.dom.qs("[data-rows]", el);
    const form = SC.dom.qs("[data-form]", el);
    const formBody = SC.dom.qs("[data-form-body]", el);

    function paint() {
      const products = SC.data.list({ sort: "nama" });
      rowsNode.innerHTML = products
        .map(
          (product, index) => `<tr data-mine="false" data-off="${String(!product.available)}">
            <td class="btable__no" data-l="No">${SC.fmt.pad(index + 1, 2)}</td>
            <td data-l="Menu">
              <span class="mrow__name">${esc(product.name)}</span>
              <span class="act__meta">${esc(product.id)}</span>
            </td>
            <td data-l="Kategori">${esc(SC.data.category(product.category).label)}</td>
            <td class="btable__no" data-l="Harga">${esc(SC.fmt.currency(product.price))}</td>
            <td class="btable__no" data-l="Layan">&plusmn; ${SC.fmt.minutes(product.service)}</td>
            <td data-l="Status"><span class="chip" data-tone="${product.available ? "ready" : "done"}">${product.available ? "TERSEDIA" : "HABIS"}</span></td>
            <td>
              <div class="btable__act">
                <button type="button" class="btn btn--line btn--sm" data-edit="${esc(product.id)}">Ubah</button>
                <button type="button" class="btn btn--ghost btn--sm" data-toggle="${esc(product.id)}">${product.available ? "Matikan" : "Hidupkan"}</button>
                ${product.id.startsWith("custom-") ? `<button type="button" class="btn btn--danger btn--sm" data-del="${esc(product.id)}">Hapus</button>` : ""}
              </div>
            </td>
          </tr>`
        )
        .join("");
      const set = (key, value) => {
        const node = SC.dom.qs(`[data-v="${key}"]`, el);
        if (node) node.textContent = value;
      };
      set("count", `${products.length} menu`);
      set("hidden", `${products.filter((product) => !product.available).length} nonaktif`);
    }

    function openForm(product) {
      editing = product || null;
      const title = SC.dom.qs("[data-form-title]", el);
      title.textContent = product ? `Ubah ${product.name}` : "Menu baru";
      formBody.reset();
      if (product) {
        formBody.elements.name.value = product.name;
        formBody.elements.category.value = product.category;
        formBody.elements.price.value = String(product.price);
        formBody.elements.service.value = String(product.service);
        formBody.elements.description.value = product.description;
        formBody.elements.available.value = String(product.available);
      } else {
        formBody.elements.available.value = "true";
      }
      form.showModal();
    }

    SC.dom.on(el, "click", "[data-new]", () => openForm(null));

    SC.dom.on(el, "click", "[data-edit]", (event, node) => openForm(SC.data.byId(node.dataset.edit)));

    SC.dom.on(el, "click", "[data-toggle]", (event, node) => {
      const product = SC.data.toggle(node.dataset.toggle);
      if (product) SC.layout.toast(`${product.name} ${product.available ? "diaktifkan" : "dimatikan"}`);
    });

    SC.dom.on(el, "click", "[data-del]", (event, node) => {
      if (SC.data.remove(node.dataset.del)) SC.layout.toast("Menu dihapus dari katalog");
    });

    SC.dom.on(el, "click", "[data-form-cancel]", () => form.close());

    SC.dom.on(el, "click", "[data-form-save]", () => {
      const data = {
        name: formBody.elements.name.value,
        category: formBody.elements.category.value,
        price: Number(formBody.elements.price.value),
        service: Number(formBody.elements.service.value),
        description: formBody.elements.description.value,
        available: formBody.elements.available.value === "true",
      };
      const saved = editing ? SC.data.upsert(Object.assign({}, editing, data)) : SC.data.create(data);
      if (!saved) {
        SC.layout.toast("Data belum valid. Periksa nama, harga, dan deskripsi.");
        return;
      }
      form.close();
      SC.layout.toast(`${saved.name} tersimpan`);
    });

    SC.dom.on(el, "click", "[data-reset]", () => {
      SC.data.reset();
      SC.layout.toast("Katalog kembali ke bawaan");
    });

    form.addEventListener("click", (event) => {
      if (event.target === form) form.close();
    });

    return {
      name: "katalog",
      title: "Katalog — QuickBite",
      announce: "Halaman katalog kantin",
      el,
      mount() {
        paint();
      },
    };
  };
})(window.SC || (window.SC = {}));
