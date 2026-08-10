import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

type PaymentMethod = "cash" | "card";

interface PosCheckoutItem {
  variantId: number;
  quantity: number;
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyAdminToken(
      request.cookies.get("adminToken")?.value,
    );

    if (!session) {
      return NextResponse.json(
        { status: "error", message: "Bu işlem için admin girişi yapmalısınız." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const paymentMethod: PaymentMethod | null =
      body.paymentMethod === "cash" || body.paymentMethod === "card"
        ? body.paymentMethod
        : null;
    const rawItems: PosCheckoutItem[] = Array.isArray(body.items)
      ? body.items
      : [];

    if (!paymentMethod) {
      return NextResponse.json(
        { status: "error", message: "Geçerli bir ödeme yöntemi seçin." },
        { status: 400 },
      );
    }

    const quantitiesByVariant = new Map<number, number>();

    for (const item of rawItems) {
      const variantId = Number(item.variantId);
      const quantity = Number(item.quantity);

      if (
        !Number.isInteger(variantId) ||
        variantId <= 0 ||
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        return NextResponse.json(
          { status: "error", message: "Sepette geçersiz bir ürün var." },
          { status: 400 },
        );
      }

      quantitiesByVariant.set(
        variantId,
        (quantitiesByVariant.get(variantId) ?? 0) + quantity,
      );
    }

    if (quantitiesByVariant.size === 0) {
      return NextResponse.json(
        { status: "error", message: "Satış sepeti boş." },
        { status: 400 },
      );
    }

    const order = await prisma.$transaction(async (tx) => {
      const variants = await tx.productVariant.findMany({
        where: { id: { in: [...quantitiesByVariant.keys()] } },
        include: { product: true, size: true, color: true },
      });

      if (variants.length !== quantitiesByVariant.size) {
        throw new Error("Sepetteki ürünlerden biri artık bulunamıyor.");
      }

      let total = 0;

      for (const variant of variants) {
        const quantity = quantitiesByVariant.get(variant.id)!;

        if (!variant.isActive || !variant.product.isActive) {
          throw new Error(`${variant.product.title} satışa açık değil.`);
        }

        const updated = await tx.productVariant.updateMany({
          where: { id: variant.id, isActive: true, stock: { gte: quantity } },
          data: { stock: { decrement: quantity } },
        });

        if (updated.count !== 1) {
          throw new Error(`${variant.product.title} için yeterli stok yok.`);
        }

        total += Number(variant.product.price) * quantity;
      }

      const merchantReference = `POS-${paymentMethod.toUpperCase()}-${randomUUID()}`;

      return tx.order.create({
        data: {
          merchantReference,
          amount: total.toFixed(2),
          currency: "TRY",
          status: "paid",
          customerName: "Mağaza Müşterisi",
          customerEmail: "pos@local.invalid",
          customerPhone: "-",
          customerAddress: "Mağazadan teslim",
          paymentToken: `POS:${paymentMethod.toUpperCase()}`,
          items: {
            create: variants.map((variant) => ({
              productId: variant.productId,
              variantId: variant.id,
              selectedSize: variant.size?.name ?? null,
              selectedColor: variant.color?.name ?? null,
              title: variant.product.title,
              image: variant.product.image,
              price: variant.product.price,
              quantity: quantitiesByVariant.get(variant.id)!,
            })),
          },
        },
        include: { items: true },
      });
    });

    return NextResponse.json(
      {
        status: "success",
        message: "Satış tamamlandı ve stoklar güncellendi.",
        order: {
          id: order.id,
          merchantReference: order.merchantReference,
          amount: Number(order.amount),
          paymentMethod,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POS satış tamamlama hatası:", error);
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error ? error.message : "Satış tamamlanamadı.",
      },
      { status: 500 },
    );
  }
}
