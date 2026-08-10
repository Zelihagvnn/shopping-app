"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useProductStore } from "@/store/productStore";
import PaymentLinkPanel from "./PaymentLinkPanel";
import styles from "./checkout.module.css";

type PaymentMethod = "cash" | "card";
type CardPaymentFlow = "device" | "link";

interface PaythorMessage {
  type?: string;
  tdsForm?: string;
  form_selector_id?: string;
  isSuccess?: boolean;
  processID?: string;
  error?: string;
}

export default function PosCheckoutPage() {
  const { cart, clearCart } = useProductStore();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [cardPaymentFlow, setCardPaymentFlow] =
    useState<CardPaymentFlow>("device");
  const [loading, setLoading] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [error, setError] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [merchantReference, setMerchantReference] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  //Aynı başarılı Paythor mesajının birden fazla kez işlenmesini engeller.
  const paymentProcessing = useRef(false);

  const formatPrice = (value: number) =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(value);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  useEffect(() => {
    const handlePaymentMessage = async (
      event: MessageEvent<PaythorMessage>,
    ) => {
      if (event.origin !== "https://pay.paythor.com" || !event.data) return;

      if (
        event.data.type === "opensource" &&
        event.data.tdsForm &&
        event.data.form_selector_id === "three_d_form"
      ) {
        const container = document.createElement("div");
        container.innerHTML = event.data.tdsForm;
        const form = container.querySelector("form");
        if (form) {
          document.body.appendChild(form);
          form.submit();
        }
        return;
      }

      if (event.data.error) {
        setError(event.data.error);
        return;
      }

      if (!event.data.isSuccess || paymentProcessing.current) return;
      if (!event.data.processID || !merchantReference) {
        setError("Ödeme başarılı ancak doğrulama bilgileri eksik.");
        return;
      }

      paymentProcessing.current = true;
      setLoading(true);

      try {
        const response = await fetch("/api/admin/pos/payment/status", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            merchantReference,
            processId: event.data.processID,
          }),
        });
        const data = await response.json();

        if (!response.ok || !data.order) {
          setError(data.message || "Paythor ödemesi doğrulanamadı.");
          paymentProcessing.current = false;
          return;
        }

        clearCart();
        // Ödeme başarılı, POS başarı sayfasına yönlendir.
        window.location.assign(
          `/admin/pos/success?orderId=${data.order.id}&reference=${encodeURIComponent(
            data.order.merchantReference,
          )}&amount=${encodeURIComponent(String(data.order.amount))}&method=paythor`,
        );
      } catch (verificationError) {
        console.error("POS Paythor sonuç hatası:", verificationError);
        setError("Ödeme sonucu doğrulanırken bağlantı hatası oluştu.");
        paymentProcessing.current = false;
      } finally {
        setLoading(false);
      }
    };

    window.addEventListener("message", handlePaymentMessage);
    return () => window.removeEventListener("message", handlePaymentMessage);
  }, [clearCart, merchantReference]);

  //ödeme durumu kontrolü.
  const checkSharedPaymentStatus = async () => {
    if (!merchantReference) return;

    setCheckingPayment(true);
    setError("");

    try {
      const response = await fetch("/api/admin/pos/payment/status", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantReference }),
      });
      const data = await response.json();

      if (response.status === 202 || data.status === "pending") {
        setError(data.message || "Ödeme henüz tamamlanmadı.");
        return;
      }

      if (!response.ok || !data.order) {
        setError(data.message || "Paythor ödemesi doğrulanamadı.");
        return;
      }

      clearCart();
      // Ödeme başarılı, POS başarı sayfasına yönlendir.
      window.location.assign(
        `/admin/pos/success?orderId=${data.order.id}&reference=${encodeURIComponent(
          data.order.merchantReference,
        )}&amount=${encodeURIComponent(String(data.order.amount))}&method=paythor-link`,
      );
    } catch (verificationError) {
      console.error("POS ödeme linki kontrol hatası:", verificationError);
      setError("Ödeme kontrol edilirken bağlantı hatası oluştu.");
    } finally {
      setCheckingPayment(false);
    }
  };

  const completeSale = async () => {
    if (cart.length === 0) {
      setError("Satış sepeti boş.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const endpoint =
        paymentMethod === "card"
          ? "/api/admin/pos/payment"
          : "/api/admin/pos/checkout";
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(paymentMethod === "cash" ? { paymentMethod } : {}),
          items: cart.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Satış tamamlanamadı.");
        return;
      }

      if (paymentMethod === "card") {
        const newPaymentLink = data.data?.payment_link;
        const newReference = data.data?.merchant_reference;

        if (!newPaymentLink || !newReference) {
          setError("Paythor ödeme bağlantısı oluşturulamadı.");
          return;
        }

        paymentProcessing.current = false;
        setPaymentLink(newPaymentLink);
        setMerchantReference(newReference);
        if (cardPaymentFlow === "device") {
          setShowPaymentModal(true);
        }
        return;
      }

      if (!data.order) {
        setError("Nakit satış kaydedilemedi.");
        return;
      }

      clearCart();
      window.location.assign(
        `/admin/pos/success?orderId=${data.order.id}&reference=${encodeURIComponent(
          data.order.merchantReference,
        )}&amount=${encodeURIComponent(String(data.order.amount))}&method=${paymentMethod}`,
      );
    } catch (requestError) {
      console.error("POS ödeme hatası:", requestError);
      setError("Satış tamamlanırken bağlantı hatası oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p>KASA / POS</p>
          <h1>Ödeme</h1>
          <span>Satışı kontrol edin ve ödeme yöntemini seçin.</span>
        </div>
        <Link href="/admin/pos">← Hızlı Satışa Dön</Link>
      </header>

      <div className={styles.layout}>
        <section className={styles.itemsCard}>
          <h2>Satış Özeti</h2>

          {cart.length === 0 ? (
            <div className={styles.empty}>
              <p>Satış sepeti boş.</p>
              <Link href="/admin/pos">Ürün okutmaya dön</Link>
            </div>
          ) : (
            <div className={styles.items}>
              {cart.map((item) => (
                <article key={item.cartItemId}>
                  <img src={item.image} alt={item.title} />
                  <div>
                    <strong>{item.title}</strong>
                    <small>
                      {[item.selectedSize, item.selectedColor]
                        .filter(Boolean)
                        .join(" / ") || "Standart"}
                    </small>
                    <span>
                      {item.quantity} × {formatPrice(item.price)}
                    </span>
                  </div>
                  <b>{formatPrice(item.price * item.quantity)}</b>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className={styles.paymentCard}>
          <h2>Ödeme Yöntemi</h2>

          <div className={styles.methods}>
            <button
              type="button"
              className={paymentMethod === "cash" ? styles.selected : ""}
              onClick={() => setPaymentMethod("cash")}
            >
              <strong>Nakit</strong>
              <span>Nakit ödeme alındıktan sonra satışı tamamlayın.</span>
            </button>
            <button
              type="button"
              className={paymentMethod === "card" ? styles.selected : ""}
              onClick={() => setPaymentMethod("card")}
            >
              <strong>Paythor ile Kart</strong>
              <span>Kart bilgileri güvenli Paythor ekranında girilir.</span>
            </button>
          </div>

          {paymentMethod === "card" && (
            <div className={styles.cardFlows}>
              <span>Kart ödemesi nasıl alınacak?</span>
              <div>
                <button
                  type="button"
                  className={
                    cardPaymentFlow === "device" ? styles.selected : ""
                  }
                  onClick={() => setCardPaymentFlow("device")}
                >
                  Bu cihazda öde
                </button>
                <button
                  type="button"
                  className={cardPaymentFlow === "link" ? styles.selected : ""}
                  onClick={() => setCardPaymentFlow("link")}
                >
                  Ödeme linki gönder
                </button>
              </div>
            </div>
          )}

          <div className={styles.total}>
            <span>Ödenecek Tutar</span>
            <strong>{formatPrice(total)}</strong>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          {!(
            paymentMethod === "card" &&
            cardPaymentFlow === "link" &&
            paymentLink
          ) && (
            <button
              type="button"
              className={styles.completeButton}
              disabled={cart.length === 0 || loading}
              onClick={completeSale}
            >
              {loading
                ? "İşlem Hazırlanıyor..."
                : paymentMethod === "card" && cardPaymentFlow === "link"
                  ? "Ödeme Linki Oluştur"
                  : paymentMethod === "card"
                    ? "Paythor Ödeme Ekranını Aç"
                    : "Nakit Ödemeyi Onayla"}
            </button>
          )}

          {paymentMethod === "card" &&
            cardPaymentFlow === "link" &&
            paymentLink && (
              <PaymentLinkPanel
                paymentLink={paymentLink}
                checking={checkingPayment}
                onCheckStatus={checkSharedPaymentStatus}
              />
            )}

          <small className={styles.notice}>
            Nakit satış hemen kaydedilir. Kart satışında stok yalnızca Paythor
            ödemeyi doğruladıktan sonra azaltılır.
          </small>
        </section>
      </div>

      {showPaymentModal && paymentLink && (
        <div className={styles.paymentOverlay} role="dialog" aria-modal="true">
          <div className={styles.paymentModal}>
            <div className={styles.paymentModalHeader}>
              <div>
                <h2>Paythor Kart Ödemesi</h2>
                <p>Ödeme tamamlanınca satış otomatik olarak onaylanır.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentLink("");
                }}
              >
                ×
              </button>
            </div>
            <iframe
              src={paymentLink}
              title="Paythor ödeme ekranı"
              className={styles.paymentFrame}
              allow="payment"
            />
            <a href={paymentLink} target="_blank" rel="noreferrer">
              Ödeme ekranını yeni sekmede aç
            </a>
          </div>
        </div>
      )}
    </main>
  );
}
