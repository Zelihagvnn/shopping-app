"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import Button from "../components/Button";
import Header from "../components/Header";
import styles from "./login.module.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/customer/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Giriş işlemi başarısız oldu.");
        return;
      }

      window.location.href = "/";
    } catch (error) {
      console.error("Giriş hatası:", error);

      setMessage("Giriş sırasında beklenmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />

      <main className={styles.page}>
        <div className={styles.wrapper}>
          <form className={styles.card} onSubmit={handleLogin}>
            <div className={styles.cardHeader}>
              <h1>Giriş Yap</h1>

              <p>Nova Store hesabınıza giriş yapın.</p>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="email">E-posta</label>

              <input
                id="email"
                type="email"
                placeholder="ornek@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password">Şifre</label>

              <input
                id="password"
                type="password"
                placeholder="Şifrenizi giriniz"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            {message && <p className={styles.errorMessage}>{message}</p>}

            <Button
              type="submit"
              loading={loading}
              loadingText="Giriş yapılıyor..."
            >
              Giriş Yap
            </Button>

            <p className={styles.registerText}>
              Hesabınız yok mu? <Link href="/register">Kayıt Ol</Link>
            </p>
          </form>
        </div>
      </main>
    </>
  );
}
