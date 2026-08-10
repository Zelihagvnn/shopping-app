"use client";

import Link from "next/link";
import { useEffect } from "react";
import Header from "../components/Header";
import { useProductStore } from "../../store/productStore";
import styles from "./favorites.module.css";

export default function FavoritesPage() {
  const { products, favoriteIds, fetchProducts, toggleFavorite } =
    useProductStore();

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  const favoriteProducts = products.filter((product) =>
    favoriteIds.includes(product.id),
  );

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(price);

  return (
    <>
      <Header />

      <main className={styles.container}>
        <div className={styles.heading}>
          <h1>Favorilerim</h1>
          <span className={styles.count}>({favoriteIds.length})</span>
        </div>

        {favoriteIds.length === 0 ? (
          <section className={styles.emptyState}>
            <span className={styles.emptyHeart}>♡</span>
            <h2>Henüz favori ürününüz yok</h2>
            <p>Beğendiğiniz ürünlerdeki kalbe dokunarak buraya ekleyebilirsiniz.</p>
            <Link href="/">Alışverişe Başla</Link>
          </section>
        ) : favoriteProducts.length === 0 ? (
          <div className={styles.loading}>Favoriler yükleniyor...</div>
        ) : (
          <div className={styles.grid}>
            {favoriteProducts.map((product) => (
              <article key={product.id} className={styles.card}>
                <button
                  type="button"
                  className={styles.removeButton}
                  aria-label={`${product.title} ürününü favorilerden çıkar`}
                  onClick={() => toggleFavorite(product.id)}
                >
                  ♥
                </button>

                <Link
                  href={`/products/${product.id}?from=favorites`}
                  className={styles.productLink}
                >
                  <div
                    className={`${styles.imageWrapper} ${
                      product.stock === 0 ? styles.unavailableImage : ""
                    }`}
                  >
                    <img src={product.image} alt={product.title} />
                    {product.stock === 0 && (
                      <span className={styles.outBadge}>Stokta Yok</span>
                    )}
                  </div>

                  <h2>{product.title}</h2>
                  <p className={styles.price}>{formatPrice(product.price)}</p>
                </Link>

                <p
                  className={
                    product.stock === 0
                      ? styles.stockOut
                      : product.stock <= 5
                        ? styles.stockLow
                        : styles.stock
                  }
                >
                  {product.stock === 0
                    ? "Tükendi"
                    : product.stock <= 5
                      ? `Son ${product.stock} adet`
                      : "Stokta"}
                </p>

                <Link
                  href={`/products/${product.id}?from=favorites`}
                  className={styles.detailButton}
                >
                  Ürünü İncele
                </Link>
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
