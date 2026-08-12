"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import styles from "./order-detail.module.css";

interface OrderItem {
  id: number;
  productId: number | null;
  title: string;
  image: string | null;
  price: number;
  quantity: number;
  total: number;
}

interface OrderCustomer {
  id: number | null;
  fullName: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
}

interface AdminOrderDetail {
  id: number;
  merchantReference: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  customer: OrderCustomer | null;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  items: OrderItem[];
}

interface OrderDetailResponse {
  status?: string;
  message?: string;
  order?: AdminOrderDetail;
}

export default function AdminOrderDetailPage() {
  const params = useParams<{
    id: string;
  }>();

  const orderId = params.id;

  const [order, setOrder] =
    useState<AdminOrderDetail | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/admin/orders/${orderId}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

        const data: OrderDetailResponse =
          await response.json();

        if (response.status === 401) {
          window.location.href =
            "/admin/login";
          return;
        }

        if (!response.ok) {
          setError(
            data.message ||
              "Sipariş detayı getirilemedi."
          );

          setOrder(null);
          return;
        }

        setOrder(data.order ?? null);
      } catch (error) {
        console.error(
          "Sipariş detay hatası:",
          error
        );

        setError(
          "Sipariş detayı alınırken bağlantı hatası oluştu."
        );

        setOrder(null);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const formatPrice = (
    price: number
  ) =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(price);

  const formatDate = (
    dateValue: string
  ) => {
    const date =
      new Date(dateValue);

    if (
      Number.isNaN(date.getTime())
    ) {
      return "-";
    }

    return new Intl.DateTimeFormat(
      "tr-TR",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    ).format(date);
  };

  const getStatusText = (
    status: string
  ) => {
    switch (
      status.toLowerCase()
    ) {
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
        return "Başarısız";

      default:
        return status;
    }
  };

  const getStatusClassName = (
    status: string
  ) => {
    switch (
      status.toLowerCase()
    ) {
      case "paid":
      case "success":
      case "completed":
        return `${styles.statusBadge} ${styles.statusPaid}`;

      case "failed":
      case "cancelled":
      case "canceled":
        return `${styles.statusBadge} ${styles.statusFailed}`;

      default:
        return `${styles.statusBadge} ${styles.statusPending}`;
    }
  };

  if (loading) {
    return (
      <div className={styles.infoCard}>
        Sipariş detayı yükleniyor...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className={styles.errorCard}>
        <h2>Sipariş açılamadı</h2>

        <p>
          {error ||
            "Sipariş bulunamadı."}
        </p>

        <Link
          href="/admin/orders"
          className={styles.backLink}
        >
          Siparişlere Dön
        </Link>
      </div>
    );
  }

  const totalQuantity =
    order.items.reduce(
      (total, item) =>
        total + item.quantity,
      0
    );

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>
            SİPARİŞ DETAYI
          </p>

          <h1>
            {order.merchantReference}
          </h1>

          <p className={styles.description}>
            Sipariş, müşteri ve ürün
            bilgilerini görüntüleyebilirsiniz.
          </p>
        </div>

        <Link
          href="/admin/orders"
          className={styles.backButton}
        >
          Siparişlere Dön
        </Link>
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span>Durum</span>

          <strong>
            <span
              className={getStatusClassName(
                order.status
              )}
            >
              {getStatusText(
                order.status
              )}
            </span>
          </strong>
        </div>

        <div className={styles.summaryCard}>
          <span>Sipariş Tarihi</span>

          <strong>
            {formatDate(
              order.createdAt
            )}
          </strong>
        </div>

        <div className={styles.summaryCard}>
          <span>Ürün Adedi</span>

          <strong>
            {totalQuantity}
          </strong>
        </div>

        <div className={styles.summaryCard}>
          <span>Toplam Tutar</span>

          <strong
            className={styles.totalAmount}
          >
            {formatPrice(order.amount)}
          </strong>
        </div>
      </div>

      <div className={styles.contentGrid}>
        <div className={styles.mainColumn}>
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Ürünler</h2>

              <span>
                {order.items.length} kalem
              </span>
            </div>

            <div className={styles.itemList}>
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className={styles.item}
                >
                  <div
                    className={
                      styles.imageArea
                    }
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                      />
                    ) : (
                      <span>📦</span>
                    )}
                  </div>

                  <div
                    className={
                      styles.itemInfo
                    }
                  >
                    <h3>{item.title}</h3>

                    <p>
                      Birim fiyat:{" "}
                      {formatPrice(
                        item.price
                      )}
                    </p>

                    <p>
                      Adet: {item.quantity}
                    </p>
                  </div>

                  <strong>
                    {formatPrice(
                      item.total
                    )}
                  </strong>
                </div>
              ))}
            </div>
          </article>
        </div>

        <div className={styles.sideColumn}>
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Müşteri Bilgileri</h2>
            </div>

            <div className={styles.detailList}>
              <div>
                <span>Ad Soyad</span>

                <strong>
                  {order.customer?.fullName || order.customerName || "Bilinmeyen Müşteri"}
                </strong>
              </div>

              <div>
                <span>E-posta</span>

                <strong>
                  {order.customer?.email || order.customerEmail || "Eklenmemiş"}
                </strong>
              </div>

              <div>
                <span>Telefon</span>

                <strong>
                  {order.customer?.phone || order.customerPhone || "Eklenmemiş"}
                </strong>
              </div>
            </div>
          </article>

          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Teslimat Bilgileri</h2>
            </div>

            <div className={styles.detailList}>
              <div>
                <span>Adres</span>

                <strong>
                  {order.customer?.address || order.customerAddress || "Eklenmemiş"}
                </strong>
              </div>

              <div>
                <span>Şehir</span>

                <strong>
                  {order.customer?.city || "Eklenmemiş"}
                </strong>
              </div>

              <div>
                <span>Posta Kodu</span>

                <strong>
                  {order.customer?.postalCode || "Eklenmemiş"}
                </strong>
              </div>
            </div>
          </article>

          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Sipariş Özeti</h2>
            </div>

            <div className={styles.detailList}>
              <div>
                <span>Ürün Kalemi</span>

                <strong>
                  {order.items.length}
                </strong>
              </div>

              <div>
                <span>
                  Toplam Ürün Adedi
                </span>

                <strong>
                  {totalQuantity}
                </strong>
              </div>

              <div>
                <span>Para Birimi</span>

                <strong>
                  {order.currency}
                </strong>
              </div>

              <div>
                <span>Toplam Tutar</span>

                <strong
                  className={
                    styles.summaryAmount
                  }
                >
                  {formatPrice(
                    order.amount
                  )}
                </strong>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}