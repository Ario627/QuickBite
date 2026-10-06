(function (SC) {
  "use strict";

  const SEEDS = [
    { items: ["nasi-goreng", "es-teh"], weight: 30 },
    { items: ["nasi-goreng", "kerupuk"], weight: 12 },
    { items: ["nasi-goreng", "es-jeruk"], weight: 6 },
    { items: ["nasi-goreng"], weight: 8 },
    { items: ["mie-goreng", "es-teh"], weight: 22 },
    { items: ["mie-goreng", "tahu-isi"], weight: 9 },
    { items: ["mie-goreng"], weight: 6 },
    { items: ["ayam-geprek", "es-teh"], weight: 20 },
    { items: ["ayam-geprek", "kerupuk"], weight: 8 },
    { items: ["ayam-geprek"], weight: 5 },
    { items: ["bakso-urat", "es-teh"], weight: 14 },
    { items: ["bakso-urat", "kerupuk"], weight: 6 },
    { items: ["nasi-uduk", "es-teh"], weight: 9 },
    { items: ["nasi-uduk", "air-mineral"], weight: 5 },
    { items: ["sate-ayam", "es-teh"], weight: 7 },
    { items: ["sate-ayam", "risoles"], weight: 4 },
    { items: ["pisang-keju", "es-teh"], weight: 6 },
    { items: ["pisang-keju", "kopi-aren"], weight: 5 },
    { items: ["risoles", "es-jeruk"], weight: 5 },
    { items: ["tahu-isi", "es-jeruk"], weight: 5 },
    { items: ["es-campur", "risoles"], weight: 3 },
    { items: ["es-teh", "kerupuk"], weight: 10 },
    { items: ["air-mineral"], weight: 4 },
  ];

  const FALLBACK = {
    "nasi-goreng": ["es-teh", "kerupuk"],
    "mie-goreng": ["es-teh", "tahu-isi"],
    "ayam-geprek": ["es-teh", "kerupuk"],
    "bakso-urat": ["es-jeruk", "kerupuk"],
    "nasi-uduk": ["air-mineral", "tahu-isi"],
    "sate-ayam": ["es-teh", "risoles"],
  };

  let cache = null;

  SC.orders.subscribe(() => {
    cache = null;
  });

  function pairKey(a, b) {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
  }

  function nameOf(id) {
    const product = SC.data.byId(id);
    return product ? product.name : id;
  }

  function collect() {
    const singles = new Map();
    const pairs = new Map();
    let transactions = 0;

    function feed(rawItems) {
      const items = Array.from(new Set(rawItems.filter((id) => SC.data.byId(id))));
      if (!items.length) return;
      transactions += 1;
      items.forEach((id) => singles.set(id, (singles.get(id) || 0) + 1));
      for (let first = 0; first < items.length; first += 1) {
        for (let second = first + 1; second < items.length; second += 1) {
          const key = pairKey(items[first], items[second]);
          pairs.set(key, (pairs.get(key) || 0) + 1);
        }
      }
    }

    SEEDS.forEach((seed) => {
      for (let count = 0; count < seed.weight; count += 1) feed(seed.items);
    });
    SC.orders.list().forEach((order) => feed(order.items.map((item) => item.productId)));

    return { singles, pairs, transactions };
  }

  function stats() {
    if (!cache) cache = collect();
    return cache;
  }

  function available(productId) {
    const product = SC.data.byId(productId);
    return Boolean(product && product.available);
  }

  function related(id) {
    const { pairs, singles } = stats();
    const base = singles.get(id) || 0;
    const rows = [];
    pairs.forEach((count, key) => {
      const parts = key.split("|");
      if (parts[0] !== id && parts[1] !== id) return;
      const other = parts[0] === id ? parts[1] : parts[0];
      if (!available(other)) return;
      rows.push({ id: other, count, confidence: base ? count / base : 0 });
    });
    return rows.sort((a, b) => b.count - a.count || b.confidence - a.confidence);
  }

  function toRec(row, via, reason) {
    return {
      product: SC.data.byId(row.id),
      count: row.count,
      confidence: row.confidence == null ? null : row.confidence,
      via,
      reason,
    };
  }

  function popular(limit) {
    return SC.data
      .list({ sort: "populer" })
      .filter((product) => product.available)
      .slice(0, limit)
      .map((product) =>
        toRec({ id: product.id, count: product.sold }, null, "paling banyak dipesan di kantin")
      );
  }

  function forProduct(id, limit) {
    const cap = limit || 3;
    const anchor = SC.data.byId(id);
    const picked = new Map();
    const result = [];

    related(id).forEach((row) => {
      if (result.length >= cap || picked.has(row.id)) return;
      picked.set(row.id, true);
      result.push(
        toRec(
          row,
          id,
          anchor
            ? `${SC.fmt.percent(row.confidence)} dari ${SC.fmt.number(stats().singles.get(id) || 0)} pesanan ${anchor.name} menambahkan ini`
            : "sering dibeli bersama menu ini"
        )
      );
    });

    (FALLBACK[id] || []).forEach((alt) => {
      if (result.length >= cap || picked.has(alt) || !available(alt)) return;
      picked.set(alt, true);
      result.push(toRec({ id: alt, count: 0, confidence: null }, id, "biasanya dipilih bersama menu ini"));
    });

    if (result.length < cap && anchor) {
      SC.data
        .list({ category: anchor.category, sort: "populer" })
        .forEach((product) => {
          if (result.length >= cap || product.id === id || picked.has(product.id) || !product.available) return;
          picked.set(product.id, true);
          result.push(
            toRec({ id: product.id, count: product.sold, confidence: null }, null, "pilihan populer di kategori ini")
          );
        });
    }

    return result;
  }

  function forCart(lines, limit) {
    const cap = limit || 4;
    const ids = Array.from(new Set(lines.map((line) => line.productId)));
    if (!ids.length) return popular(cap);

    const scores = new Map();
    ids.forEach((anchorId) => {
      related(anchorId).forEach((row) => {
        if (ids.includes(row.id)) return;
        const entry = scores.get(row.id) || { count: 0, best: null };
        if (!entry.best || row.count > entry.best.count) {
          entry.best = { count: row.count, confidence: row.confidence, via: anchorId };
        }
        entry.count += row.count;
        scores.set(row.id, entry);
      });
    });

    const result = Array.from(scores.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, cap)
      .map(([productId, entry]) =>
        toRec(
          { id: productId, count: entry.count, confidence: entry.best.confidence },
          entry.best.via,
          `sering ditambahkan bersama ${nameOf(entry.best.via)}`
        )
      );

    popular(cap).forEach((rec) => {
      if (result.length >= cap || ids.includes(rec.product.id) || result.some((row) => row.product.id === rec.product.id)) return;
      result.push(rec);
    });

    return result.slice(0, cap);
  }

  function forYou(limit) {
    const cap = limit || 4;
    const mine = SC.orders.list().filter((order) => !order.demo);
    const freq = new Map();

    mine.slice(0, 12).forEach((order, index) => {
      const weight = Math.max(1, 6 - index);
      order.items.forEach((item) => {
        freq.set(item.productId, (freq.get(item.productId) || 0) + weight);
      });
    });

    if (!freq.size) {
      return popular(cap).map((rec) =>
        Object.assign({}, rec, { reason: "paling banyak dipesan minggu ini" })
      );
    }

    const anchors = Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, weight]) => ({ id, weight }));

    const scores = new Map();
    anchors.forEach((anchor) => {
      related(anchor.id).forEach((row) => {
        const entry = scores.get(row.id) || { score: 0, best: null };
        const score = row.count * (1 + anchor.weight / 4);
        if (!entry.best || row.count > entry.best.count) {
          entry.best = { count: row.count, confidence: row.confidence, via: anchor.id };
        }
        entry.score += score;
        scores.set(row.id, entry);
      });
    });

    const result = Array.from(scores.entries())
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, cap)
      .map(([productId, entry]) =>
        toRec(
          { id: productId, count: entry.best.count, confidence: entry.best.confidence },
          entry.best.via,
          freq.has(productId)
            ? `sering kamu pesan bersama ${nameOf(entry.best.via)}`
            : `cocok dengan ${nameOf(entry.best.via)} yang sering kamu pesan`
        )
      );

    popular(cap).forEach((rec) => {
      if (result.length >= cap || result.some((row) => row.product.id === rec.product.id)) return;
      result.push(rec);
    });

    return result.slice(0, cap);
  }

  function insight() {
    const { pairs, singles, transactions } = stats();
    let top = null;
    pairs.forEach((count, key) => {
      const parts = key.split("|");
      const first = singles.get(parts[0]) || 0;
      const second = singles.get(parts[1]) || 0;
      const confidence = Math.max(count / (first || 1), count / (second || 1));
      if (!top || count > top.count) top = { a: parts[0], b: parts[1], count, confidence };
    });

    if (!top) return { transactions, top: null };
    return {
      transactions,
      top: {
        a: SC.data.byId(top.a),
        b: SC.data.byId(top.b),
        count: top.count,
        confidence: top.confidence,
      },
    };
  }

  function topPairs(limit) {
    const { pairs, singles } = stats();
    const rows = [];
    pairs.forEach((count, key) => {
      const parts = key.split("|");
      const a = SC.data.byId(parts[0]);
      const b = SC.data.byId(parts[1]);
      if (!a || !b || !a.available || !b.available) return;
      const base = Math.max(singles.get(parts[0]) || 1, singles.get(parts[1]) || 1);
      rows.push({ a, b, count, confidence: count / base });
    });
    return rows
      .sort((x, y) => y.count - x.count || y.confidence - x.confidence)
      .slice(0, limit || 3);
  }

  SC.recommend = { forProduct, forCart, forYou, insight, topPairs, stats };
})(window.SC || (window.SC = {}));
