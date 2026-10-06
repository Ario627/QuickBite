(function (SC) {
  "use strict";

  const { esc } = SC.dom;

  function menuRow(product, index) {
    const disabled = product.available ? "" : " disabled";
    const label = product.available ? `Tambah ${product.name}` : `${product.name} habis`;
    return `<li class="mrow" data-row="${esc(product.id)}" data-off="${String(!product.available)}">
      <span class="mrow__idx">${SC.fmt.pad(index, 2)}</span>
      <span>
        <span class="mrow__name">${esc(product.name)}</span>
        <span class="mrow__meta">
          <span class="mrow__svc">&plusmn; ${SC.fmt.minutes(product.service)} layan</span>
          <span>${esc(SC.data.category(product.category).label)}</span>
        </span>
      </span>
      <span class="mrow__side">
        <span class="mrow__price">${esc(SC.fmt.currency(product.price))}</span>
        <button type="button" class="mrow__add" data-add="${esc(product.id)}"${disabled} aria-label="${esc(label)}">+</button>
      </span>
    </li>`;
  }

  function chip(status) {
    const meta = SC.config.labels[status] || { text: status, tone: "done" };
    return `<span class="chip" data-tone="${meta.tone}">${esc(meta.text)}</span>`;
  }

  function queueRow(ticket, options) {
    const settings = options || {};
    if (ticket.status === "COMPLETED" || ticket.status === "CANCELLED") {
      return `<li class="qrow" data-tone="done">
        <span class="qrow__no">${esc(ticket.number)}</span>
        <span class="qrow__mark">${ticket.status === "COMPLETED" ? "&#10003;" : "&#215;"}</span>
        <span class="qrow__meta">${esc((SC.config.labels[ticket.status] || {}).text || ticket.status)}</span>
      </li>`;
    }
    if (ticket.status === "READY") {
      return `<li class="qrow" data-tone="ready">
        <span class="qrow__no">${esc(ticket.number)}</span>
        <span class="qrow__mark">&#10003;</span>
        <span class="qrow__meta">siap diambil</span>
      </li>`;
    }
    if (ticket.status === "PROCESSING") {
      return `<li class="qrow" data-tone="process">
        <span class="qrow__no">${esc(ticket.number)}</span>
        <span class="qrow__mark">&#9679;</span>
        <span class="qrow__meta">sedang disiapkan</span>
      </li>`;
    }
    const position = SC.estimator.position(ticket);
    const mine = settings.mine ? " data-tone=\"mine\"" : "";
    return `<li class="qrow"${mine}>
      <span class="qrow__no">${esc(ticket.number)}${settings.mine ? '<span class="qrow__tag">&larr; kamu</span>' : ""}</span>
      <span class="qrow__mark">&middot;</span>
      <span class="qrow__meta">posisi ${position}</span>
    </li>`;
  }

  function itemsSummary(ticket) {
    return ticket.items.map((item) => `${item.qty}&times; ${esc(item.name)}`).join(", ");
  }

  function boardWindow(tickets, limit) {
    const list = tickets.slice(0, limit || 6);
    if (!list.length) return '<li class="qrow"><span class="qrow__no">&mdash;</span><span class="qrow__meta">papan bersih</span></li>';
    return list.map((ticket) => queueRow(ticket)).join("");
  }

  SC.parts = { menuRow, chip, queueRow, itemsSummary, boardWindow };
})(window.SC || (window.SC = {}));
