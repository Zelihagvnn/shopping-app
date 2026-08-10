"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import styles from "./dashboard.module.css";

interface DashboardStats {
  productCount: number;
  customerCount: number;
  orderCount: number;
  todayOrderCount: number;
  pendingOrderCount: number;
  totalRevenue: number;
}

interface RecentOrder {
  id: number;
  merchantReference: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface DashboardResponse {
  status?: string;
  message?: string;
  stats?: DashboardStats;
  recentOrders?: RecentOrder[];
}

const initialStats: DashboardStats = {
  productCount: 0,
  customerCount: 0,
  orderCount: 0,
  todayOrderCount: 0,
  pendingOrderCount: 0,
  totalRevenue: 0,
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/dashboard", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data: DashboardResponse = await response.json();

      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }

      if (!response.ok) {
        setError(data.message || "Dashboard verileri alınamadı.");
        return;
      }

      setStats(data.stats || initialStats);
      setRecentOrders(
        Array.isArray(data.recentOrders) ? data.recentOrders : [],
      );
    } catch (error) {
      console.error("Dashboard yükleme hatası:", error);
      setError("Dashboard verileri alınırken bağlantı hatası oluştu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchDashboard();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(price);

  const formatDate = (dateValue: string) => {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "2-digit",
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

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Dashboard</h1>

          <p className={styles.description}>
            Nova Store sisteminin genel durumunu görüntüleyebilirsiniz.
          </p>
        </div>

        <button
          type="button"
          className={styles.refreshButton}
          onClick={fetchDashboard}
          disabled={loading}
        >
          {loading ? "Yükleniyor..." : "Yenile"}
        </button>
      </div>

      {error && <div className={styles.errorCard}>{error}</div>}

      <div className={styles.statsGrid}>
        <Link href="/admin/products" className={styles.statCard}>
          <span className={styles.statLabel}>Toplam Ürün</span>
          <strong className={styles.statValue}>{stats.productCount}</strong>
          <span className={styles.statLink}>Ürünleri görüntüle →</span>
        </Link>

        <Link href="/admin/customers" className={styles.statCard}>
          <span className={styles.statLabel}>Toplam Müşteri</span>
          <strong className={styles.statValue}>{stats.customerCount}</strong>
          <span className={styles.statLink}>Müşterileri görüntüle →</span>
        </Link>

        <Link href="/admin/orders" className={styles.statCard}>
          <span className={styles.statLabel}>Toplam Sipariş</span>
          <strong className={styles.statValue}>{stats.orderCount}</strong>
          <span className={styles.statLink}>Siparişleri görüntüle →</span>
        </Link>

        <Link href="/admin/orders?filter=today" className={styles.statCard}>
          <span className={styles.statLabel}>Bugünkü Sipariş</span>

          <strong className={styles.statValue}>{stats.todayOrderCount}</strong>

          <span className={styles.statLink}>
            Bugünkü siparişleri görüntüle →
          </span>
        </Link>

        <Link href="/admin/orders?status=pending" className={styles.statCard}>
          <span className={styles.statLabel}>Bekleyen Sipariş</span>

          <strong className={styles.pendingValue}>
            {stats.pendingOrderCount}
          </strong>

          <span className={styles.statLink}>
            Bekleyen siparişleri görüntüle →
          </span>
        </Link>

        <div className={`${styles.statCard} ${styles.revenueCard}`}>
          <span className={styles.statLabel}>Toplam Gelir</span>

          <strong className={styles.revenueValue}>
            {formatPrice(stats.totalRevenue)}
          </strong>

          <span className={styles.statLink}>Yalnızca ödenmiş siparişler</span>
        </div>
      </div>

      <article className={styles.recentCard}>
        <div className={styles.cardHeader}>
          <div>
            <h2>Son Siparişler</h2>
            <p>Sistemde oluşturulan son 5 sipariş.</p>
          </div>

          <Link href="/admin/orders" className={styles.allOrdersLink}>
            Tüm Siparişler
          </Link>
        </div>

        {loading ? (
          <div className={styles.infoArea}>Siparişler yükleniyor...</div>
        ) : recentOrders.length === 0 ? (
          <div className={styles.infoArea}>Henüz sipariş bulunmuyor.</div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Sipariş No</th>
                  <th>Müşteri</th>
                  <th>Tarih</th>
                  <th>Durum</th>
                  <th>Tutar</th>
                  <th>İşlem</th>
                </tr>
              </thead>

              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.merchantReference}</strong>
                    </td>

                    <td>
                      <div className={styles.customerCell}>
                        <strong>{order.customerName}</strong>
                        <span>{order.customerEmail}</span>
                      </div>
                    </td>

                    <td>{formatDate(order.createdAt)}</td>

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
                        className={styles.detailLink}
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
    </section>
  );
}
