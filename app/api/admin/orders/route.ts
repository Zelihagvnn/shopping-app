import {
  NextRequest,
  NextResponse,
} from "next/server";

import { prisma } from "@/lib/prisma";
import { verifyAdminToken } from "@/lib/adminAuth";

export async function GET(
  request: NextRequest
) {
  try {
    const token =
      request.cookies.get("adminToken")?.value;

    const session =
      await verifyAdminToken(token);

    if (!session) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "Siparişleri görüntülemek için admin girişi yapmalısınız.",
        },
        { status: 401 }
      );
    }

    const admin =
      await prisma.admin.findUnique({
        where: {
          id: session.adminId,
        },

        select: {
          id: true,
          isActive: true,
        },
      });

    if (!admin || !admin.isActive) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "Admin hesabı bulunamadı veya aktif değil.",
        },
        { status: 403 }
      );
    }

    const orders =
      await prisma.order.findMany({
        include: {
          customer: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },

          items: true,
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    const formattedOrders =
      orders.map((order) => ({
        id: order.id,

        merchantReference:
          order.merchantReference,

        amount:
          Number(order.amount),

        currency:
          order.currency,

        status:
          order.status,

        customerId:
          order.customerId,

        customerName:
          order.customer?.fullName ||
          order.customerName,

        customerEmail:
          order.customer?.email ||
          order.customerEmail,

        customerPhone:
          order.customerPhone,

        customerAddress:
          order.customerAddress,

        createdAt:
          order.createdAt.toISOString(),

        itemCount:
          order.items.reduce(
            (total, item) =>
              total + item.quantity,
            0
          ),
      }));

    return NextResponse.json({
      status: "success",
      orders: formattedOrders,
    });
  } catch (error) {
    console.error(
      "Admin sipariş listeleme hatası:",
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