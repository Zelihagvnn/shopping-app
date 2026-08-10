"use client";

import { useEffect, useState } from "react";
import Button from "../../components/Button";
import styles from "./categories.module.css";

interface Category {
  id: number;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  _count: {
    products: number;
  };
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [name, setName] = useState("");

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/categories", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (data.status === "success") {
        setCategories(data.categories);
      }
    } catch (err) {
      console.error("Kategorileri yükleme hatası:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchCategories();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });

      const data = await res.json();

      if (!res.ok || data.status === "error") {
        setError(data.message || "Kategori oluşturulamadı.");
        return;
      }

      setMessage("Kategori başarıyla oluşturuldu.");
      setName("");
      fetchCategories();

      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error("Kategori ekleme hatası:", err);
      setError("Kategori oluşturulurken hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/admin/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id,
          isActive: !currentStatus,
        }),
      });

      const data = await res.json();

      if (data.status === "success") {
        fetchCategories();
      } else {
        setError(data.message || "Kategori silinemedi.");
      }
    } catch (err) {
      console.error("Kategori güncelleme hatası:", err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Bu kategoriyi silmek istediğinize emin misiniz?"))
      return;

    try {
      const res = await fetch(`/api/admin/categories?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();

      if (data.status === "success") {
        fetchCategories();
      }
    } catch (err) {
      console.error("Kategori silme hatası:", err);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Kategori Yönetimi</h1>
          <p>Mağazadaki tüm ürün kategorilerini listeleyin ve yönetin.</p>
        </div>
      </header>

      <div className={styles.layout}>
        <div className={styles.formCard}>
          <h2>Yeni Kategori Ekle</h2>

          {error && <div className={styles.messageError}>{error}</div>}
          {message && <div className={styles.messageSuccess}>{message}</div>}

          <form onSubmit={handleCreateCategory} className={styles.formInline}>
            <div className={styles.formGroup}>
              <label>Kategori Adı</label>
              <input
                type="text"
                placeholder="Örn: Ev & Yaşam, Elektronik..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              variant="admin"
              loading={saving}
              loadingText="Ekleniyor..."
            >
              KATEGORİYİ KAYDET
            </Button>
          </form>
        </div>

        <div className={styles.tableCard}>
          <h2>Tüm Kategoriler ({categories.length})</h2>

          {loading ? (
            <div style={{ color: "#888", padding: "20px 0" }}>
              Kategoriler yükleniyor...
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>KATEGORİ ADI</th>
                  <th>SLUG</th>
                  <th>ÜRÜN</th>
                  <th>DURUM</th>
                  <th>İŞLEM</th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        textAlign: "center",
                        color: "#888",
                        padding: "30px",
                      }}
                    >
                      Henüz kategori bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  categories.map((item) => (
                    <tr key={item.id}>
                      <td className={styles.nameCell}>{item.name}</td>
                      <td className={styles.slugCell}>{item.slug}</td>
                      <td>{item._count.products}</td>
                      <td>
                        <span
                          className={
                            item.isActive
                              ? styles.activeBadge
                              : styles.passiveBadge
                          }
                        >
                          {item.isActive ? "Aktif" : "Pasif"}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.toggleBtn}`}
                          onClick={() =>
                            handleToggleStatus(item.id, item.isActive)
                          }
                        >
                          {item.isActive ? "Pasife Al" : "Aktif Et"}
                        </button>

                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.deleteBtn}`}
                          onClick={() => handleDelete(item.id)}
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
