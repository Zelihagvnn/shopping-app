import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCustomerToken } from "@/lib/customerAuth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get("customerToken")?.value;
    const session = await verifyCustomerToken(token);

    if (!session) {
      return NextResponse.json(
        {
          status: "error",
          message: "Sipariş detayını görmek için giriş yapmalısınız.",
        },
        { status: 401 }
      );
    }

    const { id } = await params;
    const orderId = Number(id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json(
        { status: "error", message: "Geçersiz sipariş ID." },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    if (!order || order.customerId !== session.customerId) {
      return NextResponse.json(
        { status: "error", message: "Sipariş bulunamadı." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: "success",
      order: {
        ...order,
        amount: Number(order.amount),
        items: order.items.map((item) => ({
          ...item,
          price: Number(item.price),
        })),
      },
    });
  } catch (error) {
    console.error("Müşteri sipariş detayı hatası:", error);
    return NextResponse.json(
      { status: "error", message: "Sipariş detayı alınamadı." },
      { status: 500 }
    );
  }
}
