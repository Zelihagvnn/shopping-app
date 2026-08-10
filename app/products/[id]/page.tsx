"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Header from "../../components/Header";
import {
  createCartItemId,
  Product,
  useProductStore,
} from "../../../store/productStore";
import styles from "./product-detail.module.css";

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const cameFromFavorites = searchParams.get("from") === "favorites";
  const {
    cart,
    addToCart,
    increaseQuantity,
    decreaseQuantity,
    favoriteIds,
    toggleFavorite,
  } = useProductStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectionError, setSelectionError] = useState("");

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`/api/products/${id}`, {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok || data.status === "error") {
          setError(data.message || "Ürün bulunamadı.");
          return;
        }

        setProduct(data.product);
      } catch (err) {
        console.error("Ürün detay yükleme hatası:", err);
        setError("Ürün detayları yüklenirken hata oluştu.");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(price);

  const hasRequiredSelection = Boolean(
    product &&
      (product.sizes.length === 0 || selectedSize) &&
      (product.colors.length === 0 || selectedColor),
  );

  const selectedCartItemId =
    product && hasRequiredSelection
      ? createCartItemId(product.id, {
          size: selectedSize || undefined,
          color: selectedColor || undefined,
        })
      : "";

  const selectedCartItem = cart.find(
    (item) => item.cartItemId === selectedCartItemId,
  );

  const selectedVariant =
    product && hasRequiredSelection
      ? product.variants.find(
          (variant) =>
            variant.size === (selectedSize || null) &&
            variant.color === (selectedColor || null),
        )
      : null;
  const displayedStock = selectedVariant?.stock ?? product?.stock ?? 0;

  const handleAddToCart = () => {
    if (!product) {
      return;
    }

    if (product.sizes.length > 0 && !selectedSize) {
      setSelectionError("Lütfen bir beden seçin.");
      return;
    }

    if (product.colors.length > 0 && !selectedColor) {
      setSelectionError("Lütfen bir renk seçin.");
      return;
    }

    const added = addToCart(product, {
      size: selectedSize || undefined,
      color: selectedColor || undefined,
    });

    if (!added) {
      setSelectionError("Bu ürün için maksimum stok miktarına ulaştınız.");
      return;
    }

    setSelectionError("");
    setToastMessage("Ürün sepete eklendi");
    setTimeout(() => setToastMessage(""), 2000);
  };

  return (
    <>
      <Header />

      <div className={styles.container}>
        <Link
          href={cameFromFavorites ? "/favorites" : "/"}
          className={styles.backLink}
        >
          ← {cameFromFavorites ? "Favorilere Dön" : "Alışverişe Dön"}
        </Link>

        {loading && <div>Ürün yükleniyor...</div>}

        {!loading && error && <div style={{ color: "#ef4444" }}>{error}</div>}

        {!loading && product && (
          <div className={styles.productWrapper}>
            <div
              className={`${styles.imageArea} ${
                product.stock === 0 ? styles.unavailableImage : ""
              }`}
            >
              <img
                src={product.image}
                alt={product.title}
                className={styles.image}
              />
            </div>

            <div className={styles.infoArea}>
              {product.category && (
                <span className={styles.categoryTag}>{product.category}</span>
              )}

              <div className={styles.titleRow}>
                <h1 className={styles.title}>{product.title}</h1>

                <button
                  type="button"
                  className={`${styles.favoriteButton} ${
                    favoriteIds.includes(product.id)
                      ? styles.favoriteButtonActive
                      : ""
                  }`}
                  aria-label={
                    favoriteIds.includes(product.id)
                      ? "Favorilerden çıkar"
                      : "Favorilere ekle"
                  }
                  aria-pressed={favoriteIds.includes(product.id)}
                  onClick={() => toggleFavorite(product.id)}
                >
                  {favoriteIds.includes(product.id) ? "♥" : "♡"}
                </button>
              </div>

              {product.description && (
                <p className={styles.description}>{product.description}</p>
              )}

              <p className={styles.price}>{formatPrice(product.price)}</p>

              <p
                className={
                  displayedStock === 0
                    ? styles.stockOut
                    : displayedStock <= 5
                      ? styles.stockLow
                      : styles.stock
                }
              >
                {displayedStock === 0
                  ? "Tükendi"
                  : displayedStock <= 5
                    ? `Yalnızca ${displayedStock} adet kaldı`
                    : `${displayedStock} adet stokta`}
              </p>

              {product.sizes.length > 0 && (
                <div className={styles.optionGroup}>
                  <span className={styles.optionLabel}>
                    Beden
                    {selectedSize && <strong>{selectedSize}</strong>}
                  </span>

                  <div className={styles.optionList}>
                    {product.sizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        className={
                          selectedSize === size ? styles.selectedOption : ""
                        }
                        onClick={() => {
                          setSelectedSize(size);
                          setSelectionError("");
                        }}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {product.colors.length > 0 && (
                <div className={styles.optionGroup}>
                  <span className={styles.optionLabel}>
                    Renk
                    {selectedColor && <strong>{selectedColor}</strong>}
                  </span>

                  <div className={styles.optionList}>
                    {product.colors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={
                          selectedColor === color ? styles.selectedOption : ""
                        }
                        onClick={() => {
                          setSelectedColor(color);
                          setSelectionError("");
                        }}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectionError && (
                <p className={styles.selectionError}>{selectionError}</p>
              )}

              {selectedCartItem ? (
                <div className={styles.quantityControl}>
                  <button
                    type="button"
                    aria-label="Adedi azalt"
                    onClick={() =>
                      decreaseQuantity(selectedCartItem.cartItemId)
                    }
                  >
                    −
                  </button>

                  <div>
                    <span>{selectedCartItem.quantity}</span>
                    <small>Sepette</small>
                  </div>

                  <button
                    type="button"
                    aria-label="Adedi artır"
                    disabled={
                      !selectedVariant ||
                      selectedCartItem.quantity >= selectedVariant.stock
                    }
                    onClick={() =>
                      increaseQuantity(selectedCartItem.cartItemId)
                    }
                  >
                    +
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.button}
                  disabled={
                    product.stock === 0 ||
                    (hasRequiredSelection && selectedVariant?.stock === 0)
                  }
                  onClick={handleAddToCart}
                >
                  🛒 Sepete Ekle
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {toastMessage && <div className={styles.toast}>✅ {toastMessage}</div>}
    </>
  );
}
