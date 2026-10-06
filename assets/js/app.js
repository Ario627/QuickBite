(function (SC) {
  "use strict";

  const root = document.getElementById("app");

  SC.layout.mount(root);

  SC.router
    .add("/", SC.views.home)
    .add("/menu", SC.views.menu)
    .add("/keranjang", SC.views.cart)
    .add("/tiket", SC.views.ticket)
    .add("/tiket/:id", SC.views.ticket)
    .add("/aktivitas", SC.views.activity)
    .add("/papan", SC.views.board)
    .add("/papan/analitik", SC.views.analytics)
    .add("/papan/katalog", SC.views.menuAdmin)
    .fallback(SC.views.notFound)
    .start(document.getElementById("main"));

  SC.dom.on(document, "click", "[data-add]", (event, node) => {
    const product = SC.data.byId(node.dataset.add);
    const added = SC.cart.add(node.dataset.add, Number(node.dataset.qty || 1));
    if (added && product) SC.layout.toast(`${product.name} masuk keranjang`);
  });

  SC.dom.on(document, "click", "[data-bump]", (event, node) => {
    SC.cart.bump(node.dataset.bump, Number(node.dataset.step || 1) * (node.dataset.dir === "-" ? -1 : 1));
  });

  let lastCount = SC.cart.count();

  SC.cart.subscribe(() => {
    SC.layout.syncCartCount();
    const next = SC.cart.count();
    if (next !== lastCount) SC.layout.popCart();
    lastCount = next;
  });

  SC.data.subscribe(() => {
    const route = document.body.dataset.route;
    if (route === "/menu" || route === "/papan/katalog") SC.router.go(route);
  });

  const seen = new Map(SC.queue.mine(true).map((ticket) => [ticket.id, ticket.status]));

  SC.queue.subscribe(({ tickets }) => {
    tickets
      .filter((ticket) => ticket.mine)
      .forEach((ticket) => {
        const before = seen.get(ticket.id);
        if (before && before !== ticket.status) {
          if (ticket.status === "PROCESSING") SC.layout.toast(`${ticket.number} mulai disiapkan`);
          if (ticket.status === "READY") SC.layout.toast(`${ticket.number} siap diambil`);
          if (ticket.status === "COMPLETED") SC.layout.toast(`${ticket.number} selesai. Terima kasih.`);
        }
        seen.set(ticket.id, ticket.status);
      });
    SC.layout.syncQueue();
  });

  window.setInterval(() => {
    if (document.hidden) return;
    if (SC.queue.summary().auto) SC.queue.tick(1);
  }, SC.config.tickMs);

  SC.layout.syncQueue();
  SC.layout.syncCartCount();
})(window.SC || (window.SC = {}));
