import {
  NextRequest,
  NextResponse,
} from "next/server";

import { prisma } from "@/lib/prisma";
import { verifyAdminToken } from "@/lib/adminAuth";

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
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
            "Sipariş detayını görüntülemek için admin girişi yapmalısınız.",
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

    const { id } = await params;

    const orderId = Number(id);

    if (
      !Number.isInteger(orderId) ||
      orderId <= 0
    ) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "Geçersiz sipariş numarası.",
        },
        { status: 400 }
      );
    }

    const order =
      await prisma.order.findUnique({
        where: {
          id: orderId,
        },

        include: {
          customer: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              address: true,
              city: true,
              postalCode: true,
            },
          },

          items: {
            orderBy: {
              id: "asc",
            },
          },
        },
      });

    if (!order) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "Sipariş bulunamadı.",
        },
        { status: 404 }
      );
    }

    const formattedOrder = {
      id: order.id,

      merchantReference:
        order.merchantReference,

      amount:
        Number(order.amount),

      currency:
        order.currency,

      status:
        order.status,

      paymentToken:
        order.paymentToken,

      paymentLink:
        order.paymentLink,

      createdAt:
        order.createdAt.toISOString(),

      updatedAt:
        order.updatedAt.toISOString(),

      customer: {
        id:
          order.customer?.id ??
          order.customerId,

        fullName:
          order.customer?.fullName ??
          order.customerName,

        email:
          order.customer?.email ??
          order.customerEmail,

        phone:
          order.customer?.phone ??
          order.customerPhone,

        address:
          order.customer?.address ??
          order.customerAddress,

        city:
          order.customer?.city ??
          null,

        postalCode:
          order.customer?.postalCode ??
          null,
      },

      items: order.items.map(
        (item) => ({
          id: item.id,

          productId:
            item.productId,

          title:
            item.title,

          image:
            item.image,

          price:
            Number(item.price),

          quantity:
            item.quantity,

          total:
            Number(item.price) *
            item.quantity,
        })
      ),
    };

    return NextResponse.json({
      status: "success",
      order: formattedOrder,
    });
  } catch (error) {
    console.error(
      "Admin sipariş detay hatası:",
      error
    );

    return NextResponse.json(
      {
        status: "error",
        message:
          "Sipariş detayı alınırken bir hata oluştu.",
      },
      { status: 500 }
    );
  }
}