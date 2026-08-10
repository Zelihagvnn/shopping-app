"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Header from "../../components/Header";
import { useProductStore } from "@/store/productStore";
import styles from "./success.module.css";

interface SearchParamsProps {
  searchParams: Promise<{
    merchantReference?: string;
    orderId?: string;
    p_id?: string;
    process_id?: string;
    processId?: string;
  }>;
}

export default function CheckoutSuccessPage({ searchParams }: SearchParamsProps) {
  const params = use(searchParams);
  const merchantReference = params.merchantReference || "";
  const orderId = params.orderId || "";
  const processId = params.p_id || params.process_id || params.processId || "";
  const { clearCart } = useProductStore();

  const [refCode] = useState(() => {
    if (merchantReference || processId) return merchantReference || processId;
    if (typeof window !== "undefined") {
      return localStorage.getItem("lastOrderMerchantReference") || "";
    }
    return "";
  });

  // 1. Ödeme tamamlanıp onay sayfasına gelindiğinde iframe dışına çık ve sepeti temizle
  useEffect(() => {
    if (typeof window !== "undefined" && window.top && window.top !== window.self) {
      window.top.location.href = window.location.href;
      return;
    }
    clearCart();
  }, [clearCart]);

  // 2. Sipariş durumunu Paythor ile doğrula ve DB'de 'paid' yap
  useEffect(() => {
    const activeRef = refCode;

    if (activeRef && !activeRef.startsWith("POS-")) {
      fetch("/api/orders/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          merchantReference: activeRef,
          processId: processId || "",
        }),
      }).catch((err) => {
        console.error("Sipariş durumu güncellenirken hata oluştu:", err);
      });
    }
  }, [refCode, processId]);

  return (
    <>
      <Header />

      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.iconCircle}>✓</div>

          <h1 className={styles.title}>Ödemeniz Başarıyla Alındı!</h1>

          <p className={styles.subtitle}>
            Siparişiniz sistemimize kaydedildi. Hazırlanma sürecini Siparişlerim
            sayfasından anlık olarak takip edebilirsiniz.
          </p>

          {refCode && (
            <div className={styles.orderBadge}>
              <label>Sipariş Takip Numarası</label>
              <strong>{refCode}</strong>
            </div>
          )}

          <div className={styles.buttonGroup}>
            {refCode.startsWith("POS-") ? (
              <>
                <Link href="/admin/orders" className={styles.primaryBtn}>
                  Admin Siparişlerine Git
                </Link>
                <Link href="/admin/pos" className={styles.secondaryBtn}>
                  Kasa / POS&apos;a Dön
                </Link>
              </>
            ) : orderId ? (
              <Link href={`/orders/${orderId}`} className={styles.primaryBtn}>
                Sipariş Detayını Gör
              </Link>
            ) : (
              <Link href="/orders" className={styles.primaryBtn}>
                Siparişlerime Git
              </Link>
            )}

            {!refCode.startsWith("POS-") && (
              <Link href="/" className={styles.secondaryBtn}>
                Alışverişe Devam Et
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
