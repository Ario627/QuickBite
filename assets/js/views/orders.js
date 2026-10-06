(function (SC) {
  "use strict";

  const views = (SC.views = SC.views || {});
  const { esc } = SC.dom;

  function rowMarkup(order, index) {
    const merged = new Map();
    order.items.forEach((item) => {
      merged.set(item.name, (merged.get(item.name) || 0) + item.qty);
    });
    const preview = Array.from(merged.entries())
      .map(([name, qty]) => `${qty}× ${name}`)
      .join(" · ");
    return `<li class="lrow" data-order="${esc(order.id)}" style="--d:${index * 45}ms">
      <a class="lrow__link" href="#/order/${encodeURIComponent(order.id)}">
        <span class="lrow__token">${order.number ? esc(order.number) : esc(order.code)}</span>
        <span class="lrow__body">
          <span class="lrow__top">${SC.ui.statusPill(order.status)}<time>${SC.fmt.clock(new Date(order.createdAt))}</time></span>
          <span class="lrow__items">${esc(preview)}</span>
          <span class="lrow__meta">${esc(order.customer.name)} &middot; ${esc(order.customer.grade)} &middot; ${SC.fmt.currency(order.total)}</span>
        </span>
        <span class="lrow__go" aria-hidden="true">&rarr;</span>
      </a>
    </li>`;
  }

  views.orders = function orders() {
    let stop = null;
    let known = new Map();

    const el = SC.dom.html('<section class="shell page"></section>');

    function paint() {
      const mine = SC.orders
        .list()
        .filter((order) => !order.demo)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      el.innerHTML = `
        <header class="page-head" data-reveal>
          <p class="eyebrow">Pesanan</p>
          <h1 class="page-head__title">Pesanan saya</h1>
          <p class="page-head__lead">Semua pesanan yang dibuat dari perangkat ini, dari kode bayar sampai selesai diambil.</p>
        </header>
        ${
          mine.length
            ? `<ol class="ledger">${mine.map(rowMarkup).join("")}</ol>`
            : SC.ui.empty({
                title: "Belum ada pesanan",
                note: "Pesanan yang kamu konfirmasi akan muncul di sini dan bisa dilacak sampai selesai.",
                action: { label: "Buka papan menu", attr: 'data-link="/menu"' },
              })
        }
      `;

      mine.forEach((order) => {
        const before = known.get(order.id);
        if (!before || before === order.status) return;
        const node = SC.dom.qs(`.lrow[data-order="${order.id}"] .st`, el);
        if (node) SC.motion.pop(node);
      });
      known = new Map(mine.map((order) => [order.id, order.status]));
      SC.motion.reveal(el);
    }

    SC.dom.on(el, "click", "[data-link]", (event, node) => {
      SC.router.go(node.dataset.link);
    });

    return {
      name: "orders",
      title: "Pesanan saya — CanteenFlow AI",
      announce: "Daftar pesanan",
      el,
      mount() {
        paint();
        stop = SC.orders.subscribe(paint);
      },
      destroy() {
        if (stop) stop();
      },
    };
  };
})(window.SC || (window.SC = {}));
