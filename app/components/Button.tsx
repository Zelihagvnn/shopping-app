import type {
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import styles from "./Button.module.css";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "customer" | "admin" | "adminLogin" | "payment";
  fullWidth?: boolean;
  loading?: boolean;
  loadingText?: ReactNode;
}

export default function Button({
  children,
  className = "",
  disabled,
  fullWidth = false,
  loading = false,
  loadingText = "Yükleniyor...",
  type = "button",
  variant = "customer",
  ...props
}: ButtonProps) {
  const classNames = [
    styles.button,
    styles[variant],
    fullWidth ? styles.fullWidth : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      {...props}
      type={type}
      className={classNames}
      disabled={disabled || loading}
      aria-busy={loading}
    >
      {loading ? loadingText : children}
    </button>
  );
}
