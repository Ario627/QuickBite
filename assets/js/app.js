(function (SC) {
  "use strict";

  const root = document.getElementById("app");

  SC.layout.mount(root);

  SC.router
    .add("/", SC.views.home)
    .add("/menu", SC.views.menu)
    .add("/menu/:id", SC.views.product)
    .add("/cart", SC.views.cart)
    .add("/checkout", SC.views.checkout)
    .add("/orders", SC.views.orders)
    .add("/order/:id", SC.views.order)
    .add("/queue", SC.views.queue)
    .add("/admin", SC.views.admin)
    .add("/admin/menu", SC.views.menuAdmin)
    .fallback(SC.views.notFound)
    .start(document.getElementById("main"));

  SC.dom.on(document, "click", "[data-add]", (event, node) => {
    const product = SC.data.byId(node.dataset.add);
    const key = SC.cart.add(node.dataset.add);
    if (key && product) SC.layout.toast(`${product.name} ditambahkan ke keranjang`);
  });

  SC.dom.on(document, "click", "[data-bump]", (event, node) => {
    SC.cart.bump(node.dataset.key, Number(node.dataset.bump));
  });

  let lastCount = SC.cart.count();

  SC.cart.subscribe(() => {
    SC.layout.syncCartCount();
    SC.ui.syncFeet();
    const next = SC.cart.count();
    if (next !== lastCount) SC.layout.popCart();
    lastCount = next;
  });

  SC.data.subscribeInventory(() => {
    const route = document.body.dataset.route;
    if (route === "/menu" || route === "/admin/menu") SC.router.go(route);
  });

  const seen = new Map(SC.orders.list().map((order) => [order.id, order.status]));
  SC.orders.subscribe((list) => {
    list.forEach((order) => {
      const before = seen.get(order.id);
      if (before && before !== order.status && order.status === "READY" && order.number) {
        SC.layout.toast(`Pesanan ${order.number} siap diambil`);
      }
      seen.set(order.id, order.status);
    });
  });

  SC.layout.syncCartCount();
  SC.motion.awake(document);
})(window.SC || (window.SC = {}));
