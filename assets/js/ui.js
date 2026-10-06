(function (SC) {
  "use strict";

  const { esc } = SC.dom;
  const { currency, number } = SC.fmt;

  const STATUS = {
    CREATED: { label: "Dibuat", tone: "created" },
    WAITING_PAYMENT: { label: "Menunggu pembayaran", tone: "waiting" },
    PAID: { label: "Dibayar", tone: "paid" },
    QUEUED: { label: "Dalam antrean", tone: "queued" },
    PROCESSING: { label: "Sedang disiapkan", tone: "processing" },
    READY: { label: "Siap diambil", tone: "ready" },
    COMPLETED: { label: "Selesai", tone: "completed" },
  };

  function statusPill(status) {
    const meta = STATUS[status] || STATUS.CREATED;
    return `<span class="st st--${meta.tone}">${esc(meta.label)}</span>`;
  }

  function art(product, options) {
    const settings = options || {};
    const category = SC.data.categoryOf(product.category);
    return `<span class="art art--${esc(product.category)}${settings.thumb ? " art--thumb" : ""}" aria-hidden="true">
      <span class="art__cat">${esc(category.label)}</span>
      <span class="art__idx">${esc(SC.data.code(product.id))}</span>
    </span>`;
  }

  function cardControl(product) {
    if (!product.available) {
      return `<span class="addoff">Habis</span>`;
    }
    const line = SC.cart.lineFor(product.id);
    if (!line) {
      return `<button type="button" class="add-btn" data-add="${esc(product.id)}" aria-label="Tambah ${esc(product.name)} ke keranjang">+</button>`;
    }
    return `<span class="stepper" data-stepper>
      <button type="button" data-bump="-1" data-key="${esc(line.key)}" aria-label="Kurangi ${esc(product.name)}">&minus;</button>
      <span>${line.qty}</span>
      <button type="button" data-bump="1" data-key="${esc(line.key)}" aria-label="Tambah ${esc(product.name)}">+</button>
    </span>`;
  }

  function menuRow(product) {
    const category = SC.data.categoryOf(product.category);
    const best = SC.data.isBestSeller(product.id) && product.available;
    return `<li class="mrow" data-product="${esc(product.id)}" data-off="${String(!product.available)}">
      <span class="mrow__no" aria-hidden="true">${esc(SC.data.code(product.id))}</span>
      <a class="mrow__body" href="#/menu/${esc(product.id)}">
        <span class="mrow__top">
          <span class="mrow__name">${esc(product.name)}</span>
          ${best ? '<span class="mrow__tag">terlaris</span>' : ""}
          ${product.available ? "" : '<span class="mrow__tag mrow__tag--off">habis</span>'}
        </span>
        <span class="mrow__desc">${esc(product.description)}</span>
        <span class="mrow__meta">${esc(category.label)} · ${number(product.sold)} terjual</span>
      </a>
      <span class="mrow__price">${currency(product.price)}</span>
      <span class="mrow__act" data-foot="${esc(product.id)}"><span data-slot>${cardControl(product)}</span></span>
    </li>`;
  }

  function menuRows(products) {
    return products.map(menuRow).join("");
  }

  function syncFeet(root) {
    SC.dom.qsa("[data-foot]", root || document).forEach((node) => {
      const product = SC.data.byId(node.dataset.foot);
      const slot = SC.dom.qs("[data-slot]", node);
      if (product && slot) slot.innerHTML = cardControl(product);
    });
  }

  function meter(value, tone) {
    return `<span class="meter${tone ? ` meter--${tone}` : ""}" aria-hidden="true"><i style="width:${Math.round(
      SC.fmt.clamp(value, 0, 1) * 100
    )}%"></i></span>`;
  }

  function recRow(rec) {
    const product = rec.product;
    if (!product) return "";
    return `<li class="rrow">
      <a class="rrow__link" href="#/menu/${esc(product.id)}">
        <span class="rrow__cat">${esc(SC.data.categoryOf(product.category).label)}</span>
        <span class="rrow__name">${esc(product.name)}</span>
        <span class="rrow__price">${currency(product.price)}</span>
      </a>
      <p class="rrow__why">${esc(rec.reason || "rekomendasi pilihan")}</p>
      ${
        rec.confidence == null
          ? ""
          : `<span class="rrow__conf"><span class="rrow__num">${SC.fmt.percent(rec.confidence)}</span>${meter(rec.confidence)}</span>`
      }
      <span class="rrow__act">
        ${
          product.available
            ? `<button type="button" class="add-btn add-btn--sm" data-add="${esc(product.id)}" aria-label="Tambah ${esc(product.name)} ke keranjang">+</button>`
            : '<span class="addoff">Habis</span>'
        }
      </span>
    </li>`;
  }

  function recList(recs) {
    if (!recs.length) return "";
    return `<ol class="rrows">${recs.map(recRow).join("")}</ol>`;
  }

  function chipRow(items, active, attribute) {
    return items
      .map((item) => {
        const on = item.id === active;
        return `<button type="button" class="chip${on ? " is-on" : ""}" data-${attribute}="${esc(item.id)}" aria-pressed="${on}">${esc(item.label)}</button>`;
      })
      .join("");
  }

  function pageHead(config) {
    return `<header class="page-head" data-reveal>
      ${config.eyebrow ? `<p class="eyebrow">${esc(config.eyebrow)}</p>` : ""}
      <h1 class="page-head__title">${esc(config.title)}</h1>
      ${config.lead ? `<p class="page-head__lead">${esc(config.lead)}</p>` : ""}
    </header>`;
  }

  function sectionHead(config) {
    return `<header class="sec-head" data-reveal>
      <div class="sec-head__main">
        ${config.eyebrow ? `<p class="eyebrow">${esc(config.eyebrow)}</p>` : ""}
        <h2 class="sec-head__title">${esc(config.title)}</h2>
      </div>
      ${
        config.hint || config.action
          ? `<div class="sec-head__side">
              ${config.hint ? `<p class="sec-head__hint">${esc(config.hint)}</p>` : ""}
              ${config.action ? `<a class="sec-head__action" href="#${config.action.path}">${esc(config.action.label)}</a>` : ""}
            </div>`
          : ""
      }
    </header>`;
  }

  function empty(config) {
    return `<div class="empty" data-reveal>
      <p class="empty__title">${esc(config.title)}</p>
      ${config.note ? `<p class="empty__note">${esc(config.note)}</p>` : ""}
      ${config.action ? `<button type="button" class="btn btn--line" ${config.action.attr}>${esc(config.action.label)}</button>` : ""}
    </div>`;
  }

  function stageMarkup(kind, hud) {
    return `<div class="stage stage--${esc(kind)}" data-stage>
      <div class="stage__fallback" aria-hidden="true"><span></span><span></span><span></span></div>
      ${hud || ""}
    </div>`;
  }

  function fifoShape(board) {
    const take = (list, tone) =>
      list.map((order) => ({ id: order.id, number: order.number || order.code, tone }));
    return {
      queued: take(board.queued, "queued"),
      processing: take(board.processing, "processing"),
      ready: take(board.ready, "ready"),
    };
  }

  function attachStage(host, read) {
    if (!host) return null;
    let handle = null;
    let alive = true;

    function boot() {
      if (!alive || !window.SC3D || typeof window.SC3D.mountFifo !== "function") return;
      handle = window.SC3D.mountFifo(host, {});
      if (!handle) return;
      host.classList.add("is-live");
      handle.sync(read());
    }

    if (window.SC3D) boot();
    else window.addEventListener("sc3d:ready", boot, { once: true });

    return {
      refresh() {
        if (handle) handle.sync(read());
      },
      destroy() {
        alive = false;
        window.removeEventListener("sc3d:ready", boot);
        if (handle) handle.destroy();
        handle = null;
      },
    };
  }

  SC.ui = {
    STATUS,
    statusPill,
    art,
    cardControl,
    menuRow,
    menuRows,
    syncFeet,
    meter,
    recRow,
    recList,
    chipRow,
    pageHead,
    sectionHead,
    empty,
    stageMarkup,
    fifoShape,
    attachStage,
  };
})(window.SC || (window.SC = {}));
