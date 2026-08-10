// lib/apiClient.ts

export const apiClient = {
  // Ürünler SDK
  products: {
    getAll: async (isAdmin: boolean = false) => {
      const url = isAdmin ? "/api/products?admin=true" : "/api/products";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Ürünler getirilemedi.");
      return res.json();
    },
    create: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Ürün eklenemedi.");
      return json;
    },
    update: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Ürün güncellenemedi.");
      return json;
    },
    delete: async (id: number) => {
      const res = await fetch(`/api/products?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Ürün silinemedi.");
      return json;
    },
  },

  // Kategoriler SDK
  categories: {
    getAll: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Kategoriler getirilemedi.");
      return res.json();
    },
  },

  // Kuponlar SDK
  coupons: {
    getAllPublic: async () => {
      const res = await fetch("/api/coupons");
      if (!res.ok) throw new Error("Kuponlar getirilemedi.");
      return res.json();
    },
    validate: async (code: string) => {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Kupon doğrulanamadı.");
      return json;
    },
  },

  // Siparişler SDK
  orders: {
    getMyOrders: async () => {
      const res = await fetch("/api/orders", { credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Siparişler alınamadı.");
      return json;
    },
  },
};
