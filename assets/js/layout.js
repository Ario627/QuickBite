(function (SC) {
  "use strict";

  const { esc } = SC.dom;

  const NAV = [
    { path: "/", label: "Beranda" },
    { path: "/menu", label: "Menu" },
    { path: "/tiket", label: "Tiket" },
    { path: "/aktivitas", label: "Riwayat" },
  ];

  const TABS = [
    { path: "/", label: "Beranda" },
    { path: "/menu", label: "Menu" },
    { path: "/tiket", label: "Tiket", badge: true },
    { path: "/aktivitas", label: "Riwayat" },
    { path: "/papan", label: "Papan" },
  ];

  const ADMIN = [
    { path: "/papan", label: "Papan antrean", exact: true },
    { path: "/papan/analitik", label: "Analitik" },
    { path: "/papan/katalog", label: "Katalog" },
  ];

  let toastNode = null;
  let liveNode = null;
  let clockNode = null;
  let progressNode = null;
  let railTrack = null;
  let tabbarNode = null;
  let cartNode = null;
  let wipeNode = null;
  let toastTimer = 0;
  let busy = false;
  let frame = 0;
  let previousY = 0;
  let railLooped = false;

  const reduced = Boolean(
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  function mark() {
    return '<a class="mark" href="#/">Quick<span>Bite</span></a>';
  }

  function isActive(itemPath, path, exact) {
    if (exact) return itemPath === path;
    if (itemPath === "/") return path === "/";
    return path === itemPath || path.startsWith(`${itemPath}/`);
  }

  function navMarkup(path) {
    return NAV.map(
      (item) =>
        `<a href="#${item.path}"${isActive(item.path, path) ? ' aria-current="page"' : ""}>${esc(item.label)}</a>`
    ).join("");
  }

  function tabMarkup(path) {
    return TABS.map(
      (item) =>
        `<a href="#${item.path}"${isActive(item.path, path, item.path === "/papan") ? ' aria-current="page"' : ""}>${
          esc(item.label)
        }${item.badge ? '<b data-mine-count></b>' : ""}</a>`
    ).join("");
  }

  function adminNav(path) {
    return `<nav class="adminnav" aria-label="Navigasi papan">${ADMIN.map(
      (item) =>
        `<a href="#${item.path}"${isActive(item.path, path, item.exact) ? ' aria-current="page"' : ""}>${esc(item.label)}</a>`
    ).join("")}</nav>`;
  }

  function railItem(key, label, value) {
    return `<span class="rail__item"><b class="rail__k">${esc(label)}</b><span class="rail__v" data-rail="${key}">${esc(
      value
    )}</span></span>`;
  }

  function railMarkup() {
    return [
      railItem("serving", "dilayani", "A---"),
      railItem("waiting", "menunggu", "0 orang"),
      railItem("eta", "estimasi", "tanpa tunggu"),
      railItem("clock", "jam kantin", "--:--"),
      railItem("mine", "tiketmu", "belum ada"),
    ].join("");
  }

  function buildRail() {
    if (!railTrack) return;
    const narrow = window.innerWidth < 860 && !reduced;
    railTrack.innerHTML = narrow ? railMarkup() + railMarkup() : railMarkup();
    railTrack.classList.toggle("is-run", narrow);
    railLooped = narrow;
    paintRail();
  }

  function mount(root) {
    const bars = Array.from({ length: 7 }, (_, index) => `<i style="--i:${index}"></i>`).join("");
    root.innerHTML = `<a class="skip" href="#main">Lewati ke konten</a>
      <div class="wipe" data-wipe aria-hidden="true">${bars}</div>
      <header class="hdr">
        <div class="shell hdr__in">
          ${mark()}
          <nav class="hdr__nav" aria-label="Navigasi utama" data-nav-slot>${navMarkup("/")}</nav>
          <div class="hdr__side">
            <p class="hdr__clock" data-clock>--:--:--</p>
            <a class="cartlink" href="#/keranjang" data-cart data-empty="true">Tray <b data-cart-count>0</b></a>
          </div>
        </div>
        <div class="rail">
          <div class="rail__track" data-rail-track>${railMarkup()}</div>
        </div>
        <div class="hdr__progress" data-progress><i></i></div>
      </header>
      <main class="main" id="main"></main>
      <footer class="ftr">
        <div class="shell ftr__grid">
          <div>
            ${mark()}
            <p class="ftr__note">Prototipe antrean digital kantin sekolah. Pilih menu, ambil nomor, datang saat giliran tiba. Semua data berjalan lokal di peramban ini.</p>
          </div>
          <div>
            <p class="ftr__title">Modul</p>
            <ul class="ftr__list">
              <li><a href="#/">Beranda</a></li>
              <li><a href="#/menu">Menu &amp; waktu layan</a></li>
              <li><a href="#/keranjang">Keranjang</a></li>
              <li><a href="#/tiket">Tiket antrean</a></li>
              <li><a href="#/papan">Papan kantin</a></li>
            </ul>
          </div>
          <div>
            <p class="ftr__title">Catatan</p>
            <p class="ftr__meta">Jam simulasi berjalan tiga detik nyata untuk satu menit kantin. Estimasi tunggu dihitung ulang setiap pesanan selesai.</p>
          </div>
        </div>
      </footer>
      <nav class="tabbar" aria-label="Navigasi bawah" data-tabbar>${tabMarkup("/")}</nav>
      <div class="toast" role="status" data-toast data-open="false"></div>
      <div class="live" aria-live="polite" aria-atomic="true" data-live></div>`;

    toastNode = SC.dom.qs("[data-toast]", root);
    liveNode = SC.dom.qs("[data-live]", root);
    clockNode = SC.dom.qs("[data-clock]", root);
    progressNode = SC.dom.qs("[data-progress]", root);
    railTrack = SC.dom.qs("[data-rail-track]", root);
    tabbarNode = SC.dom.qs("[data-tabbar]", root);
    cartNode = SC.dom.qs("[data-cart]", root);
    wipeNode = SC.dom.qs("[data-wipe]", root);

    buildRail();

    const wide = window.matchMedia("(min-width: 860px)");
    if (wide.addEventListener) wide.addEventListener("change", buildRail);

    previousY = window.scrollY;
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener(
      "resize",
      SC.dom.debounce(() => {
        const narrow = window.innerWidth < 860 && !reduced;
        if (narrow !== railLooped) buildRail();
        SC.motion.progress(progressNode);
      }, 240)
    );

    document.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      const link = event.target instanceof Element ? event.target.closest('a[href^="#/"]') : null;
      if (!link || link.target === "_blank") return;
      const path = link.getAttribute("href").slice(1);
      const current = window.location.hash.replace(/^#/, "") || "/";
      if (path === current || busy) return;
      event.preventDefault();
      sweep(() => {
        window.location.hash = `#${path}`;
      });
    });

    startClock();
    SC.motion.progress(progressNode);
    syncQueue();
  }

  function onScroll() {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      SC.motion.progress(progressNode);
      if (window.innerWidth >= 992) {
        tabbarNode.dataset.hidden = "false";
        previousY = window.scrollY;
        return;
      }
      const currentY = window.scrollY;
      const down = currentY > previousY + 10;
      const up = currentY < previousY - 10;
      const nearBottom = currentY + window.innerHeight >= document.documentElement.scrollHeight - 48;
      if (currentY < 90 || up || nearBottom) tabbarNode.dataset.hidden = "false";
      else if (down) tabbarNode.dataset.hidden = "true";
      previousY = currentY;
    });
  }

  function sweep(navigate) {
    if (reduced || !wipeNode) {
      navigate();
      return;
    }
    busy = true;
    wipeNode.dataset.phase = "cover";
    window.setTimeout(() => {
      navigate();
      window.setTimeout(() => {
        wipeNode.dataset.phase = "lift";
        window.setTimeout(() => {
          wipeNode.dataset.phase = "";
          busy = false;
        }, 420);
      }, 110);
    }, 330);
  }

  function startClock() {
    const paint = () => {
      if (clockNode) clockNode.textContent = SC.fmt.realClock(new Date());
    };
    paint();
    window.setInterval(paint, 1000);
  }

  function paintRail() {
    if (!railTrack) return;
    const summary = SC.queue.summary();
    const serving = SC.queue.nowServing();
    const crowd = SC.estimator.crowd();
    const mine = SC.queue.mine(false)[0] || null;
    const set = (key, value, tone) => {
      SC.dom.qsa(`[data-rail="${key}"]`, railTrack).forEach((node) => {
        node.textContent = value;
        if (tone) node.dataset.tone = tone;
        else delete node.dataset.tone;
      });
    };
    set("serving", serving ? serving.number : "A---", "amber");
    set("waiting", `${summary.waiting.length} orang`);
    set("eta", SC.fmt.eta(crowd.eta), crowd.tone === "coral" ? "coral" : "mint");
    set("clock", SC.fmt.clock(summary.clock));
    set("mine", mine ? mine.number : "belum ada", mine ? "amber" : "");
  }

  function syncQueue() {
    paintRail();
    syncCartCount();
  }

  function syncCartCount() {
    const count = SC.cart.count();
    SC.dom.qsa("[data-cart-count]").forEach((node) => {
      node.textContent = String(count);
    });
    if (cartNode) cartNode.dataset.empty = String(count === 0);
    const active = SC.queue.mine(false).length;
    SC.dom.qsa("[data-mine-count]").forEach((node) => {
      node.textContent = active ? String(active) : "";
    });
  }

  function syncNav(path) {
    const primary = SC.dom.qs("[data-nav-slot]");
    if (primary) primary.innerHTML = navMarkup(path);
    if (tabbarNode) tabbarNode.innerHTML = tabMarkup(path);
    const narrow = window.innerWidth < 860 && !reduced;
    if (narrow !== railLooped) buildRail();
    syncCartCount();
  }

  function enter(outlet) {
    if (!outlet || busy || reduced) return;
    outlet.classList.remove("is-enter");
    void outlet.offsetWidth;
    outlet.classList.add("is-enter");
    SC.motion.spotlight(outlet);
    SC.motion.magnet(outlet);
    SC.motion.loops(outlet);
  }

  function popCart() {
    SC.motion.pop(cartNode);
  }

  function toast(message) {
    if (!toastNode) return;
    toastNode.textContent = message;
    toastNode.dataset.open = "true";
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toastNode.dataset.open = "false";
    }, 2800);
  }

  function announce(message) {
    if (liveNode) liveNode.textContent = message;
  }

  SC.layout = { mount, syncNav, syncQueue, syncCartCount, enter, popCart, toast, announce, adminNav, mark };
})(window.SC || (window.SC = {}));
