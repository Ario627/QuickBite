(function (SC) {
  "use strict";

  const views = (SC.views = SC.views || {});
  const { esc } = SC.dom;

  views.analytics = function analyticsPage(ctx) {
    const el = SC.dom.html(`<div>
      <div class="shell">
        <header class="page__head">
          <p class="eyebrow">Analitik kantin</p>
          <h1 class="page__title">Pola permintaan &amp; kalibrasi model</h1>
          <p class="page__sub">Halaman ini membaca catatan simulasi sepekan plus tiket nyata yang selesai hari ini. Semua angka dipakai memperbaiki estimasi tunggu.</p>
        </header>
        ${SC.layout.adminNav(ctx.path)}
        <dl class="instr" data-cols="4" data-rise>
          <div class="instr__cell"><dt>Pesanan hari ini</dt><dd data-v="total">0<small>tiket</small></dd></div>
          <div class="instr__cell"><dt>Rata-rata tunggu</dt><dd data-v="wait">0<small>menit</small></dd></div>
          <div class="instr__cell"><dt>Rata-rata layan</dt><dd data-v="service">0<small>menit per tiket</small></dd></div>
          <div class="instr__cell"><dt>Jam tersibuk</dt><dd data-v="peak">—<small>per 30 menit</small></dd></div>
        </dl>
        <div class="grid2 mt-1">
          <section class="panel" data-rise="lift">
            <div class="panel__head">
              <div>
                <h2 class="panel__title">Permintaan per 30 menit</h2>
                <p class="panel__hint">Batang merah menandai blok waktu sekarang, kuning menandai puncak hari ini.</p>
              </div>
            </div>
            <div class="panel__body">
              <div class="bars" data-bars></div>
            </div>
          </section>
          <section class="panel" data-rise="lift">
            <div class="panel__head">
              <div>
                <h2 class="panel__title">Pola tujuh hari</h2>
                <p class="panel__hint">Semakin pekat selnya, semakin ramai. Kolom terakhir hari ini.</p>
              </div>
            </div>
            <div class="panel__body stack stack--sm">
              <div class="scrollx"><div class="heat" data-heat></div></div>
              <p class="svcnote">Puncak konsisten di sekitar blok 12:00. Setelah 12:30 permintaan turun cepat, cocok untuk istirahat kedua.</p>
            </div>
          </section>
        </div>
        <div class="grid2 mt-1">
          <section class="panel" data-rise="lift">
            <div class="panel__head">
              <div>
                <h2 class="panel__title">Kalibrasi model</h2>
                <p class="panel__hint">Perbandingan perkiraan waktu menu dengan durasi nyata yang tercatat.</p>
              </div>
            </div>
            <div class="panel__body stack stack--sm">
              <dl class="mini">
                <div class="mini__row"><dt>Perkiraan rata-rata menu</dt><dd data-v="model">&plusmn; 0 mnt</dd></div>
                <div class="mini__row"><dt>Durasi nyata tercatat</dt><dd data-v="actual">—</dd></div>
                <div class="mini__row"><dt>Faktor kalibrasi</dt><dd data-v="factor">1,00&times;</dd></div>
                <div class="mini__row"><dt>Contoh tercatat</dt><dd data-v="samples">0 tiket</dd></div>
              </dl>
              <p class="svcnote">Faktor dipakai langsung di rumus <code>EWT</code>: sisa layanan di depan dibagi petugas lalu dikalikan faktor ini. Dengan begitu estimasi ikut menyesuaikan diri saat dapur lebih cepat atau lebih lambat dari perkiraan menu.</p>
            </div>
          </section>
          <section class="panel" data-rise="lift">
            <div class="panel__head">
              <div>
                <h2 class="panel__title">Pasangan menu terkuat</h2>
                <p class="panel__hint">Dasar saran "sering dipesan bersama" di halaman menu.</p>
              </div>
            </div>
            <div class="panel__body">
              <div class="pairs" data-pairs></div>
            </div>
          </section>
        </div>
      </div>
    </div>`);

    function paint() {
      const today = SC.analytics.today();
      const calibration = SC.analytics.calibration();
      const set = (key, value, small) => {
        const node = SC.dom.qs(`[data-v="${key}"]`, el);
        if (!node) return;
        node.firstChild.textContent = String(value);
        if (small) {
          const smallNode = node.querySelector("small");
          if (smallNode) smallNode.textContent = small;
        }
      };
      set("total", SC.fmt.number(today.total), "tiket");
      set("wait", SC.fmt.number(Math.round(today.wait)), "menit");
      set("service", today.service.toFixed(1).replace(".", ","), "menit per tiket");
      set("peak", today.peak ? today.peak.label : "—", "per 30 menit");
      set("model", `± ${calibration.model.toFixed(1).replace(".", ",")} mnt`);
      set("actual", calibration.actual != null ? `± ${calibration.actual.toFixed(1).replace(".", ",")} mnt` : "—");
      set("factor", `${calibration.factor.toFixed(2).replace(".", ",")}×`);
      set("samples", `${calibration.samples} tiket`);

      const barsHost = SC.dom.qs("[data-bars]", el);
      const max = Math.max(1, ...today.bins.map((bin) => bin.count));
      const nowBin = SC.analytics.nowIndex();
      barsHost.innerHTML = today.bins
        .map(
          (bin) => `<div class="bars__item" data-peak="${String(today.peak && bin.index === today.peak.index)}" data-now="${String(bin.index === nowBin)}">
            <div class="bars__col"><i data-grow="${Math.max(4, Math.round((bin.count / max) * 100))}"></i></div>
            <p class="bars__label">${esc(bin.label)}</p>
          </div>`
        )
        .join("");

      const heatHost = SC.dom.qs("[data-heat]", el);
      const rows = SC.analytics.heat();
      const axis = Array.from({ length: SC.analytics.BINS }, (_, index) => {
        const label = SC.fmt.clock(SC.analytics.binStart(index));
        return `<span class="heat__axis">${index % 2 === 0 ? label : ""}</span>`;
      }).join("");
      heatHost.innerHTML =
        rows
          .map(
            (row) => `<div class="heat__row">
            <span class="heat__day">${esc(row.label)}</span>
            ${row.cells
              .map((cell) =>
                cell.future
                  ? '<span class="heat__cell heat__cell--future"></span>'
                  : `<span class="heat__cell"${cell.ratio > 0.82 ? ' data-tone="amber"' : ""} style="--o:${(0.34 + cell.ratio * 0.66).toFixed(2)}" title="${cell.count} pesanan"></span>`
              )
              .join("")}
          </div>`
          )
          .join("") + `<div class="heat__row"><span class="heat__day"></span>${axis}</div>`;

      const pairsHost = SC.dom.qs("[data-pairs]", el);
      pairsHost.innerHTML = SC.analytics
        .pairs(4)
        .map(
          (pair) => `<div class="pair">
            <div class="pair__names"><span>${esc(pair.a.name)}</span><em>+</em><span>${esc(pair.b.name)}</span></div>
            <div class="pair__foot">
              <span class="pair__conf">${SC.fmt.percent(pair.confidence)} &middot; ${pair.count}&times;</span>
              <span class="meter" data-tone="mint"><i style="--v:${Math.round(pair.confidence * 100)}%"></i></span>
            </div>
          </div>`
        )
        .join("");
    }

    let unsubscribe = null;

    return {
      name: "analitik",
      title: "Analitik — QuickBite",
      announce: "Halaman analitik kantin",
      el,
      mount() {
        paint();
        unsubscribe = SC.queue.subscribe(paint);
      },
      destroy() {
        if (unsubscribe) unsubscribe();
      },
    };
  };
})(window.SC || (window.SC = {}));
