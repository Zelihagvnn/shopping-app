"use client";

import { useState } from "react";
import styles from "./checkout.module.css";

interface PaymentLinkPanelProps {
  paymentLink: string;
  checking: boolean;
  onCheckStatus: () => Promise<void>;
}

export default function PaymentLinkPanel({
  paymentLink,
  checking,
  onCheckStatus,
}: PaymentLinkPanelProps) {
  const [copied, setCopied] = useState(false);
  const message = `Ödemenizi tamamlamak için bu bağlantıyı kullanabilirsiniz: ${paymentLink}`;

  const copyLink = async () => {
    //Tarayıcının pano API’si kullanılarak bağlantıyı kopyalar
    await navigator.clipboard.writeText(paymentLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const shareOnWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const shareByEmail = () => {
    window.location.href = `mailto:?subject=${encodeURIComponent(
      "Ödeme bağlantınız",
    )}&body=${encodeURIComponent(message)}`;
  };

  return (
    <div className={styles.linkPanel}>
      <div>
        <strong>Ödeme bağlantısı hazır</strong>
        <span>Müşteri ödemeyi kendi telefonundan tamamlayabilir.</span>
      </div>

      <input
        value={paymentLink}
        readOnly
        aria-label="Paythor ödeme bağlantısı"
      />

      <div className={styles.shareButtons}>
        <button type="button" onClick={copyLink}>
          {copied ? "Kopyalandı" : "Linki Kopyala"}
        </button>
        <button type="button" onClick={shareOnWhatsApp}>
          WhatsApp
        </button>
        <button type="button" onClick={shareByEmail}>
          E-posta
        </button>
      </div>

      <button
        type="button"
        className={styles.checkPaymentButton}
        disabled={checking}
        onClick={onCheckStatus}
      >
        {checking ? "Ödeme Kontrol Ediliyor..." : "Ödeme Durumunu Kontrol Et"}
      </button>

      <small>
        Sipariş ancak Paythor ödemeyi doğruladıktan sonra tamamlanır ve stoktan
        düşülür.
      </small>
    </div>
  );
}
