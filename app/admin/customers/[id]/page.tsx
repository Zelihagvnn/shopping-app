"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import styles from "./customer-detail.module.css";

interface CustomerOrder {
  id: number;
  merchantReference: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  productCount: number;
}

interface CustomerDetail {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  createdAt: string;
  updatedAt: string;
  orderCount: number;
  totalSpent: number;
  orders: CustomerOrder[];
}

interface CustomerDetailResponse {
  status?: string;
  message?: string;
  customer?: CustomerDetail;
}

export default function AdminCustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const customerId = params.id;

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`/api/admin/customers/${customerId}`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const data: CustomerDetailResponse = await response.json();

        if (response.status === 401) {
          window.location.href = "/admin/login";
          return;
        }

        if (!response.ok) {
          setError(data.message || "Müşteri bilgileri getirilemedi.");
          setCustomer(null);
          return;
        }

        setCustomer(data.customer ?? null);
      } catch (error) {
        console.error("Müşteri detay yükleme hatası:", error);
        setError("Müşteri bilgileri alınırken bağlantı hatası oluştu.");
        setCustomer(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [customerId]);

  const formatPrice = (value: number) =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(value);

  const formatDate = (dateValue: string) => {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
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
        return "Başarısız";

      default:
        return status;
    }
  };

  const getStatusClassName = (status: string) => {
    switch (status.toLowerCase()) {
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
      <div className={styles.infoCard}>Müşteri bilgileri yükleniyor...</div>
    );
  }

  if (error || !customer) {
    return (
      <div className={styles.errorCard}>
        <h2>Müşteri açılamadı</h2>
        <p>{error || "Müşteri bulunamadı."}</p>

        <Link href="/admin/customers" className={styles.backLink}>
          Müşterilere Dön
        </Link>
      </div>
    );
  }

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>MÜŞTERİ DETAYI</p>
          <h1>{customer.fullName}</h1>
          <p className={styles.description}>
            Müşteri bilgilerini, siparişlerini ve toplam harcamasını
            görüntüleyebilirsiniz.
          </p>
        </div>

        <Link href="/admin/customers" className={styles.backButton}>
          Müşterilere Dön
        </Link>
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span>Toplam Sipariş</span>
          <strong>{customer.orderCount}</strong>
        </div>

        <div className={styles.summaryCard}>
          <span>Toplam Harcama</span>
          <strong className={styles.totalSpent}>
            {formatPrice(customer.totalSpent)}
          </strong>
        </div>

        <div className={styles.summaryCard}>
          <span>Kayıt Tarihi</span>
          <strong>{formatDate(customer.createdAt)}</strong>
        </div>
      </div>

      <div className={styles.contentGrid}>
        <div className={styles.sideColumn}>
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Profil Bilgileri</h2>
            </div>

            <div className={styles.detailList}>
              <div>
                <span>Ad Soyad</span>
                <strong>{customer.fullName}</strong>
              </div>

              <div>
                <span>E-posta</span>
                <strong>{customer.email}</strong>
              </div>

              <div>
                <span>Telefon</span>
                <strong>{customer.phone || "Eklenmemiş"}</strong>
              </div>
            </div>
          </article>

          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Adres Bilgileri</h2>
            </div>

            <div className={styles.detailList}>
              <div>
                <span>Adres</span>
                <strong>{customer.address || "Eklenmemiş"}</strong>
              </div>

              <div>
                <span>Şehir</span>
                <strong>{customer.city || "Eklenmemiş"}</strong>
              </div>

              <div>
                <span>Posta Kodu</span>
                <strong>{customer.postalCode || "Eklenmemiş"}</strong>
              </div>
            </div>
          </article>
        </div>

        <article className={styles.ordersCard}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Müşteri Siparişleri</h2>
              <p>{customer.orders.length} sipariş bulundu</p>
            </div>
          </div>

          {customer.orders.length === 0 ? (
            <div className={styles.empty}>
              Bu müşteriye ait sipariş bulunmuyor.
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Sipariş No</th>
                    <th>Tarih</th>
                    <th>Ürün</th>
                    <th>Durum</th>
                    <th>Tutar</th>
                    <th>İşlem</th>
                  </tr>
                </thead>

                <tbody>
                  {customer.orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <strong>{order.merchantReference}</strong>
                      </td>

                      <td>{formatDate(order.createdAt)}</td>

                      <td>{order.productCount}</td>

                      <td>
                        <span className={getStatusClassName(order.status)}>
                          {getStatusText(order.status)}
                        </span>
                      </td>

                      <td>
                        <strong className={styles.amount}>
                          {formatPrice(order.amount)}
                        </strong>
                      </td>

                      <td>
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className={styles.detailButton}
                        >
                          Görüntüle
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
