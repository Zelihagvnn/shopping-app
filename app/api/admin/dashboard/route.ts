import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { verifyAdminToken } from "@/lib/adminAuth";

const paidStatuses = ["paid", "success", "completed"];
const pendingStatuses = ["created", "active", "pending"];

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("adminToken")?.value;
    const session = await verifyAdminToken(token);

    if (!session) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "Dashboard verilerini görüntülemek için admin girişi yapmalısınız.",
        },
        { status: 401 },
      );
    }

    const admin = await prisma.admin.findUnique({
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
          message: "Admin hesabı bulunamadı veya aktif değil.",
        },
        { status: 403 },
      );
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      productCount,
      customerCount,
      orderCount,
      todayOrderCount,
      pendingOrderCount,
      paidOrders,
      recentOrders,
    ] = await Promise.all([
      prisma.product.count(),

      prisma.customer.count(),

      prisma.order.count(),

      prisma.order.count({
        where: {
          createdAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      }),

      prisma.order.count({
        where: {
          status: {
            in: pendingStatuses,
          },
        },
      }),

      prisma.order.findMany({
        where: {
          status: {
            in: paidStatuses,
          },
        },
        select: {
          amount: true,
        },
      }),

      prisma.order.findMany({
        take: 5,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          customer: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
      }),
    ]);

    const totalRevenue = paidOrders.reduce(
      (total, order) => total + Number(order.amount),
      0,
    );

    const formattedRecentOrders = recentOrders.map((order) => ({
      id: order.id,
      merchantReference: order.merchantReference,
      customerName:
        order.customer?.fullName || order.customerName || "Bilinmeyen Müşteri",
      customerEmail:
        order.customer?.email || order.customerEmail || "E-posta bulunmuyor",
      amount: Number(order.amount),
      status: order.status,
      createdAt: order.createdAt.toISOString(),
    }));

    return NextResponse.json({
      status: "success",
      stats: {
        productCount,
        customerCount,
        orderCount,
        todayOrderCount,
        pendingOrderCount,
        totalRevenue,
      },
      recentOrders: formattedRecentOrders,
    });
  } catch (error) {
    console.error("Admin dashboard hatası:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "Dashboard verileri alınırken bir hata oluştu.",
      },
      { status: 500 },
    );
  }
}
