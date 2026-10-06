(function (SC) {
  "use strict";

  const views = (SC.views = SC.views || {});

  function shell(options) {
    const el = SC.dom.html(`<div class="shell">
      <div class="nf">
        <p class="nf__code">${options.code}</p>
        <div data-flap></div>
        <h1 class="nf__title">${options.title}</h1>
        <p>${options.body}</p>
        <div class="hero__cta hero__cta--center">
          <a class="btn btn--solid" href="#/">Ke beranda</a>
          <a class="btn btn--line" href="#/menu">Buka menu</a>
        </div>
      </div>
    </div>`);
    const board = SC.flap.create(options.board, { className: "flap--amber" });
    SC.dom.qs("[data-flap]", el).appendChild(board);
    return el;
  }

  views.notFound = function notFound() {
    return {
      name: "tidak-ditemukan",
      title: "Halaman tidak ditemukan — QuickBite",
      announce: "Halaman tidak ditemukan",
      el: shell({
        code: "kode 404",
        board: "A404",
        title: "Nomor ini tidak ada di papan",
        body: "Alamat yang kamu tuju tidak terdaftar di papan antrean. Kembali ke beranda atau pilih menu untuk mengambil nomor baru.",
      }),
    };
  };

  views.error = function error(ctx, err) {
    return {
      name: "galat",
      title: "Terjadi galat — QuickBite",
      announce: "Terjadi galat",
      el: shell({
        code: "kode 500",
        board: "A500",
        title: "Sistem tersendat",
        body: `Halaman gagal disusun: ${err && err.message ? err.message : "penyebab tidak diketahui"}. Coba muat ulang atau kembali ke beranda.`,
      }),
    };
  };
})(window.SC || (window.SC = {}));
