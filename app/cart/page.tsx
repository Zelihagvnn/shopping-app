"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "../components/Header";
import { useProductStore } from "../../store/productStore";
import styles from "./cart.module.css";

export default function CartPage() {
  const {
    cart,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    couponCode,
    discount,
    couponMessage,
    couponStatus,
    setCouponCode,
    copyCoupon,
    applyCoupon,
    removeCoupon,
  } = useProductStore();

  const [availableCoupons, setAvailableCoupons] = useState<
    { id: number; code: string; discount: number }[]
  >([]);

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const res = await fetch("/api/coupons", { cache: "no-store" });
        const data = await res.json();
        if (data.status === "success") {
          setAvailableCoupons(data.coupons);
        }
      } catch (err) {
        console.error("Kuponlar çekilemedi:", err);
      }
    };

    fetchCoupons();
  }, []);

  const roundMoney = (value: number) =>
    Math.round((value + Number.EPSILON) * 100) / 100;

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(price);

  const totalPrice = roundMoney(
    cart.reduce((total, item) => total + item.price * item.quantity, 0),
  );

  const totalQuantity = cart.reduce((total, item) => total + item.quantity, 0);

  const discountAmount = roundMoney((totalPrice * discount) / 100);

  const finalPrice = roundMoney(totalPrice - discountAmount);

  return (
    <>
      <Header />

      <div className={styles.container}>
        <div className={styles.left}>
          <h1 className={styles.title}>Sepetim</h1>

          {cart.length === 0 ? (
            <div className={styles.emptyContainer}>
              <p className={styles.empty}>Sepetinizde henüz ürün bulunmuyor.</p>

              <Link href="/" className={styles.backLink}>
                ← Alışverişe Devam Et
              </Link>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.cartItemId} className={styles.card}>
                <div className={styles.imageWrapper}>
                  <img
                    src={item.image}
                    alt={item.title}
                    className={styles.image}
                  />
                </div>

                <div className={styles.info}>
                  <h3>{item.title}</h3>

                  {(item.selectedSize || item.selectedColor) && (
                    <div className={styles.selectedOptions}>
                      {item.selectedSize && (
                        <span>Beden: {item.selectedSize}</span>
                      )}

                      {item.selectedColor && (
                        <span>Renk: {item.selectedColor}</span>
                      )}
                    </div>
                  )}

                  <p className={styles.price}>{formatPrice(item.price)}</p>
                </div>

                <div className={styles.actions}>
                  <div className={styles.quantityGroup}>
                    <div className={styles.quantity}>
                      <button
                        type="button"
                        aria-label={`${item.title} adetini azalt`}
                        onClick={() => decreaseQuantity(item.cartItemId)}
                      >
                        -
                      </button>

                      <span>{item.quantity}</span>

                      <button
                        type="button"
                        disabled={
                          item.quantity >= item.stock
                        }
                        aria-label={`${item.title} adetini artır`}
                        onClick={() => increaseQuantity(item.cartItemId)}
                        title={
                          item.quantity >= item.stock
                            ? "Maksimum stok miktarına ulaştınız"
                            : ""
                        }
                      >
                        +
                      </button>
                    </div>

                    {item.quantity >= item.stock && (
                      <small style={{ color: "#ef4444", fontSize: "11px" }}>
                        Maksimum stok ({item.stock} adet)
                      </small>
                    )}
                  </div>

                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => removeFromCart(item.cartItemId)}
                  >
                    Kaldır
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className={styles.right}>
            <div className={styles.couponCard}>
              <h2>Kuponlarım</h2>

              {availableCoupons.length > 0 &&
                availableCoupons.map((coupon) => (
                  <div key={coupon.code} className={styles.couponItem}>
                    <div>
                      <strong>{coupon.code}</strong>
                      <p>%{coupon.discount} İndirim</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => copyCoupon(coupon.code)}
                    >
                      Kopyala
                    </button>
                  </div>
                ))}

              <div className={styles.manualCoupon}>
                <label>Kupon Kodu Gir</label>

                <input
                  type="text"
                  placeholder="Kupon kodunuz"
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value)}
                />

                <button type="button" onClick={applyCoupon}>
                  Kuponu Uygula
                </button>
              </div>

              {couponMessage && (
                <p
                  className={
                    couponStatus === "error"
                      ? styles.errorMessage
                      : styles.couponMessage
                  }
                >
                  {couponMessage}
                </p>
              )}

              {discount > 0 && (
                <button
                  type="button"
                  className={styles.removeCouponButton}
                  onClick={removeCoupon}
                >
                  Kuponu Kaldır
                </button>
              )}
            </div>

            <div className={styles.summaryCard}>
              <h2>Sipariş Özeti</h2>

              <div className={styles.summaryRow}>
                <span>Toplam Ürün</span>
                <strong>{totalQuantity} Adet</strong>
              </div>

              <div className={styles.summaryRow}>
                <span>Ara Toplam</span>
                <strong>{formatPrice(totalPrice)}</strong>
              </div>

              {discount > 0 && (
                <div className={styles.summaryRow}>
                  <span>İndirim (%{discount})</span>
                  <strong style={{ color: "#22c55e" }}>
                    -{formatPrice(discountAmount)}
                  </strong>
                </div>
              )}

              <div className={styles.summaryTotal}>
                <span>Ödenecek Tutar</span>
                <span className={styles.finalPrice}>
                  {formatPrice(finalPrice)}
                </span>
              </div>

              <Link href="/checkout" className={styles.checkoutButton}>
                Ödemeye Geç
              </Link>

              <Link href="/" className={styles.backLink}>
                ← Alışverişe Devam Et
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
