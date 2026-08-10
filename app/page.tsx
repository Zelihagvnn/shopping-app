"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "./components/Header";
import { Product, useProductStore } from "../store/productStore";
import styles from "./page.module.css";

function QuantityInput({
  value,
  max,
  label,
  onCommit,
}: {
  value: number;
  max: number;
  label: string;
  onCommit: (quantity: number) => void;
}) {
  const [draftValue, setDraftValue] = useState(String(value));

  const commitValue = () => {
    const numericValue = Number(draftValue);

    if (!Number.isInteger(numericValue) || numericValue < 0) {
      setDraftValue(String(value));
      return;
    }

    const safeValue = Math.min(numericValue, max);
    setDraftValue(String(safeValue));
    onCommit(safeValue);
  };

  return (
    <input
      type="number"
      min="0"
      max={max}
      inputMode="numeric"
      aria-label={`${label} adedi`}
      value={draftValue}
      onFocus={(event) => event.currentTarget.select()}
      onChange={(event) => {
        if (/^\d*$/.test(event.target.value)) {
          setDraftValue(event.target.value);
        }
      }}
      onBlur={commitValue}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
    />
  );
}

export default function Home() {
  const {
    products,
    cart,
    fetchProducts,
    addToCart,
    increaseQuantity,
    decreaseQuantity,
    setProductQuantity,
    favoriteIds,
    toggleFavorite,
  } = useProductStore();

  const [message, setMessage] = useState("");
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tümü");
  const [optionProduct, setOptionProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [optionError, setOptionError] = useState("");

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (!optionProduct) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOptionProduct(null);
        setSelectedSize("");
        setSelectedColor("");
        setOptionError("");
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [optionProduct]);

  const categories = useMemo(() => {
    const list = Array.from(
      new Set(
        products
          .map((p) => p.category?.trim())
          .filter((cat): cat is string => Boolean(cat)),
      ),
    );
    return ["Tümü", ...list];
  }, [products]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(price);

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.title
      .toLocaleLowerCase("tr-TR")
      .includes(searchText.trim().toLocaleLowerCase("tr-TR"));

    const matchesCategory =
      selectedCategory === "Tümü" ||
      product.category?.trim().toLocaleLowerCase("tr-TR") ===
        selectedCategory.toLocaleLowerCase("tr-TR");

    return matchesSearch && matchesCategory;
  });

  const showMessage = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 2000);
  };

  const openOptionPicker = (product: Product) => {
    setOptionProduct(product);
    setSelectedSize(product.sizes[0] ?? "");
    setSelectedColor(product.colors[0] ?? "");
    setOptionError("");
  };

  const closeOptionPicker = () => {
    setOptionProduct(null);
    setSelectedSize("");
    setSelectedColor("");
    setOptionError("");
  };

  const handleAddToCart = (product: Product) => {
    const hasOptions =
      product.sizes.length > 0 || product.colors.length > 0;

    if (hasOptions) {
      openOptionPicker(product);
      return;
    }

    if (addToCart(product)) {
      showMessage("Ürün sepete eklendi");
    }
  };

  const handleAddSelectedOption = () => {
    if (!optionProduct) {
      return;
    }

    if (optionProduct.sizes.length > 0 && !selectedSize) {
      setOptionError("Lütfen beden seçin.");
      return;
    }

    if (optionProduct.colors.length > 0 && !selectedColor) {
      setOptionError("Lütfen renk seçin.");
      return;
    }

    const added = addToCart(optionProduct, {
      size: selectedSize || undefined,
      color: selectedColor || undefined,
    });

    if (!added) {
      setOptionError("Maksimum stok miktarına ulaştınız.");
      return;
    }

    closeOptionPicker();
    showMessage("Ürün sepete eklendi");
  };

  return (
    <>
      <Header searchText={searchText ?? ""} setSearchText={setSearchText} />

      {message && <div className={styles.toast}>✅ {message}</div>}

      <div className={styles.container}>
        {categories.length > 1 && (
          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              marginBottom: "20px",
            }}
          >
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                style={{
                  padding: "8px 16px",
                  borderRadius: "20px",
                  border: "1px solid #333",
                  background: selectedCategory === cat ? "#2563eb" : "#18181b",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <div className={styles.productGrid}>
          {filteredProducts.map((product) => {
            const productCartItems = cart.filter(
              (item) => item.id === product.id,
            );
            const productQuantity = productCartItems.reduce(
              (total, item) => total + item.quantity,
              0,
            );
            const lastCartItem =
              productCartItems[productCartItems.length - 1];

            return (
              <article
                key={product.id}
                className={`${styles.card} ${
                  product.stock === 0 ? styles.outOfStockCard : ""
                }`}
              >
                <button
                  type="button"
                  className={`${styles.favoriteButton} ${
                    favoriteIds.includes(product.id)
                      ? styles.favoriteButtonActive
                      : ""
                  }`}
                  aria-label={
                    favoriteIds.includes(product.id)
                      ? `${product.title} ürününü favorilerden çıkar`
                      : `${product.title} ürününü favorilere ekle`
                  }
                  aria-pressed={favoriteIds.includes(product.id)}
                  onClick={() => toggleFavorite(product.id)}
                >
                  {favoriteIds.includes(product.id) ? "♥" : "♡"}
                </button>

                <Link
                  href={`/products/${product.id}`}
                  className={styles.productLink}
                >
                  <div className={styles.imageWrapper}>
                    <img
                      src={product.image}
                      alt={product.title}
                      className={styles.image}
                    />

                    {product.stock === 0 && (
                      <span className={styles.outOfStockBadge}>Stokta Yok</span>
                    )}
                  </div>

                  <h3 className={styles.title}>{product.title}</h3>
                </Link>

                <p className={styles.price}>
                  {formatPrice(product.price)}
                </p>

                {product.stock > 0 && product.stock <= 5 && (
                  <p className={styles.stockLow}>Son {product.stock} ürün</p>
                )}

                {productQuantity > 0 && lastCartItem ? (
                  <div className={styles.quantityControl}>
                    <button
                      type="button"
                      aria-label={`${product.title} adetini azalt`}
                      onClick={() =>
                        decreaseQuantity(lastCartItem.cartItemId)
                      }
                    >
                      −
                    </button>

                    <QuantityInput
                      key={`${product.id}-${productQuantity}`}
                      value={productQuantity}
                      max={product.stock}
                      label={product.title}
                      onCommit={(quantity) =>
                        setProductQuantity(product.id, quantity)
                      }
                    />

                    <button
                      type="button"
                      aria-label={`${product.title} adetini artır`}
                      disabled={productQuantity >= product.stock}
                      onClick={() =>
                        increaseQuantity(lastCartItem.cartItemId)
                      }
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={styles.button}
                    disabled={product.stock === 0}
                    onClick={() => handleAddToCart(product)}
                  >
                    {product.stock === 0 ? "Tükendi" : "🛒 Sepete Ekle"}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </div>

      {optionProduct && (
        <div
          className={styles.optionOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeOptionPicker();
            }
          }}
        >
          <section
            className={styles.optionSheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="option-sheet-title"
          >
            <button
              type="button"
              className={styles.closeOptionSheet}
              aria-label="Seçim penceresini kapat"
              onClick={closeOptionPicker}
            >
              ×
            </button>

            <div className={styles.optionProduct}>
              <div className={styles.optionProductImage}>
                <img src={optionProduct.image} alt={optionProduct.title} />
              </div>

              <div>
                <h2 id="option-sheet-title">{optionProduct.title}</h2>
                <strong>{formatPrice(optionProduct.price)}</strong>
              </div>
            </div>

            {optionProduct.colors.length > 0 && (
              <div className={styles.pickerGroup}>
                <div className={styles.pickerHeading}>
                  <span>Renk</span>
                  <strong>{selectedColor}</strong>
                </div>

                <div className={styles.pickerOptions}>
                  {optionProduct.colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={
                        selectedColor === color ? styles.pickerSelected : ""
                      }
                      onClick={() => {
                        setSelectedColor(color);
                        setOptionError("");
                      }}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {optionProduct.sizes.length > 0 && (
              <div className={styles.pickerGroup}>
                <div className={styles.pickerHeading}>
                  <span>Beden</span>
                  <strong>{selectedSize}</strong>
                </div>

                <div className={styles.pickerOptions}>
                  {optionProduct.sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={
                        selectedSize === size ? styles.pickerSelected : ""
                      }
                      onClick={() => {
                        setSelectedSize(size);
                        setOptionError("");
                      }}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {optionError && (
              <p className={styles.optionError}>{optionError}</p>
            )}

            <button
              type="button"
              className={styles.confirmOptionButton}
              onClick={handleAddSelectedOption}
            >
              Sepete Ekle
            </button>
          </section>
        </div>
      )}
    </>
  );
}
