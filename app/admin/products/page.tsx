"use client";

import { FormEvent, useEffect, useState } from "react";
import BarcodeScanner from "./BarcodeScanner";
import styles from "./products.module.css";

interface Product {
  id: number;
  barcode: string | null;
  title: string;
  description: string | null;
  price: number;
  image: string;
  categoryId: number | null;
  category: string | null;
  sizeIds: number[];
  sizes: string[];
  colorIds: number[];
  colors: string[];
  stock: number;
  isActive: boolean;
}

interface CatalogOption {
  id: number;
  name: string;
  isActive: boolean;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CatalogOption[]>([]);
  const [availableSizes, setAvailableSizes] = useState<CatalogOption[]>([]);
  const [availableColors, setAvailableColors] = useState<CatalogOption[]>([]);

  const [search, setSearch] = useState("");
  const [barcode, setBarcode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [sizeIds, setSizeIds] = useState<number[]>([]);
  const [colorIds, setColorIds] = useState<number[]>([]);
  const [stock, setStock] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const formatPrice = (value: number) =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(value);

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products?admin=true", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Ürünler getirilemedi.");
        setMessageType("error");
        return;
      }

      const productList = Array.isArray(data) ? data : [];

      setProducts(
        productList.map((product: Product) => ({
          ...product,
          price: Number(product.price),
          stock: Number(product.stock),
        })),
      );
    } catch (error) {
      console.error("Ürün listeleme hatası:", error);

      setMessage("Ürünler getirilirken bağlantı hatası oluştu.");
      setMessageType("error");
    }
  };

  const fetchCatalogOptions = async () => {
    try {
      const response = await fetch("/api/admin/catalog-options", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Kategori ve seçenekler getirilemedi.");
        setMessageType("error");
        return;
      }

      setCategories(Array.isArray(data.categories) ? data.categories : []);
      setAvailableSizes(Array.isArray(data.sizes) ? data.sizes : []);
      setAvailableColors(Array.isArray(data.colors) ? data.colors : []);
    } catch (error) {
      console.error("Katalog seçenekleri getirilemedi:", error);
      setMessage("Kategori ve seçenekler getirilemedi.");
      setMessageType("error");
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchProducts();
      void fetchCatalogOptions();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const filteredProducts = products.filter((product) => {
    const searchText = search.toLocaleLowerCase("tr-TR");

    return (
      product.title.toLocaleLowerCase("tr-TR").includes(searchText) ||
      product.barcode?.toLocaleLowerCase("tr-TR").includes(searchText) ||
      product.category?.toLocaleLowerCase("tr-TR").includes(searchText) ||
      product.description?.toLocaleLowerCase("tr-TR").includes(searchText)
    );
  });

  const handleEdit = (product: Product) => {
    setEditingProductId(product.id);
    setBarcode(product.barcode || "");
    setTitle(product.title);
    setDescription(product.description || "");
    setPrice(String(product.price));
    setImage(product.image);
    setCategoryId(product.categoryId ? String(product.categoryId) : "");
    setSizeIds(product.sizeIds);
    setColorIds(product.colorIds);
    setStock(String(product.stock));

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleBarcodeDetected = async (detectedBarcode: string) => {
    setBarcode(detectedBarcode);
    setMessage("Barkod kontrol ediliyor...");
    setMessageType("");

    window.setTimeout(() => {
      const barcodeInput = document.getElementById("barcode");
      barcodeInput?.scrollIntoView({ behavior: "smooth", block: "center" });
      (barcodeInput as HTMLInputElement | null)?.focus();
    }, 50);

    try {
      const response = await fetch(
        `/api/products/by-barcode/${encodeURIComponent(detectedBarcode)}`,
        { credentials: "include", cache: "no-store" },
      );
      const data = await response.json();

      if (response.ok && data.product) {
        handleEdit({
          ...data.product,
          price: Number(data.product.price),
          stock: Number(data.product.stock),
        });
        setMessage("Barkod mevcut bir ürünle eşleşti. Ürün düzenlemeye açıldı.");
        setMessageType("success");
        return;
      }

      if (response.status === 404) {
        setEditingProductId(null);
        setTitle("");
        setDescription("");
        setPrice("");
        setImage("");
        setCategoryId("");
        setSizeIds([]);
        setColorIds([]);
        setStock("");
        setMessage("Yeni barkod algılandı. Ürün bilgilerini doldurup kaydedin.");
        setMessageType("success");
        return;
      }

      setMessage(data.message || "Barkod kontrol edilemedi.");
      setMessageType("error");
    } catch (error) {
      console.error("Barkod kontrol hatası:", error);
      setMessage("Barkod kontrol edilirken bağlantı hatası oluştu.");
      setMessageType("error");
    }
  };

  const handleDelete = async (product: Product) => {
    const confirmed = window.confirm(
      `"${product.title}" ürününü silmek istediğinize emin misiniz?`,
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/products?id=${product.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Ürün silinemedi.");
        setMessageType("error");
        return;
      }

      setMessage("Ürün başarıyla silindi.");
      setMessageType("success");

      if (editingProductId === product.id) {
        setEditingProductId(null);
        setBarcode("");
        setTitle("");
        setDescription("");
        setPrice("");
        setImage("");
        setCategoryId("");
        setSizeIds([]);
        setColorIds([]);
        setStock("");
      }

      await fetchProducts();
    } catch (error) {
      console.error("Ürün silme hatası:", error);
      setMessage("Ürün silinirken bağlantı hatası oluştu.");
      setMessageType("error");
    }
  };

  const handleToggleActive = async (product: Product) => {
    try {
      const response = await fetch("/api/products", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: product.id,
          isActive: !product.isActive,
          statusOnly: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Ürün durumu değiştirilemedi.");
        setMessageType("error");
        return;
      }

      setMessage(
        product.isActive
          ? "Ürün pasif duruma getirildi."
          : "Ürün aktif duruma getirildi.",
      );
      setMessageType("success");

      await fetchProducts();
    } catch (error) {
      console.error("Durum değiştirme hatası:", error);

      setMessage("Ürün durumu değiştirilemedi.");
      setMessageType("error");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setMessageType("");

    try {
      const response = await fetch("/api/products", {
        method: editingProductId ? "PUT" : "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingProductId,
          barcode,
          title,
          description,
          price: Number(price),
          image,
          categoryId: categoryId ? Number(categoryId) : null,
          sizeIds,
          colorIds,
          stock: Number(stock),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message ||
            (editingProductId ? "Ürün güncellenemedi." : "Ürün eklenemedi."),
        );
        setMessageType("error");
        return;
      }

      setMessage(
        editingProductId
          ? "Ürün başarıyla güncellendi."
          : "Ürün başarıyla eklendi.",
      );
      setMessageType("success");

      setTitle("");
      setBarcode("");
      setDescription("");
      setPrice("");
      setImage("");
      setCategoryId("");
      setSizeIds([]);
      setColorIds([]);
      setStock("");
      setEditingProductId(null);

      await fetchProducts();
    } catch (error) {
      console.error("Ürün ekleme hatası:", error);

      setMessage("Ürün eklenirken bağlantı hatası oluştu.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Ürün Yönetimi</h1>

          <p>
            Ürünleri ekleyebilir, düzenleyebilir ve stok durumlarını
            yönetebilirsiniz.
          </p>
        </div>
      </div>

      <div className={styles.layout}>
        <section className={styles.formCard}>
          <h2>{editingProductId ? "Ürünü Düzenle" : "Yeni Ürün Ekle"}</h2>

          <form onSubmit={handleSubmit}>
            <BarcodeScanner onDetected={handleBarcodeDetected} />

            <div className={styles.formGroup}>
              <label htmlFor="barcode">Ürün Barkodu</label>

              <input
                id="barcode"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Kamerayla tarayın veya elle girin"
                value={barcode}
                onChange={(event) => setBarcode(event.target.value.trim())}
                minLength={4}
                maxLength={64}
              />

              <small>Barkod isteğe bağlıdır ancak başka bir üründe kullanılamaz.</small>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="title">Ürün Adı</label>

              <input
                id="title"
                type="text"
                placeholder="Örneğin: Kablosuz Kulaklık"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="description">Açıklama</label>

              <textarea
                id="description"
                placeholder="Ürün açıklamasını giriniz"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="price">Fiyat</label>

                <input
                  id="price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="999.90"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="stock">Stok</label>

                <input
                  id="stock"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="10"
                  value={stock}
                  onChange={(event) => setStock(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="category">Kategori</label>

              <select
                id="category"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                <option value="">Kategorisiz</option>
                {categories.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                    disabled={!item.isActive}
                  >
                    {item.name}
                    {!item.isActive ? " (Pasif)" : ""}
                  </option>
                ))}
              </select>

              <small>Kategori artık adıyla değil, ID ilişkisiyle kaydedilir.</small>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Bedenler</label>

                <div className={styles.optionChoices}>
                  {availableSizes.filter((item) => item.isActive).length ===
                  0 ? (
                    <small>Tanımlı aktif beden bulunmuyor.</small>
                  ) : (
                    availableSizes
                      .filter((item) => item.isActive)
                      .map((item) => (
                        <label key={item.id} className={styles.optionChoice}>
                          <input
                            type="checkbox"
                            checked={sizeIds.includes(item.id)}
                            onChange={() =>
                              setSizeIds((current) =>
                                current.includes(item.id)
                                  ? current.filter((id) => id !== item.id)
                                  : [...current, item.id],
                              )
                            }
                          />
                          <span>{item.name}</span>
                        </label>
                      ))
                  )}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Renkler</label>

                <div className={styles.optionChoices}>
                  {availableColors.filter((item) => item.isActive).length ===
                  0 ? (
                    <small>Tanımlı aktif renk bulunmuyor.</small>
                  ) : (
                    availableColors
                      .filter((item) => item.isActive)
                      .map((item) => (
                        <label key={item.id} className={styles.optionChoice}>
                          <input
                            type="checkbox"
                            checked={colorIds.includes(item.id)}
                            onChange={() =>
                              setColorIds((current) =>
                                current.includes(item.id)
                                  ? current.filter((id) => id !== item.id)
                                  : [...current, item.id],
                              )
                            }
                          />
                          <span>{item.name}</span>
                        </label>
                      ))
                  )}
                </div>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="image">Resim Adresi</label>

              <input
                id="image"
                type="url"
                placeholder="https://site.com/urun.jpg"
                value={image}
                onChange={(event) => setImage(event.target.value)}
                required
              />
            </div>

            {image && (
              <div className={styles.preview}>
                <span>Resim önizlemesi</span>

                <img src={image} alt="Ürün önizlemesi" />
              </div>
            )}

            {message && (
              <p
                className={
                  messageType === "success"
                    ? styles.successMessage
                    : styles.errorMessage
                }
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading
                ? editingProductId
                  ? "Ürün güncelleniyor..."
                  : "Ürün ekleniyor..."
                : editingProductId
                  ? "Değişiklikleri Kaydet"
                  : "Ürünü Kaydet"}
            </button>
          </form>
        </section>

        <section className={styles.productsCard}>
          <div className={styles.productsHeader}>
            <div>
              <h2>Ürün Listesi</h2>
              <p>{products.length} ürün bulundu</p>
            </div>

            <button
              type="button"
              className={styles.refreshButton}
              onClick={fetchProducts}
            >
              Yenile
            </button>
          </div>

          <div className={styles.searchArea}>
            <input
              type="search"
              placeholder="Ürün adı, kategori veya açıklama ara"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className={styles.searchInput}
            />
          </div>

          {products.length === 0 ? (
            <div className={styles.empty}>Henüz ürün eklenmedi.</div>
          ) : filteredProducts.length === 0 ? (
            <div className={styles.empty}>
              Aramanızla eşleşen ürün bulunamadı.
            </div>
          ) : (
            <div className={styles.productList}>
              {filteredProducts.map((product) => (
                <article key={product.id} className={styles.productItem}>
                  <img
                    src={product.image}
                    alt={product.title}
                    className={styles.productImage}
                  />

                  <div className={styles.productInfo}>
                    <div className={styles.productHeader}>
                      <h3>{product.title}</h3>

                      <button
                        type="button"
                        className={
                          product.isActive
                            ? styles.activeBadge
                            : styles.passiveBadge
                        }
                        onClick={() => handleToggleActive(product)}
                      >
                        {product.isActive ? "Aktif" : "Pasif"}
                      </button>
                    </div>

                    <p>{product.category || "Kategorisiz"}</p>

                    {product.barcode && (
                      <span className={styles.barcode}>Barkod: {product.barcode}</span>
                    )}

                    {(product.sizes.length > 0 ||
                      product.colors.length > 0) && (
                      <div className={styles.optionSummary}>
                        {product.sizes.length > 0 && (
                          <span>Beden: {product.sizes.join(", ")}</span>
                        )}

                        {product.colors.length > 0 && (
                          <span>Renk: {product.colors.join(", ")}</span>
                        )}
                      </div>
                    )}

                    <div className={styles.productFooter}>
                      <div className={styles.productMeta}>
                        <strong>{formatPrice(product.price)}</strong>

                        <span>Stok: {product.stock}</span>
                      </div>

                      <div className={styles.productActions}>
                        <button
                          type="button"
                          className={styles.editButton}
                          title="Düzenle"
                          onClick={() => handleEdit(product)}
                        >
                          ✏️
                        </button>

                        <button
                          type="button"
                          className={styles.deleteButton}
                          title="Sil"
                          onClick={() => handleDelete(product)}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
