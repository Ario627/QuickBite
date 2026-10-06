(function (SC) {
  "use strict";

  const views = (SC.views = SC.views || {});
  const { esc } = SC.dom;

  const STEPS = [
    { index: "01", title: "Pilih dari kelas", body: "Buka papan menu, atur porsi, tulis catatan untuk dapur." },
    { index: "02", title: "Bayar di kasir", body: "Tunjukkan kode bayar. Kasir menerima QRIS atau tunai." },
    { index: "03", title: "Nomor terbit", body: "Pembayaran diterima, nomor antrean masuk jalur FIFO." },
    { index: "04", title: "Ambil saat siap", body: "Layar memanggil nomormu. Ambil di meja pengambilan." },
  ];

  function boardHud() {
    return `<div class="bb__hud">
      <div class="bb__now">
        <p class="bb__label">Sedang disiapkan</p>
        <p class="bb__value" data-live-processing data-flip>&mdash;</p>
      </div>
      <dl class="bb__rows">
        <div><dt>Siap diambil</dt><dd data-live-ready>&mdash;</dd></div>
        <div><dt>Dalam antrean</dt><dd data-live-queued>&mdash;</dd></div>
        <div><dt>Estimasi tunggu</dt><dd data-live-eta>&mdash;</dd></div>
      </dl>
      <a class="bb__link" href="#/queue">Buka layar antrean</a>
    </div>`;
  }

  function pairRow(pair) {
    return `<li class="pairrow" style="--d:__D__ms">
      <span class="pairrow__conf">
        <span class="pairrow__num">${SC.fmt.percent(pair.confidence)}</span>
        <span class="pairrow__bar">${SC.ui.meter(pair.confidence, "mint")}</span>
      </span>
      <span class="pairrow__body">
        <span class="pairrow__pair"><a href="#/menu/${esc(pair.a.id)}">${esc(pair.a.name)}</a> <em>+</em> <a href="#/menu/${esc(pair.b.id)}">${esc(pair.b.name)}</a></span>
        <span class="pairrow__meta">${SC.fmt.number(pair.count)} transaksi mencatat pasangan ini</span>
      </span>
      <button type="button" class="add-btn add-btn--sm" data-add="${esc(pair.b.id)}" aria-label="Tambah ${esc(pair.b.name)} ke keranjang">+</button>
    </li>`;
  }

  views.home = function home() {
    const dateLabel = new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date());
    const menuCount = SC.data.products.length;
    const insight = SC.recommend.insight();
    const forYou = SC.recommend.forYou(4);
    const pairs = SC.recommend.topPairs(3);
    const favorite = SC.data.list({ sort: "populer" }).slice(0, 5);

    const el = SC.dom.html(`<div data-home>
      <section class="masthead">
        <div class="shell">
          <div class="masthead__bar">
            <span>Kantin sekolah &middot; prototipe</span>
            <span>${esc(dateLabel)}</span>
            <span>edisi MVP</span>
          </div>
          <h1 class="masthead__title">
            <span class="masthead__line masthead__line--solid">Canteen</span>
            <span class="masthead__line masthead__line--hollow">Flow</span>
          </h1>
          <div class="masthead__foot">
            <p class="masthead__lead">Digitalisasi kantin sekolah: papan menu, kode bayar untuk kasir, dan antrean FIFO yang bisa dipantau dari kelas. Semua berjalan di peramban, tanpa server.</p>
            <ul class="masthead__facts">
              <li><strong data-count="${menuCount}">0</strong><span>menu aktif</span></li>
              <li><strong data-count="${insight.transactions}">0</strong><span>transaksi dianalisis AI</span></li>
              <li><strong>FIFO</strong><span>urutan diproses</span></li>
            </ul>
            <div class="masthead__cta">
              <a class="btn btn--solid" href="#/menu">Buka papan menu</a>
              <a class="btn btn--line" href="#/orders">Pesanan saya</a>
            </div>
          </div>
        </div>
      </section>

      ${SC.layout.tickerMarkup([
        "Antrean FIFO",
        "bayar di kasir",
        "kode bayar per pesanan",
        "rekomendasi AI dari pola belanja",
        "layar antrean untuk monitor kantin",
      ])}

      <section class="board-band">
        <div class="shell board-band__head" data-reveal>
          <p class="eyebrow eyebrow--night">Simulasi jalur dapur</p>
          <h2 class="board-band__title">Setiap pesanan bergerak satu arah.</h2>
          <p class="board-band__hint">Kubus bernomor pada belt mewakili pesanan nyata: antre, disiapkan, lalu siap diambil. Pandangan belt ini bisa digeser dengan kursor.</p>
        </div>
        ${SC.ui.stageMarkup("board")}
        ${boardHud()}
      </section>

      <section class="band">
        <div class="shell panel-grid">
          <div class="panel-grid__main">
            ${SC.ui.sectionHead({
              eyebrow: "Papan menu",
              title: "Paling dicari minggu ini",
              hint: "Lima menu dengan penjualan tertinggi.",
              action: { path: "/menu", label: "Semua menu" },
            })}
            <ol class="mrows" data-reveal>${SC.ui.menuRows(favorite)}</ol>
          </div>
          <aside class="panel-grid__side" data-reveal>
            <p class="eyebrow">Cara kerja AI</p>
            <ol class="pipe">
              <li><span class="pipe__no">01</span>Data pesanan</li>
              <li><span class="pipe__no">02</span>Pola pasangan menu</li>
              <li><span class="pipe__no">03</span>Rekomendasi untukmu</li>
            </ol>
            <p class="panel-grid__note">Mesin rekomendasi menghitung co-occurrence dari ${SC.fmt.number(insight.transactions)} transaksi kantin, lalu menyarankan pelengkap saat kamu memilih menu.</p>
            <a class="btn btn--line btn--wide" href="#/menu">Coba rekomendasinya</a>
          </aside>
        </div>
      </section>

      <section class="band band--paper">
        <div class="shell">
          ${SC.ui.sectionHead({
            eyebrow: "Rekomendasi AI",
            title: "Untukmu",
            hint: "Berubah mengikuti riwayat pesanan di perangkat ini.",
          })}
          <div class="ai-grid">
            <div data-reveal>
              <p class="ai-grid__label">Disusun dari kebiasaanmu</p>
              ${SC.ui.recList(forYou)}
            </div>
            <div data-reveal>
              <p class="ai-grid__label">Pasangan terkuat kantin</p>
              <ol class="pairrows">${
                pairs.length
                  ? pairs.map((pair, index) => pairRow(pair).replace("__D__", String(index * 70))).join("")
                  : '<li class="pairrow pairrow--empty">Belum ada pasangan yang cukup kuat.</li>'
              }</ol>
              <p class="ai-grid__note">Persentase dihitung dari porsi pesanan yang memuat salah satu menu lalu menambahkan pasangannya.</p>
            </div>
          </div>
        </div>
      </section>

      <section class="band">
        <div class="shell">
          ${SC.ui.sectionHead({
            eyebrow: "Alur pemesanan",
            title: "Empat langkah",
            hint: "Dari meja kelas sampai meja pengambilan.",
          })}
          <ol class="flow" data-reveal>
            ${STEPS.map(
              (step) =>
                `<li class="flow__step"><span class="flow__no">${step.index}</span><h3 class="flow__title">${esc(step.title)}</h3><p class="flow__body">${esc(step.body)}</p></li>`
            ).join("")}
          </ol>
        </div>
      </section>

      <section class="manifest">
        <div class="shell manifest__grid">
          <div data-reveal>
            <p class="eyebrow eyebrow--night">Status sistem</p>
            <h2 class="manifest__title">Sudah berjalan</h2>
            <ul class="manifest__list">
              <li>Papan menu, pencarian, filter, dan kelola stok</li>
              <li>Kode bayar dan konfirmasi pembayaran kasir</li>
              <li>Antrean FIFO dengan layar monitor kantin</li>
              <li>Rekomendasi AI dari pola transaksi</li>
            </ul>
          </div>
          <div data-reveal>
            <p class="eyebrow eyebrow--night">Menyusul</p>
            <h2 class="manifest__title manifest__title--muted">Tahap lanjut</h2>
            <ul class="manifest__list manifest__list--muted">
              <li>QRIS asli lewat payment gateway</li>
              <li>Notifikasi push saat siap diambil</li>
              <li>Analitik penjualan harian</li>
              <li>Kamera AI untuk memantau kepadatan kantin</li>
            </ul>
          </div>
        </div>
      </section>
    </div>`);

    let stopOrders = null;
    let stage = null;

    function paintLive() {
      const board = SC.orders.board();
      const processing = board.processing[0];
      const line = (name) => SC.dom.qs(`[data-live-${name}]`, el);
      const now = line("processing");

      if (now) {
        const next = processing ? processing.number : "\u2014";
        if (now.textContent !== next) {
          now.textContent = next;
          if (processing) SC.motion.flip(now);
        }
      }

      const ready = line("ready");
      if (ready) ready.textContent = board.ready.length ? board.ready.map((order) => order.number).join(" ") : "\u2014";

      const queued = line("queued");
      if (queued) queued.textContent = board.queued.length ? `${SC.fmt.number(board.queued.length)} pesanan` : "kosong";

      const eta = line("eta");
      if (eta) eta.textContent = board.activeCount ? `\u00b1 ${SC.fmt.number(board.eta)} menit` : "\u2014";

      if (stage) stage.refresh();
    }

    return {
      name: "home",
      title: "CanteenFlow AI — Pesan kantin tanpa antre",
      announce: "Beranda CanteenFlow AI",
      el,
      mount() {
        paintLive();
        stopOrders = SC.orders.subscribe(paintLive);
        stage = SC.ui.attachStage(SC.dom.qs("[data-stage]", el), () => SC.ui.fifoShape(SC.orders.board()));
      },
      destroy() {
        if (stopOrders) stopOrders();
        if (stage) stage.destroy();
      },
    };
  };
})(window.SC || (window.SC = {}));
