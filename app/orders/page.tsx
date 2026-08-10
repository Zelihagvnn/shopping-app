"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "../components/Header";
import styles from "./orders.module.css";

interface OrderItem {
  id: number;
  productId: number | null;
  title: string;
  image: string | null;
  price: number;
  quantity: number;
}

interface Order {
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

interface OrdersResponse {
  status?: string;
  message?: string;
  orders?: Order[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setMessage("");

        const response = await fetch("/api/orders", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const contentType = response.headers.get("content-type");

        const data: OrdersResponse = contentType?.includes("application/json")
          ? await response.json()
          : {
              status: "error",
              message: "Sunucu geçerli bir cevap döndürmedi.",
            };

        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }

        if (!response.ok) {
          setMessage(
            data.message || "Siparişler getirilirken bir hata oluştu.",
          );

          setOrders([]);
          return;
        }

        const orderList = Array.isArray(data.orders) ? data.orders : [];

        const normalizedOrders = orderList.map((order) => ({
          ...order,

          amount: Number(order.amount),

          items: Array.isArray(order.items)
            ? order.items.map((item) => ({
                ...item,
                price: Number(item.price),
                quantity: Number(item.quantity),
              }))
            : [],
        }));

        setOrders(normalizedOrders);
      } catch (error) {
        console.error("Sipariş listeleme hatası:", error);

        setMessage("Siparişler getirilirken bağlantı hatası oluştu.");

        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(price);

  const formatDate = (date: string) => {
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Tarih bilgisi bulunamadı";
    }

    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(parsedDate);
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

  const getStatusClassName = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
      case "success":
      case "completed":
        return `${styles.status} ${styles.statusSuccess}`;

      case "failed":
      case "cancelled":
      case "canceled":
        return `${styles.status} ${styles.statusFailed}`;

      default:
        return `${styles.status} ${styles.statusPending}`;
    }
  };

  return (
    <>
      <Header />

      <main className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>HESABIM</p>

            <h1>Siparişlerim</h1>

            <p>Hesabınıza ait siparişleri buradan görüntüleyebilirsiniz.</p>
          </div>

          <Link href="/account" className={styles.backButton}>
            Hesabıma Dön
          </Link>
        </div>

        {loading && (
          <div className={styles.infoCard}>Siparişler yükleniyor...</div>
        )}

        {!loading && message && (
          <div className={styles.infoCard}>
            <h2>Bir sorun oluştu</h2>

            <p>{message}</p>

            <Link href="/" className={styles.shoppingLink}>
              Mağazaya Dön
            </Link>
          </div>
        )}

        {!loading && !message && orders.length === 0 && (
          <div className={styles.infoCard}>
            <h2>Henüz siparişiniz bulunmuyor</h2>

            <p>
              Vereceğiniz siparişler yalnızca hesabınıza özel olarak burada
              görüntülenecektir.
            </p>

            <Link href="/" className={styles.shoppingLink}>
              Alışverişe Başla
            </Link>
          </div>
        )}

        {!loading && !message && orders.length > 0 && (
          <div className={styles.orderList}>
            {orders.map((order) => (
              <article key={order.id} className={styles.orderCard}>
                <div className={styles.orderHeader}>
                  <div>
                    <span className={styles.label}>Sipariş Numarası</span>

                    <h2>{order.merchantReference}</h2>

                    <p>{formatDate(order.createdAt)}</p>
                  </div>

                  <div className={styles.orderSummary}>
                    <span className={getStatusClassName(order.status)}>
                      {getStatusText(order.status)}
                    </span>

                    <strong>{formatPrice(order.amount)}</strong>

                    <Link
                      href={`/orders/${order.id}`}
                      style={{
                        display: "inline-block",
                        marginTop: "8px",
                        color: "#2563eb",
                        fontSize: "13px",
                        fontWeight: "bold",
                        textDecoration: "none",
                      }}
                    >
                      Detaylar →
                    </Link>
                  </div>
                </div>

                <div className={styles.items}>
                  {order.items.length === 0 ? (
                    <div className={styles.noItems}>
                      Bu siparişe ait ürün bilgisi bulunmuyor.
                    </div>
                  ) : (
                    order.items.map((item) => (
                      <div key={item.id} className={styles.item}>
                        <div className={styles.imageArea}>
                          {item.image ? (
                            <img src={item.image} alt={item.title} />
                          ) : (
                            <span>📦</span>
                          )}
                        </div>

                        <div className={styles.itemInfo}>
                          <h3>{item.title}</h3>

                          <p>Birim fiyat: {formatPrice(item.price)}</p>

                          <p>Adet: {item.quantity}</p>
                        </div>

                        <strong>
                          {formatPrice(item.price * item.quantity)}
                        </strong>
                      </div>
                    ))
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
