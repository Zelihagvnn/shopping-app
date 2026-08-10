"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Header from "../components/Header";
import styles from "./account.module.css";

interface Customer {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
}

export default function AccountPage() {
  const [customer, setCustomer] = useState<Customer | null>(null);

  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState("");

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");

  useEffect(() => {
    const getCustomer = async () => {
      try {
        const response = await fetch("/api/customer/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          window.location.href = "/login";
          return;
        }

        const data = await response.json();

        if (!data.customer) {
          window.location.href = "/login";
          return;
        }

        setCustomer(data.customer);
        setFullName(data.customer.fullName || "");
        setPhone(data.customer.phone || "");
        setAddress(data.customer.address || "");
        setCity(data.customer.city || "");
        setPostalCode(data.customer.postalCode || "");
      } catch (error) {
        console.error("Hesap bilgileri alınamadı:", error);

        setErrorMessage("Hesap bilgileri alınırken bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    };

    getCustomer();
  }, []);

  const handleUpdateProfile = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setSaving(true);

    try {
      const response = await fetch("/api/customer/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          fullName,
          phone,
          address,
          city,
          postalCode,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.status === "error") {
        setErrorMessage(data.message || "Profil güncellenemedi.");
        return;
      }

      setCustomer(data.customer);
      setSuccessMessage("Profil bilgileriniz başarıyla güncellendi.");
      setEditing(false);

      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Profil güncelleme hatası:", error);
      setErrorMessage("Profil güncellenirken bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/customer/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        setErrorMessage("Çıkış işlemi gerçekleştirilemedi.");
        return;
      }

      window.location.href = "/";
    } catch (error) {
      console.error("Çıkış hatası:", error);

      setErrorMessage("Çıkış sırasında bir hata oluştu.");
    }
  };

  const getInitials = (fullName: string) => {
    return fullName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((name) => name.charAt(0).toUpperCase())
      .join("");
  };

  if (loading) {
    return (
      <>
        <Header />

        <main className={styles.page}>
          <div className={styles.loadingCard}>
            Hesap bilgileri yükleniyor...
          </div>
        </main>
      </>
    );
  }

  if (!customer) {
    return null;
  }

  const hasDeliveryInformation = Boolean(
    customer.phone || customer.address || customer.city || customer.postalCode,
  );

  return (
    <>
      <Header />

      <main className={styles.page}>
        <div className={styles.container}>
          <section className={styles.profileHeader}>
            <div className={styles.avatar}>
              {getInitials(customer.fullName)}
            </div>

            <div className={styles.profileTitle}>
              <span className={styles.welcomeText}>Hoş geldiniz</span>

              <h1>{customer.fullName}</h1>

              <p>{customer.email}</p>
            </div>

            <button
              type="button"
              style={{
                marginLeft: "auto",
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                fontWeight: "bold",
                fontSize: "13px",
                cursor: "pointer",
              }}
              onClick={() => setEditing((prev) => !prev)}
            >
              {editing ? "İptal Et" : "✏️ Bilgileri Düzenle"}
            </button>
          </section>

          {successMessage && (
            <p
              style={{
                padding: "12px",
                background: "rgba(34, 197, 94, 0.15)",
                border: "1px solid #22c55e",
                color: "#22c55e",
                borderRadius: "8px",
                marginBottom: "20px",
                fontWeight: "bold",
              }}
            >
              ✅ {successMessage}
            </p>
          )}

          {errorMessage && (
            <p className={styles.errorMessage}>{errorMessage}</p>
          )}

          {editing && (
            <div
              style={{
                background: "#1b1c1f",
                border: "1px solid #2d2f34",
                borderRadius: "18px",
                padding: "24px",
                marginBottom: "24px",
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: "16px" }}>
                Profil ve Teslimat Bilgilerini Düzenle
              </h3>
              <form
                onSubmit={handleUpdateProfile}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "4px",
                      fontSize: "13px",
                      color: "#aaa",
                    }}
                  >
                    Ad Soyad
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #333",
                      background: "transparent",
                      color: "#fff",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "4px",
                      fontSize: "13px",
                      color: "#aaa",
                    }}
                  >
                    Telefon
                  </label>
                  <input
                    type="tel"
                    placeholder="05xx xxx xx xx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #333",
                      background: "transparent",
                      color: "#fff",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "4px",
                      fontSize: "13px",
                      color: "#aaa",
                    }}
                  >
                    Adres
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Teslimat adresinizi giriniz"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #333",
                      background: "transparent",
                      color: "#fff",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        fontSize: "13px",
                        color: "#aaa",
                      }}
                    >
                      Şehir
                    </label>
                    <input
                      type="text"
                      placeholder="Şehir"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #333",
                        background: "transparent",
                        color: "#fff",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        fontSize: "13px",
                        color: "#aaa",
                      }}
                    >
                      Posta Kodu
                    </label>
                    <input
                      type="text"
                      placeholder="Posta kodu"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #333",
                        background: "transparent",
                        color: "#fff",
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: "12px",
                    background: "#16a34a",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "bold",
                    fontSize: "14px",
                    cursor: "pointer",
                    marginTop: "8px",
                  }}
                >
                  {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
                </button>
              </form>
            </div>
          )}

          <div className={styles.content}>
            <section className={styles.profileCard}>
              <div className={styles.cardHeader}>
                <div>
                  <h2>Profil Bilgileri</h2>

                  <p>Nova Store hesabınıza kayıtlı temel bilgiler</p>
                </div>

                <span className={styles.cardIcon}>👤</span>
              </div>

              <div className={styles.infoList}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Ad Soyad</span>

                  <strong>{customer.fullName}</strong>
                </div>

                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>E-posta</span>

                  <strong>{customer.email}</strong>
                </div>
              </div>

              <div className={styles.deliverySection}>
                <div className={styles.deliveryHeader}>
                  <div>
                    <h3>Teslimat Bilgileri</h3>

                    <p>Siparişlerde kullanılacak telefon ve adres bilgileri</p>
                  </div>

                  <span>📍</span>
                </div>

                {hasDeliveryInformation ? (
                  <div className={styles.infoList}>
                    {customer.phone && (
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Telefon</span>

                        <strong>{customer.phone}</strong>
                      </div>
                    )}

                    {customer.address && (
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Adres</span>

                        <strong>{customer.address}</strong>
                      </div>
                    )}

                    {customer.city && (
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Şehir</span>

                        <strong>{customer.city}</strong>
                      </div>
                    )}

                    {customer.postalCode && (
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Posta Kodu</span>

                        <strong>{customer.postalCode}</strong>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={styles.emptyDelivery}>
                    <span className={styles.emptyIcon}>📦</span>

                    <div>
                      <strong>Henüz teslimat bilgisi bulunmuyor</strong>

                      <p>
                        Telefon ve adres bilgileriniz ödeme sırasında
                        alınacaktır.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <aside className={styles.actionsCard}>
              <h2>Hesap İşlemleri</h2>

              <p className={styles.actionsDescription}>
                Siparişlerinizi ve hesabınızı buradan yönetebilirsiniz.
              </p>

              <Link href="/orders" className={styles.actionLink}>
                <span className={styles.actionIcon}>📦</span>

                <span className={styles.actionText}>
                  <strong>Siparişlerim</strong>

                  <small>Geçmiş siparişlerinizi görüntüleyin</small>
                </span>

                <span className={styles.actionArrow}>›</span>
              </Link>

              <Link href="/" className={styles.actionLink}>
                <span className={styles.actionIcon}>🛍️</span>

                <span className={styles.actionText}>
                  <strong>Alışverişe Devam Et</strong>

                  <small>Ürünleri incelemeye devam edin</small>
                </span>

                <span className={styles.actionArrow}>›</span>
              </Link>

              <button
                type="button"
                className={styles.logoutButton}
                onClick={handleLogout}
              >
                <span>🚪</span>
                <span>Çıkış Yap</span>
              </button>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
