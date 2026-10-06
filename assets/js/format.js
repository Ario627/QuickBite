(function (SC) {
  "use strict";

  const idr = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const decimal = new Intl.NumberFormat("id-ID");

  const clockFormat = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  function currency(value) {
    return idr.format(Math.round(Number(value) || 0));
  }

  function number(value) {
    return decimal.format(Number(value) || 0);
  }

  function percent(value) {
    const ratio = Number(value);
    if (!Number.isFinite(ratio)) return "0%";
    return `${Math.round(clamp(ratio, 0, 1) * 100)}%`;
  }

  function clock(value) {
    return clockFormat.format(value instanceof Date ? value : new Date(value));
  }

  function hash(value) {
    const text = String(value);
    let result = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      result ^= text.charCodeAt(index);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function duration(minutes) {
    const total = Math.max(0, Math.round(minutes));
    if (total < 1) return "kurang dari 1 menit";
    if (total < 60) return `${total} menit`;
    const hours = Math.floor(total / 60);
    const rest = total % 60;
    return rest ? `${hours} jam ${rest} menit` : `${hours} jam`;
  }

  SC.fmt = { currency, number, percent, clock, hash, clamp, duration };
})(window.SC || (window.SC = {}));
