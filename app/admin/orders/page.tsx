"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./orders.module.css";

interface AdminOrder {
  id: number;
  merchantReference: string;
  amount: number;
  currency: string;
  status: string;
  customerId: number | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  createdAt: string;
  itemCount: number;
}

interface OrdersResponse {
  status?: string;
  message?: string;
  orders?: AdminOrder[];
}

type StatusFilter = "all" | "paid" | "pending" | "failed";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [todayOnly, setTodayOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/orders", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data: OrdersResponse = await response.json();

      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }

      if (!response.ok) {
        setError(data.message || "Siparişler getirilemedi.");
        setOrders([]);
        return;
      }

      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (error) {
      console.error("Sipariş listeleme hatası:", error);
      setError("Siparişler alınırken bağlantı hatası oluştu.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const status = params.get("status");
      const filter = params.get("filter");

      if (status === "pending") {
        setStatusFilter("pending");
      } else if (status === "paid") {
        setStatusFilter("paid");
      } else if (status === "failed") {
        setStatusFilter("failed");
      }

      if (filter === "today") {
        setTodayOnly(true);
      }

      void fetchOrders();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("tr-TR");

    return orders.filter((order) => {
      const searchableText = [
        order.merchantReference,
        order.customerName,
        order.customerEmail,
        order.customerPhone,
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      const matchesSearch =
        !normalizedSearch || searchableText.includes(normalizedSearch);

      const normalizedStatus = order.status.toLowerCase();

      const paidStatuses = ["paid", "success", "completed"];
      const pendingStatuses = ["created", "active", "pending"];
      const failedStatuses = ["failed", "cancelled", "canceled"];

      let matchesStatus = true;

      if (statusFilter === "paid") {
        matchesStatus = paidStatuses.includes(normalizedStatus);
      }

      if (statusFilter === "pending") {
        matchesStatus = pendingStatuses.includes(normalizedStatus);
      }

      if (statusFilter === "failed") {
        matchesStatus = failedStatuses.includes(normalizedStatus);
      }

      let matchesDate = true;

      if (todayOnly) {
        const orderDate = new Date(order.createdAt);
        const today = new Date();

        matchesDate =
          orderDate.getFullYear() === today.getFullYear() &&
          orderDate.getMonth() === today.getMonth() &&
          orderDate.getDate() === today.getDate();
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [orders, search, statusFilter, todayOnly]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTodayOnly(false);
    window.history.replaceState({}, "", "/admin/orders");
  };

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

  const hasActiveFilter =
    search.trim() !== "" || statusFilter !== "all" || todayOnly;

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Sipariş Yönetimi</h1>

          <p className={styles.description}>
            Oluşturulan bütün siparişleri görüntüleyebilirsiniz.
          </p>
        </div>

        <button
          type="button"
          className={styles.refreshButton}
          onClick={fetchOrders}
          disabled={loading}
        >
          {loading ? "Yükleniyor..." : "Yenile"}
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.orderCount}>
          <strong>{filteredOrders.length} sipariş</strong>

          <span>
            {hasActiveFilter
              ? ` gösteriliyor (${orders.length} toplam)`
              : " kayıtlı"}
          </span>
        </div>

        <div className={styles.filters}>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Sipariş no, müşteri veya e-posta ara"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <select
            className={styles.statusSelect}
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as StatusFilter)
            }
          >
            <option value="all">Tüm Durumlar</option>
            <option value="paid">Ödendi</option>
            <option value="pending">Ödeme Bekleniyor</option>
            <option value="failed">Başarısız</option>
          </select>

          {hasActiveFilter && (
            <button
              type="button"
              className={styles.refreshButton}
              onClick={clearFilters}
            >
              Filtreleri Temizle
            </button>
          )}
        </div>
      </div>

      {todayOnly && !loading && !error && (
        <div className={styles.infoCard}>
          Yalnızca bugün oluşturulan siparişler gösteriliyor.
        </div>
      )}

      {loading && (
        <div className={styles.infoCard}>Siparişler yükleniyor...</div>
      )}

      {!loading && error && (
        <div className={styles.errorCard}>
          <p>{error}</p>

          <button type="button" onClick={fetchOrders}>
            Tekrar Dene
          </button>
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className={styles.infoCard}>Henüz sipariş bulunmuyor.</div>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Sipariş No</th>
                <th>Müşteri</th>
                <th>Ürün</th>
                <th>Tarih</th>
                <th>Durum</th>
                <th>Tutar</th>
                <th>İşlem</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <strong className={styles.reference}>
                      {order.merchantReference}
                    </strong>
                  </td>

                  <td>
                    <div className={styles.customerCell}>
                      <strong>{order.customerName}</strong>
                      <span>{order.customerEmail}</span>
                    </div>
                  </td>

                  <td>{order.itemCount}</td>

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

          {filteredOrders.length === 0 && (
            <div className={styles.noResult}>
              Seçilen filtrelerle eşleşen sipariş bulunamadı.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
