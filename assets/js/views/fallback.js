(function (SC) {
  "use strict";

  const views = (SC.views = SC.views || {});
  const { esc } = SC.dom;

  function plain(config) {
    return {
      name: "plain",
      title: `${config.title} — CanteenFlow AI`,
      announce: config.announce || config.title,
      el: SC.dom.html(`
        <section class="shell">
          <div class="plain" data-reveal>
            ${config.eyebrow ? `<p class="eyebrow">${esc(config.eyebrow)}</p>` : ""}
            <h1 class="plain__title">${esc(config.title)}</h1>
            ${config.lead ? `<p class="plain__lead">${esc(config.lead)}</p>` : ""}
            ${config.items ? `<ul class="plain__list">${config.items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>` : ""}
            <div class="plain__cta">
              <a class="btn ${config.actionStyle || "btn--solid"}" href="#${config.actionPath || "/"}">${esc(config.actionLabel || "Kembali ke beranda")}</a>
            </div>
          </div>
        </section>
      `),
    };
  }

  views.notFound = function notFound() {
    return plain({
      eyebrow: "404",
      title: "Halaman tidak ditemukan",
      lead: "Alamat yang kamu buka tidak ada di prototype ini. Gunakan navigasi untuk kembali ke alur pemesanan.",
      items: ["Beranda menampilkan jalur dapur dan rekomendasi AI", "Papan menu memuat seluruh katalog dan filter kategori"],
      actionPath: "/",
      actionLabel: "Kembali ke beranda",
    });
  };

  views.error = function error(ctx, cause) {
    return plain({
      eyebrow: "Galat",
      title: "Terjadi kesalahan saat memuat halaman",
      lead: `Rute ${ctx && ctx.path ? ctx.path : "-"} gagal dirender. Buka konsol peramban untuk melihat detail teknisnya.`,
      items: [cause && cause.message ? cause.message : "Penyebab tidak diketahui"],
      actionPath: "/",
      actionLabel: "Kembali ke beranda",
    });
  };
})(window.SC || (window.SC = {}));
