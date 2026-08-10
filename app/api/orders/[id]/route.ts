import { NextRequest, NextResponse } from "next/server";
import { verifyCustomerToken } from "@/lib/customerAuth";
import { getOrderById } from "@/services/orderService";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = request.cookies.get("customerToken")?.value;
    const session = await verifyCustomerToken(token);

    if (!session) {
      return NextResponse.json(
        { status: "error", message: "Bu işlem için giriş yapmalısınız." },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const orderId = Number(id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json(
        { status: "error", message: "Geçerli bir sipariş kimliği gönderilmelidir." },
        { status: 400 },
      );
    }

    const order = await getOrderById(orderId, session.customerId);

    if (!order) {
      return NextResponse.json(
        { status: "error", message: "Sipariş bulunamadı." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      status: "success",
      order,
    });
  } catch (error) {
    console.error("Müşteri sipariş detay hatası:", error);
    return NextResponse.json(
      { status: "error", message: "Sipariş detayı alınırken bir hata oluştu." },
      { status: 500 },
    );
  }
}
