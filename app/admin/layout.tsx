"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./admin-layout.module.css";

interface Admin {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();

  const [admin, setAdmin] = useState<Admin | null>(null);
  const isLoginPage = pathname === "/admin/login";
  const [loading, setLoading] = useState(!isLoginPage);

  useEffect(() => {
    if (isLoginPage) {
      return;
    }

    const checkAdminSession = async () => {
      try {
        const response = await fetch("/api/admin/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          router.replace("/admin/login");
          return;
        }

        setAdmin(data.admin);
      } catch (error) {
        console.error("Admin oturum kontrolü hatası:", error);

        router.replace("/admin/login");
      } finally {
        setLoading(false);
      }
    };

    checkAdminSession();
  }, [isLoginPage, router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Admin çıkış hatası:", error);
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  };

  if (isLoginPage) {
    return children;
  }

  if (loading) {
    return (
      <main className={styles.loadingPage}>
        <p>Admin paneli yükleniyor...</p>
      </main>
    );
  }

  if (!admin) {
    return null;
  }

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.brandArea}>
          <p className={styles.brandEyebrow}>YÖNETİM PANELİ</p>

          <h1>Nova Store</h1>

          <p className={styles.adminName}>{admin.fullName}</p>
        </div>

        <nav className={styles.navigation}>
          <Link
            href="/admin"
            className={
              pathname === "/admin" ? styles.activeLink : styles.navLink
            }
          >
            Dashboard
          </Link>

          <Link
            href="/admin/products"
            className={
              pathname.startsWith("/admin/products")
                ? styles.activeLink
                : styles.navLink
            }
          >
            Ürünler
          </Link>

          <Link
            href="/admin/pos"
            className={
              pathname.startsWith("/admin/pos")
                ? styles.activeLink
                : styles.navLink
            }
          >
            Hızlı Satış
          </Link>

          <Link
            href="/admin/customers"
            className={
              pathname.startsWith("/admin/customers")
                ? styles.activeLink
                : styles.navLink
            }
          >
            Müşteriler
          </Link>

          <Link
            href="/admin/orders"
            className={
              pathname.startsWith("/admin/orders")
                ? styles.activeLink
                : styles.navLink
            }
          >
            Siparişler
          </Link>

          <Link
            href="/admin/coupons"
            className={
              pathname.startsWith("/admin/coupons")
                ? styles.activeLink
                : styles.navLink
            }
          >
            Kuponlar
          </Link>

          <Link
            href="/admin/categories"
            className={
              pathname.startsWith("/admin/categories")
                ? styles.activeLink
                : styles.navLink
            }
          >
            Kategoriler
          </Link>

        </nav>

        <div className={styles.sidebarBottom}>
          <Link href="/" className={styles.storeLink}>
            Mağazaya Dön
          </Link>

          <button
            type="button"
            className={styles.logoutButton}
            onClick={handleLogout}
          >
            Çıkış Yap
          </button>
        </div>
      </aside>

      <main className={styles.content}>{children}</main>
    </div>
  );
}
