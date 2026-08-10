import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken } from "@/lib/adminAuth";
import { getCustomerByIdAdmin } from "@/services/customerService";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = request.cookies.get("adminToken")?.value;
    const session = await verifyAdminToken(token);

    if (!session) {
      return NextResponse.json(
        {
          status: "error",
          message: "Bu işlem için admin girişi yapmalısınız.",
        },
        { status: 401 },
      );
    }

    const admin = await prisma.admin.findUnique({
      where: { id: session.adminId },
      select: { id: true, isActive: true },
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

    const { id } = await context.params;
    const customerId = Number(id);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return NextResponse.json(
        {
          status: "error",
          message: "Geçerli bir müşteri kimliği gönderilmelidir.",
        },
        { status: 400 },
      );
    }

    const customer = await getCustomerByIdAdmin(customerId);

    if (!customer) {
      return NextResponse.json(
        {
          status: "error",
          message: "Müşteri bulunamadı.",
        },
        { status: 404 },
      );
    }

    const orders = customer.orders.map((order) => ({
      id: order.id,
      merchantReference: order.merchantReference,
      amount: Number(order.amount),
      currency: order.currency,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      productCount: order.items.reduce(
        (total, item) => total + item.quantity,
        0,
      ),
    }));

    const paidStatuses = ["paid", "success", "completed"];

    const totalSpent = customer.orders.reduce((total, order) => {
      const normalizedStatus = order.status.toLowerCase();
      if (!paidStatuses.includes(normalizedStatus)) {
        return total;
      }
      return total + Number(order.amount);
    }, 0);

    return NextResponse.json({
      status: "success",
      customer: {
        id: customer.id,
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        city: customer.city,
        postalCode: customer.postalCode,
        createdAt: customer.createdAt.toISOString(),
        updatedAt: customer.updatedAt.toISOString(),
        orderCount: customer.orders.length,
        totalSpent,
        orders,
      },
    });
  } catch (error) {
    console.error("Müşteri detay hatası:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Müşteri detayı alınırken bir hata oluştu.",
      },
      { status: 500 },
    );
  }
}
