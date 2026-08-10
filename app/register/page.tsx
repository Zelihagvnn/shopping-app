"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import Button from "../components/Button";
import Header from "../components/Header";
import styles from "./register.module.css";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setMessage("");
    setIsError(false);

    if (password !== passwordAgain) {
      setIsError(true);
      setMessage("Şifreler birbiriyle uyuşmuyor.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/customer/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setIsError(true);
        setMessage(data.message || "Kayıt işlemi başarısız oldu.");
        return;
      }

      setIsError(false);
      setMessage(
        "Hesabınız oluşturuldu. Giriş sayfasına yönlendiriliyorsunuz.",
      );

      setTimeout(() => {
        window.location.href = "/login";
      }, 1200);
    } catch (error) {
      console.error("Kayıt hatası:", error);

      setIsError(true);
      setMessage("Kayıt sırasında beklenmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />

      <main className={styles.page}>
        <form className={styles.card} onSubmit={handleRegister}>
          <div className={styles.cardHeader}>
            <h1>Hesap Oluştur</h1>

            <p>Nova Store hesabınızı birkaç adımda oluşturun.</p>
          </div>

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
              placeholder="En az 6 karakter"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="passwordAgain">Şifre Tekrar</label>

            <input
              id="passwordAgain"
              type="password"
              placeholder="Şifrenizi tekrar giriniz"
              value={passwordAgain}
              onChange={(event) => setPasswordAgain(event.target.value)}
              minLength={6}
              required
            />
          </div>

          {message && (
            <p
              className={isError ? styles.errorMessage : styles.successMessage}
            >
              {message}
            </p>
          )}

          <Button
            type="submit"
            loading={loading}
            loadingText="Hesap oluşturuluyor..."
          >
            Hesap Oluştur
          </Button>

          <p className={styles.loginText}>
            Zaten hesabınız var mı? <Link href="/login">Giriş Yap</Link>
          </p>
        </form>
      </main>
    </>
  );
}
