(function (SC) {
  "use strict";

  const views = (SC.views = SC.views || {});
  const { esc } = SC.dom;

  const STEPS = [
    { no: "01", title: "Pilih menu", body: "Menentukan berapa lama dapur bekerja." },
    { no: "02", title: "Kunci nomor", body: "Nomor masuk jalur FIFO, bukan antrean fisik." },
    { no: "03", title: "Pantau posisi", body: "Posisi dan estimasi bergerak setiap pesanan selesai." },
    { no: "04", title: "Datang saat giliran", body: "Panggilan muncul di posisi tiga dan satu." },
  ];

  function forecastSlot(slot, options) {
    const settings = options || {};
    const note = settings.now ? esc(slot.note || "") : `${slot.count} pesanan`;
    return `<div class="forecast__slot"${settings.now ? ' data-now="true"' : ""}${settings.best ? ' data-best="true"' : ""}>
      <p class="forecast__time">${esc(slot.label)}</p>
      <p class="forecast__val">${SC.fmt.eta(slot.wait)}</p>
      <p class="forecast__note">${note}</p>
    </div>`;
  }

  views.home = function home() {
    const insight = SC.analytics.insight();
    const fastest = SC.data.fastest(4);

    const el = SC.dom.html(`<div>
      <section class="hero" data-spot>
        <div class="shell hero__grid">
          <div>
            <p class="eyebrow"><span class="dot"></span> papan langsung kantin</p>
            <h1 class="hero__title" data-rise="mask">Antrean kantin, tanpa berdiri di depan loket.</h1>
            <p class="hero__sub" data-rise>
              Pilih menu, ambil nomor, lalu kembali saat giliranmu mendekat. Estimasi dihitung dari waktu layan tiap menu,
              jumlah petugas, dan catatan layanan hari ini.
            </p>
            <div class="hero__cta" data-rise>
              <a class="btn btn--solid" data-magnet href="#/menu">Ambil nomor antrean</a>
              <a class="btn btn--line" data-magnet href="#/papan">Buka papan kantin</a>
            </div>
            <div class="hero__flag" data-flag data-rise></div>
          </div>
          <div class="hero__stage" data-rise="scale">
            <div class="stage" data-stage>
              <p class="stage__corner"><span class="dot"></span> unit papan mekanis</p>
              <div class="stage__fallback" data-fallback>
                <p class="stage__caption">nomor sedang dilayani</p>
              </div>
            </div>
            <div class="stage__specs">
              <span class="chip">4 modul &middot; 37 flap</span>
              <span class="chip">papan fisik 3D</span>
              <span class="chip" data-v="spec-eta">&plusmn; 0 mnt</span>
            </div>
            <p class="stage__note">Geser kursor di atas papan untuk mengubah sudut pandang. Papan bergetar setiap digit berganti.</p>
          </div>
        </div>
        <div class="shell">
          <dl class="instr mt-2" data-cols="4" data-rise="lift" data-stagger="70">
            <div class="instr__cell">
              <dt>Menunggu</dt>
              <dd><span data-v="waiting">0</span><small>orang</small></dd>
            </div>
            <div class="instr__cell">
              <dt>Estimasi tunggu</dt>
              <dd data-tone="amber"><span data-v="eta">tanpa tunggu</span></dd>
            </div>
            <div class="instr__cell">
              <dt>Petugas paralel</dt>
              <dd><span data-v="servers">2</span><small>dapur</small></dd>
            </div>
            <div class="instr__cell">
              <dt>Kondisi</dt>
              <dd><span data-v="crowd">NORMAL</span></dd>
            </div>
          </dl>
        </div>
      </section>

      <section class="band">
        <div class="shell">
          <div class="sechead" data-rise>
            <div>
              <p class="eyebrow">prakiraan</p>
              <h2 class="sechead__title">Kapan sebaiknya datang</h2>
              <p class="sechead__hint">Disusun dari pola permintaan tujuh hari terakhir dan sisa layanan yang sedang berjalan.</p>
            </div>
            <div class="sechead__side">
              <span class="chip" data-tone="calm" data-v="reco">SEKARANG</span>
            </div>
          </div>
          <div class="forecast" data-forecast data-rise="lift"></div>
        </div>
      </section>

      <section class="band">
        <div class="shell grid2">
          <div data-rise>
            <div class="sechead">
              <div>
                <p class="eyebrow">paling cepat</p>
                <h2 class="sechead__title">Menu dengan waktu layan pendek</h2>
              </div>
              <div class="sechead__side">
                <a class="btn btn--line btn--sm" href="#/menu">Semua menu</a>
              </div>
            </div>
            <ul class="menulist" data-stagger="45">${fastest.map((product, index) => SC.parts.menuRow(product, index + 1)).join("")}</ul>
          </div>
          <details class="fold" data-rise>
            <summary>Bagaimana angka ini dihitung</summary>
            <div class="fold__body stack stack--sm">
              <p class="svcnote">Estimasi tunggu = sisa waktu layanan di depan dibagi jumlah petugas, lalu dikalikan faktor kalibrasi dapur.</p>
              <dl class="mini">
                <div class="mini__row"><dt>Sisa layanan di depan</dt><dd data-v="ahead">0 mnt</dd></div>
                <div class="mini__row"><dt>Petugas paralel</dt><dd data-v="servers2">2</dd></div>
                <div class="mini__row"><dt>Faktor kalibrasi</dt><dd data-v="factor">1,00&times;</dd></div>
                <div class="mini__row"><dt>Estimasi tunggu</dt><dd data-v="ewt">tanpa tunggu</dd></div>
              </dl>
              <p class="svcnote">Faktor dibaca dari catatan layanan selesai hari ini dan model ${SC.fmt.number(
                insight.tickets
              )} pesanan sepekan.</p>
              <a class="btn btn--line btn--wide" href="#/papan/analitik">Buka analitik</a>
            </div>
          </details>
        </div>
      </section>

      <section class="band">
        <div class="shell">
          <div class="sechead" data-rise>
            <div>
              <p class="eyebrow">alur</p>
              <h2 class="sechead__title">Empat langkah</h2>
            </div>
          </div>
          <ol class="steps" data-rise="lift" data-stagger="60">
            ${STEPS.map(
              (step) =>
                `<li class="steps__item"><span class="steps__no">${step.no}</span><h3 class="steps__title">${esc(
                  step.title
                )}</h3><p class="steps__body">${esc(step.body)}</p></li>`
            ).join("")}
          </ol>
        </div>
      </section>
    </div>`);

    const fallbackHost = SC.dom.qs("[data-fallback]", el);
    let fallbackBoard = null;
    let stage = null;
    let unsubscribe = null;

    function value(key) {
      return SC.dom.qs(`[data-v="${key}"]`, el);
    }

    function paintFlag() {
      const host = SC.dom.qs("[data-flag]", el);
      const mine = SC.queue.mine(false)[0] || null;
      if (mine) {
        const state = SC.estimator.ticketState(mine);
        host.innerHTML = `<div class="pkbanner">
          <span class="pkbanner__no">${esc(mine.number)}</span>
          <div class="pkbanner__body">
            <p class="notice__title">${esc(state.text)}</p>
            <p>${esc(SC.parts.itemsSummary(mine))}</p>
          </div>
          <a class="btn btn--line btn--sm" href="#/tiket/${esc(mine.id)}">Buka tiket</a>
        </div>`;
        return;
      }
      const crowd = SC.estimator.crowd();
      const rec = SC.estimator.recommendation();
      const tone = crowd.tone === "coral" ? "coral" : crowd.tone === "mint" ? "mint" : "amber";
      const body = rec.crowded
        ? rec.text
        : `Estimasi nomor baru ${SC.fmt.eta(crowd.eta)} dengan ${crowd.processing} pesanan di dapur.`;
      host.innerHTML = `<div class="notice" data-tone="${tone}">
        <div>
          <p class="notice__title">${esc(crowd.label)} &middot; ${esc(crowd.advice)}</p>
          <p class="notice__body">${esc(body)}</p>
        </div>
      </div>`;
    }

    function paintForecast() {
      const host = SC.dom.qs("[data-forecast]", el);
      const crowd = SC.estimator.crowd();
      const slots = SC.analytics.forecast(5);
      const best = slots.length
        ? slots.reduce((winner, slot) => (slot.wait < winner.wait ? slot : winner), slots[0])
        : null;
      host.innerHTML =
        forecastSlot(
          {
            label: SC.fmt.clock(SC.queue.minutesOfDay()),
            wait: crowd.eta,
            count: crowd.waiting,
            note: `kondisi ${crowd.label.toLowerCase()}`,
          },
          { now: true }
        ) +
        slots.map((slot) => forecastSlot(slot, { best: Boolean(best && slot.index === best.index) })).join("");
      const tag = value("reco");
      if (tag) {
        if (best && crowd.level === "ramai") {
          tag.dataset.tone = "peak";
          tag.textContent = `DISARANKAN ${best.label}`;
        } else {
          tag.dataset.tone = "calm";
          tag.textContent = "SEKARANG WAKTU TEPAT";
        }
      }
    }

    function paintBoard() {
      const summary = SC.queue.summary();
      const crowd = SC.estimator.crowd();
      const calibration = SC.analytics.calibration();
      const set = (key, text) => {
        const node = value(key);
        if (node) node.textContent = text;
      };
      set("waiting", SC.fmt.number(summary.waiting.length));
      set("eta", SC.fmt.eta(crowd.eta));
      set("servers", String(summary.servers));
      set("crowd", crowd.label);
      set("spec-eta", SC.fmt.eta(crowd.eta));

      const cell = SC.dom.qs('[data-v="crowd"]', el);
      if (cell && cell.parentElement) {
        cell.parentElement.dataset.tone = crowd.tone === "mint" ? "mint" : crowd.tone === "coral" ? "coral" : "amber";
      }

      const ahead = SC.queue
        .active()
        .reduce((sum, ticket) => sum + SC.estimator.remaining(ticket, summary.clock), 0);
      set("ahead", SC.fmt.minutes(ahead));
      set("servers2", String(summary.servers));
      set("factor", `${calibration.factor.toFixed(2).replace(".", ",")}×`);
      set("ewt", SC.fmt.eta(crowd.eta));

      const serving = SC.queue.nowServing();
      const text = serving ? serving.number : "A---";
      if (stage) stage.set(text);
      if (fallbackBoard) fallbackBoard.set(text);
    }

    function paint() {
      paintFlag();
      paintForecast();
      paintBoard();
    }

    return {
      name: "beranda",
      title: "QuickBite — antrean kantin tanpa berdiri",
      announce: "Beranda QuickBite",
      el,
      mount() {
        fallbackBoard = SC.flap.create("A---", { className: "flap--lg flap--amber", stagger: 90 });
        fallbackHost.appendChild(fallbackBoard);
        stage = SC.stage.mount(SC.dom.qs("[data-stage]", el));
        paint();
        unsubscribe = SC.queue.subscribe(paint);
      },
      destroy() {
        if (unsubscribe) unsubscribe();
        if (stage) stage.destroy();
      },
    };
  };
})(window.SC || (window.SC = {}));
