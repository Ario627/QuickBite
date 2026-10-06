(function (SC) {
  "use strict";

  const { esc } = SC.dom;

  const NAV = [
    { path: "/", label: "Beranda" },
    { path: "/menu", label: "Menu" },
    { path: "/orders", label: "Pesanan" },
    { path: "/queue", label: "Antrean" },
  ];

  const NAV_ADMIN = [
    { path: "/admin", label: "Ringkasan", exact: true },
    { path: "/admin/menu", label: "Katalog" },
    { path: "/queue", label: "Layar antrean" },
  ];

  const TABS = [
    { path: "/", label: "Beranda" },
    { path: "/menu", label: "Menu" },
    { path: "/orders", label: "Pesanan" },
    { path: "/cart", label: "Keranjang", badge: true },
  ];

  const TABS_ADMIN = [
    { path: "/admin", label: "Ringkasan", exact: true },
    { path: "/admin/menu", label: "Katalog" },
    { path: "/queue", label: "Antrean" },
  ];

  const MODULES = [
    { path: "/", label: "Beranda" },
    { path: "/menu", label: "Menu" },
    { path: "/cart", label: "Keranjang" },
    { path: "/orders", label: "Pesanan saya" },
    { path: "/queue", label: "Layar antrean" },
    { path: "/admin", label: "Panel kantin" },
    { path: "/admin/menu", label: "Kelola katalog" },
  ];

  let countNode = null;
  let tabCountNode = null;
  let toastNode = null;
  let liveNode = null;
  let tabbarNode = null;
  let toastTimer = 0;
  let scrollFrame = 0;
  let previousScrollY = 0;

  function brandMarkup(tag) {
    return `<a class="brand" href="#/"><span class="brand__mark" aria-hidden="true"></span><span class="brand__name">CanteenFlow</span><span class="brand__tag">${esc(tag || SC.config.brandMark)}</span></a>`;
  }

  function isActive(itemPath, path, exact) {
    if (exact) return itemPath === path;
    if (itemPath === "/") return path === "/";
    return path === itemPath || path.startsWith(`${itemPath}/`);
  }

  function navMarkup(path, isAdmin) {
    const links = isAdmin ? NAV_ADMIN : NAV;
    return links
      .map(
        (item) =>
          `<a href="#${item.path}" data-nav="${item.path}"${isActive(item.path, path, item.exact) ? ' aria-current="page"' : ""}>${esc(item.label)}</a>`
      )
      .join("");
  }

  function tabMarkup(path, isAdmin) {
    const links = isAdmin ? TABS_ADMIN : TABS;
    return links
      .map(
        (item) =>
          `<a href="#${item.path}" data-nav="${item.path}"${isActive(item.path, path, item.exact) ? ' aria-current="page"' : ""}>${esc(item.label)}${
            item.badge ? '<span class="tabbar__n" data-tab-count></span>' : ""
          }</a>`
      )
      .join("");
  }

  function mount(root) {
    root.innerHTML = `<a class="skip" href="#main">Lewati ke konten</a>
      <header class="site-head">
        <div class="shell site-head__in">
          ${brandMarkup()}
          <nav class="site-nav" aria-label="Navigasi utama" data-nav-slot>${navMarkup("/", false)}</nav>
          <a class="cart-btn" href="#/cart">
            Keranjang
            <span class="cart-btn__n" data-cart-count data-empty="true">0</span>
          </a>
        </div>
      </header>
      <main class="main" id="main"></main>
      <footer class="site-foot">
        <div class="shell site-foot__grid">
          <div class="site-foot__brand">
            ${brandMarkup()}
            <p class="site-foot__note">Prototype digitalisasi kantin sekolah. Katalog, pembayaran kasir, dan antrean FIFO berjalan penuh di peramban tanpa server.</p>
          </div>
          <nav class="site-foot__nav" aria-label="Peta modul">
            ${MODULES.map((item) => `<a href="#${item.path}">${esc(item.label)}</a>`).join("")}
          </nav>
          <div class="site-foot__side">
            <p class="site-foot__meta">Tahap MVP &mdash; pembayaran kasir, antrean FIFO, rekomendasi AI</p>
          </div>
        </div>
      </footer>
      <nav class="tabbar" aria-label="Navigasi bawah" data-tabbar>${tabMarkup("/", false)}</nav>
      <div class="toast" role="status" data-toast data-open="false"></div>
      <div class="live" aria-live="polite" aria-atomic="true" data-live></div>`;

    countNode = SC.dom.qs("[data-cart-count]", root);
    tabCountNode = SC.dom.qs("[data-tab-count]", root);
    toastNode = SC.dom.qs("[data-toast]", root);
    liveNode = SC.dom.qs("[data-live]", root);
    tabbarNode = SC.dom.qs("[data-tabbar]", root);
    tabbarNode.dataset.hidden = "false";
    previousScrollY = window.scrollY;
    window.addEventListener("scroll", () => {
      if (scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0;
        if (window.innerWidth >= 992) {
          tabbarNode.dataset.hidden = "false";
          previousScrollY = window.scrollY;
          return;
        }
        const currentY = window.scrollY;
        const scrollingDown = currentY > previousScrollY + 6;
        const scrollingUp = currentY < previousScrollY - 6;
        const nearBottom = currentY + window.innerHeight >= document.documentElement.scrollHeight - 40;
        if (currentY < 80 || scrollingUp || nearBottom) tabbarNode.dataset.hidden = "false";
        else if (scrollingDown) tabbarNode.dataset.hidden = "true";
        previousScrollY = currentY;
      });
    }, { passive: true });
  }

  function syncNav(path) {
    const isAdmin = path.startsWith("/admin");
    const primary = SC.dom.qs("[data-nav-slot]");
    if (primary) {
      primary.setAttribute("aria-label", isAdmin ? "Navigasi pengelola" : "Navigasi utama");
      primary.innerHTML = navMarkup(path, isAdmin);
    }
    if (tabbarNode) {
      tabbarNode.innerHTML = tabMarkup(path, isAdmin);
      tabCountNode = SC.dom.qs("[data-tab-count]", tabbarNode);
      syncCartCount();
    }
    SC.dom.qsa("[data-nav]").forEach((node) => {
      const exact = node.dataset.nav === "/admin";
      if (isActive(node.dataset.nav, path, exact)) node.setAttribute("aria-current", "page");
      else node.removeAttribute("aria-current");
    });
  }

  function consoleNav(path) {
    return `<nav class="console-nav" aria-label="Navigasi panel">${NAV_ADMIN.map(
      (item) =>
        `<a href="#${item.path}"${isActive(item.path, path, item.exact) ? ' aria-current="page"' : ""}>${esc(item.label)}</a>`
    ).join("")}</nav>`;
  }

  function syncCartCount() {
    const total = SC.cart.count();
    if (countNode) {
      countNode.textContent = String(total);
      countNode.dataset.empty = String(total === 0);
    }
    if (tabCountNode) tabCountNode.textContent = total ? String(total) : "";
  }

  function popCart() {
    SC.motion.pop(countNode);
    SC.motion.pop(tabCountNode);
  }

  function toast(message) {
    if (!toastNode) return;
    toastNode.textContent = message;
    toastNode.dataset.open = "true";
    SC.motion.pop(toastNode);
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toastNode.dataset.open = "false";
    }, 2600);
  }

  function announce(message) {
    if (liveNode) liveNode.textContent = message;
  }

  function tickerMarkup(parts) {
    return `<div class="ticker" data-ticker aria-hidden="true"><div class="ticker__track" data-marquee>${parts
      .map((part) => `<span class="ticker__item">${esc(part)}</span>`)
      .join("")}</div></div>`;
  }

  SC.layout = {
    mount,
    syncNav,
    consoleNav,
    syncCartCount,
    popCart,
    toast,
    announce,
    brandMarkup,
    tickerMarkup,
  };
})(window.SC || (window.SC = {}));
