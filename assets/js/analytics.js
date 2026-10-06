(function (SC) {
  "use strict";

  const BINS = (SC.config.closeHour - SC.config.openHour) * (60 / SC.config.binMinutes);
  const BASE_CURVE = [2, 4, 7, 9, 10, 14, 22, 20, 8, 4];
  const DAY_FACTOR = [0.34, 1, 1, 1.04, 1, 0.94, 0.52];
  const cache = new Map();
  let pairCache = null;

  function rng(seed) {
    let value = seed >>> 0;
    return () => {
      value = (value + 0x6d2b79f5) | 0;
      let t = Math.imul(value ^ (value >>> 15), 1 | value);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function dateOf(offset) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return date;
  }

  function dayKey(offset) {
    const date = dateOf(offset);
    return `${date.getFullYear()}-${SC.fmt.pad(date.getMonth() + 1, 2)}-${SC.fmt.pad(date.getDate(), 2)}`;
  }

  function binStart(index) {
    return SC.config.openHour * 60 + index * SC.config.binMinutes;
  }

  function binLabel(index) {
    return SC.fmt.clock(binStart(index));
  }

  function nowIndex() {
    const minutes = SC.queue.minutesOfDay() - SC.config.openHour * 60;
    return SC.fmt.clamp(Math.floor(minutes / SC.config.binMinutes), 0, BINS - 1);
  }

  function buildDay(offset) {
    const key = dayKey(offset);
    if (cache.has(key)) return cache.get(key);
    const date = dateOf(offset);
    const random = rng(SC.fmt.hash(`qb-${key}`));
    const factor = DAY_FACTOR[date.getDay()];
    const counts = BASE_CURVE.map((base) => Math.max(0, Math.round(base * factor * (0.75 + random() * 0.5))));
    const serviceAvg = 3.1 + random() * 0.7;
    const tickets = counts.map((count, index) => {
      const service = serviceAvg * (0.92 + random() * 0.2);
      const intensity = count * service * 0.55;
      const wait = Math.max(0.6, intensity * (0.4 + random() * 0.35));
      return { index, count, service, wait };
    });
    const day = { offset, key, counts, tickets, serviceAvg, factor };
    cache.set(key, day);
    return day;
  }

  function liveRecords() {
    return SC.queue.records();
  }

  function bins(offset) {
    const day = buildDay(offset);
    const target = offset === 0 ? nowIndex() : BINS - 1;
    const count = 1 + offset;
    const includeLive = count > 0;
    const live = liveRecords();
    return day.tickets.slice(0, target + 1).map((bin) => {
      let tickets = bin.count;
      if (includeLive) {
        const from = binStart(bin.index);
        const to = from + SC.config.binMinutes;
        tickets += live.filter((record) => record.clock >= from && record.clock < to).length;
      }
      return {
        index: bin.index,
        start: binStart(bin.index),
        label: binLabel(bin.index),
        count: tickets,
        wait: bin.wait,
        service: bin.service,
      };
    });
  }

  function peakOf(list) {
    return list.reduce((best, bin) => (bin.count > best.count ? bin : best), list[0]);
  }

  function today() {
    const list = bins(0);
    const live = liveRecords();
    const total = list.reduce((sum, bin) => sum + bin.count, 0);
    const peak = list.length ? peakOf(list) : null;
    const serviceLive = live.length
      ? live.reduce((sum, record) => sum + record.service, 0) / live.length
      : null;
    const waitLive = live.length ? live.reduce((sum, record) => sum + record.wait, 0) / live.length : null;
    const service = serviceLive != null ? serviceLive : list.length ? list.reduce((sum, bin) => sum + bin.service, 0) / list.length : 3.4;
    const wait = waitLive != null ? waitLive : list.length ? list.reduce((sum, bin) => sum + bin.wait, 0) / list.length : 4;
    return {
      bins: list,
      total,
      service,
      wait,
      peak,
      liveCount: live.length,
    };
  }

  function heat() {
    const rows = [];
    for (let offset = -6; offset <= 0; offset += 1) {
      const day = buildDay(offset);
      const target = offset === 0 ? nowIndex() : BINS - 1;
      const cells = day.counts.slice(0, BINS).map((count, index) => ({
        count: index <= target ? count : 0,
        future: index > target,
      }));
      rows.push({
        offset,
        label: offset === 0 ? "ini" : SC.fmt.dayShort(offset),
        cells,
      });
    }
    const max = Math.max(1, ...rows.flatMap((row) => row.cells.map((cell) => cell.count)));
    rows.forEach((row) => {
      row.cells.forEach((cell) => {
        cell.ratio = cell.count / max;
      });
    });
    return rows;
  }

  function forecast(windows) {
    const span = windows || 6;
    const day = buildDay(0);
    const start = nowIndex() + 1;
    const servers = SC.queue.summary().servers;
    const slots = [];
    for (let step = 0; step < span; step += 1) {
      const index = start + step;
      if (index >= BINS) break;
      const bin = day.tickets[index];
      slots.push({
        index,
        start: binStart(index),
        label: binLabel(index),
        count: bin.count,
        wait: Math.max(0.6, (bin.count * bin.service * 0.5) / servers),
      });
    }
    return slots;
  }

  function requestStops() {
    return nowIndex() + 1;
  }

  function demandAt(minutes) {
    const index = SC.fmt.clamp(
      Math.floor((minutes - SC.config.openHour * 60) / SC.config.binMinutes),
      0,
      BINS - 1
    );
    const day = buildDay(0);
    return SC.fmt.clamp(day.tickets[index].count / SC.config.binMinutes, 0, 1.4);
  }

  function serviceOfModel() {
    const records = liveRecords();
    if (records.length >= 3) {
      return records.reduce((sum, record) => sum + record.estimate, 0) / records.length;
    }
    const available = SC.data.products.filter((product) => product.available);
    if (!available.length) return 3;
    return available.reduce((sum, product) => sum + product.service, 0) / available.length;
  }

  function calibration() {
    const live = liveRecords();
    const model = serviceOfModel();
    if (live.length < 3) {
      return { factor: 1, model, actual: null, samples: live.length };
    }
    const actual = live.reduce((sum, record) => sum + record.service, 0) / live.length;
    const factor = SC.fmt.clamp(actual / model, 0.72, 1.45);
    return { factor, model, actual, samples: live.length };
  }

  function pairs(limit) {
    if (!pairCache) {
      const random = rng(SC.fmt.hash("qb-pairs"));
      const counts = new Map();
      const productPairs = new Map();
      for (let offset = -6; offset <= 0; offset += 1) {
        const day = buildDay(offset);
        const dayTotal = day.counts.reduce((sum, count) => sum + count, 0);
        const sample = Math.max(24, Math.round(dayTotal * 0.42));
        for (let index = 0; index < sample; index += 1) {
          const pool = SC.data.products.filter((product) => product.available);
          if (pool.length < 2) break;
          const first = pool[Math.floor(random() * pool.length)];
          const second = pool[Math.floor(random() * pool.length)];
          if (first.id === second.id) continue;
          counts.set(first.id, (counts.get(first.id) || 0) + 1);
          const key = [first.id, second.id].sort().join("|");
          productPairs.set(key, (productPairs.get(key) || 0) + 1);
        }
      }
      liveRecords().forEach((record) => {
        const ids = record.items.map((item) => item.id);
        ids.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1));
        for (let a = 0; a < ids.length; a += 1) {
          for (let b = a + 1; b < ids.length; b += 1) {
            const key = [ids[a], ids[b]].sort().join("|");
            productPairs.set(key, (productPairs.get(key) || 0) + 1);
          }
        }
      });
      pairCache = { counts, productPairs };
    }
    const results = [];
    pairCache.productPairs.forEach((count, key) => {
      const [aId, bId] = key.split("|");
      const a = SC.data.byId(aId);
      const b = SC.data.byId(bId);
      if (!a || !b) return;
      const base = Math.max(1, pairCache.counts.get(aId) || 1);
      results.push({ a, b, count, confidence: SC.fmt.clamp(count / base, 0, 1) });
    });
    return results.sort((x, y) => y.count - x.count).slice(0, limit || 4);
  }

  function insight() {
    const live = liveRecords();
    let tickets = 0;
    for (let offset = -6; offset <= 0; offset += 1) {
      const day = buildDay(offset);
      const target = offset === 0 ? nowIndex() : BINS - 1;
      tickets += day.counts.slice(0, target + 1).reduce((sum, count) => sum + count, 0);
    }
    tickets += live.length;
    return { tickets, days: 7, live: live.length };
  }

  SC.analytics = { bins, today, heat, forecast, calibration, pairs, insight, binStart, binLabel, nowIndex, requestStops, demandAt, BINS };
})(window.SC || (window.SC = {}));
