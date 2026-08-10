"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Header from "../../components/Header";
import styles from "./order-detail.module.css";

interface OrderItem {
  id: number;
  productId: number | null;
  title: string;
  image: string | null;
  price: number;
  quantity: number;
}

interface OrderDetail {
  id: number;
  merchantReference: string;
  amount: number;
  currency: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  createdAt: string;
  items: OrderItem[];
}

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`/api/orders/${id}`, {
          credentials: "include",
          cache: "no-store",
        });

        const data = await response.json();

        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }

        if (!response.ok || data.status === "error") {
          setError(data.message || "Sipariş detayları alınamadı.");
          return;
        }

        setOrder(data.order);
      } catch (err) {
        console.error("Sipariş detay yükleme hatası:", err);
        setError("Sipariş yüklenirken hata oluştu.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(price);

  const formatDate = (dateValue: string) => {
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return "-";
    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(parsed);
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
      case "success":
      case "completed":
        return "Ödendi";
      case "created":
      case "active":
      case "pending":
        return "Ödeme Bekleniyor";
      case "failed":
      case "cancelled":
      case "canceled":
        return "Ödeme Başarısız";
      default:
        return status;
    }
  };

  return (
    <>
      <Header />

      <div className={styles.container}>
        <Link href="/orders" className={styles.backLink}>
          ← Siparişlerime Dön
        </Link>

        {loading && <div>Sipariş detayları yükleniyor...</div>}

        {!loading && error && <div style={{ color: "#ef4444" }}>{error}</div>}

        {!loading && order && (
          <div className={styles.card}>
            <div className={styles.header}>
              <div>
                <h1 style={{ margin: 0, fontSize: "22px" }}>
                  Sipariş #{order.merchantReference}
                </h1>
                <small style={{ color: "#aaa" }}>{formatDate(order.createdAt)}</small>
              </div>

              <div>
                <span
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontWeight: "bold",
                    fontSize: "14px",
                    background:
                      order.status.toLowerCase() === "paid"
                        ? "rgba(34, 197, 94, 0.15)"
                        : "rgba(234, 179, 8, 0.15)",
                    color:
                      order.status.toLowerCase() === "paid" ? "#22c55e" : "#eab308",
                  }}
                >
                  {getStatusText(order.status)}
                </span>
              </div>
            </div>

            <h3 className={styles.sectionTitle}>📍 Teslimat Bilgileri</h3>

            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <label>Alıcı</label>
                <p>{order.customerName}</p>
              </div>

              <div className={styles.infoItem}>
                <label>E-posta</label>
                <p>{order.customerEmail}</p>
              </div>

              <div className={styles.infoItem}>
                <label>Telefon</label>
                <p>{order.customerPhone || "Belirtilmedi"}</p>
              </div>

              <div className={styles.infoItem}>
                <label>Adres</label>
                <p>{order.customerAddress || "Belirtilmedi"}</p>
              </div>
            </div>

            <h3 className={styles.sectionTitle}>📦 Ürünler</h3>

            <div>
              {order.items.map((item) => (
                <div key={item.id} className={styles.itemRow}>
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      className={styles.itemImage}
                    />
                  ) : (
                    <span style={{ fontSize: "24px" }}>📦</span>
                  )}

                  <div className={styles.itemInfo}>
                    <h4>{item.title}</h4>
                    <p>
                      {formatPrice(item.price)} x {item.quantity} Adet
                    </p>
                  </div>

                  <strong style={{ color: "#22c55e" }}>
                    {formatPrice(item.price * item.quantity)}
                  </strong>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: "24px",
                paddingTop: "16px",
                borderTop: "1px solid #ddd",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>Toplam Tutarlar</span>
              <h2 style={{ margin: 0, color: "#22c55e" }}>
                {formatPrice(order.amount)}
              </h2>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
