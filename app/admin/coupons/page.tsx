"use client";

import { useEffect, useState } from "react";
import Button from "../../components/Button";
import styles from "./coupons.module.css";

interface Coupon {
  id: number;
  code: string;
  discount: number;
  expirationDate: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState("");
  const [expirationDate, setExpirationDate] = useState("");

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/coupons", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (data.status === "success") {
        setCoupons(data.coupons);
      }
    } catch (err) {
      console.error("Kuponları yükleme hatası:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchCoupons();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          code,
          discount: Number(discount),
          expirationDate: expirationDate || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.status === "error") {
        setError(data.message || "Kupon oluşturulamadı.");
        return;
      }

      setMessage("Kupon başarıyla oluşturuldu.");
      setCode("");
      setDiscount("");
      setExpirationDate("");
      fetchCoupons();

      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error("Kupon ekleme hatası:", err);
      setError("Kupon oluşturulurken hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/admin/coupons", {
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
        fetchCoupons();
      }
    } catch (err) {
      console.error("Kupon durumu güncelleme hatası:", err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Bu kuponu silmek istediğinize emin misiniz?")) return;

    try {
      const res = await fetch(`/api/admin/coupons?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();

      if (data.status === "success") {
        fetchCoupons();
      }
    } catch (err) {
      console.error("Kupon silme hatası:", err);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Süresiz";
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Kupon Yönetimi</h1>
          <p>Mağazada geçerli indirim kuponlarını tanımlayın ve yönetin.</p>
        </div>
      </header>

      <div className={styles.layout}>
        <div className={styles.formCard}>
          <h2>Yeni Kupon Ekle</h2>

          {error && <div className={styles.messageError}>{error}</div>}
          {message && <div className={styles.messageSuccess}>{message}</div>}

          <form onSubmit={handleCreateCoupon} className={styles.formInline}>
            <div className={styles.formGroup}>
              <label>Kupon Kodu</label>
              <input
                type="text"
                placeholder="Örn: YAZ2026"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>İndirim Oranı (%)</label>
              <input
                type="number"
                placeholder="Örn: 20"
                min="1"
                max="100"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Son Kullanma Tarihi</label>
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              variant="admin"
              fullWidth
              loading={saving}
              loadingText="Kaydediliyor..."
            >
              KUPONU KAYDET
            </Button>
          </form>
        </div>

        <div className={styles.tableCard}>
          <h2>Tüm Kuponlar ({coupons.length})</h2>

          {loading ? (
            <div style={{ color: "#888", padding: "20px 0" }}>
              Kuponlar yükleniyor...
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>KOD</th>
                  <th>İNDİRİM</th>
                  <th>SON KULLANMA</th>
                  <th>DURUM</th>
                  <th>İŞLEM</th>
                </tr>
              </thead>
              <tbody>
                {coupons.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        textAlign: "center",
                        color: "#888",
                        padding: "30px",
                      }}
                    >
                      Henüz kupon bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  coupons.map((item) => (
                    <tr key={item.id}>
                      <td className={styles.codeCell}>{item.code}</td>
                      <td className={styles.discountCell}>%{item.discount}</td>
                      <td>{formatDate(item.expirationDate)}</td>
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
