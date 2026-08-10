import {
  NextRequest,
  NextResponse,
} from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCustomerToken } from "@/lib/customerAuth";

export async function GET(
  request: NextRequest
) {
  try {
    const token =
      request.cookies.get("customerToken")?.value;

    const session =
      await verifyCustomerToken(token);

    if (!session) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "Siparişleri görüntülemek için giriş yapmalısınız.",
        },
        { status: 401 }
      );
    }

    const orders = await prisma.order.findMany({
      where: {
        customerId: session.customerId,
      },

      include: {
        items: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedOrders = orders.map(
      (order) => ({
        ...order,

        amount: Number(order.amount),

        items: order.items.map((item) => ({
          ...item,
          price: Number(item.price),
        })),
      })
    );

    return NextResponse.json({
      status: "success",
      orders: formattedOrders,
    });
  } catch (error) {
    console.error(
      "Müşteri siparişleri alınırken hata oluştu:",
      error
    );

    return NextResponse.json(
      {
        status: "error",
        message:
          "Siparişler alınırken bir hata oluştu.",
      },
      { status: 500 }
    );
  }
}