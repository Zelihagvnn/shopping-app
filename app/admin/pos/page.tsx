"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import BarcodeScanner from "../products/BarcodeScanner";
import {
  type Product,
  type ProductVariant,
  useProductStore,
} from "@/store/productStore";
import styles from "./pos.module.css";

export default function AdminPosPage() {
  const {
    cart,
    addToCart,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    clearCart,
  } = useProductStore();
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");
  const [loadingBarcode, setLoadingBarcode] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const formatPrice = (value: number) =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(value);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  );
  const totalQuantity = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );

  const addVariantToCart = (product: Product, variant: ProductVariant) => {
    const added = addToCart(product, {
      variantId: variant.id,
      size: variant.size ?? undefined,
      color: variant.color ?? undefined,
    });

    if (!added) {
      setMessage("Ürün eklenemedi. Stok miktarını kontrol edin.");
      setMessageType("error");
      return;
    }

    setPendingProduct(null);
    setMessage(`${product.title} satış sepetine eklendi.`);
    setMessageType("success");
  };

  const handleBarcodeDetected = async (barcode: string) => {
    setLoadingBarcode(true);
    setPendingProduct(null);
    setMessage("Barkodla ürün aranıyor...");
    setMessageType("");

    try {
      const response = await fetch(
        `/api/admin/pos/products/${encodeURIComponent(barcode)}`,
        { credentials: "include", cache: "no-store" },
      );
      const data = await response.json();

      if (!response.ok || !data.product) {
        setMessage(
          `${data.message || "Barkoda ait ürün bulunamadı."} Okunan barkod: ${barcode}`,
        );
        setMessageType("error");
        return;
      }

      const product: Product = {
        ...data.product,
        price: Number(data.product.price),
        stock: Number(data.product.stock),
      };
      const availableVariants = product.variants.filter(
        (variant) => variant.isActive && variant.stock > 0,
      );

      if (availableVariants.length === 1) {
        addVariantToCart(product, availableVariants[0]);
        return;
      }

      setPendingProduct(product);
      setMessage("Ürünün beden/renk seçeneğini seçin.");
      setMessageType("");
    } catch (error) {
      console.error("POS barkod arama hatası:", error);
      setMessage("Ürün aranırken bağlantı hatası oluştu.");
      setMessageType("error");
    } finally {
      setLoadingBarcode(false);
    }
  };

  const handleManualBarcodeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const barcode = manualBarcode.trim();

    if (!barcode || loadingBarcode) return;

    setManualBarcode("");
    await handleBarcodeDetected(barcode);
    barcodeInputRef.current?.focus();
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      setMessage("Ödemeye geçmek için sepete ürün ekleyin.");
      setMessageType("error");
      return;
    }

    window.location.assign("/admin/pos/checkout");
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>KASA / POS</p>
          <h1>Hızlı Satış</h1>
          <p>Barkodu okutun, ürünleri sepete ekleyin ve ödemeye geçin.</p>
        </div>

        <div className={styles.totalBadge}>
          <span>{totalQuantity} ürün</span>
          <strong>{formatPrice(total)}</strong>
        </div>
      </header>

      <div className={styles.layout}>
        <section className={styles.scannerCard}>
          <h2>Ürün Okut</h2>
          <p>Kamerayı açıp ürün barkodunu çerçevenin içinde tutun.</p>

          <form className={styles.barcodeForm} onSubmit={handleManualBarcodeSubmit}>
            <label htmlFor="pos-barcode">USB okuyucu veya manuel barkod</label>
            <div>
              <input
                ref={barcodeInputRef}
                id="pos-barcode"
                type="text"
                value={manualBarcode}
                onChange={(event) => setManualBarcode(event.target.value)}
                placeholder="Barkodu okutun veya yazın"
                autoComplete="off"
                autoFocus
                disabled={loadingBarcode}
              />
              <button
                type="submit"
                disabled={!manualBarcode.trim() || loadingBarcode}
              >
                Ürünü Bul
              </button>
            </div>
            <small>
              USB barkod okuyucu barkodu yazıp Enter gönderdiğinde ürün otomatik
              aranır.
            </small>
          </form>

          <BarcodeScanner onDetected={handleBarcodeDetected} />

          {loadingBarcode && <p className={styles.info}>Ürün aranıyor...</p>}
          {message && (
            <p
              className={
                messageType === "error" ? styles.error : styles.success
              }
              role="status"
            >
              {message}
            </p>
          )}

          {pendingProduct && (
            <div className={styles.variantPicker}>
              <div className={styles.pendingProduct}>
                <img src={pendingProduct.image} alt={pendingProduct.title} />
                <div>
                  <strong>{pendingProduct.title}</strong>
                  <span>{formatPrice(pendingProduct.price)}</span>
                </div>
              </div>

              <div className={styles.variantList}>
                {pendingProduct.variants
                  .filter((variant) => variant.isActive && variant.stock > 0)
                  .map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => addVariantToCart(pendingProduct, variant)}
                    >
                      <span>
                        {[variant.size, variant.color]
                          .filter(Boolean)
                          .join(" / ") || "Standart"}
                      </span>
                      <small>{variant.stock} stok</small>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </section>

        <section className={styles.cartCard}>
          <div className={styles.cartHeader}>
            <div>
              <h2>Satış Sepeti</h2>
              <p>{totalQuantity} adet ürün</p>
            </div>
            {cart.length > 0 && (
              <button type="button" onClick={clearCart}>
                Sepeti Temizle
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className={styles.emptyCart}>Henüz ürün okutulmadı.</div>
          ) : (
            <div className={styles.cartList}>
              {cart.map((item) => (
                <article key={item.cartItemId} className={styles.cartItem}>
                  <img src={item.image} alt={item.title} />
                  <div className={styles.itemInfo}>
                    <strong>{item.title}</strong>
                    {(item.selectedSize || item.selectedColor) && (
                      <small>
                        {[item.selectedSize, item.selectedColor]
                          .filter(Boolean)
                          .join(" / ")}
                      </small>
                    )}
                    <span>{formatPrice(item.price)}</span>
                  </div>

                  <div className={styles.quantity}>
                    <button
                      type="button"
                      onClick={() => decreaseQuantity(item.cartItemId)}
                    >
                      −
                    </button>
                    <strong>{item.quantity}</strong>
                    <button
                      type="button"
                      disabled={item.quantity >= item.stock}
                      onClick={() => increaseQuantity(item.cartItemId)}
                    >
                      +
                    </button>
                  </div>

                  <div className={styles.lineTotal}>
                    <strong>{formatPrice(item.price * item.quantity)}</strong>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.cartItemId)}
                    >
                      Kaldır
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <footer className={styles.checkoutArea}>
            <div>
              <span>Genel Toplam</span>
              <strong>{formatPrice(total)}</strong>
            </div>
            <button
              type="button"
              className={styles.checkoutButton}
              disabled={cart.length === 0}
              onClick={handleCheckout}
            >
              POS Ödemesine Geç
            </button>
            <small>
              Ödeme admin POS ekranında tamamlanır; müşteri girişi gerekmez.
            </small>
          </footer>
        </section>
      </div>
    </main>
  );
}
