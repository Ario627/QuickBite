(function (SC) {
  "use strict";

  const views = (SC.views = SC.views || {});

  const SORTS = [
    { id: "populer", label: "Terlaris" },
    { id: "murah", label: "Termurah" },
    { id: "mahal", label: "Termahal" },
    { id: "nama", label: "A–Z" },
  ];

  views.menu = function menu(ctx) {
    let category = ctx.query.get("kategori") || "semua";
    let keyword = ctx.query.get("cari") || "";
    let sort = "populer";

    const insight = SC.recommend.insight();
    const categories = SC.data.categories;

    const el = SC.dom.html(`
      <section class="shell page mboard">
        <header class="mboard__head">
          <div class="mboard__intro" data-reveal>
            <p class="eyebrow">01 / Papan menu</p>
            <h1 class="mboard__title">Menu</h1>
            <p class="mboard__lead">Harga dan ketersediaan diperbarui pengelola setiap pagi. Menu habis tetap terdaftar, tetapi tidak bisa dipesan.</p>
            ${
              insight.top
                ? `<p class="mboard__insight">AI membaca <strong>${SC.fmt.number(insight.transactions)} transaksi</strong>. Pasangan terkuat: <strong>${SC.dom.esc(insight.top.a.name)} + ${SC.dom.esc(insight.top.b.name)}</strong> (${SC.fmt.percent(insight.top.confidence)}).</p>`
                : ""
            }
          </div>
          <div class="mboard__tools" data-reveal>
            <label class="search">
              <span class="live-label">Cari menu</span>
              <input class="field" type="search" data-search aria-label="Cari menu" placeholder="Cari nama menu atau bahan" value="${SC.dom.esc(keyword)}">
            </label>
            <div class="seg" role="group" aria-label="Urutkan menu">
              ${SORTS.map(
                (item) =>
                  `<button type="button" data-sort="${item.id}" aria-pressed="${item.id === sort}">${item.label}</button>`
              ).join("")}
            </div>
            <p class="mboard__count" data-result>memuat…</p>
          </div>
        </header>

        <div class="mboard__body">
          <aside class="rail" data-reveal>
            <p class="rail__label">Kategori</p>
            <ol class="rail__list" data-chips>
              ${categories
                .map(
                  (item, index) =>
                    `<li><button type="button" class="catbtn${item.id === category ? " is-on" : ""}" data-cat="${item.id}" aria-pressed="${item.id === category}"><span class="catbtn__no">${String(index + 1).padStart(2, "0")}</span><span class="catbtn__label">${SC.dom.esc(item.label)}</span></button></li>`
                )
                .join("")}
            </ol>
            <p class="rail__note">Kategori membantu dapur menyiapkan bahan. Minuman dan snack biasanya siap lebih cepat.</p>
          </aside>

          <div class="mboard__list">
            <div data-shelf></div>
            <ol class="mrows mrows--board" data-rows></ol>
            <div data-empty hidden></div>
          </div>
        </div>
      </section>
    `);

    const rows = SC.dom.qs("[data-rows]", el);
    const chips = SC.dom.qs("[data-chips]", el);
    const shelf = SC.dom.qs("[data-shelf]", el);
    const emptySlot = SC.dom.qs("[data-empty]", el);
    const resultLine = SC.dom.qs("[data-result]", el);
    const search = SC.dom.qs("[data-search]", el);

    function paintShelf() {
      const visible = category === "semua" && !keyword;
      if (!visible) {
        shelf.innerHTML = "";
        return;
      }
      const recs = SC.recommend.forYou(3);
      shelf.innerHTML = recs.length
        ? `<div class="shelf" data-reveal>
            <p class="shelf__label">Untukmu, dari pola pemesanan</p>
            ${SC.ui.recList(recs)}
          </div>`
        : "";
    }

    function paintList() {
      const items = SC.data.list({ category, query: keyword, sort });
      rows.innerHTML = items.length ? SC.ui.menuRows(items) : "";
      emptySlot.hidden = items.length > 0;
      emptySlot.innerHTML = items.length
        ? ""
        : SC.ui.empty({
            title: "Tidak ada menu yang cocok",
            note: `Tidak ada hasil untuk "${keyword}" pada kategori ini.`,
            action: { label: "Reset filter", attr: "data-reset" },
          });

      const label = SC.data.categoryOf(category).label.toLowerCase();
      resultLine.textContent = items.length
        ? `${SC.fmt.number(items.length)} menu · kategori ${label}`
        : `0 menu · kategori ${label}`;
      SC.ui.syncFeet(rows);
      SC.motion.reveal(el);
    }

    function syncControls() {
      SC.dom.qsa("[data-cat]", chips).forEach((node) => {
        const on = node.dataset.cat === category;
        node.classList.toggle("is-on", on);
        node.setAttribute("aria-pressed", String(on));
      });
      SC.dom.qsa("[data-sort]", el).forEach((node) => {
        node.setAttribute("aria-pressed", String(node.dataset.sort === sort));
      });
    }

    const onSearch = SC.dom.debounce(() => {
      keyword = search.value.trim();
      paintShelf();
      paintList();
    }, 140);

    SC.dom.on(el, "click", "[data-cat]", (event, node) => {
      category = node.dataset.cat;
      syncControls();
      paintShelf();
      paintList();
    });

    SC.dom.on(el, "click", "[data-sort]", (event, node) => {
      sort = node.dataset.sort;
      syncControls();
      paintList();
    });

    SC.dom.on(el, "click", "[data-reset]", () => {
      category = "semua";
      keyword = "";
      sort = "populer";
      search.value = "";
      syncControls();
      paintShelf();
      paintList();
    });

    SC.dom.on(el, "input", "[data-search]", onSearch);

    syncControls();
    paintShelf();
    paintList();

    return {
      name: "menu",
      title: "Papan menu — CanteenFlow AI",
      announce: "Papan menu kantin",
      el,
    };
  };
})(window.SC || (window.SC = {}));
