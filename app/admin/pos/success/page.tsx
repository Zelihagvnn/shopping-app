import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import PosSuccessClient from "./PosSuccessClient";
import styles from "./success.module.css";

export default async function PosSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    orderId?: string;
    reference?: string;
    amount?: string;
    method?: string;
  }>;
}) {
  const params = await searchParams;

  let orderId = params.orderId;
  let rawAmount = params.amount ? Number(params.amount) : NaN;
  const reference = params.reference;

  if (reference) {
    try {
      const order = await prisma.order.findUnique({
        where: { merchantReference: reference },
        include: { items: true },
      });

      if (order) {
        orderId = String(order.id);
        rawAmount = Number(order.amount);

        // Paythor yönlendirmesiyle gelindiyse siparişi ödendi olarak işaretle ve stokları düş
        if (order.status !== "paid") {
          await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            for (const item of order.items) {
              if (item.variantId) {
                await tx.productVariant.updateMany({
                  where: { id: item.variantId, stock: { gte: item.quantity } },
                  data: { stock: { decrement: item.quantity } },
                });
              }
            }
            await tx.order.update({
              where: { id: order.id },
              data: { status: "paid" },
            });
          });
        }
      }
    } catch (err) {
      console.error("POS ödeme durumunu güncellerken hata oluştu:", err);
    }
  }

  const formattedAmount = Number.isFinite(rawAmount)
    ? new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
      }).format(rawAmount)
    : "-";

  return (
    <main className={styles.page}>
      <PosSuccessClient />
      <section className={styles.card}>
        <div className={styles.icon}>✓</div>
        <p className={styles.eyebrow}>KASA / POS</p>
        <h1>Satış Tamamlandı</h1>
        <p>Satış kaydedildi ve ürün stokları güncellendi.</p>

        <dl>
          <div>
            <dt>Tutar</dt>
            <dd>{formattedAmount}</dd>
          </div>
          <div>
            <dt>Ödeme</dt>
            <dd>{params.method === "cash" ? "Nakit" : "Paythor Kart"}</dd>
          </div>
          {reference && (
            <div>
              <dt>Satış Referansı</dt>
              <dd>{reference}</dd>
            </div>
          )}
        </dl>

        <div className={styles.actions}>
          <Link href="/admin/pos">Yeni Satış Başlat</Link>
          {orderId ? (
            <Link href={`/admin/orders/${orderId}`}>Siparişi Gör</Link>
          ) : (
            <Link href="/admin/orders">Tüm Siparişler</Link>
          )}
        </div>
      </section>
    </main>
  );
}
