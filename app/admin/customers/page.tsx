"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "./customers.module.css";

interface Customer {
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
}

interface CustomersResponse {
  status?: string;
  message?: string;
  customers?: Customer[];
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/customers", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data: CustomersResponse = await response.json();

      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }

      if (!response.ok) {
        setError(data.message || "Müşteriler getirilemedi.");

        setCustomers([]);
        return;
      }

      setCustomers(Array.isArray(data.customers) ? data.customers : []);
    } catch (error) {
      console.error("Müşteri listeleme hatası:", error);

      setError("Müşteriler alınırken bağlantı hatası oluştu.");

      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchCustomers();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const filteredCustomers = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("tr-TR");

    if (!normalizedSearch) {
      return customers;
    }

    return customers.filter((customer) => {
      const searchableText = [
        customer.fullName,
        customer.email,
        customer.phone ?? "",
        customer.city ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      return searchableText.includes(normalizedSearch);
    });
  }, [customers, search]);

  const formatDate = (dateValue: string) => {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Müşteri Yönetimi</h1>

          <p className={styles.description}>
            Kayıtlı müşterileri ve sipariş sayılarını görüntüleyebilirsiniz.
          </p>
        </div>

        <button
          type="button"
          className={styles.refreshButton}
          onClick={fetchCustomers}
          disabled={loading}
        >
          {loading ? "Yükleniyor..." : "Yenile"}
        </button>
      </div>

      <div className={styles.toolbar}>
        <div>
          <strong>{customers.length} müşteri</strong>

          <span> kayıtlı</span>
        </div>

        <input
          type="search"
          className={styles.searchInput}
          placeholder="Ad, e-posta, telefon veya şehir ara"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {loading && (
        <div className={styles.infoCard}>Müşteriler yükleniyor...</div>
      )}

      {!loading && error && (
        <div className={styles.errorCard}>
          <p>{error}</p>

          <button type="button" onClick={fetchCustomers}>
            Tekrar Dene
          </button>
        </div>
      )}

      {!loading && !error && customers.length === 0 && (
        <div className={styles.infoCard}>Henüz kayıtlı müşteri bulunmuyor.</div>
      )}

      {!loading && !error && customers.length > 0 && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Müşteri</th>
                <th>Telefon</th>
                <th>Şehir</th>
                <th>Kayıt Tarihi</th>
                <th>Sipariş</th>
                <th>İşlem</th>
              </tr>
            </thead>

            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <div className={styles.customerCell}>
                      <div className={styles.avatar}>
                        {customer.fullName
                          .trim()
                          .charAt(0)
                          .toLocaleUpperCase("tr-TR") || "M"}
                      </div>

                      <div>
                        <strong>{customer.fullName}</strong>

                        <span>{customer.email}</span>
                      </div>
                    </div>
                  </td>

                  <td>{customer.phone || "Eklenmemiş"}</td>

                  <td>{customer.city || "Eklenmemiş"}</td>

                  <td>{formatDate(customer.createdAt)}</td>

                  <td>
                    <span className={styles.orderBadge}>
                      {customer.orderCount}
                    </span>
                  </td>

                  <td>
                    <a
                      href={`/admin/customers/${customer.id}`}
                      className={styles.detailButton}
                    >
                      Görüntüle
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredCustomers.length === 0 && (
            <div className={styles.noResult}>
              Aramanızla eşleşen müşteri bulunamadı.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
