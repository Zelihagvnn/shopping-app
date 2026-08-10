"use client";

import { FormEvent, useState } from "react";
import Button from "../../components/Button";
import styles from "./admin-login.module.css";

interface AdminLoginResponse {
  status?: string;
  message?: string;
}

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError(
        "E-posta ve şifre zorunludur."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 12000);

      let response: Response;

      try {
        response = await fetch("/api/admin/login", {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          credentials: "include",
          cache: "no-store",
          signal: controller.signal,

          body: JSON.stringify({
            email: normalizedEmail,
            password,
          }),
        });
      } finally {
        window.clearTimeout(timeout);
      }

      const data: AdminLoginResponse =
        await response.json();

      if (!response.ok) {
        setError(
          data.message ||
            "Admin girişi başarısız."
        );
        return;
      }

      window.location.assign("/admin");
    } catch (error) {
      console.error(
        "Admin giriş isteği hatası:",
        error
      );

      setError(
        error instanceof DOMException && error.name === "AbortError"
          ? "Giriş isteği zaman aşımına uğradı. Telefon ve bilgisayarın aynı Wi-Fi ağına bağlı olduğunu kontrol edin."
          : "Sunucuya bağlanılamadı. Sayfayı yenileyip tekrar deneyin."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <form
        className={styles.card}
        onSubmit={handleSubmit}
      >
        <h1>Admin Girişi</h1>

        <p>
          Nova Store Yönetim Paneli
        </p>

        <div className={styles.group}>
          <label htmlFor="adminEmail">
            E-posta
          </label>

          <input
            id="adminEmail"
            type="email"
            autoComplete="email"
            placeholder="admin@novastore.com"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            disabled={loading}
            required
          />
        </div>

        <div className={styles.group}>
          <label htmlFor="adminPassword">
            Şifre
          </label>

          <input
            id="adminPassword"
            type="password"
            autoComplete="current-password"
            placeholder="Şifrenizi giriniz"
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value
              )
            }
            disabled={loading}
            required
          />
        </div>

        {error && (
          <p
            className={styles.error}
            role="alert"
          >
            {error}
          </p>
        )}

        <Button
          type="submit"
          variant="adminLogin"
          loading={loading}
          loadingText="Giriş Yapılıyor..."
        >
          Giriş Yap
        </Button>
      </form>
    </main>
  );
}
