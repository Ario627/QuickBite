(function (SC) {
  "use strict";

  const categories = [
    { id: "semua", label: "Semua" },
    { id: "makanan", label: "Makanan" },
    { id: "minuman", label: "Minuman" },
    { id: "snack", label: "Snack" },
  ];

  const products = [
    {
      id: "bite-burger",
      name: "Bite Burger",
      category: "makanan",
      price: 10000,
      service: 2,
      sold: 284,
      available: true,
      description: "Roti panggang, patty ayam, saus bite, dan selada. Paling cepat keluar dari dapur.",
    },
    {
      id: "mie-goreng",
      name: "Mie Goreng Jawa",
      category: "makanan",
      price: 10000,
      service: 4,
      sold: 251,
      available: true,
      description: "Mie basah bumbu bawang, telur, sawi, dan irisan ayam.",
    },
    {
      id: "nasi-goreng",
      name: "Nasi Goreng Spesial",
      category: "makanan",
      price: 12000,
      service: 5,
      sold: 268,
      available: true,
      description: "Nasi goreng telur dengan kerupuk, acar timun, dan sambal bawang.",
    },
    {
      id: "ayam-geprek",
      name: "Ayam Geprek Sambal Bawang",
      category: "makanan",
      price: 13000,
      service: 5,
      sold: 312,
      available: true,
      description: "Ayam tepung digeprek sambal bawang, disajikan dengan nasi hangat.",
    },
    {
      id: "bakso-urat",
      name: "Bakso Urat Kuah",
      category: "makanan",
      price: 12000,
      service: 3,
      sold: 187,
      available: true,
      description: "Lima butir bakso urat dalam kuah kaldu sapi, mi kuning, dan seledri.",
    },
    {
      id: "nasi-uduk",
      name: "Nasi Uduk Komplit",
      category: "makanan",
      price: 11000,
      service: 4,
      sold: 143,
      available: true,
      description: "Nasi uduk gurih dengan bihun goreng, tempe orek, dan sambal kacang.",
    },
    {
      id: "sate-ayam",
      name: "Sate Ayam Madura",
      category: "makanan",
      price: 14000,
      service: 6,
      sold: 96,
      available: false,
      description: "Sepuluh tusuk sate ayam dengan bumbu kacang, lontong, dan bawang goreng.",
    },
    {
      id: "es-teh",
      name: "Es Teh Manis",
      category: "minuman",
      price: 4000,
      service: 1,
      sold: 412,
      available: true,
      description: "Teh tubruk diseduh pekat, disajikan dingin dengan es batu.",
    },
    {
      id: "es-jeruk",
      name: "Es Jeruk Peras",
      category: "minuman",
      price: 5000,
      service: 1,
      sold: 224,
      available: true,
      description: "Jeruk peras segar dengan gula batu dan es serut.",
    },
    {
      id: "air-mineral",
      name: "Air Mineral Dingin",
      category: "minuman",
      price: 3000,
      service: 1,
      sold: 356,
      available: true,
      description: "Air mineral botol 600 ml, disimpan di lemari pendingin.",
    },
    {
      id: "kopi-aren",
      name: "Kopi Susu Gula Aren",
      category: "minuman",
      price: 9000,
      service: 2,
      sold: 88,
      available: true,
      description: "Espresso dengan susu segar dan gula aren cair.",
    },
    {
      id: "es-campur",
      name: "Es Campur",
      category: "minuman",
      price: 8000,
      service: 2,
      sold: 118,
      available: true,
      description: "Serutan es dengan cincau, kelapa muda, kolang-kaling, dan sirup gula merah.",
    },
    {
      id: "kentang",
      name: "Kentang Goreng",
      category: "snack",
      price: 7000,
      service: 3,
      sold: 231,
      available: true,
      description: "Kentang potong lurus, digoreng garing, ditaburi bumbu asin gurih.",
    },
    {
      id: "pisang-keju",
      name: "Pisang Goreng Keju",
      category: "snack",
      price: 6000,
      service: 3,
      sold: 174,
      available: true,
      description: "Dua potong pisang goreng dengan topping keju parut dan susu kental manis.",
    },
    {
      id: "risoles",
      name: "Risoles Mayo",
      category: "snack",
      price: 7000,
      service: 3,
      sold: 103,
      available: true,
      description: "Risoles isi smoked beef, telur rebus, dan mayones.",
    },
    {
      id: "tahu-isi",
      name: "Tahu Isi Sayur",
      category: "snack",
      price: 4000,
      service: 2,
      sold: 152,
      available: true,
      description: "Tiga buah tahu isi sayur goreng, disajikan dengan cabai rawit.",
    },
  ];

  const BASE = products.map((product) => Object.assign({}, product));
  const listeners = new Set();
  const byIdMap = new Map();
  const categoryMap = new Map(categories.map((category) => [category.id, category]));

  function safe(fn) {
    try {
      return fn();
    } catch {
      return null;
    }
  }

  function rebuildIndexes() {
    byIdMap.clear();
    products.forEach((product) => byIdMap.set(product.id, product));
  }

  function valid(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    if (!/^[a-z0-9-]{3,60}$/.test(String(raw.id || ""))) return null;
    if (typeof raw.name !== "string" || typeof raw.description !== "string") return null;
    if (!categoryMap.has(raw.category) || categoryMap.get(raw.category).id === "semua") return null;
    const price = Math.floor(Number(raw.price));
    if (!Number.isSafeInteger(price) || price < 500 || price > 250000) return null;
    const service = Number(raw.service);
    if (!Number.isFinite(service) || service < 0.5 || service > 30) return null;
    const name = raw.name.trim().replace(/\s+/g, " ");
    const description = raw.description.trim().replace(/\s+/g, " ");
    if (name.length < 2 || name.length > 48) return null;
    if (description.length < 8 || description.length > 180) return null;
    return {
      id: String(raw.id),
      name,
      category: raw.category,
      price,
      service: Math.round(service * 2) / 2,
      sold: Math.max(0, Math.floor(Number(raw.sold) || 0)),
      available: typeof raw.available === "boolean" ? raw.available : true,
      description,
    };
  }

  function save() {
    safe(() =>
      window.localStorage.setItem(SC.config.keys.catalog, JSON.stringify(products.map((product) => Object.assign({}, product))))
    );
  }

  function load() {
    const stored = safe(() => JSON.parse(window.localStorage.getItem(SC.config.keys.catalog) || "null"));
    products.splice(0, products.length, ...BASE.map((product) => Object.assign({}, product)));
    if (Array.isArray(stored)) {
      const base = new Map(products.map((product) => [product.id, product]));
      const updated = new Map();
      const custom = new Map();
      stored.forEach((raw) => {
        const product = valid(raw);
        if (!product) return;
        if (base.has(product.id)) updated.set(product.id, product);
        else if (product.id.startsWith("custom-") && !custom.has(product.id)) custom.set(product.id, product);
      });
      products.forEach((product, index) => {
        const saved = updated.get(product.id);
        if (saved) products[index] = saved;
      });
      products.push(...custom.values());
    }
    rebuildIndexes();
  }

  function emit() {
    const snapshot = list();
    listeners.forEach((listener) => listener(snapshot));
  }

  function commit() {
    rebuildIndexes();
    save();
    emit();
  }

  load();

  const sorters = {
    populer: (a, b) => b.sold - a.sold || a.name.localeCompare(b.name, "id"),
    cepat: (a, b) => a.service - b.service || a.price - b.price,
    murah: (a, b) => a.price - b.price || a.name.localeCompare(b.name, "id"),
    nama: (a, b) => a.name.localeCompare(b.name, "id"),
  };

  function list(options) {
    const settings = options || {};
    const query = String(settings.query || "")
      .trim()
      .toLowerCase();
    const category = settings.category || "semua";
    const sorter = sorters[settings.sort] || sorters.populer;
    return products
      .filter((product) => category === "semua" || product.category === category)
      .filter((product) => !query || product.name.toLowerCase().includes(query) || product.description.toLowerCase().includes(query))
      .slice()
      .sort(sorter);
  }

  function byId(id) {
    return byIdMap.get(String(id)) || null;
  }

  function category(id) {
    return categoryMap.get(String(id)) || null;
  }

  function bestSellers(limit) {
    return products
      .slice()
      .sort(sorters.populer)
      .slice(0, limit || 4);
  }

  function fastest(limit) {
    return products
      .filter((product) => product.available)
      .slice()
      .sort(sorters.cepat)
      .slice(0, limit || 4);
  }

  function upsert(input) {
    const base = byId(input.id) || {};
    const candidate = valid(
      Object.assign({}, base, input, {
        sold: base.sold || 0,
        available: typeof input.available === "boolean" ? input.available : base.available !== false,
      })
    );
    if (!candidate) return null;
    const index = products.findIndex((product) => product.id === candidate.id);
    if (index >= 0) products[index] = candidate;
    else products.push(candidate);
    commit();
    return candidate;
  }

  function create(input) {
    const slug = String(input.name || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
    if (!slug) return null;
    let id = `custom-${slug}`;
    let attempt = 2;
    while (byId(id)) {
      id = `custom-${slug}-${attempt}`;
      attempt += 1;
      if (attempt > 40) return null;
    }
    return upsert(Object.assign({}, input, { id, sold: 0, available: true }));
  }

  function remove(id) {
    const index = products.findIndex((product) => product.id === String(id));
    if (index < 0 || !String(id).startsWith("custom-")) return false;
    products.splice(index, 1);
    commit();
    return true;
  }

  function toggle(id) {
    const product = byId(id);
    if (!product) return null;
    product.available = !product.available;
    commit();
    return product;
  }

  function reset() {
    safe(() => window.localStorage.removeItem(SC.config.keys.catalog));
    load();
    emit();
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  SC.data = {
    categories,
    get products() {
      return products;
    },
    list,
    byId,
    category,
    bestSellers,
    fastest,
    upsert,
    create,
    remove,
    toggle,
    reset,
    subscribe,
  };
})(window.SC || (window.SC = {}));
