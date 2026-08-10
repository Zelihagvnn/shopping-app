"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useProductStore } from "../../store/productStore";
import styles from "./Header.module.css";

interface HeaderProps {
  searchText?: string;
  setSearchText?: (value: string) => void;
}

interface Customer {
  id: number;
  fullName: string;
  email: string;
}

export default function Header({ searchText, setSearchText }: HeaderProps) {
  const { cart, favoriteIds } = useProductStore();

  const [customer, setCustomer] = useState<Customer | null>(null);

  const [checkingSession, setCheckingSession] = useState(true);

  const [menuOpen, setMenuOpen] = useState(false);

  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  const totalQuantity = cart.reduce((total, item) => total + item.quantity, 0);

  useEffect(() => {
    const getCustomer = async () => {
      try {
        const response = await fetch("/api/customer/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          setCustomer(null);
          return;
        }

        const data = await response.json();

        setCustomer(data.customer ?? null);
      } catch (error) {
        console.error("Müşteri bilgisi alınamadı:", error);

        setCustomer(null);
      } finally {
        setCheckingSession(false);
      }
    };

    getCustomer();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/customer/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Çıkış işlemi başarısız oldu.");
      }

      setCustomer(null);
      setMenuOpen(false);
      window.location.href = "/";
    } catch (error) {
      console.error("Çıkış hatası:", error);
    }
  };

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.logo}>
        🛍️ Nova Store
      </Link>

      {setSearchText && (
        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon}>🔍</span>

          <input
            type="text"
            placeholder="Ürün ara..."
            value={searchText ?? ""}
            onChange={(event) => setSearchText(event.target.value)}
            className={styles.searchInput}
          />
        </div>
      )}

      <nav className={styles.menu}>
        {!checkingSession && customer ? (
          <div ref={accountMenuRef} className={styles.accountArea}>
            <button
              type="button"
              className={styles.customerButton}
              onClick={() => setMenuOpen((current) => !current)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <span className={styles.customerIcon}>👤</span>

              <span className={styles.customerName}>{customer.fullName}</span>

              <span
                className={`${styles.arrow} ${
                  menuOpen ? styles.arrowOpen : ""
                }`}
              >
                ▼
              </span>
            </button>

            {menuOpen && (
              <div className={styles.dropdown} role="menu">
                <div className={styles.dropdownHeader}>
                  <strong>{customer.fullName}</strong>
                  <span>{customer.email}</span>
                </div>

                <Link
                  href="/account"
                  className={styles.dropdownLink}
                  onClick={() => setMenuOpen(false)}
                >
                  👤 Hesabım
                </Link>

                <Link
                  href="/orders"
                  className={styles.dropdownLink}
                  onClick={() => setMenuOpen(false)}
                >
                  📦 Siparişlerim
                </Link>

                <button
                  type="button"
                  className={styles.dropdownLogout}
                  onClick={handleLogout}
                >
                  🚪 Çıkış Yap
                </button>
              </div>
            )}
          </div>
        ) : (
          !checkingSession && (
            <Link href="/login" className={styles.customerButton}>
              <span className={styles.customerIcon}>👤</span>

              <span className={styles.customerName}>Hesabım</span>
            </Link>
          )
        )}

        <Link href="/favorites" className={styles.favorite}>
          <span>♡ Favoriler</span>
          {favoriteIds.length > 0 && (
            <span className={styles.favoriteBadge}>{favoriteIds.length}</span>
          )}
        </Link>

        <Link href="/cart" className={styles.cart}>
          <span>🛒 Sepet</span>
          {totalQuantity > 0 && (
            <span className={styles.cartBadge}>{totalQuantity}</span>
          )}
        </Link>
      </nav>
    </header>
  );
}
