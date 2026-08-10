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
            "Müşterileri görüntülemek için admin girişi yapmalısınız.",
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

    const customers =
      await prisma.customer.findMany({
        orderBy: {
          createdAt: "desc",
        },

        include: {
          _count: {
            select: {
              orders: true,
            },
          },
        },
      });

    const formattedCustomers =
      customers.map((customer) => ({
        id: customer.id,
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        city: customer.city,
        postalCode: customer.postalCode,
        createdAt:
          customer.createdAt.toISOString(),
        updatedAt:
          customer.updatedAt.toISOString(),
        orderCount:
          customer._count.orders,
      }));

    return NextResponse.json({
      status: "success",
      customers: formattedCustomers,
    });
  } catch (error) {
    console.error(
      "Admin müşteri listeleme hatası:",
      error
    );

    return NextResponse.json(
      {
        status: "error",
        message:
          "Müşteriler alınırken bir hata oluştu.",
      },
      { status: 500 }
    );
  }
}