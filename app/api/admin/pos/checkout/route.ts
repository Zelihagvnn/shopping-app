import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/adminAuth";
import { processPosCheckout } from "@/services/orderService";

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

    const order = await processPosCheckout(
      session.adminId,
      paymentMethod,
      rawItems,
    );

    return NextResponse.json({
      status: "success",
      message: "Satış başarıyla tamamlandı.",
      order: {
        id: order.id,
        merchantReference: order.merchantReference,
        amount: Number(order.amount),
        currency: order.currency,
        status: order.status,
        createdAt: order.createdAt,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "POS satışı tamamlanamadı.";
    return NextResponse.json({ status: "error", message }, { status: 400 });
  }
}
