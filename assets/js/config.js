(function (SC) {
  "use strict";

  SC.config = {
    brand: "CanteenFlow",
    brandMark: "AI",
    orderPrefix: "A",
    serveSeconds: 42,
    keys: {
      catalog: "canteenflow.catalog.v1",
      cart: "canteenflow.cart.v1",
      orders: "canteenflow.orders.v1",
      counter: "canteenflow.counter.v1",
      seed: "canteenflow.seed.v1",
    },
  };
})(window.SC || (window.SC = {}));
