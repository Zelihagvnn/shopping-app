"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Button from "../components/Button";
import Header from "../components/Header";
import { useProductStore } from "../../store/productStore";
import styles from "./checkout.module.css";

interface PaymentCartItem {
  id: string;
  name: string;
  type: "product" | "discount";
  price: string;
  quantity: number;
}

interface PaythorMessage {
  type?: string;
  tdsForm?: string;
  form_selector_id?: string;
  isSuccess?: boolean;
  processID?: string;
  error?: string;
}

export default function CheckoutPage() {
  const { cart, couponCode, discount, clearCart } = useProductStore();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [paymentLink, setPaymentLink] = useState("");
  const [merchantReference, setMerchantReference] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Aynı ödeme sonucunun birden fazla kez işlenmesini engeller.
  const paymentMessageProcessing = useRef(false);

  const roundMoney = (value: number) =>
    Math.round((value + Number.EPSILON) * 100) / 100;

  const totalPrice = roundMoney(
    cart.reduce((total, item) => total + item.price * item.quantity, 0),
  );

  const totalQuantity = cart.reduce((total, item) => total + item.quantity, 0);

  const discountAmount = roundMoney((totalPrice * discount) / 100);

  const finalPrice = roundMoney(totalPrice - discountAmount);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(price);

  useEffect(() => {
    const handlePaymentMessage = async (
      event: MessageEvent<PaythorMessage>,
    ) => {
      /*
        Yalnızca Paythor ödeme sayfasından gelen
        mesajları işliyoruz.
      */
      if (event.origin !== "https://pay.paythor.com") {
        return;
      }

      const messageData = event.data;

      if (!messageData) {
        return;
      }

      /*
        Paythor 3D Secure formu gönderirse formu
        sayfaya ekleyip otomatik olarak gönderiyoruz.
      */
      if (
        messageData.type === "opensource" &&
        messageData.tdsForm &&
        messageData.form_selector_id === "three_d_form"
      ) {
        const temporaryContainer = document.createElement("div");

        temporaryContainer.innerHTML = messageData.tdsForm;

        const threeDForm = temporaryContainer.querySelector("form");

        if (threeDForm) {
          document.body.appendChild(threeDForm);
          threeDForm.submit();
        }

        return;
      }

      if (messageData.error) {
        setErrorMessage(messageData.error);
        return;
      }

      if (!messageData.isSuccess) {
        return;
      }

      /*
        Paythor aynı mesajı birden fazla kez gönderirse
        işlemin tekrar yapılmasını engeller.
      */
      if (paymentMessageProcessing.current) {
        return;
      }

      const currentMerchantReference =
        merchantReference ||
        localStorage.getItem("currentMerchantReference") ||
        "";

      if (!currentMerchantReference) {
        setErrorMessage(
          "Ödeme başarılı oldu ancak sipariş referansı bulunamadı.",
        );
        return;
      }

      paymentMessageProcessing.current = true;

      try {
        /*
          Siparişin durumunu paid yapar.
          Status API içinde stok azaltma işlemi de
          bulunuyorsa stoklar burada azalır.
        */
        const response = await fetch("/api/orders/status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },

          credentials: "include",

          body: JSON.stringify({
            merchantReference: currentMerchantReference,
            processId: messageData.processID || null,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setErrorMessage(data.message || "Sipariş durumu güncellenemedi.");

          paymentMessageProcessing.current = false;
          return;
        }

        localStorage.setItem(
          "lastOrderMerchantReference",
          currentMerchantReference,
        );

        localStorage.removeItem("currentMerchantReference");

        clearCart();

        setErrorMessage("");

        setTimeout(() => {
          setShowPaymentModal(false);
          setPaymentLink("");

          const orderId = data?.order?.id ? `&orderId=${data.order.id}` : "";
          const processIdParam = messageData.processID
            ? `&p_id=${encodeURIComponent(messageData.processID)}`
            : "";
          window.location.href = `/checkout/success?merchantReference=${encodeURIComponent(
            currentMerchantReference,
          )}${orderId}${processIdParam}`;
        }, 3000);
      } catch (error) {
        console.error("Ödeme sonucu işlenirken hata oluştu:", error);

        setErrorMessage(
          "Ödeme tamamlandı ancak sipariş durumu güncellenirken hata oluştu.",
        );

        paymentMessageProcessing.current = false;
      }
    };

    window.addEventListener("message", handlePaymentMessage);

    return () => {
      window.removeEventListener("message", handlePaymentMessage);
    };
  }, [clearCart, merchantReference]);

  const handlePayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setErrorMessage("");
    paymentMessageProcessing.current = false;

    if (
      !fullName.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !address.trim() ||
      !city.trim() ||
      !postalCode.trim()
    ) {
      setErrorMessage("Lütfen bütün alanları doldurunuz.");
      return;
    }

    if (!email.includes("@")) {
      setErrorMessage("Lütfen geçerli bir e-posta adresi giriniz.");
      return;
    }

    const cleanedPhone = phone.replace(/\D/g, "");

    if (cleanedPhone.length < 10) {
      setErrorMessage("Lütfen geçerli bir telefon numarası giriniz.");
      return;
    }

    if (cart.length === 0) {
      setErrorMessage("Sepetinizde ürün bulunmuyor.");
      return;
    }

    if (finalPrice <= 0) {
      setErrorMessage("Ödenecek tutar sıfırdan büyük olmalıdır.");
      return;
    }

    const nameParts = fullName.trim().split(/\s+/);

    const firstName = nameParts[0] ?? "";

    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

    const orderCart: PaymentCartItem[] = cart.map((item) => {
      const selectedOptions = [
        item.selectedSize ? `Beden: ${item.selectedSize}` : "",
        item.selectedColor ? `Renk: ${item.selectedColor}` : "",
      ].filter(Boolean);

      return {
        id: String(item.id),
        name:
          selectedOptions.length > 0
            ? `${item.title} (${selectedOptions.join(", ")})`
            : item.title,
        type: "product",
        price: roundMoney(item.price).toFixed(2),
        quantity: item.quantity,
      };
    });

    /*
      Kupon uygulanmışsa Paythor sepetine
      indirim kalemi eklenir.
    */
    if (discountAmount > 0) {
      orderCart.push({
        id: `DISCOUNT-${Date.now()}`,
        name: `Kupon İndirimi (%${discount})`,
        type: "discount",
        price: discountAmount.toFixed(2),
        quantity: 1,
      });
    }

    const referenceTime = Date.now();

    const newMerchantReference = `ORDER-${referenceTime}`;

    const paymentBody = {
      checkoutCouponCode: discount > 0 ? couponCode.trim().toUpperCase() : "",
      cartMetadata: cart.map((item) => ({
        productId: item.id,
        variantId: item.variantId,
        selectedSize: item.selectedSize ?? null,
        selectedColor: item.selectedColor ?? null,
      })),
      payment: {
        amount: finalPrice.toFixed(2),
        currency: "TRY",
        buyer_fee: "0",
        method: "creditcard",
        merchant_reference: newMerchantReference,
        return_url: `${window.location.origin}/checkout/success?merchantReference=${newMerchantReference}`,
      },

      payer: {
        first_name: firstName,
        last_name: lastName,
        email: email.trim(),
        phone: cleanedPhone,

        address: {
          line_1: address.trim(),
          city: city.trim(),
          state: city.trim(),
          postal_code: postalCode.trim(),
          country: "TR",
        },

        ip: "127.0.0.1",
      },

      order: {
        cart: orderCart,

        shipping: {
          first_name: firstName,
          last_name: lastName,
          phone: cleanedPhone,
          email: email.trim(),

          address: {
            line_1: address.trim(),
            city: city.trim(),
            state: city.trim(),
            postal_code: postalCode.trim(),
            country: "TR",
          },
        },

        invoice: {
          id: `INV-${referenceTime}`,
          first_name: firstName,
          last_name: lastName,
          price: finalPrice.toFixed(2),
          quantity: 1,
        },
      },
    };

    try {
      setLoading(true);

      const response = await fetch("/api/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        credentials: "include",

        body: JSON.stringify(paymentBody),
      });

      const data = await response.json();

      console.log("API cevabı:", data);

      if (!response.ok) {
        setErrorMessage(
          data.message || "Ödeme oluşturulurken bir hata oluştu.",
        );
        return;
      }

      const newPaymentLink = data?.data?.payment_link;

      if (data.status === "success" && newPaymentLink) {
        /*
          Ödeme sonucunda hangi siparişin
          güncelleneceğini belirlemek için kaydedilir.
        */
        localStorage.setItem("currentMerchantReference", newMerchantReference);

        setMerchantReference(newMerchantReference);

        setPaymentLink(newPaymentLink);
        setShowPaymentModal(true);
      } else {
        setErrorMessage(
          data.message || "Paythor ödeme bağlantısı oluşturulamadı.",
        );
      }
    } catch (error) {
      console.error("Ödeme hatası:", error);

      setErrorMessage("Ödeme isteği sırasında beklenmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentLink("");
  };

  return (
    <>
      <Header />

      <div className={styles.container}>
        {cart.length === 0 ? (
          <div className={styles.emptyCard}>
            <h1>Sepetiniz boş</h1>

            <p>
              Ödeme ekranına geçebilmek için önce sepete ürün eklemelisiniz.
            </p>

            <Link href="/" className={styles.backButton}>
              Alışverişe Dön
            </Link>
          </div>
        ) : (
          <>
            <form className={styles.paymentCard} onSubmit={handlePayment}>
              <h1>💳 Ödeme Bilgileri</h1>

              <div className={styles.formGroup}>
                <label htmlFor="fullName">Ad Soyad</label>

                <input
                  id="fullName"
                  type="text"
                  placeholder="Adınızı ve soyadınızı giriniz"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="email">E-posta</label>

                <input
                  id="email"
                  type="email"
                  placeholder="E-posta adresinizi giriniz"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="phone">Telefon</label>

                <input
                  id="phone"
                  type="tel"
                  placeholder="05xx xxx xx xx"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="address">Adres</label>

                <textarea
                  id="address"
                  placeholder="Teslimat adresinizi giriniz"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  required
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="city">Şehir</label>

                  <input
                    id="city"
                    type="text"
                    placeholder="Antalya"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="postalCode">Posta Kodu</label>

                  <input
                    id="postalCode"
                    type="text"
                    placeholder="07050"
                    value={postalCode}
                    onChange={(event) => setPostalCode(event.target.value)}
                    required
                  />
                </div>
              </div>

              {errorMessage && (
                <p className={styles.errorMessage}>{errorMessage}</p>
              )}

              <Button
                type="submit"
                variant="payment"
                loading={loading}
                loadingText="Ödeme oluşturuluyor..."
              >
                Paythor ile Öde
              </Button>
            </form>

            <div className={styles.summaryCard}>
              <h2>📋 Sipariş Özeti</h2>

              <div className={styles.summaryRow}>
                <span>Toplam Ürün</span>
                <strong>{totalQuantity}</strong>
              </div>

              <div className={styles.summaryRow}>
                <span>Ara Toplam</span>
                <strong>{formatPrice(totalPrice)}</strong>
              </div>

              <div className={styles.summaryRow}>
                <span>İndirim</span>
                <strong>{formatPrice(-discountAmount)}</strong>
              </div>

              <hr />

              <div className={styles.totalArea}>
                <span>Ödenecek Tutar</span>

                <h1>{formatPrice(finalPrice)}</h1>
              </div>

              <Link href="/cart" className={styles.backLink}>
                ← Sepete Geri Dön
              </Link>
            </div>
          </>
        )}
      </div>

      {showPaymentModal && paymentLink && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Güvenli Ödeme</h2>

              <button
                type="button"
                className={styles.closeButton}
                onClick={closePaymentModal}
                aria-label="Ödeme penceresini kapat"
              >
                ✕
              </button>
            </div>

            <iframe
              src={paymentLink}
              title="Paythor Güvenli Ödeme"
              className={styles.paymentFrame}
              allow="payment"
            />

            <div className={styles.modalFooter}>
              <p>
                Ödeme ekranı açılmadıysa aşağıdaki bağlantıyı kullanabilirsiniz.
              </p>

              <a
                href={paymentLink}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.externalPaymentLink}
              >
                Ödeme sayfasını yeni sekmede aç
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
