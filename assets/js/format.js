(function (SC) {
  "use strict";

  const idr = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const decimal = new Intl.NumberFormat("id-ID");

  const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  function currency(value) {
    return idr.format(Math.round(Number(value) || 0));
  }

  function number(value) {
    return decimal.format(Number(value) || 0);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function pad(value, size) {
    return String(Math.max(0, Math.floor(value))).padStart(size || 3, "0");
  }

  function queueNumber(prefix, seq) {
    return `${prefix}${pad(seq, 3)}`;
  }

  function minutes(value) {
    const total = Math.max(0, Math.round(Number(value) || 0));
    if (total === 0) return "kurang dari 1 mnt";
    if (total < 60) return `${total} mnt`;
    const hours = Math.floor(total / 60);
    const rest = total % 60;
    return rest ? `${hours} jam ${rest} mnt` : `${hours} jam`;
  }

  function eta(value) {
    const total = Number(value) || 0;
    return total < 1 ? "tanpa tunggu" : `± ${minutes(total)}`;
  }

  function seconds(value) {
    const total = Math.max(0, Math.round(Number(value) || 0));
    const mins = Math.floor(total / 60);
    const rest = total % 60;
    return `${mins}m ${pad(rest, 2)}s`;
  }

  function clock(minutesOfDay, withSeconds) {
    const total = ((Math.round(minutesOfDay) % 1440) + 1440) % 1440;
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    const base = `${pad(hours, 2)}:${pad(mins, 2)}`;
    return withSeconds ? `${base}:00` : base;
  }

  function realClock(date) {
    const now = date instanceof Date ? date : new Date();
    return `${pad(now.getHours(), 2)}:${pad(now.getMinutes(), 2)}:${pad(now.getSeconds(), 2)}`;
  }

  function dateLabel(date) {
    const now = date instanceof Date ? date : new Date();
    return `${dayNames[now.getDay()]}, ${now.getDate()} ${monthNames[now.getMonth()]}`;
  }

  function dayShort(offset) {
    const now = new Date();
    now.setDate(now.getDate() + offset);
    return dayNames[now.getDay()].slice(0, 3);
  }

  function percent(value) {
    const ratio = Number(value);
    if (!Number.isFinite(ratio)) return "0%";
    return `${Math.round(clamp(ratio, 0, 1) * 100)}%`;
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

  SC.fmt = {
    currency,
    number,
    clamp,
    pad,
    queueNumber,
    minutes,
    eta,
    seconds,
    clock,
    realClock,
    dateLabel,
    dayShort,
    percent,
    hash,
  };
})(window.SC || (window.SC = {}));
