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
      id: "nasi-goreng",
      name: "Nasi Goreng Spesial",
      category: "makanan",
      price: 12000,
      sold: 268,
      available: true,
      description: "Nasi goreng telur dengan kerupuk, acar timun, dan sambal bawang.",
    },
    {
      id: "mie-goreng",
      name: "Mie Goreng Jawa",
      category: "makanan",
      price: 10000,
      sold: 241,
      available: true,
      description: "Mie basah bumbu bawang dengan telur, sawi, dan irisan ayam.",
    },
    {
      id: "ayam-geprek",
      name: "Ayam Geprek Sambal Bawang",
      category: "makanan",
      price: 13000,
      sold: 312,
      available: true,
      description: "Ayam tepung digeprek sambal bawang, disajikan dengan nasi hangat.",
    },
    {
      id: "bakso-urat",
      name: "Bakso Urat Kuah",
      category: "makanan",
      price: 12000,
      sold: 187,
      available: true,
      description: "Lima butir bakso urat dalam kuah kaldu sapi, mi kuning, dan seledri.",
    },
    {
      id: "nasi-uduk",
      name: "Nasi Uduk Komplit",
      category: "makanan",
      price: 11000,
      sold: 143,
      available: true,
      description: "Nasi uduk gurih dengan bihun goreng, tempe orek, dan sambal kacang.",
    },
    {
      id: "sate-ayam",
      name: "Sate Ayam Madura",
      category: "makanan",
      price: 14000,
      sold: 96,
      available: false,
      description: "Sepuluh tusuk sate ayam dengan bumbu kacang, lontong, dan bawang goreng.",
    },
    {
      id: "es-teh",
      name: "Es Teh Manis",
      category: "minuman",
      price: 4000,
      sold: 412,
      available: true,
      description: "Teh tubruk diseduh pekat, disajikan dingin dengan es batu.",
    },
    {
      id: "es-jeruk",
      name: "Es Jeruk Peras",
      category: "minuman",
      price: 5000,
      sold: 224,
      available: true,
      description: "Jeruk peras segar dengan gula batu dan es serut.",
    },
    {
      id: "air-mineral",
      name: "Air Mineral Dingin",
      category: "minuman",
      price: 3000,
      sold: 356,
      available: true,
      description: "Air mineral botol 600 ml, disimpan di lemari pendingin.",
    },
    {
      id: "kopi-aren",
      name: "Kopi Susu Gula Aren",
      category: "minuman",
      price: 9000,
      sold: 88,
      available: true,
      description: "Espresso dengan susu segar dan gula aren cair.",
    },
    {
      id: "es-campur",
      name: "Es Campur",
      category: "minuman",
      price: 8000,
      sold: 118,
      available: true,
      description: "Serutan es dengan cincau, kelapa muda, kolang-kaling, dan sirup gula merah.",
    },
    {
      id: "pisang-keju",
      name: "Pisang Goreng Keju",
      category: "snack",
      price: 6000,
      sold: 174,
      available: true,
      description: "Dua potong pisang goreng dengan topping keju parut dan susu kental manis.",
    },
    {
      id: "risoles",
      name: "Risoles Mayo",
      category: "snack",
      price: 7000,
      sold: 103,
      available: true,
      description: "Risoles isi smoked beef, telur rebus, dan mayones.",
    },
    {
      id: "tahu-isi",
      name: "Tahu Isi Sayur",
      category: "snack",
      price: 4000,
      sold: 152,
      available: true,
      description: "Tiga buah tahu isi sayur goreng, disajikan dengan cabai rawit.",
    },
    {
      id: "kerupuk",
      name: "Kerupuk Kaleng",
      category: "snack",
      price: 2500,
      sold: 287,
      available: true,
      description: "Kerupuk kanji renyah, teman makan nasi goreng dan bakso.",
    },
  ];

  const BASE_PRODUCTS = products.map((product) => Object.assign({}, product));
  const inventoryListeners = new Set();

  function safe(fn) {
    try {
      return fn();
    } catch {
      return null;
    }
  }

  const CATALOG_KEY = SC.config.keys.catalog;
  const byIdMap = new Map();
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const codeMap = new Map();
  const bestSellers = new Set();

  function rebuildIndexes() {
    byIdMap.clear();
    codeMap.clear();
    products.forEach((product, index) => {
      byIdMap.set(product.id, product);
      codeMap.set(product.id, String(index + 1).padStart(2, "0"));
    });

    bestSellers.clear();
    products
      .filter((product) => product.sold > 0)
      .slice()
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 3)
      .forEach((product) => bestSellers.add(product.id));
  }

  function validProduct(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    if (!/^[a-z0-9-]{3,60}$/.test(String(raw.id || ""))) return null;
    if (typeof raw.name !== "string" || typeof raw.description !== "string") return null;
    if (!categoryMap.has(raw.category)) return null;
    const price = Math.floor(Number(raw.price));
    if (!Number.isSafeInteger(price) || price < 500 || price > 250000) return null;
    const name = raw.name.trim().replace(/\s+/g, " ");
    const description = raw.description.trim().replace(/\s+/g, " ");
    if (name.length < 2 || name.length > 48 || description.length < 8 || description.length > 180) return null;

    return {
      id: String(raw.id),
      name,
      category: raw.category,
      price,
      sold: Math.max(0, Math.floor(Number(raw.sold) || 0)),
      available: typeof raw.available === "boolean" ? raw.available : true,
      description,
    };
  }

  function saveCatalog() {
    safe(() =>
      window.localStorage.setItem(
        CATALOG_KEY,
        JSON.stringify(products.map((product) => Object.assign({}, product)))
      )
    );
  }

  function loadCatalog() {
    const stored = safe(() => JSON.parse(window.localStorage.getItem(CATALOG_KEY) || "null"));
    products.splice(0, products.length, ...BASE_PRODUCTS.map((product) => Object.assign({}, product)));
    if (!Array.isArray(stored)) {
      rebuildIndexes();
      return;
    }

    const baseById = new Map(products.map((product) => [product.id, product]));
    const updated = new Map();
    const custom = new Map();

    stored.forEach((raw) => {
      const product = validProduct(raw);
      if (!product) return;
      if (baseById.has(product.id)) updated.set(product.id, product);
      else if (product.id.startsWith("custom-") && !custom.has(product.id)) custom.set(product.id, product);
    });

    products.forEach((product, index) => {
      const saved = updated.get(product.id);
      if (saved) products[index] = saved;
    });
    products.push(...custom.values());
    rebuildIndexes();
  }

  loadCatalog();

  const sorters = {
    populer: (a, b) => b.sold - a.sold || a.name.localeCompare(b.name, "id"),
    murah: (a, b) => a.price - b.price || a.name.localeCompare(b.name, "id"),
    mahal: (a, b) => b.price - a.price || a.name.localeCompare(b.name, "id"),
    nama: (a, b) => a.name.localeCompare(b.name, "id"),
  };

  function byId(id) {
    return byIdMap.get(id) || null;
  }

  function code(id) {
    return codeMap.get(id) || "00";
  }

  function isBestSeller(id) {
    return bestSellers.has(id);
  }

  function categoryOf(id) {
    return categoryMap.get(id) || categories[0];
  }

  function setAvailability(id, available) {
    const product = byId(id);
    if (!product || typeof available !== "boolean") return null;
    if (product.available === available) return product;
    product.available = available;
    saveCatalog();
    inventoryListeners.forEach((listener) => listener(products));
    return product;
  }

  function saveProduct(draft, productId) {
    if (!draft || typeof draft !== "object") return { error: "Data menu tidak valid" };
    const current = productId ? byId(productId) : null;
    if (productId && !current) return { error: "Menu tidak ditemukan" };

    const category = String(draft.category || "");
    const price = Number(draft.price);
    const product = validProduct({
      id: current ? current.id : `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      name: String(draft.name || ""),
      category,
      price,
      sold: current ? current.sold : 0,
      available: current ? current.available : true,
      description: String(draft.description || ""),
    });

    if (!product) {
      return {
        error: "Periksa kembali nama, kategori, harga Rp500–Rp250.000, dan deskripsi (8–180 karakter).",
      };
    }

    if (current) {
      products[products.indexOf(current)] = product;
    } else {
      products.push(product);
    }

    rebuildIndexes();
    saveCatalog();
    inventoryListeners.forEach((listener) => listener(products));
    return { product };
  }

  function removeProduct(productId) {
    const product = byId(productId);
    if (!product) return { error: "Menu tidak ditemukan" };
    if (!productId.startsWith("custom-")) {
      return { error: "Menu bawaan tidak dapat dihapus; ubah saja ketersediaannya" };
    }

    const referenced = SC.orders
      .list()
      .some((order) => order.items.some((item) => item.productId === productId));
    if (referenced) {
      return { error: "Menu ini sudah dipakai di pesanan. Tandai habis agar riwayat tetap utuh." };
    }

    products.splice(products.indexOf(product), 1);
    rebuildIndexes();
    saveCatalog();
    inventoryListeners.forEach((listener) => listener(products));
    return { product };
  }

  function subscribeInventory(listener) {
    inventoryListeners.add(listener);
    return () => inventoryListeners.delete(listener);
  }

  function list(options) {
    const { category = "semua", query = "", sort = "populer" } = options || {};
    const keyword = query.trim().toLowerCase();
    const sorter = sorters[sort] || sorters.populer;

    return products
      .filter((product) => {
        if (category !== "semua" && product.category !== category) return false;
        if (!keyword) return true;
        return `${product.name} ${product.description}`.toLowerCase().includes(keyword);
      })
      .sort(sorter);
  }

  window.addEventListener("storage", (event) => {
    if (event.key === CATALOG_KEY) {
      loadCatalog();
      inventoryListeners.forEach((listener) => listener(products));
    }
  });

  SC.data = {
    products,
    categories,
    byId,
    code,
    isBestSeller,
    categoryOf,
    list,
    setAvailability,
    saveProduct,
    removeProduct,
    subscribeInventory,
  };
})(window.SC || (window.SC = {}));
